-- MAP-015: password account registry. Passwords remain exclusively in Supabase Auth.
begin;
create table if not exists public.bp_accounts(
 user_id uuid primary key references auth.users(id),
 workspace_id uuid not null references public.bp_workspaces(id),
 profile_id text not null,
 login_name text not null unique check(login_name ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
 created_at timestamptz not null default now(),
 unique(workspace_id,profile_id),
 foreign key(workspace_id,profile_id) references public.bp_editor_profiles(workspace_id,id)
);
create index if not exists bp_accounts_workspace on public.bp_accounts(workspace_id);
alter table public.bp_accounts enable row level security;
revoke all on public.bp_accounts from public,anon,authenticated;
grant select on public.bp_accounts to authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then grant usage on schema blueprint_private to service_role;grant select,insert,update,delete on public.bp_accounts to service_role;end if;end;$$;
drop policy if exists bp_accounts_self_owner on public.bp_accounts;
create policy bp_accounts_self_owner on public.bp_accounts for select to authenticated using(
 user_id=(select auth.uid()) or exists(select 1 from public.bp_workspaces w where w.id=workspace_id and w.created_by=(select auth.uid()))
);
create or replace function blueprint_private.register_account(p_actor uuid,p_workspace_id uuid,p_user_id uuid,p_login text,p_profile_id text,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$declare profile text;entry public.bp_accounts%rowtype;begin
 if not exists(select 1 from public.bp_workspaces where id=p_workspace_id and created_by=p_actor) then raise exception 'Hanya pemilik ruang dapat membuat akun';end if;
 if p_login is null or p_login !~ '^[a-z0-9][a-z0-9._-]{2,39}$' or p_name is null or length(trim(p_name)) not between 1 and 60 then raise exception 'Akun tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,40));
 select * into entry from public.bp_accounts where user_id=p_user_id;
 if found then
  if entry.workspace_id<>p_workspace_id or entry.login_name<>p_login then raise exception 'Akun sudah terdaftar';end if;
  return to_jsonb(entry);
 end if;
 if p_profile_id is null then
  profile='p_'||gen_random_uuid()::text;
  insert into public.bp_editor_profiles(workspace_id,id,name,base) values(p_workspace_id,profile,trim(p_name),false);
 else
  profile=p_profile_id;
  if not exists(select 1 from public.bp_editor_profiles where workspace_id=p_workspace_id and id=profile and deleted_at is null) then raise exception 'Profil tidak ditemukan';end if;
 end if;
 insert into public.bp_accounts(user_id,workspace_id,profile_id,login_name) values(p_user_id,p_workspace_id,profile,p_login) returning * into entry;
 insert into public.bp_members(workspace_id,user_id,role) values(p_workspace_id,p_user_id,case when p_user_id=p_actor then 'owner' else 'editor' end) on conflict do nothing;
 return to_jsonb(entry);
end;$$;
create or replace function public.bp_register_account(p_actor uuid,p_workspace_id uuid,p_user_id uuid,p_login text,p_profile_id text,p_name text) returns jsonb
language sql security invoker set search_path='' as $$select blueprint_private.register_account(p_actor,p_workspace_id,p_user_id,p_login,p_profile_id,p_name)$$;
revoke all on function blueprint_private.register_account(uuid,uuid,uuid,text,text,text),public.bp_register_account(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
do $$begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function blueprint_private.register_account(uuid,uuid,uuid,text,text,text),public.bp_register_account(uuid,uuid,uuid,text,text,text) to service_role;end if;end;$$;
-- Once a workspace has password accounts, legacy anonymous invitations cannot admit new users.
create or replace function public.bp_join_workspace(p_code uuid) returns uuid language plpgsql security definer set search_path='' as $$declare w uuid;begin
 if auth.uid() is null then raise exception 'Sesi belum tersedia';end if;
 select workspace_id into w from public.bp_invites where code=p_code;
 if w is null then raise exception 'Kode undangan tidak valid';end if;
 if exists(select 1 from public.bp_accounts where workspace_id=w) then
  if not exists(select 1 from public.bp_accounts where workspace_id=w and user_id=auth.uid()) then raise exception 'Gunakan akun dengan password. Client memakai link project.';end if;
 end if;
 insert into public.bp_members values(w,auth.uid(),'editor') on conflict do nothing;
 return w;
end;$$;
-- Registered workspaces require a registered password account; preserve legacy owner setup.
create or replace function public.bp_is_member(p_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bp_members m where m.workspace_id=p_workspace_id and m.user_id=auth.uid() and (
  not exists(select 1 from public.bp_accounts a where a.workspace_id=p_workspace_id)
  or exists(select 1 from public.bp_accounts a join public.bp_editor_profiles p on p.workspace_id=a.workspace_id and p.id=a.profile_id where a.workspace_id=p_workspace_id and a.user_id=auth.uid() and p.deleted_at is null)
  or exists(select 1 from public.bp_workspaces w where w.id=p_workspace_id and w.created_by=auth.uid())
 ));
$$;
create or replace function public.bp_can_access_path(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bp_workspaces w where w.id::text=split_part(p_path,'/',1) and public.bp_is_member(w.id));
$$;
do $$begin if to_regclass('realtime.messages') is not null then
 execute 'drop policy if exists bp_presence_read on realtime.messages';
 execute $p$create policy bp_presence_read on realtime.messages for select to authenticated using(extension='presence' and exists(select 1 from public.bp_members m where m.user_id=(select auth.uid()) and public.bp_is_member(m.workspace_id) and (select realtime.topic())='blueprint-presence:'||m.workspace_id::text))$p$;
 execute 'drop policy if exists bp_presence_track on realtime.messages';
 execute $p$create policy bp_presence_track on realtime.messages for insert to authenticated with check(extension='presence' and exists(select 1 from public.bp_members m where m.user_id=(select auth.uid()) and public.bp_is_member(m.workspace_id) and (select realtime.topic())='blueprint-presence:'||m.workspace_id::text))$p$;
end if;end;$$;
commit;

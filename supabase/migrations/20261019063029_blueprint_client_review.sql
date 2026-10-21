-- MAP-005. Project-scoped, revocable read-only review access. No public bucket or editor membership.
begin;
create table public.bp_review_links(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,project_id text not null,
 code uuid not null unique default gen_random_uuid(),created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '30 days',revoked_at timestamptz,
 unique(workspace_id,project_id),foreign key(workspace_id,project_id) references public.bp_documents(workspace_id,project_id)
);
create index bp_review_links_author on public.bp_review_links(created_by);
create table public.bp_review_visitors(link_id uuid not null references public.bp_review_links(id),user_id uuid not null references auth.users(id),joined_at timestamptz not null default now(),primary key(link_id,user_id));
create index bp_review_visitors_user on public.bp_review_visitors(user_id);
alter table public.bp_review_links enable row level security;
alter table public.bp_review_visitors enable row level security;
revoke all on public.bp_review_links,public.bp_review_visitors from public,anon,authenticated;
-- The invitation code is visible only to editors; visitors cannot enumerate links or visitors.
grant select on public.bp_review_links to authenticated;
create policy bp_review_links_editor on public.bp_review_links for select to authenticated using(public.bp_is_member(workspace_id));
create function public.bp_review_link(p_workspace_id uuid,p_project_id text,p_action text default 'get') returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.bp_review_links%rowtype;
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses editor ditolak'; end if;
 if p_action not in ('get','create','rotate','revoke') or p_action is null then raise exception 'Aksi tidak valid'; end if;
 if not exists(select 1 from public.bp_documents where workspace_id=p_workspace_id and project_id=p_project_id) then raise exception 'Proyek tidak ditemukan'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||p_project_id,5));
 select * into link from public.bp_review_links where workspace_id=p_workspace_id and project_id=p_project_id for update;
 if p_action='revoke' then update public.bp_review_links set revoked_at=now() where id=link.id;return null; end if;
 if p_action in ('create','rotate') and (link.id is null or link.revoked_at is not null or link.expires_at<=now() or p_action='rotate') then
  -- Rotate the code and clear prior visitors so old sessions lose access.
  if link.id is not null then delete from public.bp_review_visitors where link_id=link.id; end if;
  insert into public.bp_review_links(workspace_id,project_id,created_by) values(p_workspace_id,p_project_id,auth.uid())
  on conflict(workspace_id,project_id) do update set code=gen_random_uuid(),expires_at=now()+interval '30 days',revoked_at=null,created_by=auth.uid() returning * into link;
 end if;
 if link.id is null or link.revoked_at is not null or link.expires_at<=now() then return null; end if;
 return jsonb_build_object('code',link.code,'expiresAt',link.expires_at);
end; $$;
create function public.bp_join_review(p_code uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.bp_review_links%rowtype;
begin
 if auth.uid() is null then raise exception 'Sesi client diperlukan'; end if;
 select * into link from public.bp_review_links where code=p_code and revoked_at is null and expires_at>now() for share;
 if not found then raise exception 'Tautan review tidak aktif atau sudah kedaluwarsa'; end if;
 insert into public.bp_review_visitors(link_id,user_id) values(link.id,auth.uid()) on conflict do nothing;
 return jsonb_build_object('workspaceId',link.workspace_id,'projectId',link.project_id);
end; $$;
create function public.bp_can_view_review(p_workspace_id uuid,p_project_id text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.bp_review_links l join public.bp_review_visitors v on v.link_id=l.id where l.workspace_id=p_workspace_id and l.project_id=p_project_id and v.user_id=auth.uid() and l.revoked_at is null and l.expires_at>now());
$$;
create function public.bp_review_asset_path(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.bp_review_links l join public.bp_review_visitors v on v.link_id=l.id join public.bp_documents d on d.workspace_id=l.workspace_id and d.project_id=l.project_id cross join lateral jsonb_array_elements(d.payload->'assets') a where v.user_id=auth.uid() and l.revoked_at is null and l.expires_at>now() and a->>'storagePath'=p_path and exists(select 1 from public.bp_assets b where b.workspace_id=l.workspace_id and b.asset_id=a->>'id' and b.storage_path=p_path));
$$;
create function public.bp_read_review(p_code uuid,p_known_token uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.bp_review_links%rowtype;doc public.bp_documents%rowtype;
begin
 select * into link from public.bp_review_links where code=p_code and revoked_at is null and expires_at>now();
 if not found or auth.uid() is null or not exists(select 1 from public.bp_review_visitors where link_id=link.id and user_id=auth.uid()) then raise exception 'Tautan review tidak aktif atau akses ditolak'; end if;
 select * into doc from public.bp_documents where workspace_id=link.workspace_id and project_id=link.project_id;
 if not found then raise exception 'Proyek tidak ditemukan'; end if;
 return jsonb_build_object('workspaceId',link.workspace_id,'projectId',link.project_id,'token',doc.token,'updatedAt',doc.updated_at,'expiresAt',link.expires_at,'unchanged',doc.token=p_known_token,'payload',case when doc.token=p_known_token then null else doc.payload end);
end; $$;
revoke all on function public.bp_review_link(uuid,text,text),public.bp_join_review(uuid),public.bp_can_view_review(uuid,text),public.bp_review_asset_path(text),public.bp_read_review(uuid,uuid) from public,anon;
grant execute on function public.bp_review_link(uuid,text,text),public.bp_join_review(uuid),public.bp_can_view_review(uuid,text),public.bp_review_asset_path(text),public.bp_read_review(uuid,uuid) to authenticated;
create policy bp_documents_client_review on public.bp_documents for select to authenticated using(public.bp_can_view_review(workspace_id,project_id));
create policy bp_images_client_review on storage.objects for select to authenticated using(bucket_id='blueprint-designs' and public.bp_review_asset_path(name));
-- No write RPC, INSERT, UPDATE, DELETE or History grant is added for reviewers.
commit;

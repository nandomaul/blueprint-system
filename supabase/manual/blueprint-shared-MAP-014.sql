-- MAP-014: one configured shared room for existing members; private Presence.
-- No membership is granted by this RPC. New devices still need a one-time invitation.
begin;
create table if not exists blueprint_private.shared_entry (
 singleton boolean primary key default true check(singleton),
 workspace_id uuid not null references public.bp_workspaces(id)
);
alter table blueprint_private.shared_entry enable row level security;
revoke all on blueprint_private.shared_entry from public,anon,authenticated;
-- Preserve an existing selection on replay. In this project the earliest room is the original team.
insert into blueprint_private.shared_entry(singleton,workspace_id)
 select true,id from public.bp_workspaces order by created_at,id limit 1
 on conflict(singleton) do nothing;
create or replace function blueprint_private.enter_shared_workspace() returns uuid
language plpgsql security definer set search_path='' as $$declare w uuid;begin
 if auth.uid() is null then raise exception 'Sesi belum tersedia';end if;
 select workspace_id into w from blueprint_private.shared_entry where singleton;
 if w is null then raise exception 'Ruang bersama belum dikonfigurasi. Pasang SQL MAP-014.';end if;
 if not public.bp_is_member(w) then raise exception 'Perangkat ini belum diberi akses. Buka undangan tim satu kali.';end if;
 return w;
end;$$;
create or replace function public.bp_enter_shared_workspace() returns uuid
language sql security invoker set search_path='' as $$select blueprint_private.enter_shared_workspace()$$;
revoke all on function blueprint_private.enter_shared_workspace(),public.bp_enter_shared_workspace() from public,anon;
grant execute on function blueprint_private.enter_shared_workspace(),public.bp_enter_shared_workspace() to authenticated;
-- Existing project/document/chat RLS remains unchanged. Presence is only for workspace members.
do $$begin
 if to_regclass('realtime.messages') is not null then
  execute 'drop policy if exists bp_presence_read on realtime.messages';
  execute 'drop policy if exists bp_presence_track on realtime.messages';
  execute $p$create policy bp_presence_read on realtime.messages for select to authenticated using (
   extension='presence' and exists(select 1 from public.bp_members m where m.user_id=(select auth.uid()) and (select realtime.topic())='blueprint-presence:'||m.workspace_id::text)
  )$p$;
  execute $p$create policy bp_presence_track on realtime.messages for insert to authenticated with check (
   extension='presence' and exists(select 1 from public.bp_members m where m.user_id=(select auth.uid()) and (select realtime.topic())='blueprint-presence:'||m.workspace_id::text)
  )$p$;
 end if;
end;$$;
commit;

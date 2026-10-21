-- MAP-012: shared chat, read cursors, editable profiles. Additive, rerunnable.
alter table public.bp_editor_profiles add column if not exists avatar text;
DO $$begin if not exists(select 1 from pg_constraint where conname='bp_profile_avatar_size') then alter table public.bp_editor_profiles add constraint bp_profile_avatar_size check(avatar is null or (length(avatar)<=100000 and avatar ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$'));end if;end$$;
create table if not exists public.bp_chat_messages (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.bp_workspaces(id) on delete cascade,
 client_id uuid not null,profile_id text not null,author_name text not null,
 body text not null check(length(trim(body)) between 1 and 4000),
 kind text not null check(kind in ('chat','note')),context jsonb,
 mentions jsonb not null default '[]'::jsonb,created_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id),unique(workspace_id,client_id),
 foreign key(workspace_id,profile_id) references public.bp_editor_profiles(workspace_id,id)
);
create index if not exists bp_chat_workspace_cursor on public.bp_chat_messages(workspace_id,id desc);
create index if not exists bp_chat_profile_fk on public.bp_chat_messages(workspace_id,profile_id);
create index if not exists bp_chat_creator_fk on public.bp_chat_messages(created_by);
create table if not exists public.bp_chat_reads (
 workspace_id uuid not null references public.bp_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id text not null,last_id bigint not null default 0,
 primary key(workspace_id,user_id,profile_id),
 foreign key(workspace_id,profile_id) references public.bp_editor_profiles(workspace_id,id)
);
create index if not exists bp_chat_reads_user_fk on public.bp_chat_reads(user_id);
create index if not exists bp_chat_reads_profile_fk on public.bp_chat_reads(workspace_id,profile_id);
alter table public.bp_chat_messages enable row level security;
alter table public.bp_chat_reads enable row level security;
drop policy if exists bp_chat_member_read on public.bp_chat_messages;
create policy bp_chat_member_read on public.bp_chat_messages for select to authenticated using(public.bp_is_member(workspace_id));
drop policy if exists bp_chat_own_cursor on public.bp_chat_reads;
create policy bp_chat_own_cursor on public.bp_chat_reads for select to authenticated using(user_id=(select auth.uid()) and public.bp_is_member(workspace_id));
revoke all on public.bp_chat_messages,public.bp_chat_reads from anon,authenticated;
grant select on public.bp_chat_messages,public.bp_chat_reads to authenticated;
-- Keep the legacy catalog response unchanged for older clients.
create or replace function public.bp_workspace_catalog_v12(p_workspace_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 return jsonb_build_object('profiles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'base',base,'deletedAt',deleted_at,'avatar',avatar) order by base desc,lower(name),id) from public.bp_editor_profiles where workspace_id=p_workspace_id),'[]'::jsonb),'projects',coalesce((select jsonb_agg(jsonb_build_object('id',project_id,'coverAssetId',cover_asset_id,'pinned',pinned,'shortcut',shortcut,'trashedAt',trashed_at)) from public.bp_document_settings where workspace_id=p_workspace_id),'[]'::jsonb));end$$;
create or replace function blueprint_private.editor_profile(p_workspace_id uuid,p_action text,p_id text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.bp_editor_profiles%rowtype;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 if p_action is null or p_action not in ('create','trash','restore') then raise exception 'Aksi profil tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,10));
 if p_action='create' then
  if p_name is null or length(trim(p_name)) not between 1 and 60 then raise exception 'Nama profil 1–60 karakter';end if;
  insert into public.bp_editor_profiles(workspace_id,id,name) values(p_workspace_id,'p_'||gen_random_uuid()::text,trim(p_name)) returning * into r;
 else
  select * into r from public.bp_editor_profiles where workspace_id=p_workspace_id and id=p_id for update;
  if not found then raise exception 'Profil tidak ditemukan';end if;
  if p_action='trash' and r.deleted_at is null and (select count(*) from public.bp_editor_profiles where workspace_id=p_workspace_id and deleted_at is null)<=1 then raise exception 'Sisakan satu profil aktif';end if;
  update public.bp_editor_profiles set deleted_at=case when p_action='trash' then coalesce(deleted_at,now()) else null end where workspace_id=p_workspace_id and id=p_id returning * into r;
 end if;
 return jsonb_build_object('id',r.id,'name',r.name,'base',r.base,'deletedAt',r.deleted_at);end$$;
create or replace function blueprint_private.update_profile(p_workspace_id uuid,p_id text,p_name text,p_avatar text) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.bp_editor_profiles%rowtype;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 if p_name is null or length(trim(p_name)) not between 1 and 60 then raise exception 'Nama profil 1–60 karakter';end if;
 if p_avatar is not null and (length(p_avatar)>100000 or p_avatar !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$') then raise exception 'Foto profil tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,10));
 update public.bp_editor_profiles set name=trim(p_name),avatar=p_avatar where workspace_id=p_workspace_id and id=p_id and deleted_at is null returning * into r;
 if not found then raise exception 'Profil tidak ditemukan atau ada di Trash';end if;
 return jsonb_build_object('id',r.id,'name',r.name,'base',r.base,'deletedAt',r.deleted_at,'avatar',r.avatar);end$$;
create or replace function public.bp_update_editor_profile(p_workspace_id uuid,p_id text,p_name text,p_avatar text) returns jsonb language sql security invoker set search_path='' as $$select blueprint_private.update_profile(p_workspace_id,p_id,p_name,p_avatar)$$;
create or replace function blueprint_private.chat_send(p_workspace_id uuid,p_profile text,p_client_id uuid,p_body text,p_kind text,p_context jsonb,p_mentions jsonb) returns text language plpgsql security definer set search_path='' as $$
declare actor public.bp_editor_profiles%rowtype;r public.bp_chat_messages%rowtype;ctx jsonb;doc jsonb;project_title text;page_title text;list jsonb;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 select * into actor from public.bp_editor_profiles where workspace_id=p_workspace_id and id=p_profile and deleted_at is null;
 if not found then raise exception 'Profil tidak aktif';end if;
 if p_client_id is null or p_body is null or length(trim(p_body)) not between 1 and 4000 or p_kind is null or p_kind not in ('chat','note') then raise exception 'Pesan tidak valid';end if;
 if p_mentions is null or jsonb_typeof(p_mentions)<>'array' then raise exception 'Mention tidak valid';end if;
 if jsonb_array_length(p_mentions)>12 then raise exception 'Maksimal 12 mention';end if;
 if exists(select 1 from jsonb_array_elements(p_mentions) v where jsonb_typeof(v)<>'string' or not exists(select 1 from public.bp_editor_profiles p where p.workspace_id=p_workspace_id and p.id=v#>>'{}' and p.deleted_at is null)) then raise exception 'Profil mention tidak ditemukan';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.id),'[]'::jsonb) into list from public.bp_editor_profiles p where p.workspace_id=p_workspace_id and p_mentions ? p.id;
 -- Serial order prevents cursor acknowledgement skipping an earlier uncommitted send.
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,20));
 select * into r from public.bp_chat_messages where workspace_id=p_workspace_id and client_id=p_client_id;
 if found then
  if r.created_by<>auth.uid() or r.profile_id<>p_profile or r.body<>trim(p_body) or r.kind<>p_kind or (select coalesce(jsonb_agg(v->>'id' order by v->>'id'),'[]'::jsonb) from jsonb_array_elements(r.mentions) v)<>(select coalesce(jsonb_agg(v->>'id' order by v->>'id'),'[]'::jsonb) from jsonb_array_elements(list) v) or coalesce(r.context->>'projectId','')<>coalesce(p_context->>'projectId','') or coalesce(r.context->>'nodeId','')<>coalesce(p_context->>'nodeId','') or coalesce(r.context->>'view','')<>coalesce(p_context->>'view','') then raise exception 'ID pesan sudah dipakai';end if;
  return r.id::text;
 end if;
 if p_context is not null and p_context<>'null'::jsonb then
  if jsonb_typeof(p_context)<>'object' or coalesce(p_context->>'view','') not in ('canvas','flow','assets','brief') then raise exception 'Referensi tidak valid';end if;
  select d.payload,d.title into doc,project_title from public.bp_documents d where d.workspace_id=p_workspace_id and d.project_id=p_context->>'projectId' and not exists(select 1 from public.bp_document_settings s where s.workspace_id=d.workspace_id and s.project_id=d.project_id and s.trashed_at is not null);
  if doc is null then raise exception 'Proyek tidak ditemukan atau ada di Trash';end if;
  if coalesce(p_context->>'nodeId','')<>'' then
   select n->>'title' into page_title from jsonb_array_elements(doc->'nodes') n where n->>'id'=p_context->>'nodeId';
   if page_title is null then raise exception 'Halaman tidak ditemukan';end if;
  end if;
  ctx=jsonb_build_object('projectId',p_context->>'projectId','projectTitle',project_title,'nodeId',nullif(p_context->>'nodeId',''),'nodeTitle',page_title,'view',p_context->>'view');
 end if;
 insert into public.bp_chat_messages(workspace_id,client_id,profile_id,author_name,body,kind,context,mentions,created_by) values(p_workspace_id,p_client_id,p_profile,actor.name,trim(p_body),p_kind,ctx,list,auth.uid()) returning * into r;
 return r.id::text;end$$;
create or replace function public.bp_chat_send(p_workspace_id uuid,p_profile text,p_client_id uuid,p_body text,p_kind text,p_context jsonb,p_mentions jsonb) returns text language sql security invoker set search_path='' as $$select blueprint_private.chat_send(p_workspace_id,p_profile,p_client_id,p_body,p_kind,p_context,p_mentions)$$;
create or replace function blueprint_private.chat_read(p_workspace_id uuid,p_profile text,p_last_id bigint) returns text language plpgsql security definer set search_path='' as $$declare cursor_id bigint;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 if not exists(select 1 from public.bp_editor_profiles where workspace_id=p_workspace_id and id=p_profile and deleted_at is null) then raise exception 'Profil tidak aktif';end if;
 if p_last_id is null or p_last_id<0 then raise exception 'Cursor tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,20));
 select least(p_last_id,coalesce(max(id),0)) into cursor_id from public.bp_chat_messages where workspace_id=p_workspace_id;
 insert into public.bp_chat_reads(workspace_id,user_id,profile_id,last_id) values(p_workspace_id,auth.uid(),p_profile,cursor_id) on conflict(workspace_id,user_id,profile_id) do update set last_id=greatest(bp_chat_reads.last_id,excluded.last_id) returning last_id into cursor_id;
 return cursor_id::text;end$$;
create or replace function public.bp_chat_read(p_workspace_id uuid,p_profile text,p_last_id bigint) returns text language sql security invoker set search_path='' as $$select blueprint_private.chat_read(p_workspace_id,p_profile,p_last_id)$$;
create or replace function public.bp_chat_page(p_workspace_id uuid,p_profile text,p_before bigint default null) returns jsonb language plpgsql security invoker set search_path='' as $$declare cursor_id bigint;items jsonb;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 if not exists(select 1 from public.bp_editor_profiles where workspace_id=p_workspace_id and id=p_profile and deleted_at is null) then raise exception 'Profil tidak aktif';end if;
 select coalesce((select last_id from public.bp_chat_reads where workspace_id=p_workspace_id and user_id=auth.uid() and profile_id=p_profile),0) into cursor_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id::text,'clientId',m.client_id,'profileId',m.profile_id,'authorName',m.author_name,'body',m.body,'kind',m.kind,'context',m.context,'mentions',m.mentions,'createdAt',m.created_at) order by m.id),'[]'::jsonb) into items from (select * from public.bp_chat_messages where workspace_id=p_workspace_id and (p_before is null or id<p_before) order by id desc limit 50) m;
 return jsonb_build_object('messages',items,'lastRead',cursor_id::text,'unread',(select count(*) from public.bp_chat_messages where workspace_id=p_workspace_id and id>cursor_id and profile_id<>p_profile),'hasMore',case when jsonb_array_length(items)=0 then false else exists(select 1 from public.bp_chat_messages where workspace_id=p_workspace_id and id<(items->0->>'id')::bigint) end);end$$;
revoke all on function blueprint_private.update_profile(uuid,text,text,text),blueprint_private.chat_send(uuid,text,uuid,text,text,jsonb,jsonb),blueprint_private.chat_read(uuid,text,bigint) from public,anon;
grant execute on function blueprint_private.update_profile(uuid,text,text,text),blueprint_private.chat_send(uuid,text,uuid,text,text,jsonb,jsonb),blueprint_private.chat_read(uuid,text,bigint) to authenticated;
revoke all on function public.bp_workspace_catalog_v12(uuid),public.bp_update_editor_profile(uuid,text,text,text),public.bp_chat_send(uuid,text,uuid,text,text,jsonb,jsonb),public.bp_chat_read(uuid,text,bigint),public.bp_chat_page(uuid,text,bigint) from public,anon;
grant execute on function public.bp_workspace_catalog_v12(uuid),public.bp_update_editor_profile(uuid,text,text,text),public.bp_chat_send(uuid,text,uuid,text,text,jsonb,jsonb),public.bp_chat_read(uuid,text,bigint),public.bp_chat_page(uuid,text,bigint) to authenticated;
DO $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='bp_chat_messages') then alter publication supabase_realtime add table public.bp_chat_messages;end if;end$$;
notify pgrst,'reload schema';

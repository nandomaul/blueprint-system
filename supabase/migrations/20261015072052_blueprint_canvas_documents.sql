-- MAP-003: multiple systems, autosave without checkpoints, atomic versions and Realtime.
-- Additive migration. Old tables, snapshots and storage files remain intact.
begin;
create table public.bp_documents (
 workspace_id uuid not null references public.bp_workspaces(id), project_id text not null check(length(project_id) between 1 and 100),
 token uuid not null, title text not null check(length(title) between 1 and 100), payload jsonb not null,
 updated_at timestamptz not null default now(), updated_by uuid not null references auth.users(id),
 primary key(workspace_id,project_id)
);
create index bp_documents_editor on public.bp_documents(updated_by);
create table public.bp_document_versions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id text not null,
 label text not null check(length(trim(label)) between 1 and 100), snapshot jsonb not null,
 saved_at timestamptz not null default now(), created_by uuid not null references auth.users(id),
 profile text not null check(profile in ('nando','hadist','ryan')), deleted_at timestamptz,
 foreign key(workspace_id,project_id) references public.bp_documents(workspace_id,project_id)
);
create index bp_document_versions_document_time on public.bp_document_versions(workspace_id,project_id,saved_at desc);
create index bp_document_versions_author on public.bp_document_versions(created_by);
alter table public.bp_documents enable row level security;
alter table public.bp_document_versions enable row level security;
revoke all on public.bp_documents,public.bp_document_versions from public,anon,authenticated;
grant select on public.bp_documents,public.bp_document_versions to authenticated;
create policy bp_documents_read on public.bp_documents for select to authenticated using(public.bp_is_member(workspace_id));
create policy bp_document_versions_read on public.bp_document_versions for select to authenticated using(public.bp_is_member(workspace_id));
-- Copy historical records without rewriting or deleting the originals.
insert into public.bp_documents(workspace_id,project_id,token,title,payload,updated_at,updated_by)
 select workspace_id,payload->>'id',token,payload->>'title',payload,updated_at,updated_by from public.bp_projects;
-- Historical projects may have changed IDs through JSON import; preserve those documents too.
insert into public.bp_documents(workspace_id,project_id,token,title,payload,updated_at,updated_by)
 select distinct on(workspace_id,snapshot->>'id') workspace_id,snapshot->>'id',gen_random_uuid(),snapshot->>'title',snapshot,saved_at,created_by
 from public.bp_versions order by workspace_id,snapshot->>'id',saved_at desc
 on conflict(workspace_id,project_id) do nothing;
insert into public.bp_document_versions(id,workspace_id,project_id,label,snapshot,saved_at,created_by,profile,deleted_at)
 select id,workspace_id,snapshot->>'id',label,snapshot,saved_at,created_by,profile,deleted_at from public.bp_versions;
create function public.bp_write_document(p_workspace_id uuid,p_project_id text,p_expected_token uuid,p_payload jsonb,p_profile text,p_label text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_token uuid; new_token uuid:=gen_random_uuid(); version_id uuid; a jsonb;
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak'; end if;
 if p_project_id is null or length(p_project_id) not between 1 and 100 or p_payload->>'id' is distinct from p_project_id then raise exception 'ID sistem tidak valid'; end if;
 if p_profile is null or p_profile not in ('nando','hadist','ryan') then raise exception 'Profil tidak valid'; end if;
  if p_payload is null or octet_length(p_payload::text)>2000000 or p_payload->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(p_payload->'nodes') is distinct from 'array' or jsonb_typeof(p_payload->'edges') is distinct from 'array'
    or jsonb_typeof(p_payload->'assets') is distinct from 'array' or jsonb_typeof(p_payload->'presentation') is distinct from 'array' then raise exception 'Snapshot proyek tidak valid'; end if;
  if jsonb_array_length(p_payload->'nodes') not between 1 and 80 or jsonb_array_length(p_payload->'edges')>240 or jsonb_array_length(p_payload->'assets')>30 then raise exception 'Ukuran proyek melampaui batas'; end if;
  if jsonb_array_length(p_payload->'presentation') not between 1 and 80
    or length(coalesce(p_payload->>'title','')) not between 1 and 100
    or (select count(distinct n->>'id') from jsonb_array_elements(p_payload->'nodes') n) <> jsonb_array_length(p_payload->'nodes')
    or (select count(distinct e->>'id') from jsonb_array_elements(p_payload->'edges') e) <> jsonb_array_length(p_payload->'edges')
    or (select count(distinct x->>'id') from jsonb_array_elements(p_payload->'assets') x) <> jsonb_array_length(p_payload->'assets') then raise exception 'ID atau urutan proyek tidak valid'; end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'nodes') n where length(coalesce(n->>'id','')) not between 1 and 100 or length(coalesce(n->>'title','')) not between 1 and 80)
    or exists(select 1 from jsonb_array_elements(p_payload->'edges') e where not exists(select 1 from jsonb_array_elements(p_payload->'nodes') n where n->>'id'=e->>'source') or not exists(select 1 from jsonb_array_elements(p_payload->'nodes') n where n->>'id'=e->>'target'))
    or exists(select 1 from jsonb_array_elements_text(p_payload->'presentation') step where not exists(select 1 from jsonb_array_elements(p_payload->'nodes') n where n->>'id'=step)) then raise exception 'Koneksi atau node proyek tidak valid'; end if;
  for a in select value from jsonb_array_elements(p_payload->'assets') loop
    if a ? 'data' or not exists(select 1 from public.bp_assets where workspace_id=p_workspace_id and asset_id=a->>'id' and storage_path=a->>'storagePath' and sha256=a->>'sha256') then raise exception 'Referensi gambar belum terdaftar di workspace'; end if;
  end loop;

 if exists(select 1 from jsonb_array_elements(p_payload->'nodes') n where n ? 'design' and (jsonb_typeof(n->'design'->'elements') is distinct from 'array' or jsonb_array_length(n->'design'->'elements')>100)) then raise exception 'Komponen halaman tidak valid'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||p_project_id,3));
 select token into old_token from public.bp_documents where workspace_id=p_workspace_id and project_id=p_project_id for update;
 if old_token is distinct from p_expected_token then raise exception 'CONFLICT: Rancangan berubah di tab atau anggota lain. Download draft sebelum memuat versi tim.' using errcode='40001'; end if;
 insert into public.bp_documents values(p_workspace_id,p_project_id,new_token,p_payload->>'title',p_payload,now(),auth.uid())
 on conflict(workspace_id,project_id) do update set token=excluded.token,title=excluded.title,payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 if p_label is not null then
  insert into public.bp_document_versions(workspace_id,project_id,label,snapshot,created_by,profile)
  values(p_workspace_id,p_project_id,trim(p_label),p_payload,auth.uid(),p_profile) returning id into version_id;
 end if;
 return jsonb_build_object('token',new_token,'versionId',version_id);
end; $$;
create function public.bp_edit_document_version(p_workspace_id uuid,p_id uuid,p_action text,p_label text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak'; end if;
 if p_action not in ('rename','trash','untrash') or p_action is null then raise exception 'Aksi tidak valid'; end if;
 update public.bp_document_versions set
 label=case when p_action='rename' then trim(p_label) else label end,
 deleted_at=case when p_action='trash' then coalesce(deleted_at,now()) when p_action='untrash' then null else deleted_at end
 where id=p_id and workspace_id=p_workspace_id;
 if not found then raise exception 'Versi tidak ditemukan atau akses ditolak'; end if;
end; $$;
revoke all on function public.bp_write_document(uuid,text,uuid,jsonb,text,text),public.bp_edit_document_version(uuid,uuid,text,text) from public,anon;
grant execute on function public.bp_write_document(uuid,text,uuid,jsonb,text,text),public.bp_edit_document_version(uuid,uuid,text,text) to authenticated;
-- Add only these tables to the existing publication; never replace the publication.
do $$ declare t text; begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 foreach t in array array['bp_documents','bp_document_versions'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;
commit;

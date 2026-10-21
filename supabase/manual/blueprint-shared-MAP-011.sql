-- BLUEPRINT MAP-011 — SQL MURNI UNTUK SQL EDITOR SUPABASE
-- Project: qjmwxezxtsuikywqoajj
-- Dapat dijalankan ulang pada fondasi Blueprint yang sudah ada.
-- Menyiapkan profil, cover/pin/Trash dan guard client review.
-- Tidak menghapus workspace, dokumen, history, gambar atau profil tambahan.
-- Design UI gambar penuh memakai payload proyek yang sama; tidak perlu tabel per halaman.

-- MAP-010: shared editor labels and recoverable project administration.
begin;
-- Requires this project's workspace/document/review foundation (MAP-005+).
do $$begin if to_regclass('public.bp_documents') is null or to_regclass('public.bp_review_links') is null or to_regprocedure('public.bp_is_member(uuid)') is null then raise exception 'Fondasi Blueprint belum ada. Gunakan project Supabase qjmwxezxtsuikywqoajj yang sudah dipakai aplikasi.';end if;end;$$;
create schema if not exists blueprint_private;
revoke all on schema blueprint_private from public,anon;
grant usage on schema blueprint_private to authenticated;
create table if not exists public.bp_editor_profiles(workspace_id uuid not null references public.bp_workspaces(id),id text not null,name text not null check(length(trim(name)) between 1 and 60),base boolean not null default false,deleted_at timestamptz,primary key(workspace_id,id),check(id in ('nando','hadist','ryan') or id ~ '^p_[0-9a-f-]{36}$'));
create unique index if not exists bp_editor_profiles_active_name on public.bp_editor_profiles(workspace_id,lower(trim(name))) where deleted_at is null;
create table if not exists public.bp_document_settings(workspace_id uuid not null,project_id text not null,cover_asset_id text,pinned boolean not null default false,shortcut boolean not null default true,trashed_at timestamptz,primary key(workspace_id,project_id),foreign key(workspace_id,project_id) references public.bp_documents(workspace_id,project_id));
alter table public.bp_editor_profiles enable row level security;
alter table public.bp_document_settings enable row level security;
revoke all on public.bp_editor_profiles,public.bp_document_settings from public,anon,authenticated;
grant select on public.bp_editor_profiles,public.bp_document_settings to authenticated;
drop policy if exists bp_editor_profiles_read on public.bp_editor_profiles;
create policy bp_editor_profiles_read on public.bp_editor_profiles for select to authenticated using(public.bp_is_member(workspace_id));
drop policy if exists bp_document_settings_read on public.bp_document_settings;
create policy bp_document_settings_read on public.bp_document_settings for select to authenticated using(public.bp_is_member(workspace_id));
insert into public.bp_editor_profiles(workspace_id,id,name,base) select w.id,p.id,p.name,true from public.bp_workspaces w cross join (values('nando','Nando'),('hadist','Hadist'),('ryan','Ryan')) p(id,name) on conflict(workspace_id,id) do nothing;
create or replace function blueprint_private.init_profiles() returns trigger language plpgsql set search_path='' as $$begin insert into public.bp_editor_profiles(workspace_id,id,name,base) values(new.id,'nando','Nando',true),(new.id,'hadist','Hadist',true),(new.id,'ryan','Ryan',true);return new;end;$$;
revoke all on function blueprint_private.init_profiles() from public,anon,authenticated;
drop trigger if exists bp_workspace_profiles on public.bp_workspaces;
create trigger bp_workspace_profiles after insert on public.bp_workspaces for each row execute function blueprint_private.init_profiles();
-- Preserve historical authors, including profiles subsequently archived.
alter table public.bp_document_versions drop constraint if exists bp_document_versions_profile_check;
alter table public.bp_document_versions add constraint bp_document_versions_profile_check check(profile in ('nando','hadist','ryan') or profile ~ '^p_[0-9a-f-]{36}$');
create or replace function public.bp_workspace_catalog(p_workspace_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$begin if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;return jsonb_build_object('profiles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'base',base,'deletedAt',deleted_at) order by base desc,name) from public.bp_editor_profiles where workspace_id=p_workspace_id),'[]'::jsonb),'projects',coalesce((select jsonb_agg(jsonb_build_object('id',project_id,'coverAssetId',cover_asset_id,'pinned',pinned,'shortcut',shortcut,'trashedAt',trashed_at)) from public.bp_document_settings where workspace_id=p_workspace_id),'[]'::jsonb));end;$$;
create or replace function blueprint_private.editor_profile(p_workspace_id uuid,p_action text,p_id text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$declare r public.bp_editor_profiles%rowtype;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 if p_action is null or p_action not in ('create','trash','restore') then raise exception 'Aksi profil tidak valid';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,10));
 if p_action='create' then if p_name is null or length(trim(p_name)) not between 1 and 60 then raise exception 'Nama profil 1–60 karakter';end if;insert into public.bp_editor_profiles(workspace_id,id,name) values(p_workspace_id,'p_'||gen_random_uuid()::text,trim(p_name)) returning * into r;
 else select * into r from public.bp_editor_profiles where workspace_id=p_workspace_id and id=p_id for update;if not found then raise exception 'Profil tidak ditemukan';end if;if r.base then raise exception 'Profil dasar tidak dapat dihapus';end if;update public.bp_editor_profiles set deleted_at=case when p_action='trash' then coalesce(deleted_at,now()) else null end where workspace_id=p_workspace_id and id=p_id returning * into r;end if;
 return jsonb_build_object('id',r.id,'name',r.name,'base',r.base,'deletedAt',r.deleted_at);
end;$$;
create or replace function public.bp_editor_profile(p_workspace_id uuid,p_action text,p_id text default null,p_name text default null) returns jsonb language sql security invoker set search_path='' as $$select blueprint_private.editor_profile(p_workspace_id,p_action,p_id,p_name);$$;
create or replace function blueprint_private.manage_documents(p_workspace_id uuid,p_action text,p_ids text[],p_value text,p_passcode text,p_profile text) returns void language plpgsql security definer set search_path='' as $$declare target_id text;d public.bp_documents%rowtype;begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak';end if;
 if not exists(select 1 from public.bp_editor_profiles where workspace_id=p_workspace_id and public.bp_editor_profiles.id=p_profile and deleted_at is null) then raise exception 'Profil tidak aktif';end if;
 if p_action is null or p_action not in ('rename','trash','restore','cover','pin','unpin','shortcut','hideShortcut') or cardinality(p_ids) is null or cardinality(p_ids) not between 1 and 100 then raise exception 'Pilih 1–100 proyek';end if;
 if p_action='trash' and p_passcode is distinct from 'systemdelete' then raise exception 'Passcode tidak sesuai';end if;
 if p_action in ('rename','cover') and cardinality(p_ids)<>1 then raise exception 'Pilih satu proyek';end if;
 if p_action='rename' and (p_value is null or length(trim(p_value)) not between 1 and 100) then raise exception 'Nama proyek 1–100 karakter';end if;
 for target_id in select distinct unnest(p_ids) order by 1 loop
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||target_id,3));select * into d from public.bp_documents where workspace_id=p_workspace_id and project_id=target_id for update;if not found then raise exception 'Proyek tidak ditemukan atau akses ditolak';end if;
  if p_action not in ('restore','trash') and exists(select 1 from public.bp_document_settings s where s.workspace_id=p_workspace_id and s.project_id=target_id and s.trashed_at is not null) then raise exception 'Pulihkan proyek dari Trash dahulu';end if;
  insert into public.bp_document_settings(workspace_id,project_id) values(p_workspace_id,target_id) on conflict do nothing;
  if p_action='rename' then perform public.bp_write_document(p_workspace_id,target_id,d.token,d.payload||jsonb_build_object('title',trim(p_value),'updatedAt',now()),p_profile,null);
  elsif p_action='trash' then update public.bp_document_settings set trashed_at=coalesce(trashed_at,now()) where workspace_id=p_workspace_id and project_id=target_id;update public.bp_review_links set revoked_at=coalesce(revoked_at,now()) where workspace_id=p_workspace_id and project_id=target_id;
  elsif p_action='restore' then update public.bp_document_settings set trashed_at=null where workspace_id=p_workspace_id and project_id=target_id;
  elsif p_action='cover' then if p_value is not null and not exists(select 1 from jsonb_array_elements(d.payload->'assets') a where a->>'id'=p_value and nullif(a->>'deletedAt','') is null) then raise exception 'Gambar cover tidak ditemukan';end if;update public.bp_document_settings set cover_asset_id=p_value where workspace_id=p_workspace_id and project_id=target_id;
  elsif p_action in ('pin','unpin') then update public.bp_document_settings set pinned=(p_action='pin') where workspace_id=p_workspace_id and project_id=target_id;
  else update public.bp_document_settings set shortcut=(p_action='shortcut') where workspace_id=p_workspace_id and project_id=target_id;end if;
 end loop;
end;$$;
create or replace function public.bp_manage_documents(p_workspace_id uuid,p_action text,p_ids text[],p_value text default null,p_passcode text default null,p_profile text default 'nando') returns void language sql security invoker set search_path='' as $$select blueprint_private.manage_documents(p_workspace_id,p_action,p_ids,p_value,p_passcode,p_profile);$$;
revoke all on function blueprint_private.editor_profile(uuid,text,text,text),blueprint_private.manage_documents(uuid,text,text[],text,text,text),public.bp_editor_profile(uuid,text,text,text),public.bp_manage_documents(uuid,text,text[],text,text,text),public.bp_workspace_catalog(uuid) from public,anon;
grant execute on function blueprint_private.editor_profile(uuid,text,text,text),blueprint_private.manage_documents(uuid,text,text[],text,text,text),public.bp_editor_profile(uuid,text,text,text),public.bp_manage_documents(uuid,text,text[],text,text,text),public.bp_workspace_catalog(uuid) to authenticated;
-- Replace only validation/soft-trash guards, retaining the existing writer and merge semantics.
create or replace function public.bp_write_document(p_workspace_id uuid,p_project_id text,p_expected_token uuid,p_payload jsonb,p_profile text,p_label text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_token uuid; new_token uuid:=gen_random_uuid(); version_id uuid; a jsonb;
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak'; end if;
 if p_project_id is null or length(p_project_id) not between 1 and 100 or p_payload->>'id' is distinct from p_project_id then raise exception 'ID sistem tidak valid'; end if;
 if p_profile is null or not exists(select 1 from public.bp_editor_profiles where workspace_id=p_workspace_id and id=p_profile and deleted_at is null) then raise exception 'Profil tidak valid'; end if;
  if p_payload is null or octet_length(p_payload::text)>2000000 or p_payload->>'schemaVersion' is distinct from '1'
    or jsonb_typeof(p_payload->'nodes') is distinct from 'array' or jsonb_typeof(p_payload->'edges') is distinct from 'array'
    or jsonb_typeof(p_payload->'assets') is distinct from 'array' or jsonb_typeof(p_payload->'presentation') is distinct from 'array' then raise exception 'Snapshot proyek tidak valid'; end if;
  if jsonb_array_length(p_payload->'nodes') not between 1 and 80 or jsonb_array_length(p_payload->'edges')>240 or jsonb_array_length(p_payload->'assets')>120 then raise exception 'Ukuran proyek melampaui batas'; end if;
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
 if exists(select 1 from public.bp_document_settings where workspace_id=p_workspace_id and project_id=p_project_id and trashed_at is not null) then raise exception 'Proyek berada di Trash. Pulihkan dahulu.';end if;
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

-- New catalog tables participate in the existing publication.
do $$declare t text;begin foreach t in array array['bp_editor_profiles','bp_document_settings'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end;$$;

-- MAP-010: serialize review sharing with project Trash.
create or replace function blueprint_private.review_link(p_workspace_id uuid,p_project_id text,p_action text default 'get') returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.bp_review_links%rowtype;
begin
 if auth.uid() is null or not public.bp_is_member(p_workspace_id) then raise exception 'Akses editor ditolak'; end if;
 if p_action not in ('get','create','rotate','revoke') or p_action is null then raise exception 'Aksi tidak valid'; end if;
 if not exists(select 1 from public.bp_documents where workspace_id=p_workspace_id and project_id=p_project_id) then raise exception 'Proyek tidak ditemukan'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||'/'||p_project_id,3));
 if exists(select 1 from public.bp_document_settings where workspace_id=p_workspace_id and project_id=p_project_id and trashed_at is not null) then
  if p_action in ('create','rotate') then raise exception 'Proyek berada di Trash. Pulihkan dahulu.';end if;
  if p_action='get' then return null;end if;
 end if;
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
create or replace function public.bp_review_link(p_workspace_id uuid,p_project_id text,p_action text default 'get') returns jsonb language sql security invoker set search_path='' as $$select blueprint_private.review_link(p_workspace_id,p_project_id,p_action);$$;
revoke all on function blueprint_private.review_link(uuid,text,text) from public,anon;
grant execute on function blueprint_private.review_link(uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;

select 'Blueprint shared SQL siap' as status;

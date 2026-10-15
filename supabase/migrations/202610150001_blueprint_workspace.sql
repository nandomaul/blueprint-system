-- Blueprint MAP-002. Jalankan sekali melalui Supabase SQL Editor sebagai postgres.
-- Prefix bp_ khusus workspace perancangan; tidak mengubah tabel sistem HR.
-- Seluruh migration atomik. Jika nama/bucket sudah ada: berhenti, periksa dulu.
begin;
create table public.bp_workspaces (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.bp_members (
  workspace_id uuid not null references public.bp_workspaces(id), user_id uuid not null references auth.users(id),
  role text not null check(role in ('owner','editor')), primary key(workspace_id,user_id)
);
create table public.bp_invites (
  workspace_id uuid primary key references public.bp_workspaces(id), code uuid not null unique default gen_random_uuid()
);
create table public.bp_projects (
  workspace_id uuid primary key references public.bp_workspaces(id), token uuid not null,
  payload jsonb not null, updated_at timestamptz not null default now(), updated_by uuid not null references auth.users(id)
);
create table public.bp_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.bp_workspaces(id),
  label text not null check(length(trim(label)) between 1 and 100), snapshot jsonb not null,
  saved_at timestamptz not null default now(), created_by uuid not null references auth.users(id),
  profile text not null check(profile in ('nando','hadist','ryan')), deleted_at timestamptz
);
create index bp_versions_workspace_time on public.bp_versions(workspace_id,saved_at desc);
create table public.bp_assets (
  workspace_id uuid not null references public.bp_workspaces(id), asset_id text not null check(length(asset_id) between 1 and 100),
  storage_path text not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  primary key(workspace_id,asset_id)
);
create function public.bp_is_member(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.bp_members where workspace_id=p_workspace_id and user_id=auth.uid());
$$;
create function public.bp_can_access_path(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.bp_members where workspace_id::text=split_part(p_path,'/',1) and user_id=auth.uid());
$$;
alter table public.bp_workspaces enable row level security;
alter table public.bp_members enable row level security;
alter table public.bp_invites enable row level security;
alter table public.bp_projects enable row level security;
alter table public.bp_versions enable row level security;
alter table public.bp_assets enable row level security;
create policy bp_workspaces_read on public.bp_workspaces for select to authenticated using(public.bp_is_member(id));
create policy bp_members_read on public.bp_members for select to authenticated using(public.bp_is_member(workspace_id));
create policy bp_projects_read on public.bp_projects for select to authenticated using(public.bp_is_member(workspace_id));
create policy bp_versions_read on public.bp_versions for select to authenticated using(public.bp_is_member(workspace_id));
create policy bp_assets_read on public.bp_assets for select to authenticated using(public.bp_is_member(workspace_id));
revoke all on public.bp_workspaces,public.bp_members,public.bp_invites,public.bp_projects,public.bp_versions,public.bp_assets from anon,authenticated;
grant select on public.bp_workspaces,public.bp_members,public.bp_projects,public.bp_versions,public.bp_assets to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('blueprint-designs','blueprint-designs',false,4194304,array['image/png','image/jpeg','image/webp']);
create policy bp_images_read on storage.objects for select to authenticated
using(bucket_id='blueprint-designs' and public.bp_can_access_path(name));
create policy bp_images_insert on storage.objects for insert to authenticated
with check(bucket_id='blueprint-designs' and public.bp_can_access_path(name)
  and name ~ '^[a-f0-9-]{36}/[a-f0-9]{64}\.(png|jpg|webp)$');
-- Tidak ada UPDATE/DELETE Storage: gambar lama tidak tertimpa oleh upload/Trash.
create function public.bp_create_workspace(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w uuid; c uuid;
begin
  if auth.uid() is null then raise exception 'Sesi belum tersedia'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
  select id into w from public.bp_workspaces where created_by=auth.uid();
  if w is not null then
    select code into c from public.bp_invites where workspace_id=w;
    return jsonb_build_object('workspaceId',w,'inviteCode',c);
  end if;
  insert into public.bp_workspaces(name,created_by) values(trim(p_name),auth.uid()) returning id into w;
  insert into public.bp_members values(w,auth.uid(),'owner');
  insert into public.bp_invites(workspace_id) values(w) returning code into c;
  return jsonb_build_object('workspaceId',w,'inviteCode',c);
end; $$;
create function public.bp_join_workspace(p_code uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  if auth.uid() is null then raise exception 'Sesi belum tersedia'; end if;
  select workspace_id into w from public.bp_invites where code=p_code;
  if w is null then raise exception 'Kode undangan tidak valid'; end if;
  insert into public.bp_members values(w,auth.uid(),'editor') on conflict do nothing;
  return w;
end; $$;
create function public.bp_invite_code(p_workspace_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.bp_members where workspace_id=p_workspace_id and user_id=auth.uid() and role='owner') then raise exception 'Hanya pembuat workspace yang dapat melihat undangan'; end if;
  return (select code from public.bp_invites where workspace_id=p_workspace_id);
end; $$;
create function public.bp_register_asset(p_workspace_id uuid,p_asset_id text,p_path text,p_sha256 text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' or p_path !~ ('^'||p_workspace_id::text||'/'||p_sha256||'\.(png|jpg|webp)$') then raise exception 'Path gambar tidak valid'; end if;
  if not exists(select 1 from storage.objects where bucket_id='blueprint-designs' and name=p_path) then raise exception 'Upload gambar belum selesai'; end if;
  insert into public.bp_assets values(p_workspace_id,p_asset_id,p_path,p_sha256) on conflict do nothing;
  if not exists(select 1 from public.bp_assets where workspace_id=p_workspace_id and asset_id=p_asset_id and storage_path=p_path and sha256=p_sha256) then raise exception 'ID gambar sudah digunakan. Buat versi baru.'; end if;
end; $$;
create function public.bp_save_project(p_workspace_id uuid,p_expected_token uuid,p_payload jsonb,p_label text,p_profile text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare old_token uuid; new_token uuid := gen_random_uuid(); v public.bp_versions; a jsonb;
begin
  if not public.bp_is_member(p_workspace_id) then raise exception 'Akses workspace ditolak'; end if;
  if p_profile is null or p_profile not in ('nando','hadist','ryan') then raise exception 'Profil tidak valid'; end if;
  if p_payload is null or octet_length(p_payload::text)>500000 or p_payload->>'schemaVersion' is distinct from '1'
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
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,0));
  select token into old_token from public.bp_projects where workspace_id=p_workspace_id for update;
  if old_token is distinct from p_expected_token then raise exception 'Proyek berubah di tab atau anggota lain. Ekspor perubahan, lalu muat ulang.' using errcode='40001'; end if;
  insert into public.bp_projects values(p_workspace_id,new_token,p_payload,now(),auth.uid())
    on conflict(workspace_id) do update set token=excluded.token,payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  insert into public.bp_versions(workspace_id,label,snapshot,created_by,profile) values(p_workspace_id,trim(p_label),p_payload,auth.uid(),p_profile) returning * into v;
  return jsonb_build_object('token',new_token,'id',v.id,'label',v.label,'savedAt',v.saved_at,'profile',v.profile);
end; $$;
create function public.bp_rename_version(p_id uuid,p_label text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bp_versions set label=trim(p_label) where id=p_id and public.bp_is_member(workspace_id);
  if not found then raise exception 'Versi tidak ditemukan atau akses ditolak'; end if;
end; $$;
create function public.bp_trash_version(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bp_versions set deleted_at=coalesce(deleted_at,now()) where id=p_id and public.bp_is_member(workspace_id);
  if not found then raise exception 'Versi tidak ditemukan atau akses ditolak'; end if;
end; $$;
create function public.bp_untrash_version(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bp_versions set deleted_at=null where id=p_id and public.bp_is_member(workspace_id);
  if not found then raise exception 'Versi tidak ditemukan atau akses ditolak'; end if;
end; $$;
create function public.bp_restore_version(p_id uuid,p_expected_token uuid,p_profile text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.bp_versions;
begin
  select * into v from public.bp_versions where id=p_id and public.bp_is_member(workspace_id) for update;
  if not found then raise exception 'Versi tidak ditemukan atau akses ditolak'; end if;
  if v.deleted_at is not null then raise exception 'Pulihkan versi dari Trash terlebih dahulu'; end if;
  return public.bp_save_project(v.workspace_id,p_expected_token,v.snapshot,left('Restore — '||v.label,100),p_profile);
end; $$;
revoke all on function public.bp_is_member(uuid), public.bp_can_access_path(text), public.bp_create_workspace(text), public.bp_join_workspace(uuid), public.bp_invite_code(uuid), public.bp_register_asset(uuid,text,text,text), public.bp_save_project(uuid,uuid,jsonb,text,text), public.bp_rename_version(uuid,text), public.bp_trash_version(uuid), public.bp_untrash_version(uuid), public.bp_restore_version(uuid,uuid,text) from public,anon;
grant execute on function public.bp_is_member(uuid), public.bp_can_access_path(text), public.bp_create_workspace(text), public.bp_join_workspace(uuid), public.bp_invite_code(uuid), public.bp_register_asset(uuid,text,text,text), public.bp_save_project(uuid,uuid,jsonb,text,text), public.bp_rename_version(uuid,text), public.bp_trash_version(uuid), public.bp_untrash_version(uuid), public.bp_restore_version(uuid,uuid,text) to authenticated;
commit;

-- MAP-017: additive rich chat; immutable private images, replies, sender-only deletion,
-- shared reminders and per-account reminder receipts. No workspace/project reset.
begin;
do $$begin if to_regclass('public.bp_accounts') is null or to_regclass('public.bp_chat_messages') is null then raise exception 'SQL MAP-015 dan chat MAP-012 diperlukan';end if;end$$;
alter table public.bp_chat_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.bp_chat_messages add column if not exists reply_to bigint references public.bp_chat_messages(id);
alter table public.bp_chat_messages add column if not exists deleted_at timestamptz;
alter table public.bp_chat_messages add column if not exists request_hash text;
alter table public.bp_chat_messages add column if not exists reminder_version bigint not null default 0;
alter table public.bp_chat_messages add column if not exists reminder_at timestamptz;
alter table public.bp_chat_messages add column if not exists reminder_by uuid references auth.users(id);
alter table public.bp_chat_messages add column if not exists reminder_profile text;
create index if not exists bp_chat_reply_fk on public.bp_chat_messages(reply_to);
create index if not exists bp_chat_reminder_by_fk on public.bp_chat_messages(reminder_by);
create index if not exists bp_chat_active_reminders on public.bp_chat_messages(workspace_id,reminder_version desc) where reminder_at is not null and deleted_at is null;
create sequence if not exists blueprint_private.chat_reminder_version;
revoke all on sequence blueprint_private.chat_reminder_version from public,anon,authenticated;
create table if not exists public.bp_chat_reminder_reads(workspace_id uuid not null references public.bp_workspaces(id),user_id uuid not null references auth.users(id),message_id bigint not null references public.bp_chat_messages(id),version bigint not null,primary key(workspace_id,user_id,message_id));
create index if not exists bp_chat_reminder_reads_user_fk on public.bp_chat_reminder_reads(user_id);
create index if not exists bp_chat_reminder_reads_message_fk on public.bp_chat_reminder_reads(message_id);
alter table public.bp_chat_reminder_reads enable row level security;
revoke all on public.bp_chat_reminder_reads from public,anon,authenticated;
grant select on public.bp_chat_reminder_reads to authenticated;
drop policy if exists bp_chat_reminder_own_read on public.bp_chat_reminder_reads;
create policy bp_chat_reminder_own_read on public.bp_chat_reminder_reads for select to authenticated using(user_id=(select auth.uid()) and public.bp_is_member(workspace_id));
create or replace function blueprint_private.chat_actor(w uuid,p text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.bp_is_member(w) then raise exception 'Akses workspace ditolak';end if;
 if not exists(select 1 from public.bp_editor_profiles where workspace_id=w and id=p and deleted_at is null) then raise exception 'Profil tidak aktif';end if;
 if exists(select 1 from public.bp_accounts where workspace_id=w) and not exists(select 1 from public.bp_accounts where workspace_id=w and user_id=auth.uid() and profile_id=p) then raise exception 'Profil tidak sesuai akun login';end if;
end$$;
create or replace function blueprint_private.chat_row(m public.bp_chat_messages) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',m.id::text,'clientId',m.client_id,'profileId',m.profile_id,'authorName',m.author_name,'body',case when m.deleted_at is null then m.body else '' end,'kind',m.kind,'context',m.context,'mentions',m.mentions,'createdAt',m.created_at,'attachments',case when m.deleted_at is null then m.attachments else '[]'::jsonb end,'replyTo',m.reply_to::text,'reply',case when m.reply_to is null then null else (select jsonb_build_object('id',r.id::text,'authorName',r.author_name,'body',case when r.deleted_at is null then r.body else '' end,'deleted',r.deleted_at is not null) from public.bp_chat_messages r where r.id=m.reply_to and r.workspace_id=m.workspace_id) end,'deletedAt',m.deleted_at,'canDelete',m.created_by=auth.uid() and m.deleted_at is null,'reminder',case when m.reminder_at is null or m.deleted_at is not null then null else jsonb_build_object('version',m.reminder_version::text,'at',m.reminder_at,'profileId',m.reminder_profile,'authorName',(select name from public.bp_editor_profiles where workspace_id=m.workspace_id and id=m.reminder_profile)) end,'reminderUnread',m.reminder_at is not null and m.deleted_at is null and m.reminder_by<>auth.uid() and not exists(select 1 from public.bp_chat_reminder_reads r where r.workspace_id=m.workspace_id and r.user_id=auth.uid() and r.message_id=m.id and r.version=m.reminder_version));
$$;
create or replace function blueprint_private.chat_send_v17(p_workspace_id uuid,p_profile text,p_client_id uuid,p_body text,p_kind text,p_context jsonb,p_mentions jsonb,p_attachments jsonb,p_reply_to bigint) returns text language plpgsql security definer set search_path='' as $$
declare r public.bp_chat_messages%rowtype;a jsonb;h text;message_id bigint;begin
 perform blueprint_private.chat_actor(p_workspace_id,p_profile);
 if p_body is null or length(trim(p_body))>4000 or p_attachments is null or jsonb_typeof(p_attachments)<>'array' or jsonb_array_length(p_attachments)>3 or (trim(p_body)='' and jsonb_array_length(p_attachments)=0) then raise exception 'Pesan/gambar tidak valid';end if;
 for a in select value from jsonb_array_elements(p_attachments) loop
  if jsonb_typeof(a)<>'object' or (a-array['id','storagePath','sha256','name','mime','size'])<>'{}'::jsonb or length(coalesce(a->>'name','')) not between 1 and 180 or coalesce(a->>'mime','') not in ('image/png','image/jpeg','image/webp') or coalesce(a->>'size','')!~'^[0-9]{1,8}$' or (a->>'size')::int not between 1 and 4194304 or not exists(select 1 from public.bp_assets where workspace_id=p_workspace_id and asset_id=a->>'id' and storage_path=a->>'storagePath' and sha256=a->>'sha256') then raise exception 'Referensi gambar chat tidak valid/belum diupload';end if;
 end loop;
 if p_reply_to is not null and not exists(select 1 from public.bp_chat_messages where workspace_id=p_workspace_id and id=p_reply_to) then raise exception 'Pesan balasan tidak ditemukan';end if;
 h=encode(sha256(convert_to(jsonb_build_object('body',trim(p_body),'kind',p_kind,'context',p_context,'mentions',p_mentions,'attachments',p_attachments,'reply',p_reply_to)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,20));
 select * into r from public.bp_chat_messages where workspace_id=p_workspace_id and client_id=p_client_id;
 if found and r.request_hash is not null then if r.created_by<>auth.uid() or r.profile_id<>p_profile or r.request_hash<>h then raise exception 'ID pesan sudah dipakai';end if;return r.id::text;end if;
 message_id=blueprint_private.chat_send(p_workspace_id,p_profile,p_client_id,case when trim(p_body)='' then '[image]' else p_body end,p_kind,p_context,p_mentions)::bigint;
 -- Keep legacy nonempty-body invariant. UI suppresses the image-only sentinel.
 update public.bp_chat_messages set attachments=p_attachments,reply_to=p_reply_to,request_hash=h where id=message_id;
 return message_id::text;
end$$;
create or replace function public.bp_chat_send_v17(p_workspace_id uuid,p_profile text,p_client_id uuid,p_body text,p_kind text,p_context jsonb,p_mentions jsonb,p_attachments jsonb default '[]'::jsonb,p_reply_to bigint default null) returns text language sql security invoker set search_path='' as $$select blueprint_private.chat_send_v17(p_workspace_id,p_profile,p_client_id,p_body,p_kind,p_context,p_mentions,p_attachments,p_reply_to)$$;
create or replace function blueprint_private.chat_action_v17(p_workspace_id uuid,p_profile text,p_action text,p_message_id bigint,p_ids jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.bp_chat_messages%rowtype;begin
 perform blueprint_private.chat_actor(p_workspace_id,p_profile);perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text,20));
 if p_action='readReminders' then
  if p_ids is null or jsonb_typeof(p_ids)<>'array' or jsonb_array_length(p_ids)>200 or exists(select 1 from jsonb_array_elements(p_ids) i where jsonb_typeof(i)<>'string' or (i#>>'{}')!~'^[0-9]{1,19}$') then raise exception 'Daftar reminder tidak valid';end if;
  insert into public.bp_chat_reminder_reads(workspace_id,user_id,message_id,version) select p_workspace_id,auth.uid(),id,reminder_version from public.bp_chat_messages where workspace_id=p_workspace_id and reminder_at is not null and deleted_at is null and p_ids ? id::text on conflict(workspace_id,user_id,message_id) do update set version=excluded.version;
  return null;
 end if;
 select * into m from public.bp_chat_messages where workspace_id=p_workspace_id and id=p_message_id for update;if not found then raise exception 'Pesan tidak ditemukan';end if;
 if p_action='delete' then
  if m.created_by<>auth.uid() then raise exception 'Hanya pengirim dapat menghapus pesan';end if;
  update public.bp_chat_messages set deleted_at=coalesce(deleted_at,now()),body='Pesan dihapus',attachments='[]',reminder_at=null,reminder_by=null,reminder_profile=null where id=m.id returning * into m;
 elsif p_action in ('remind','unremind') then
  if m.deleted_at is not null then raise exception 'Pesan sudah dihapus';end if;
  if p_action='remind' and m.reminder_at is null then update public.bp_chat_messages set reminder_version=nextval('blueprint_private.chat_reminder_version'),reminder_at=now(),reminder_by=auth.uid(),reminder_profile=p_profile where id=m.id returning * into m;
  elsif p_action='unremind' then update public.bp_chat_messages set reminder_at=null,reminder_by=null,reminder_profile=null where id=m.id returning * into m;end if;
 else raise exception 'Aksi chat tidak dikenal';end if;
 return blueprint_private.chat_row(m);
end$$;
create or replace function public.bp_chat_action_v17(p_workspace_id uuid,p_profile text,p_action text,p_message_id bigint default null,p_ids jsonb default '[]'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select blueprint_private.chat_action_v17(p_workspace_id,p_profile,p_action,p_message_id,p_ids)$$;
create or replace function public.bp_chat_page_v17(p_workspace_id uuid,p_profile text,p_before bigint default null,p_mode text default 'chat') returns jsonb language plpgsql security invoker set search_path='' as $$
declare cursor_id bigint;items jsonb;reminders jsonb;reminder_before bigint;begin
 perform blueprint_private.chat_actor(p_workspace_id,p_profile);if p_mode not in ('chat','reminders') or p_mode is null then raise exception 'Mode chat tidak valid';end if;
 select coalesce((select last_id from public.bp_chat_reads where workspace_id=p_workspace_id and user_id=auth.uid() and profile_id=p_profile),0) into cursor_id;
 select coalesce(jsonb_agg(blueprint_private.chat_row(m) order by m.id),'[]'::jsonb) into items from (select * from public.bp_chat_messages where workspace_id=p_workspace_id and (p_mode='reminders' or p_before is null or id<p_before) order by id desc limit 50) m;
 reminder_before=case when p_mode='reminders' then p_before else null end;
 select coalesce(jsonb_agg(blueprint_private.chat_row(m) order by m.reminder_version desc),'[]'::jsonb) into reminders from (select * from public.bp_chat_messages where workspace_id=p_workspace_id and reminder_at is not null and deleted_at is null and (reminder_before is null or reminder_version<reminder_before) order by reminder_version desc limit 50) m;
 return jsonb_build_object('messages',items,'lastRead',cursor_id::text,'unread',(select count(*) from public.bp_chat_messages where workspace_id=p_workspace_id and id>cursor_id and profile_id<>p_profile and deleted_at is null),'hasMore',case when jsonb_array_length(items)=0 then false else exists(select 1 from public.bp_chat_messages where workspace_id=p_workspace_id and id<(items->0->>'id')::bigint) end,'reminders',reminders,'unreadReminders',(select count(*) from public.bp_chat_messages m where m.workspace_id=p_workspace_id and m.reminder_at is not null and m.deleted_at is null and m.reminder_by<>auth.uid() and not exists(select 1 from public.bp_chat_reminder_reads r where r.workspace_id=p_workspace_id and r.user_id=auth.uid() and r.message_id=m.id and r.version=m.reminder_version)),'hasMoreReminders',case when jsonb_array_length(reminders)=0 then false else exists(select 1 from public.bp_chat_messages where workspace_id=p_workspace_id and reminder_at is not null and deleted_at is null and reminder_version<(reminders->(jsonb_array_length(reminders)-1)->'reminder'->>'version')::bigint) end);
end$$;
-- Preserve legacy send/read behavior but bind editor profiles to provisioned login accounts.
create or replace function public.bp_chat_send(p_workspace_id uuid,p_profile text,p_client_id uuid,p_body text,p_kind text,p_context jsonb,p_mentions jsonb) returns text language sql security invoker set search_path='' as $$select blueprint_private.chat_actor(p_workspace_id,p_profile);select blueprint_private.chat_send(p_workspace_id,p_profile,p_client_id,p_body,p_kind,p_context,p_mentions)$$;
create or replace function public.bp_chat_read(p_workspace_id uuid,p_profile text,p_last_id bigint) returns text language sql security invoker set search_path='' as $$select blueprint_private.chat_actor(p_workspace_id,p_profile);select blueprint_private.chat_read(p_workspace_id,p_profile,p_last_id)$$;
revoke all on function blueprint_private.chat_actor(uuid,text),blueprint_private.chat_row(public.bp_chat_messages),blueprint_private.chat_send_v17(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,bigint),blueprint_private.chat_action_v17(uuid,text,text,bigint,jsonb),public.bp_chat_send_v17(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,bigint),public.bp_chat_action_v17(uuid,text,text,bigint,jsonb),public.bp_chat_page_v17(uuid,text,bigint,text) from public,anon;
grant execute on function blueprint_private.chat_actor(uuid,text),blueprint_private.chat_row(public.bp_chat_messages),blueprint_private.chat_send_v17(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,bigint),blueprint_private.chat_action_v17(uuid,text,text,bigint,jsonb),public.bp_chat_send_v17(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,bigint),public.bp_chat_action_v17(uuid,text,text,bigint,jsonb),public.bp_chat_page_v17(uuid,text,bigint,text) to authenticated;
notify pgrst,'reload schema';
commit;

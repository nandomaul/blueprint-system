-- MAP-020: pemeriksaan struktur saja. Tempel seluruh file di Supabase > SQL Editor > New query > Run.
-- Hanya SELECT metadata. Tidak mengubah schema, akun, izin, proyek, chat, atau gambar.
-- OK = struktur ditemukan; MISSING/WARN = kirim hasil untuk ditinjau, jangan reset database.
-- Ini bukan migrasi dan bukan bukti sinkronisasi antarperangkat/isi data lengkap.
with expected_tables(name) as (values
 ('bp_workspaces'),('bp_members'),('bp_invites'),('bp_projects'),('bp_versions'),('bp_assets'),('bp_documents'),('bp_document_versions'),
 ('bp_editor_profiles'),('bp_document_settings'),('bp_accounts'),('bp_chat_messages'),
 ('bp_chat_reads'),('bp_chat_reminder_reads'),('bp_review_links'),('bp_review_visitors')
), expected_rpc(signature) as (values
 ('public.bp_register_asset(uuid,text,text,text)'),
 ('public.bp_write_document(uuid,text,uuid,jsonb,text,text)'),
 ('public.bp_merge_document(uuid,text,uuid,jsonb,jsonb,text,text)'),
 ('public.bp_edit_document_version(uuid,uuid,text,text)'),
 ('public.bp_workspace_catalog_v12(uuid)'),('public.bp_editor_profile(uuid,text,text,text)'),
 ('public.bp_update_editor_profile(uuid,text,text,text)'),
 ('public.bp_manage_documents(uuid,text,text[],text,text,text)'),
 ('public.bp_chat_page_v17(uuid,text,bigint,text)'),
 ('public.bp_chat_send_v17(uuid,text,uuid,text,text,jsonb,jsonb,jsonb,bigint)'),
 ('public.bp_chat_action_v17(uuid,text,text,bigint,jsonb)'),
 ('public.bp_chat_read(uuid,text,bigint)'),('public.bp_enter_shared_workspace()'),
 ('public.bp_review_link(uuid,text,text)'),('public.bp_join_review(uuid)'),('public.bp_read_review(uuid,uuid)')
), expected_chat_columns(name) as (values
 ('attachments'),('reply_to'),('deleted_at'),('request_hash'),('reminder_version'),
 ('reminder_at'),('reminder_by'),('reminder_profile')
), expected_realtime(name) as (values
 ('bp_documents'),('bp_document_versions'),('bp_editor_profiles'),('bp_document_settings'),('bp_chat_messages')
), routines as (select signature,to_regprocedure(signature)::oid oid from expected_rpc),
 checks as (
 select 'TABEL & RLS'::text bagian,e.name item,
  case when c.oid is null then 'MISSING' when not c.relrowsecurity then 'WARN' else 'OK' end status,
  case when c.oid is null then 'Tabel belum ada.' when not c.relrowsecurity then 'RLS tidak aktif.'
   when not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=e.name) then 'RLS aktif; periksa akses melalui RPC/policy.'
   else 'Tabel dan RLS ada; policy perlu diuji dengan akun sebenarnya.' end detail
 from expected_tables e left join pg_class c on c.oid=to_regclass('public.'||e.name)
 union all
 select 'RPC',signature,
  case when r.oid is null then 'MISSING'
   when not coalesce(has_function_privilege((select oid from pg_roles where rolname='authenticated'),r.oid,'EXECUTE'),false) then 'WARN'
   when coalesce(has_function_privilege((select oid from pg_roles where rolname='anon'),r.oid,'EXECUTE'),false) then 'WARN' else 'OK' end,
  case when r.oid is null then 'Fungsi/signature belum ada.'
   when not coalesce(has_function_privilege((select oid from pg_roles where rolname='authenticated'),r.oid,'EXECUTE'),false) then 'Role authenticated belum mendapat EXECUTE.'
   when coalesce(has_function_privilege((select oid from pg_roles where rolname='anon'),r.oid,'EXECUTE'),false) then 'Role anon dapat EXECUTE; tinjau grant.' else 'Signature dan grant dasar sesuai; isi fungsi tidak diaudit oleh query ini.' end
 from routines r
 union all
 select 'KOLOM CHAT MAP-017',e.name,
  case when a.attname is null then 'MISSING' else 'OK' end,
  case when a.attname is null then 'Kolom fitur chat belum ada.' else 'Ada.' end
 from expected_chat_columns e left join pg_attribute a on a.attrelid=to_regclass('public.bp_chat_messages') and a.attname=e.name and a.attnum>0 and not a.attisdropped
 union all
 select 'REALTIME',e.name,
  case when exists(select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.schemaname='public' and p.tablename=e.name) then 'OK' else 'WARN' end,
  'Periksa tabel terdaftar di publication supabase_realtime; koneksi dan izin tetap perlu diuji.'
 from expected_realtime e
 union all
 select 'STORAGE','blueprint-designs',
  case when not exists(select 1 from storage.buckets where id='blueprint-designs') then 'MISSING'
   when exists(select 1 from storage.buckets where id='blueprint-designs' and public) then 'WARN' else 'OK' end,
  'Bucket harus ada dan private. Query ini tidak membaca/menguji file atau policy Storage.'
 )
select bagian,item,status,detail from checks
order by case status when 'MISSING' then 0 when 'WARN' then 1 else 2 end,bagian,item;

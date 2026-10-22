-- MAP-021: pemeriksaan riwayat chat, hanya baca. Tidak reset/migrasi/hapus/ubah data.
-- Supabase > SQL Editor > New query > paste isi file ini > Run.
-- Bandingkan workspace_id dengan ID ruang di Settings pada localhost dan situs deploy.
-- Hasil hanya jumlah/tanggal/ID ruang; tidak mengeluarkan isi pesan atau password.
select w.id as workspace_id,w.name as ruang,
 count(m.id) as total_pesan,
 count(m.id) filter(where m.deleted_at is null) as pesan_aktif,
 count(m.id) filter(where m.deleted_at is not null) as penanda_pesan_dihapus,
 count(m.id) filter(where m.kind='note') as catatan,
 min(m.created_at) as pesan_pertama,max(m.created_at) as pesan_terakhir,
 coalesce(jsonb_agg(distinct m.profile_id) filter(where m.id is not null),'[]'::jsonb) as penanda_pengirim
from public.bp_workspaces w
left join public.bp_chat_messages m on m.workspace_id=w.id
group by w.id,w.name
order by max(m.created_at) desc nulls last,w.id;

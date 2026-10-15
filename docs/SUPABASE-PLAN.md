# Status MAP-002

Rencana di bawah adalah riwayat MAP-001. Adapter/migration kini tersedia; tenant pengguna belum tersambung. Gunakan **[MAP-002.md](MAP-002.md)** untuk schema `bp_*`, Auth anonymous, profil aktivitas N/H/R, undangan workspace, SQL Editor dan langkah verifikasi. Jangan membuat schema usulan di bawah ini lagi.

---

# Arah Supabase — usulan, belum terhubung

Supabase direkomendasikan untuk workspace perancangan bersama, bukan sebagai pengganti keputusan sumber data HR. Menyimpan hasil tidak otomatis mewajibkan Supabase. MAP-001 memiliki adapter IndexedDB dan ekspor/impor lokal; ini bisa dipakai untuk menilai UI lebih dahulu.

## Pembagian yang dituju

| Bagian | Tugas |
| --- | --- |
| Supabase Auth | Login anggota tim; identitas owner/editor/viewer |
| Supabase Database | Proyek, membership, node, koneksi, metadata gambar, checkpoint dan presentasi |
| Supabase Storage | Gambar raster serta referensi visual dalam private bucket |
| RLS | Membatasi record dan file berdasarkan keanggotaan proyek/peran; izin tidak hanya disembunyikan di UI |
| Feishu People | Target sumber master karyawan pada aplikasi HR |
| Lark Base/workflow | Target operasional/workflow HR |

Tabel usulan: `projects`, `project_members`, `flow_nodes`, `flow_edges`, `screen_assets`, `project_versions`. `flow_edges` harus menghubungkan node pada proyek yang sama. Checkpoint immutable menyimpan snapshot graf serta referensi versi file. Objek gambar memakai ID baru pada setiap upload agar versi lama tidak tertimpa.

Owner/editor dapat mengubah proyek sesuai membership. Viewer hanya membaca versi yang diizinkan. Preview publik, jika nanti diminta, menggunakan salinan presentasi yang telah dipilih; tidak membuka seluruh workspace/data HR.

Gambar disimpan pada private bucket. Pembacaan memakai akses terautentikasi atau signed URL terbatas waktu. Aturan database/storage, batas file dan MIME harus disiapkan sebelum upload cloud diaktifkan. Kunci rahasia tetap di server; jangan kirim service-role key ke frontend/chat.

## Yang diperlukan sebelum sambungan aktual

1. Project Supabase dan akses konfigurasi yang benar-benar tersedia.
2. Keputusan siapa saja owner/editor/viewer; sumber akun tim.
3. Baca schema/aturan yang sudah ada sebelum migration.
4. Migration tabel dan RLS serta private bucket; uji akses dua anggota dan pengguna di luar proyek.
5. Adapter cloud dengan optimistic concurrency, transaksi/operasi server untuk simpan checkpoint, penanganan upload gagal, dan impor data lokal secara eksplisit.
6. Uji lintas perangkat dan browser; data sudah muncul kembali sebelum UI menyatakan tersimpan cloud.

Realtime dapat dipertimbangkan sesudah simpan biasa dan konflik versi benar. Belum ada klaim kolaborasi realtime pada MAP-001.

Referensi resmi: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/storage/buckets/fundamentals .

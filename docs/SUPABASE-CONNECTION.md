# SUPA-001 — koneksi project Blueprint

Project ref: qjmwxezxtsuikywqoajj. API URL diverifikasi langsung: https://qjmwxezxtsuikywqoajj.supabase.co. Publishable key yang pengguna berikan berhasil digunakan untuk GET Auth settings (HTTP 200). Secret/service_role dan kode undangan tidak disimpan di source.

## Status pemeriksaan aktual

Pada 15 Oktober 2026: project ACTIVE_HEALTHY, PostgreSQL 17.11; keenam tabel bp_* sudah ada dengan RLS aktif; 11 RPC/helper, grants anggota, dan private bucket blueprint-designs sudah terpasang. Bucket membatasi file 4 MB, PNG/JPEG/WebP. SQL awal tidak dijalankan ulang dan schema/data pengguna tidak diganti.

Verifikasi langsung ke database: create workspace/retry, save bernama, token usang ditolak, rename menjaga snapshot, Trash/untrash, restore menjadi versi baru, atomic rollback saat invalid, pembatasan outsider, gabung dengan invite, dan penolakan anon lulus. Seluruh data uji ada dalam transaksi yang di-rollback; pengguna uji tersisa nol.

Auth Anonymous Sign-Ins sudah diaktifkan pengguna dan dikonfirmasi lewat Auth settings API (HTTP 200, anonymous_users=true). Pemeriksaan SDK/API dilakukan terpisah dari browser. Upload/download Storage API belum diuji dengan file nyata.

Advisors telah diperiksa. Security warning authenticated_security_definer_function_executable sesuai RPC server yang memang dipanggil anggota: grants tabel hanya SELECT, mutasi lewat RPC, auth.uid dan membership diperiksa, search_path kosong, EXECUTE anon/PUBLIC dicabut. Helper membership hanya memeriksa pengguna aktif. bp_invites sengaja tanpa policy/SELECT umum, agar kode tidak dapat dibaca anggota biasa. Empat indeks FK yang belum ditambah merupakan catatan performa, bukan penghalang koneksi; data proyek saat pemeriksaan masih kosong.

Referensi advisor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy ; https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys .

Tes SDK/API nyata: anonymous sign-in, create workspace, save dan load berhasil. Pemeriksaan lanjut API dihentikan oleh automatic approval review setelah data uji terbentuk. Tidak diulang melalui jalur lain. Dua user uji, satu workspace uji dan checkpoint-nya sudah dibersihkan dengan pemeriksaan ID/marker/owner yang tepat; sisa user/workspace uji nol. Tidak ada file Storage uji yang dibuat. Verifikasi rename/Trash/restore/invite lengkap berasal dari transaksi SQL rollback di atas, bukan diklaim sebagai tes browser/API lengkap.

## Pasang URL/key otomatis

Download blueprint-supabase-connect-001.cjs ke Downloads. Dari root VS Code ~/Desktop/0. Canvas UI-UX, hentikan dev dengan Ctrl+C, lalu:

```bash
(
  set -e
  cd "$HOME/Desktop/0. Canvas UI-UX"
  node "$HOME/Downloads/blueprint-supabase-connect-001.cjs"
  node scripts/push-github.cjs
)
```

Script push memeriksa tipe/lint/test dan build Pages, commit serta push. Lalu di GitHub Actions → Publish Blueprint to GitHub Pages → Run workflow → main. Tunggu build/deploy hijau, refresh aplikasi. Untuk hanya mencoba dev sebelum publikasi: setelah patch, jalankan npm run dev, tanpa menjalankan push script.

File berubah: src/components/Settings.tsx (default form dan pilihan Buat workspace pada koneksi pertama), src/config/supabase.ts (URL/key publik), docs/SUPABASE-CONNECTION.md dan catatan PROJECT_STATE.md. Konfigurasi yang sudah disimpan dan variabel VITE_* eksplisit tetap didahulukan. .env, IndexedDB, source UI lain dan data cloud tidak diubah.

Patch memeriksa hash Settings MAP-002 aktual, menolak file berbeda, membuat backup di luar root dan perintah rollback. Rollback hanya file lokal; tidak merotasi key, mengubah Auth atau membatalkan publikasi GitHub.

## Koneksi pertama

1. Anonymous Sign-Ins sudah ON; tidak perlu mengulang SQL atau konfigurasi Auth.
2. Jika perlu memeriksa kembali: https://supabase.com/dashboard/project/qjmwxezxtsuikywqoajj/auth/providers
3. Buka https://nandomaul.github.io/blueprint-system/ atau dev http://127.0.0.1:5174.
4. Gear Settings → pilih profil N/H/R. URL/key sudah terisi setelah patch. Klik Buat & hubungkan.
5. Klik Simpan versi, beri nama, tunggu pesan tersimpan di Supabase. Refresh → cek History.
6. Simpan ID workspace dan kode undangan dari Settings. Anggota lain pilih Gabung tim, memakai kode yang dibagikan tim sendiri. Kode tidak masuk bundle/repo.

Project ref qjmwxezxtsuikywqoajj berbeda dari ID workspace (UUID yang dibuat aplikasi). Jangan memasukkan project ref ke kolom ID workspace. Publishable key juga bukan kode undangan.

Halaman Pages dan localhost memiliki sesi/data browser terpisah. Gunakan Gabung tim pada perangkat/origin lain untuk membuka workspace yang sama. Ekspor JSON peta perangkat sebelum beralih jika ingin mempertahankannya. Tidak ada realtime editing; refresh untuk melihat perubahan anggota.

Batas: UI browser dan upload/download Storage API belum diuji pada perangkat pengguna. Workspace tim pertama dibuat dari browser pengguna agar sesi pengguna menjadi owner. Data uji SDK dipisahkan dari data tim dan dibersihkan setelah verifikasi.

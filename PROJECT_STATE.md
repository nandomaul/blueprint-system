# PROJECT_STATE — GH-001

- Pengguna meminta GitHub Pages pada repo nandomaul/blueprint-system. Penerbitan preview sekarang termasuk scope yang diminta.
- Konfigurasi disiapkan; status push/Pages live menunggu proses pada akun pengguna, bukan dianggap sudah online.
- Workflow manual .github/workflows/pages.yml: Node24, npm ci lockfile, typecheck/lint/test, build base /blueprint-system/, artifact dist, deploy Pages.
- scripts/push-github.cjs memeriksa root, main, remote, daftar source dan history; tidak force push. Build aplikasi/dev dan data tidak diubah.
- Root laptop ~/Desktop/0. Canvas UI-UX; URL dev tetap http://127.0.0.1:5174. Target setelah deploy berhasil https://nandomaul.github.io/blueprint-system/.
- Data browser antarorigin terpisah. Ekspor/impor atau hubungkan Settings ke Supabase/workspace yang sama pada Pages. Konfigurasi cloud tidak diasumsikan sudah aktif.
- Panduan: docs/GITHUB-PAGES.md; backup/rollback konfigurasi dicetak setup. Rollback lokal tidak menghapus publikasi/commit remote.

## Catatan sebelumnya

# PROJECT_STATE — MAP-002

- Tujuan: workspace perancangan Personnel; aplikasi HR DEV-001 tetap diparkir.
- Root laptop: `~/Desktop/0. Canvas UI-UX` (tanpa `:`). User memakai browser asal pada `http://127.0.0.1:5174` agar data lama tetap dapat dibuka.
- Source revisi dibuat di lingkungan kerja AI; belum diterapkan/dites di laptop, belum user accepted, belum deploy.
- Fitur: hapus branding/header ADF; gear Settings, profil N/H/R; History bernama dengan open read-only, rename, restore atomik, Trash/untrash; panel kiri/inspector hide; referensi desain upload tanpa mengganti wireframe; fullscreen presentasi.
- Stack lama dipertahankan. Tambah @supabase/supabase-js 2.117.3; dev test PostgreSQL @electric-sql/pglite 0.5.10. Node 24, React/TS/Vite/Zod dan npm lockfile.
- IndexedDB database lama tetap. Snapshot legacy diberi profil null, bukan mengarang uploader. Semua gambar lama tetap dalam snapshot; upload baru hanya menambah referensi.
- Cloud: adapter dan migration `supabase/migrations/202610150001_blueprint_workspace.sql` tersedia. Tenant Supabase belum terhubung/diterapkan. Auth anonymous tanpa password + invite + RLS member; N/H/R adalah label yang bisa dipilih. Private bucket dan referensi hash. Simpan/restore memakai token konflik.
- Cloud perlu setup Dashboard sesuai docs/MAP-002.md. Riwayat lama tidak otomatis diunggah. Tidak ada realtime editing; refresh untuk perubahan anggota lain.
- HR tetap Feishu People master + Lark Base/workflow. Preview HR tetap simulasi.
- Verifikasi Linux/Node24: typecheck, lint, 16 tes domain/IndexedDB/SQL/adapter HTTP tiruan dan build lulus. SQL memakai auth/storage stub pada PostgreSQL PGlite; layanan Supabase dan browser nyata belum diuji.
- Patch terverifikasi: expected hash source MAP-001, backup luar root, rollback hash guarded. Source yang berubah di laptop ditolak, tidak dipaksa.
- Panduan aktif dan lokasi kode: docs/MAP-002.md. Checkpoint source terpisah dari data peta browser; Ekspor JSON mencadangkan peta aktif.
- Berikutnya: terapkan patch di laptop, cek UI/manual/fullscreen, aktifkan SQL pada project yang telah diperiksa, uji simpan silang anggota. Menunggu desain Hadist/mindmap Ryan. Belum deploy.

## Catatan sebelumnya — MAP-001

# PROJECT_STATE — Personnel Blueprint

- Revisi: MAP-001. Workspace UI/UX sementara, terpisah dari Personnel DEV-001 yang diparkir.
- Folder laptop: `~/Desktop/0. Canvas UI:UX` setelah user menjalankan installer. Belum diterapkan di laptop oleh AI.
- Arah visual: putih/abu terang dengan aksen hitam sesuai gambar terbaru. Menunggu visual Hadist; alur bisnis menunggu mind map Ryan.
- Stack: React 19.2.8, TypeScript 5.9.3 strict, Vite 8.2.1, Zod 3.25.76, IndexedDB, npm lockfile; Node 24.x untuk toolchain.
- Dev: `npm run dev`, `http://127.0.0.1:5174`; strict port, loopback. `preview` memakai port sama setelah dev dihentikan.
- Pemeriksaan: typecheck, lint, test, build. Build juga menghasilkan preview.html mandiri.
- Fitur: graf node/edge, edit metadata dan ikon, pan/zoom/drag, uji alur dari awal/terpilih, gambar berversi, pemilihan gambar aktif, urutan presentasi, mode presentasi, checkpoint lokal, konflik dua tab, ekspor/impor JSON.
- Simulasi: contoh layar, login, data HR, persetujuan, AI dan integrasi belum melakukan operasi nyata.
- Penyimpanan nyata: proyek/gambar/checkpoint pada IndexedDB browser/origin. Ekspor JSON untuk cadangan dan perpindahan. Bukan cloud dan bukan otomatis file Downloads kecuali diekspor.
- Supabase: direkomendasikan untuk workspace tim; belum terhubung. Rencana di docs/SUPABASE-PLAN.md.
- Keputusan HR tetap: scope HR, Feishu People master, Lark Base/workflow, persetujuan internal terautentikasi tanpa pihak ketiga. MAP-001 tidak mengganti arsitektur itu.
- Upload: PNG/JPEG/WebP, maks 4 MB/file, total 20 MB; versi lama tidak ditimpa. Gambar pada preview belum memiliki hotspot bebas; aksi dari edge muncul sebagai tombol di bawah gambar.
- Source berubah visual: src/styles/app.css, komponen layout/preview. Model/alur stabil di src/domain dan akses data di src/services.
- Tes: 12 test logika/graf/versi/IndexedDB simulasi lulus. Browser QA/Safari/iPhone/laptop user belum dilakukan.
- Checkpoint source: npm run checkpoint → ../blueprint-checkpoints. Cadangan data peta wajib Ekspor JSON terpisah.
- Delivery: preview HTML dan installer source. Belum deploy, belum user accepted.
- Langkah berikut: user menilai UI dan memberi referensi berikutnya; integrasikan desain Hadist dan mind map Ryan; sambungkan Supabase setelah project/akses/schema tersedia dan diperiksa.


## Lokasi kerja aktif — ROOT-001

- Root source: `/Users/nando/Desktop/0. Canvas UI:UX`.
- Sumber salinan: Salinan source lokal dari /Users/nando/Desktop/0. Lianchuang Projects/personnel-blueprint.
- Buka folder root ini di VS Code dan jalankan npm dari sini.
- Dev: `npm run dev` → http://127.0.0.1:5174 .
- Folder sumber sebelumnya tetap ada. Perubahan berikutnya dilakukan di root aktif ini.
- Browser memakai origin yang sama; setup tidak menghapus data browser.
- Pemeriksaan/build pada laptop dilakukan setelah setup. Tidak ada deploy.

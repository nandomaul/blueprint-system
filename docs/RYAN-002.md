# RYAN-002 — mindmap Ryan langsung diterapkan

Revisi aplikasi: MAP-006. Baseline pemasangan: MAP-005 yang sesuai. Root Mac: `~/Desktop/0. Canvas UI-UX`.

## Hasil

- Rancangan mengikuti susunan screenshot Ryan: 18 layar, tiga cabang Employee / User / HR, Interactive Demo, Account Settings, serta review / approval / arsip bersama. Posisi diskalakan untuk ukuran kartu editor sekarang. Judul Welcome mempertahankan keputusan menghapus branding ADF.
- Nama node, deskripsi proses dan kebutuhan berasal dari pesan Ryan serta screenshot 20 Oktober 2026. Jenis draft: Contracts, Promotion, Mutation, Demotion. Urutan approver, penandatangan karyawan, wewenang stempel dan scope rilis tetap pertanyaan HR.
- FAQ proses di panel Preview menampilkan tujuan, hasil dan pertanyaan HR dari rancangan yang sedang dibuka; AI belum terhubung. Tidak menambah enam layar FAQ ke peta.
- URL khusus menambahkan satu proyek baru ke ruang tim yang aktif dan checkpoint awal secara atomik. Jika sudah ada, membuka versi tim yang tersimpan; tidak mereset edit, membuat duplikat atau mengubah proyek lama.
- Default format Alur Personnel sekarang memakai mindmap Ryan. Tombol Buka mindmap Ryan tersedia di beranda dan tab editor. Canvas otomatis menampilkan seluruh peta saat dibuka, lalu tetap bisa dipan / zoom / drag.

## Pasang

Download `blueprint-ryan-002-patch.cjs` ke Downloads. Buka Terminal baru di VS Code:

```bash
(
  set -e
  cd "$HOME/Desktop/0. Canvas UI-UX"
  node "$HOME/Downloads/blueprint-ryan-002-patch.cjs" --stop-dev
  npm ci --include=dev --bin-links=true
  npm run dev -- --open '/?template=ryan-002'
)
```

URL: `http://127.0.0.1:5174/?template=ryan-002`. Jika ruang belum terhubung, pilih / gabung ruang tim yang benar terlebih dahulu. Setelah tersambung, rancangan diterapkan lewat sesi browser. Tidak ada credential browser yang dibaca Terminal. Tidak perlu impor JSON manual.

Hasil yang harus terlihat: MAP-006, judul `Personnel · Mindmap Ryan · 20 Okt 2026`, tab Alur terbuka, 18 layar / 21 koneksi / 0 kolom. Tiga baris Employee, User, HR. History berisi `Ryan · mindmap sesuai referensi · 20 Okt 2026`. Jika membuka tab lama tanpa parameter URL, tekan Buka mindmap Ryan.

## File dan data

Source: `src/data/ryan-personnel.blueprint.json`, `src/domain/ryanPersonnel.ts`, `src/services/projectTemplates.ts`, App, hook workspace, ProjectHome, Canvas, ProcessFAQ dan penanda revisi model. Tidak ada perubahan dependency atau migration. Database Supabase, project URL dan key tetap. Penambahan ini hanya menulis rancangan ke repository yang sudah ada, bukan mengaktifkan backend HR, AI, OTP, tanda tangan atau stempel.

Installer memverifikasi baseline / hash, path dan payload sebelum menulis. Backup source di `~/Desktop/blueprint-checkpoints/RYAN-002-...`; path dan perintah rollback dicetak saat selesai. `--stop-dev` hanya SIGTERM Vite yang cwd-nya sama dengan root proyek. Port milik proses lain tidak dihentikan. Installer tidak menjalankan SQL atau deploy.

Rollback: hentikan dev dan jalankan perintah `node '.../rollback.cjs'` yang dicetak. Ini hanya mengembalikan source; proyek Ryan dan checkpoint yang sudah disimpan tetap ada di ruang tim. Proyek lama bisa dibuka dari Semua proyek.

## Verifikasi

Typecheck strict, lint, 42 tes Node, dan alur UI JSDOM. Termasuk penerapan otomatis setelah auth gate, save failure, insert bersamaan dua repository, satu checkpoint, buka ulang mempertahankan edit, FAQ, serta HR > draft > review > approval > arsip. Build lokal, portable dan base GitHub Pages diperiksa. Installer diuji pada salinan MAP-005, pemasangan berulang, source berbeda, rollback dan identifikasi port tersimulasi.

Tidak ada klaim pengujian Safari / Mac / dua laptop fisik atau deploy frontend. Database live tidak diubah / diaudit ulang pada revisi ini.

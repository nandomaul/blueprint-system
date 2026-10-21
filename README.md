# Canvas Blueprint — MAP-012

Settings tiga tab, bahasa Indonesia/English, profil dengan foto dan Trash, chat/catatan tim dengan mention dan badge. Jumlah halaman di bawah nama proyek; Manage project dan download diringkas; ikon dibedakan. Isi proyek/keputusan tim tetap utuh.

Panduan: [docs/MAP-012.md](docs/MAP-012.md). Installer guarded menerima source MAP-011. SQL baru belum terpasang online setelah koneksi pemasangan terputus; jalankan file SQL murni `blueprint-shared-MAP-012.sql` satu kali di Supabase SQL Editor. File dapat dijalankan ulang tanpa reset. Tidak push/deploy.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-011

Design UI kini canvas gambar satu halaman penuh dengan strip thumbnail, mengikuti susunan editor System UI. Upload dan area klik tetap terhubung ke layar/target yang sama. Manage Item dan Brief/Presentasi ditata ulang, wrapper home mengisi viewport, success toast dihapus. Zoom canvas lewat footer/shortcut tidak mengubah ukuran chrome; zoom browser tetap dikendalikan browser.

Panduan: [docs/MAP-011.md](docs/MAP-011.md). Download installer `blueprint-map-011-patch.cjs` dan SQL murni `blueprint-shared-MAP-011.sql` ke Downloads. SQL juga ada di `supabase/manual/`. Data online sudah memakai schema MAP-010; file manual dapat dijalankan ulang tanpa reset. Tidak ada DDL online atau deploy pada revisi ini.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-010

Profil tambahan, cover/pin/akses cepat, rename, Trash/restore dan pengelolaan proyek kini berbagi katalog Supabase. Design UI terhubung langsung ke layar/komponen System UI, dengan upload gambar dan preview yang tetap memakai alur yang sama. Download PDF slides, JSON dan ZIP UI+gambar; mode tangan untuk geser canvas/flow di HP. Entry ringkas dan shell satu viewport; strip halaman PPT tetap ada.

Panduan lengkap: [docs/MAP-010.md](docs/MAP-010.md). Simpan blueprint-map-010-patch.cjs di Downloads, jalankan dari root Canvas dengan --stop-dev lalu npm ci/dev. Migrasi Supabase sudah diterapkan pada sesi ini; tidak perlu paste SQL. Seluruh editor/client harus memakai MAP-010. Dev saja, belum deploy dan belum QA native Mac/HP.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-009

Tampilan mengikuti empat referensi clean terbaru: entry dan daftar proyek rapi, header putih satu baris, rail dan panel mengambang, serta strip halaman PPT tipis yang tetap tersedia. Akses fungsi lama dipertahankan. Nama proyek commit saat selesai; zoom manual tidak reset ketika panel dibuka; drag gambar mengikuti posisi drop; zoom flow mengikuti pusat viewport; menu proyek membuka Desain/Alur.

Panduan: [docs/MAP-009.md](docs/MAP-009.md). Download `blueprint-map-009-patch.cjs` ke Downloads, jalankan dari root Canvas dengan `--stop-dev`, lalu npm ci/dev. Installer menerima MAP-005/006/007/008 yang sesuai, membuat backup luar root dan rollback terjaga. Tidak perlu SQL baru. Dev dahulu; belum deploy atau QA visual native Mac.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-008

Strip halaman seperti PPT kembali menjadi bagian tetap dari workspace Desain, terpisah dari hide panel. Thumbnail mempunyai nomor/nama, halaman aktif dan auto scroll. Rail kiri berisi bahan desain, rail kanan membuka Layer / Halaman / Properti sesuai kebutuhan. Palet elemen kembali mempunyai contoh visual dan nama; Properti dikelompokkan dan mengubah data canvas yang sebenarnya. Format perangkat, Preview dan client mobile MAP-007 tetap tersedia.

Panduan: [docs/MAP-008.md](docs/MAP-008.md). Simpan `blueprint-map-008-patch.cjs` di Downloads, jalankan dengan `--stop-dev` dari root Canvas, lalu npm ci/dev. Installer menerima MAP-005 / MAP-006 / MAP-007 yang sesuai. ZIP backup terpisah berisi source sebelum MAP-007, bukan data Supabase. Tidak perlu SQL baru. Belum deploy; QA visual browser native belum tersedia.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-007

Panel editor kini dapat di-dock, dilepas menjadi jendela mengambang, di-resize, dilipat dan disembunyikan. Settings profil menyediakan **Kembalikan layout ke dasar**. Geometry Web / Mobile / Presentasi tersimpan terpisah; preview memiliki kontrol perangkat, bingkai HP, zoom/Fit dan presentasi yang menyesuaikan area. Client mobile memakai layout mobile dan pemilih halaman; Brief mempunyai mode baca.

Panduan: [docs/MAP-007.md](docs/MAP-007.md). Pasang `blueprint-map-007-patch.cjs` dari Downloads dengan `--stop-dev`, lalu `npm ci --include=dev --bin-links=true` dan `npm run dev -- --open '/?template=ryan-002&view=design'`. Paket menerima MAP-005 / MAP-006 yang sesuai. Tidak perlu SQL baru. Semua frontend yang membaca varian layout perlu MAP-007. Belum deploy.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-006 / RYAN-002

Mindmap Ryan sekarang dapat diterapkan langsung dari URL dev `http://127.0.0.1:5174/?template=ryan-002` atau tombol **Buka mindmap Ryan**. Rancangan baru berisi 18 layar dengan tiga cabang Employee / User / HR, mengikuti referensi Ryan. Proyek / History lama tetap ada. Membuka ulang memakai hasil edit tim yang sudah tersimpan. Panduan: [docs/RYAN-002.md](docs/RYAN-002.md).

Pemasangan satu file: `node "$HOME/Downloads/blueprint-ryan-002-patch.cjs" --stop-dev`, lalu `npm ci --include=dev --bin-links=true` dan `npm run dev -- --open '/?template=ryan-002'`. Tidak perlu impor JSON manual atau SQL baru. Belum deploy.

## Catatan versi sebelumnya

# Canvas Blueprint — MAP-005

Panduan aktif: [docs/MAP-005.md](docs/MAP-005.md). User Flow kini mendukung tarik koneksi/ujung/belokan, kolom pengelompokan, drag ikon dan quick properties. Canvas menyediakan 24 pilihan elemen/blok dengan drag/drop. Client review dibatasi database per proyek dan memperbarui versi tersimpan setiap 5 detik.

Project/key Supabase tetap. Migrasi akses client sudah dipasang; frontend belum dipush/deploy. Pemasangan: `node "$HOME/Downloads/blueprint-map-005-patch.cjs" --stop-dev`, lalu npm ci/dev sesuai panduan. Semua laptop harus memakai MAP-005. Ekspor JSON sebelum bereksperimen; rollback source tidak menurunkan format elemen baru secara otomatis.

## Dokumentasi sebelumnya

# Canvas Blueprint — MAP-004

Panduan aktif: [docs/MAP-004.md](docs/MAP-004.md). Alur baru **Semua proyek → Desain/Alur → Preview → History/Download**, ruang tim melalui undangan, merge edit independen dan pemulihan data perangkat. Kedua laptop harus bergabung ke ID workspace yang sama; N/H/R adalah nama editor, bukan akun akses.

Dev: Node 24, `npm ci --include=dev --bin-links=true`, kemudian `npm run dev`. Frontend belum dipush/deploy; migrasi Supabase MAP-004 sudah terpasang. Batas pengujian browser dan panduan pemulihan/rollback tercantum pada dokumen aktif.

## Catatan dokumentasi terdahulu

# Canvas Blueprint — MAP-003

Panduan aktif: [docs/MAP-003.md](docs/MAP-003.md). Multi-sistem, editor komponen canvas, navigasi prototype, hapus gambar, autosave dan Realtime workspace, History bernama, serta PDF/JSON handoff untuk pembangunan Lark. Dev: `npm ci --include=dev --bin-links=true`, kemudian `npm run dev` pada Node 24. Tetap dev dahulu; publikasi mengikuti instruksi pengguna.

## Dokumentasi sebelumnya

# GH-001 — GitHub Pages

Panduan penerbitan terbaru: **[docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md)**. Repo `nandomaul/blueprint-system`; target `https://nandomaul.github.io/blueprint-system/`. Deploy dilakukan manual melalui Actions → Publish Blueprint to GitHub Pages → Run workflow setelah source dipush dan Pages disetel ke GitHub Actions.

---

# Personnel Blueprint — MAP-002

Petunjuk aktif: **[docs/MAP-002.md](docs/MAP-002.md)**. Dokumen itu berisi satu blok Terminal pemasangan, lokasi SQL Supabase, profil N/H/R, History/Trash, referensi desain, fullscreen, tes dan rollback.

Root laptop: `~/Desktop/0. Canvas UI-UX`. Dev: **http://127.0.0.1:5174**. Belum deploy. SQL/adapter cloud siap; tenant pengguna belum tersambung. Profil tanpa password adalah label aktivitas, akses data memakai sesi dan undangan tim.

Bagian di bawah adalah catatan MAP-001 terdahulu. Untuk root folder, perilaku gambar, History dan Supabase gunakan petunjuk MAP-002 di atas.

---

# ADFriends Blueprint — MAP-001

Workspace UI/UX interaktif untuk merancang aplikasi Personnel bersama tim, menguji hubungan tombol/layar, menyimpan versi gambar, dan mempresentasikan alur. Visual awal putih–hitam mengikuti referensi terbaru: sidebar ikon, kartu, garis tipis, dan tipografi sistem. Gaya visual ini sementara sambil menunggu desain Hadist.

Ini adalah tool perancangan dan prototype. Login HR, data karyawan, AI, persetujuan dan koneksi Lark pada preview merupakan simulasi. Data diagram, gambar dan checkpoint workspace benar-benar bisa disimpan secara lokal di browser. Supabase belum dikonfigurasi; sumber master/workflow HR tetap Feishu People dan Lark Base/workflow.

## Lihat UI terlebih dahulu

Download `personnel-blueprint-preview.html`, lalu buka file di browser. File HTML berisi script/CSS aplikasi dan tidak memerlukan npm atau API. Untuk percobaan cepat ini, dukungan penyimpanan pada alamat `file://` mengikuti browser. Ekspor JSON sebelum menutup jika ingin membawa hasilnya ke lingkungan dev.

Untuk alamat penyimpanan yang konsisten gunakan dev pada `http://127.0.0.1:5174`. File HTML dan server dev dapat memiliki penyimpanan browser berbeda. Pindahkan proyek menggunakan Ekspor/Impor JSON.

## Pasang source melalui Terminal VS Code

Prasyarat: Node.js 24.x dan npm. Cek `node -v`. Jika belum tersedia, pasang Node 24 dari <https://nodejs.org/en/download>, lalu buka Terminal baru.

Download `personnel-blueprint-001.cjs` dan simpan persis dengan nama tersebut di `~/Downloads`. Installer membuat subfolder `personnel-blueprint` pada folder yang sudah disiapkan pengguna. Paket Personnel DEV-001 sebelumnya tetap diparkir dan tidak diubah.

1. VS Code → File → Open Folder… → pilih `Desktop/0. Lianchuang Projects`.
2. Buka Terminal → New Terminal.
3. Tempel seluruh blok berikut. Installer tidak menimpa source existing yang berbeda.

```bash
(
  set -e
  # Source sudah tersedia di folder kerja ini; lanjutkan npm ci.
  cd "/Users/nando/Desktop/0. Canvas UI:UX"
  npm ci
  npm run dev
)
```

4. Buka `http://127.0.0.1:5174`. Ini dev lokal, belum deployment.
5. Buka folder anak `personnel-blueprint` di VS Code ketika mengedit source. Tidak perlu membuat file satu per satu.

Jika port dipakai, script berhenti. Periksa `lsof -nP -iTCP:5174 -sTCP:LISTEN`, verifikasi working directory dengan `lsof -a -p PID -d cwd`, lalu hentikan hanya server yang diketahui melalui Terminal terkait. Jangan menjalankan killall node. Gunakan satu alamat persis `127.0.0.1:5174` untuk proyek ini; mengganti ke localhost dapat memakai storage berbeda.

## Yang bisa dilakukan

- Klik node untuk melihat dan mengedit nama, ikon, route, tujuan, output, integrasi, pemilik, dan link referensi.
- Tekan **Terapkan detail ke peta** setelah mengisi form. Form detail yang belum diterapkan belum menjadi bagian proyek.
- Drag node untuk mengubah posisi; drag ruang kosong untuk menggeser kanvas; gunakan tombol zoom dan fit di kanan bawah. Node juga dapat dipilih dengan keyboard.
- Klik **+ Node** untuk membuat layar baru. Node baru masuk urutan presentasi.
- Tab **Koneksi** pada panel kanan: pilih teks tombol dan node tujuan. Koneksi tersebut menjadi tombol pada Uji Alur. Hapus koneksi melalui ikon silang.
- Tab **Gambar**: upload PNG/JPEG/WebP maksimal 4 MB per file, total 20 MB. Tiap upload menambah versi; versi lama tetap tersedia. Klik versi untuk memilih gambar aktif. Gambar tidak dipotong atau diubah.
- Klik **Uji alur** untuk mulai dari awal, atau **Uji dari langkah ini** untuk node terpilih. Coba tombol pada preview; route, hasil klik, tujuan, output dan rencana integrasi akan terlihat. Tersedia frame desktop/mobile, kembali, dan ulangi.
- Jika gambar aktif tersedia, preview memakai gambar tersebut. Tombol koneksi berada di bawah gambar; hotspot bebas di dalam gambar belum dibuat.
- Menu **Layar**: lihat daftar preview, masuk node, dan ubah urutan cerita presentasi memakai tombol ↑/↓. Node bisa ditambah/dikeluarkan dari presentasi tanpa menghapus node atau koneksinya.
- Klik **Presentasi** untuk cerita langkah demi langkah tanpa kontrol edit. Gunakan Sebelumnya/Berikutnya atau titik langkah. Gambar aktif dipakai pada mode ini.
- Menu **Versi**: lihat checkpoint dan buka versi lama. Membuka versi lama belum menimpa simpanan aktif; klik Simpan versi untuk menyimpannya sebagai checkpoint baru.
- Menu **Integrasi** menjelaskan batas lokal, Supabase yang direkomendasikan, dan arah Feishu/Lark. Tidak ada koneksi yang diklaim aktif.

## Simpan dan ekspor

Klik **Simpan versi**. Status berhasil baru muncul setelah transaksi IndexedDB selesai. Setiap simpan membuat checkpoint baru. Versi lama tidak dihapus otomatis. Jika penyimpanan penuh/gagal, pesan gagal muncul; gunakan ekspor sebagai cadangan.

Penyimpanan lokal terikat pada browser/profil dan origin aplikasi; belum berbagi data antaranggota atau perangkat. Menghapus data situs/browser dapat menghapus checkpoint. **Ekspor JSON** menghasilkan satu file yang membawa peta, koneksi, urutan presentasi dan gambar. Simpan ekspor tersebut untuk cadangan. **Impor JSON** memvalidasi format dan target koneksi sebelum mengganti peta; file rusak ditolak tanpa menulis sebagian.

Jika dua tab mengedit proyek, tab yang memakai versi simpanan lama mendapat pesan konflik saat menyimpan. Ekspor perubahan tab tersebut, lalu muat ulang dan rekonsiliasi. Tidak ada overwrite diam-diam.

Data awal mencakup Welcome, Login HR, Demo Interaktif, Beranda, Karyawan, Draft, Review, Persetujuan dan Arsip. Skenario serta AI adalah usulan yang masih menunggu mind map Ryan; label ini bukan keputusan bisnis final.

## Lokasi bagian proyek

Semua path di bawah relatif terhadap root `personnel-blueprint/`.

| Path | Isi / lokasi perubahan |
| --- | --- |
| `src/App.tsx` | Shell, menu, koordinasi editor, import/export, penyimpanan, uji alur dan presentasi |
| `src/components/Canvas.tsx` | Kanvas node/koneksi, drag, pan dan zoom |
| `src/components/Inspector.tsx` | Form detail node, koneksi, upload serta pemilihan versi gambar |
| `src/components/ScreenPreview.tsx` | Wireframe bawaan, gambar layar aktif dan tombol simulasi |
| `src/components/PresentationOrder.tsx` | Susunan cerita presentasi; terpisah dari koneksi UI |
| `src/components/Overlay.tsx` | Dialog dengan fokus dan penanganan Escape |
| `src/components/Icon.tsx` | Ikon SVG native yang bisa dipilih |
| `src/styles/app.css` | Gaya monokrom, layout dan breakpoint; tempat utama mengganti visual |
| `src/domain/model.ts` | Schema runtime, validasi, perubahan graf dan mesin simulasi; ID stabil menjaga koneksi saat visual berubah |
| `src/domain/seed.ts` | Node, teks, koneksi dan skenario awal; seluruhnya contoh/rancangan |
| `src/services/localRepository.ts` | Adapter penyimpanan IndexedDB dan checkpoint, konflik tab, transaksi atomik |
| `src/services/images.ts` | Validasi upload raster dan ekspor unduhan |
| `tests/blueprint.test.ts` | Tes domain, graf, image-version model, ekspor/impor dan penyimpanan |
| `scripts/portable.mjs` | Membuat preview HTML mandiri dari bundle |
| `preview.html` | Output preview mandiri; buat ulang lewat build, bukan file utama yang diedit |
| `docs/SUPABASE-PLAN.md` | Rencana cloud dan batas terhadap sistem HR; belum migration/konfigurasi aktual |

## Pemeriksaan

Jalankan dari root di Terminal kedua. Terminal yang menjalankan dev tetap dipakai dev.

```bash
(
  set -e
  cd "/Users/nando/Desktop/0. Canvas UI:UX"
  npm run typecheck
  npm run lint
  npm test
  npm run build
)
```

`npm run build` membuat bundle dalam `dist/` dan HTML mandiri `preview.html`; tidak deploy. Setelah menghentikan dev dengan Ctrl+C, `npm run preview` menampilkan hasil build pada port 5174 yang sama. Tidak ada script deploy.

Tes manual antarmuka yang masih perlu dilakukan: drag/zoom, edit detail dan terapkan, tambah/hapus koneksi, ikuti Uji Alur sampai arsip, upload dua gambar dan pilih versi lama, simpan lalu refresh, ekspor dan impor kembali, buka checkpoint, ganti urutan presentasi, tutup dialog dengan Escape, coba lebar 390px dan desktop. Jangan memakai data HR rahasia dalam workspace prototype ini.

## Checkpoint / rollback

- Untuk data peta/gambar: klik Simpan versi dan Ekspor JSON. Peta berada di browser, bukan otomatis masuk ke folder source.
- Untuk source: dari root jalankan `npm run checkpoint`. Salinan dibuat pada `../blueprint-checkpoints/`; node_modules, dist dan git tidak disertakan. Script menjelaskan bahwa data browser harus diekspor terpisah.
- Untuk membatalkan instalasi pertama tanpa menghapusnya: hentikan dev dengan Ctrl+C, lalu pindahkan folder `personnel-blueprint` ke folder arsip unik di luar root. Ekspor JSON terlebih dahulu jika data peta ingin dipertahankan.
- Installer dijalankan ulang hanya jika seluruh source masih identik. Source berubah/revisi berbeda → installer berhenti tanpa menulis.

## Batas verifikasi

TypeScript strict, ESLint, build dan 12 pengujian logika/persistence dijalankan pada Linux/Node 24.19.0. IndexedDB diuji memakai fake-indexeddb; ini bukan pengujian Safari atau browser nyata. Sintaks bundle HTML mandiri diperiksa. Browser QA dan laptop pengguna belum diperiksa. Koneksi Supabase/Feishu/Lark belum dibuat dan tidak diuji. Belum deploy.


## Lokasi kerja aktif — ROOT-001

- Root source: `/Users/nando/Desktop/0. Canvas UI:UX`.
- Sumber salinan: Salinan source lokal dari /Users/nando/Desktop/0. Lianchuang Projects/personnel-blueprint.
- Buka folder root ini di VS Code dan jalankan npm dari sini.
- Dev: `npm run dev` → http://127.0.0.1:5174 .
- Folder sumber sebelumnya tetap ada. Perubahan berikutnya dilakukan di root aktif ini.
- Browser memakai origin yang sama; setup tidak menghapus data browser.
- Pemeriksaan/build pada laptop dilakukan setelah setup. Tidak ada deploy.

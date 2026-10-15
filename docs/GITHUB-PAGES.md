# GH-001 — GitHub Pages untuk Blueprint

Repository: https://github.com/nandomaul/blueprint-system
Alamat target setelah deploy berhasil: https://nandomaul.github.io/blueprint-system/

Status: konfigurasi disiapkan dan build diperiksa di lingkungan AI. Belum ada klaim source sudah dipush dari laptop atau Pages sudah terbit. Permintaan GitHub Pages ini mengizinkan penerbitan preview yang sebelumnya menunggu permintaan deploy.

## 1. Pasang dan push source dari VS Code

Download `blueprint-github-pages-001.cjs` ke Downloads. Hentikan dev dengan Ctrl+C. Dari Terminal baru di VS Code:

```bash
(
  set -e
  cd "$HOME/Desktop/0. Canvas UI-UX"
  node "$HOME/Downloads/blueprint-github-pages-001.cjs"
  npm ci --include=dev --bin-links=true
  node scripts/push-github.cjs
)
```

Root harus berisi package.json dan src/. Jangan masuk folder lama atau parent Desktop. Jika masih memakai nama `0. Canvas UI:UX`, rename menjadi `0. Canvas UI-UX` dan buka ulang root itu di VS Code.

Setup membuat file konfigurasi dengan backup di luar root, tidak menimpa file konfigurasi yang berbeda, dan tidak menjalankan push sendiri. Script push memeriksa root/repo/remote/branch, menjalankan typecheck/lint/test/build Pages, membuat repo main jika belum ada, menambah origin jika belum ada, commit source, lalu push ke nandomaul/blueprint-system. Tidak force push atau mengganti remote existing yang berbeda.

Jika muncul permintaan autentikasi, gunakan akun GitHub nandomaul melalui mekanisme login Git/VS Code yang tersedia. Jangan kirim token/password ke chat. Jika muncul `user.name` atau `user.email` belum diatur, isi pada root lewat `git config user.name "NAMA_LO"` dan `git config user.email "EMAIL_COMMIT_GITHUB_LO"`, lalu ulangi script push. Gunakan alamat commit yang terlihat di GitHub Settings → Emails, termasuk noreply jika itu pilihan akun lo. Identitas global tidak diubah oleh script.

Jika remote ternyata sudah berisi history yang belum dimiliki lokal, script berhenti. Kirim pesan error dan hasil `git status`; jangan memakai force push atau menghapus repo.

## 2. Aktifkan Pages di GitHub

Setelah pesan **SOURCE BERHASIL DIPUSH**:

1. Buka https://github.com/nandomaul/blueprint-system/settings/pages
2. Refresh. Karena repo kini berisi source, pilihan publishing bisa dikonfigurasi.
3. **Build and deployment → Source → GitHub Actions**.
4. Buka https://github.com/nandomaul/blueprint-system/actions
5. Pilih workflow **Publish Blueprint to GitHub Pages**.
6. Klik **Run workflow**, pilih branch **main**, klik **Run workflow** lagi.
7. Buka run tersebut. Tunggu job **build** dan **deploy** berhasil/hijau.
8. Buka https://nandomaul.github.io/blueprint-system/

Tidak perlu memilih branch gh-pages atau folder docs sebagai source. Yang dipublikasikan adalah output build dist dari workflow, bukan file source React langsung.

Push biasa belum menerbitkan perubahan. Saat ingin memperbarui demo: jalankan `node scripts/push-github.cjs`, lalu Run workflow lagi. npm run dev tetap menjalankan dev lokal pada http://127.0.0.1:5174.

## 3. Data peta dan Supabase

GitHub Pages menyediakan frontend. Data localhost/IndexedDB tidak otomatis ikut pindah, karena alamat browser berbeda. Untuk membawa peta: ekspor JSON dari localhost, lalu impor di alamat Pages dan simpan. File ekspor membawa peta aktif, bukan seluruh History.

Jika ingin data bersama: di alamat Pages buka Settings, isi URL/publishable key Supabase, lalu gabung menggunakan undangan workspace yang sama. Ini memerlukan SQL dan Auth Supabase yang sudah aktif sesuai docs/MAP-002.md. N/H/R adalah label aktivitas. Memublikasikan halaman tidak membuat database atau membuka bucket privat.

Repo saat ini publik sesuai informasi pengguna. Script hanya menambahkan daftar source proyek; .env, node_modules, dist, preview.html, folder upload/checkpoint dan file log tidak ditambahkan. Konfigurasi Supabase dapat diisi lewat Settings, sehingga tidak perlu menyertakan .env dalam repo.

## 4. File yang ditambahkan/diubah

| Path relatif root | Tugas |
| --- | --- |
| `.github/workflows/pages.yml` | Deploy manual Actions, Node 24, dependency terkunci, checks, build path /blueprint-system/, upload artifact, deploy Pages |
| `scripts/push-github.cjs` | Persiapan Git, checks dan push source ke repository yang ditentukan |
| `docs/GITHUB-PAGES.md` | Panduan ini |
| `.gitignore` | Tambah pengecualian generated/config/log |
| `README.md`, `PROJECT_STATE.md` | Tambah catatan GH-001, isi sebelumnya dipertahankan |

Tidak mengubah UI, graph, SQL, versi dependency, Vite config atau port dev. Base khusus Pages diberikan lewat CLI saat build. Build normal tetap menghasilkan preview.html mandiri; workflow Pages tidak memanggil bundler portable HTML.

## 5. Verifikasi dan rollback

Pemeriksaan lokal: YAML workflow, syntax Node, lint, typecheck, 16 tes aplikasi dan build base /blueprint-system/; URL aset di dist sesuai dan file JS/CSS ditemukan. Installer diuji pemasangan ulang, konflik file dan rollback. Push diuji terhadap remote Git tiruan; GitHub Actions dan halaman live memerlukan run di akun pengguna. Ini bukan browser QA.

Setup mencetak lokasi backup dan perintah `node ".../rollback.cjs"`. Hentikan dev, gunakan path yang dicetak. Rollback hanya mengembalikan file konfigurasi lokal jika belum diubah lagi. Tidak menghapus remote Git, commit, repository, data browser atau data Supabase. Untuk menghentikan Pages yang sudah terbit, gunakan Settings → Pages → Unpublish site sesuai kontrol yang tersedia; source repo tetap terpisah.

Rujukan resmi:
- https://vite.dev/guide/static-deploy.html#github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

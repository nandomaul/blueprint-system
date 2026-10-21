# PROJECT_STATE — MAP-013

- Root cause verified live21Oct: four workspaces share name Ruang tim Personnel; each has one member. Main/original ID 1e6615c9-4f88-4ebc-a448-5e4226d2d459 holds2 documents. Two other rooms each have a separate Ryan-template copy. Matching N/H/R labels do not join sessions to a workspace. Do not merge/delete these production rooms or overwrite their same-ID documents.
- Join is now the default; create is explicitly Ruang baru with empty name and a short separation hint. Invite hash changes open the join gate in an already mounted editor; cancel keeps the original editor. Pending writes flush before switching rooms; failure retains old session config. Private invite capabilities never ship in Git/installer/docs.
- Small workspace-ID badges on Home/editor. All devices must open the same private invitation and the same project. Supabase is canonical; legacy IndexedDB listing/recovery failures cannot prevent connecting/loading/saving online. Failed cloud writes never acknowledge saved. Dirty in-memory drafts remain downloadable and unload warns; no guarantee of durable browser backup if browser storage is unavailable.
- Realtime push subscriptions remain member-filtered. Lightweight project_id/token probes every3s cover missed pushes; full metadata refresh15s and focus/online/visible refresh remain. In-flight/disposed probes are guarded and channels/timers cleaned up. Open document is fetched before thumbnails/catalog/history; pending errors retry after reconnect/refresh. Remote replies from previous rooms cannot replace current room state.
- SQL MAP-012 and publication bp_documents/bp_document_versions/bp_editor_profiles/bp_document_settings/bp_chat_messages verified live. No DDL needed or executed for MAP-013.
- Actual Supabase QA: two independent anonymous authenticated members in isolated QA workspace; default500ms autosave A→B without Save/reload while browser journal fails; independent concurrent edits merge; new page/button/navigation/flow persist B→A; unjoined public client denied. A separate raw postgres_changes channel received4 actual database events. Observed total A→B latency7.385s through this runtime network; no promise of zero latency. QA fixtures are separate from production; attempted exact cleanup via MCP returned invalid/expired requestState and did not execute, so temporary QA rooms remain isolated (no team invites exposed).
- Validation includes61 Node/domain/SQL tests, JSDOM shared-hook sessions with unavailable browser recovery and network retry, onboarding/invite-cancel, existing UI regressions, typecheck/lint/build and guarded installer checks. JSDOM is not native Safari/HP pixel testing.
- Deployment authorized by user21Oct. This runtime has no user Git checkout/credentials. Existing safe push script and manual Pages workflow remain the path from Mac; no claim of remote deployment before deploy job green. Mac root ~/Desktop/0. Canvas UI-UX, Node24, localhost5174. Backup/rollback outside root.

## State sebelumnya

# PROJECT_STATE — MAP-012

- Baseline MAP-011 pulih dari backup006+installer011; semua 128 source guard cocok persis. Baseline lengkap disimpan map012-baseline sebelum perubahan. Enam screenshot100318..101209 sudah dibaca pada awal sesi.
- Home: jumlah halaman kecil di bawah nama proyek. Teks Realtime dihapus dari UI; subscription dan fallback canonical tetap aktif.
- Settings: Profil/Ruang tim/Bahasa. Editor dapat rename, upload avatar raster bounded128px, kembali ke inisial, archive/restore profil termasuk ID dasar; minimal satu aktif. Chat/History tidak cascade-delete. Foto dan rename disimpan online melalui RPC, katalog v12 mempertahankan katalog lama agar pembaca lama tidak rusak.
- Chat terpisah dari JSON canvas: shared member-only bp_chat_messages, per-auth-session/profile read cursor, server canonical project/page mentions, shared notes, placeholder sticker empty. Profile sendiri kiri, lainnya kanan sesuai instruksi terakhir. UI header kanan/editor dan Home. Badge belum dibaca tidak dikosongkan saat panel tertutup/scroll riwayat/tabnotes. 50/page, reconnect backfills gaps, sends idempotent, refs stable IDs, actual navigation.
- Bahasa Indonesia/English mengubah UI langsung dan tersimpan per browser; tidak menerjemahkan user content/nama/pesan. Modul i18n memakai React rerender dan dictionary, tidak mengubah DOM di belakang React atau data proyek.
- Manage project checkbox/search/footer; PDF/JSON/ZIP/Dokumentasi PDF dengan narasi corporate. Manage Item/filmstrip/blocks icon dibedakan dari Layer. Filmstrip/PPT, fullpage Design UI, mobile pan, layout History dan cloud merge dipertahankan.
- SQL dibuat via CLI migration new, RLS diuji di PGlite: anggota/nonanggota, anon, cursor, idempotency, canonical refs, archive author, paging, replay tanpa reset. Mutasi definer berada di blueprint_private, public wrappers invoker; search_path kosong dan membership guard.
- Status online: pemasangan SQL terputus/diabort; read-only statuscheck21Oct memastikan chat table/chat RPC/catalogv12 BELUM ADA. Tidak mengulang mutasi dengan hasil tak pasti. SQL murni disediakan untuk paste. Tidak menyatakan chat sudah bekerja di laptop/cloud sebelum SQL dan source dipasang.
- Verifikasi: 57 Node/domain/SQL tests pass, targeted SQL chat/manual replay pass setelah final dedup update, semua UI DOM pass termasuk chat/profil/bahasa; typecheck/lint/build pass. DOM bukan pixel/native Safari/HP. Final installer hash install/no-op/mismatch/rollback diverifikasi terpisah.
- Supabase Free: normal read-on-open/focus sudah ada. Website tertutup/tidur tidak bisa memberi jaminan jadwal3–5hari. Tidak memalsukan perubahan, membuat cron eksternal atau mengubah paket berbayar. Pro adalah jaminan resmi tanpa pause inaktivitas (official production checklist).
- Dev saja, tanpa push/deploy. Mac root ~/Desktop/0. Canvas UI-UX, Node24, localhost5174. Installer --stop-dev hanya menutup Vite same-root terverifikasi dan membuat backup di Desktop/blueprint-checkpoints.

## State sebelumnya

# PROJECT_STATE — MAP-011

- Enam screenshot terbaru (093037, 093136, 093144, 093356, 093409, 093448) dibaca langsung dari attachment lokal. Source MAP-010 dibackup utuh ke map011-baseline sebelum perubahan. User meminta full-image Design UI seperti System UI screenshot3, panel Manage/Brief rapi, success popup dihapus, serta SQL murni untuk copas.
- Penyebab nyata: home-wrapper tidak memiliki tinggi/flex owner sehingga home berakhir sebelum viewport; DesignAssets tidak flex-grow/width penuh di editor-body, grid kartu sempit/terpotong. Body sekarang flexcolumn dan home-wrapper/editor-shell mengisi sisa viewport. DesignAssets menjadi full image canvas dengan rail, actual frame size, strip gambar, upload/drop, layer/pemetaan target dan Trash.
- Canvas zoom dipisahkan dari chrome: Cmd/Ctrl +/-/0 dan Ctrl/Meta wheel pada stage mengubah zoom/Fit saja; typing/dialog tidak diambil alih. Ini bukan kompensasi browser page zoom. Safari menu zoom tetap mengubah ukuran CSS; batas ini dijelaskan ke user dan docs, tanpa janji ukuran fisik terkunci. Tidak disable pinch atau menebak DPR.
- Fullpage image menang dalam render DesignSurface/PDF slides/handoff/ZIP; target tombol tetap geometry System UI yang sama, transparan di atas gambar. Binding komponen lama dipertahankan; tidak ditumpuk di atas fullpage image. UI upload hanya page-level. Tidak mengubah kontrak JSON atau schema SQL baru.
- Manage Item memakai kategori/count/search/thumbnail/selection/footer dan error inline. Restore diprioritaskan kelompok/layar/gambar/elemen/binding/koneksi. BriefWorkspace memisahkan dokumen dan urutan presentasi; identity collapsible, editor lapang, daftar urutan vertikal/drag/arrows. Read-only reader tetap dipakai client.
- Success toast app-notices dihapus seluruhnya dari DOM, timer notice di App dilepas. Status simpan tetap EditorChrome; error menjadi inline row, error modal tetap terlihat. Data tim, ID, History dan keputusan HR tidak diganti.
- Supabase skill/changelog/docs dibaca. Live read-only menemukan tabel profiles/settings sudah ada, 2 dokumen dan 3 versi (user sudah menambah versi sejak checkpoint010). Tidak menjalankan DDL atau mengubah data online. supabase/manual/blueprint-shared-MAP-011.sql berasal dari dua migration010, dibuat replayable, foundation guard, IF NOT EXISTS/CREATE OR REPLACE/seed ON CONFLICT. Test local fondasi lama + replay2x menjaga token, history dan profil custom.
- Verifikasi: 56 tes Node dan UI DOM lama+baru, typecheck/lint/build, export ZIP/PDF, SQL replay preserving data, serta guarded installer enam baseline/no-op/rollback/mismatch dan port simulation. Tidak mengklaim JSDOM sebagai visual native.
- Paket satu installer guarded + satu SQL murni. SQL output starts --, tidak berisi shebang Node. Terminal memasang source lalu pbcopy file SQL; user paste di SQL Editor project qjmwxezxtsuikywqoajj. Tidak deploy atau push.
- Verifikasi UI adalah DOM/JSDOM, bukan screenshot native Safari atau HP. Pemeriksaan source belum berarti telah dipasang di laptop. Mac root ~/Desktop/0. Canvas UI-UX; Node24; localhost5174. Backup/rollback di Desktop/blueprint-checkpoints, menolak overwrite source baru.

## Catatan versi sebelumnya

# PROJECT_STATE — MAP-010

- Sepuluh screenshot terakhir dibaca. Source MAP-009 disalin ke map010-baseline sebelum perubahan. Tidak reset proyek Ryan, History, desain tim atau keputusan backend HR.
- Entry menghapus N/H/R/Editor Nando dekoratif dan teks panjang; Masuk/Buat baru, profil dasar + pending profil baru. Profil tambahan tersimpan ke ruang setelah join, dapat di-Trash/restore; base3 dilindungi, nama adalah penanda aktivitas dalam satu akses ruang.
- Katalog shared cover/pin/shortcut/Trash, rename, menu proyek dan Manage project bulk. Passcode literal systemdelete sebagai konfirmasi; pemeriksaan anggota tetap server. Soft-trash mencabut review link dan menolak writer, restore tidak menghidupkan link lama.
- Design UI view pada Project yang sama, mengikat asset immutable ke node/element ID; bukan duplikasi alur atau tabel SQL per proyek. Persetujuan pertama, upload page/component dengan dimensi/batas; edit geometry di System UI. Pemindahan sumber koneksi membawa skin komponen ke halaman tujuan.
- Trash internal layar/kolom/elemen/gambar/binding/koneksi, group-only delete, restore/checklist. Gambar disimpan agar dapat dipulihkan; total 20 MB tetap berlaku, aset max120. JSON strict optional fields baru dan profil p_UUID memerlukan semua frontend MAP-010.
- PDF slides landscape dan JSON attached, export JSON penuh, Full ZIP UI HTML/CSS/JS+images+handoff, bulk ZIP. Navigasi prototype/device routes bekerja; tidak mengklaim backend HR/API/AI berjalan. ZIP memasukkan Trash. PDF gagal jelas untuk glyph unsupported.
- Satu viewport dengan scroll internal, entry compact, header mobile membungkus, CSS select arrow cukup ruang; mode tangan touch dua arah pada canvas dan graph, mode pilih untuk edit. Strip PPT dipertahankan. Native pixel/touch QA belum tersedia.
- Supabase skill dibaca, changelog/docs diperiksa, CLI 2.121.0 membuat migration sebelum final; filename diselaraskan timestamp server 20261020090306; guard review tambahan 20261020091404 menserialkan create/rotate dengan Trash dan menolak link baru untuk proyek arsip. Migrasi sudah diterapkan via Supabase: bp_editor_profiles, bp_document_settings, RLS/member RPC/realtime publication, writer profile/Trash guard. Private definer/public invoker untuk mutasi baru. Tidak ada frontend secret/deploy.
- PGlite tes semua migration; remote rollback fixture dua anggota/outsider lolos; counts tetap1 ruang/2 dokumen/2 versi, profil dasar seeded3. Adapter Realtime empat tabel + refresh15s. Tidak mengklaim dua laptop browser nyata atau websocket E2E hanya dari SQL.
- Advisor diperiksa; peringatan anonymous Auth/member policies, definer RPC lama dan index/policy lama dicatat di docs/MAP-010.md, tanpa melonggarkan akses. Schema tidak merusak kolom bp_documents yang dipakai writer positional insert lama.
- Verifikasi akhir: typecheck/lint, 54 tes Node + seluruh UI DOM, ZIP CRC/runtime/device navigation, PDF render/embedded JSON, build portable dan base Pages. Guarded installer lima baseline/no-op/rollback/mismatch dan simulasi port diperiksa. Native browser Mac/HP belum diverifikasi.
- Paket guarded menerima MAP-005/006/007/008/009 persis; external backup/rollback, no-op/mismatch/port safeguards. docs/MAP-010.md berisi instruksi Mac, batas tes dan rollback source vs data. Root ~/Desktop/0. Canvas UI-UX, Node24, localhost5174. Installer tidak menjalankan SQL/npm/deploy. Versi laptop/Pages belum dipasang.

## Catatan versi sebelumnya

# PROJECT_STATE — MAP-009

- Empat gambar 20 Oktober (075040 / 075047 / 075049 / 075049-1) dibaca dari attachment lokal: entry, home, canvas dan flow. User meminta visual lebih clean dan peningkatan logika. Source MAP-008 disalin ke map009-baseline sebelum edit. Data proyek / seed Ryan / HR business rules tidak diganti.
- Entry/home baru: putih/abu/lavender, header dan pilihan editor, diagram dekoratif code-native, search/sort, kartu dan menu Desain/Alur yang benar-benar bekerja. State koneksi jujur. Form trim empty guard dan busy fieldset mencegah submit berulang saat koneksi.
- EditorChrome satu baris menggantikan dua bar; seluruh aksi tetap tersedia. Nama proyek disimpan Enter/blur, Escape batal, kosong kembali semula. Format header untuk halaman aktif. Panel rail mengambang kiri, dock controls ke menu, default semua panel tertutup; preferensi v3 dan strip 88 px. Header/entry/home rules lama dibersihkan; tema baru clean.css.
- PageFilmstrip terpisah, nomor/nama/seleksi, scroll ke halaman aktif, panah saat overflow dan resize/hide independen. Strip tetap ada saat hide panel. Editor fullscreen memakai API atau informasi unsupported; preview/presentasi/client tetap memakai fitur sebelumnya.
- Logika: autoFit vs manualZoom terpisah; drag gambar benar-benar memakai titik drop; text commit menargetkan ID editing; zoom flow menjaga titik tengah. User Flow rail/panel lebih ringkas, drag kepala ke floating dan dock kembali, posisi browser tanpa write proyek. Margin dock kanan ikut dihitung. Sukses toast 6 detik, error/konflik tidak auto-dismiss.
- Tidak ada dependency, schema proyek, SQL, key, Auth, RLS, layanan cloud, atau deploy berubah. Supabase tidak dioperasikan pada revisi ini. Semua editor yang membaca varian tetap perlu MAP-007+. Proyek Ryan existing dan History tidak direset.
- Verifikasi typecheck/lint, 47 Node, UI JSDOM lama+baru; build lokal/portable/base Pages; installer empat baseline/no-op/rollback/mismatch/port guards. Fullscreen UI test memakai mock API; tidak menyebutnya native. Tidak ada QA pixel/browser native Mac/Safari/touch/dua laptop. Browser environment tidak dapat membuka lokal dan pembatasan tidak diakali.
- Paket blueprint-map-009-patch.cjs menerima MAP-005/006/007/008 persis. Root Mac ~/Desktop/0. Canvas UI-UX; Node24; 127.0.0.1:5174; membuka template Ryan existing di design. Panduan docs/MAP-009.md. Source belum dipasang di Mac atau diterbitkan.

## Catatan versi sebelumnya

# PROJECT_STATE — MAP-008

- User menolak perubahan MAP-007, meminta ZIP source sebelumnya sebagai arsip dan melanjutkan perbaikan. Enam referensi visual 20 Oktober (043938 sampai 044004) dibaca: modular panel, inspector berkelompok, navigasi dan menu ringkas. Tidak mengklaim referensi adalah screenshot aplikasi aktif.
- ZIP `blueprint-MAP-006-before-MAP-007-backup.zip` berasal dari map007-baseline: 94 file source persis, tiap hash diverifikasi. Petunjuk/hash di luar direktori source. Bukan backup data cloud/browser atau source laptop yang tidak diterima.
- Penyebab strip hilang: canvas-editor MAP-007 tidak lagi height:100%, sementara main editor-body bukan flex container. Parent overflow dapat memotong child/footer yang membesar. Body kini flex; editor dua baris grid minmax(0,1fr) dan footer auto. Strip tidak bergantung pada zen panel; hanya toggle strip eksplisit yang menyembunyikannya.
- Thumbnail nomor/nama/seleksi, auto scroll halaman aktif, resize hingga strip tipis. Rail kiri Elemen/Teks/Upload; kanan Layer/Halaman/Properti. Default kanan tertutup; preferensi v2 menghindari flag hide lama. Palet dua kolom memakai contoh bentuk/nama; kategori enam ikon tetap satu baris. Inspector Layout/Konten/Tampilan/Navigasi memodifikasi properti asli.
- Format/preview/client/brief, edit tim, History dan ID proyek dipertahankan. Tidak ada dependency, schema JSON proyek, SQL migration, key, izin atau cloud live write yang berubah. Tidak deploy. Source rollback tidak menurunkan varian layout data.
- Verifikasi typecheck/lint, 46 Node + UI JSDOM, build lokal/portable/base Pages; installer tiga baseline/no-op/rollback/mismatch/port guard. JSDOM bukan bukti posisi piksel. Browser cloud menolak file URL dan tidak menjangkau dev; tidak mencoba mengakali pembatasan. Native Mac/Safari/touch/dua laptop belum diverifikasi.
- Installer `blueprint-map-008-patch.cjs` menerima MAP-005/006/007 persis, backup luar root. Mac ~/Desktop/0. Canvas UI-UX, Node24, dev 127.0.0.1:5174, URL template Ryan + view=design membuka edit tim yang sudah tersimpan. Panduan docs/MAP-008.md. Belum dipasang di Mac pengguna.

## Catatan versi sebelumnya

# PROJECT_STATE — MAP-007

- Seluruh 11 screenshot baru dan teks brief 20 Oktober 2026 dibaca. Penyebab format rusak: fungsi size lama meng-clamp elemen ke ukuran kecil; format besar kemudian memakai geometry yang sudah terjepit. Presentasi merender canvas mentah tanpa Fit; client mempertahankan sidebar pada viewport sempit dan brief memakai textarea abu-abu.
- Editor: dock kiri/kanan, floating drag kepala/ikon, reorder rail, resize, collapse 36px, hide/restore, Layer dan Properti, enam filter ikon satu baris, strip halaman resize/hide dan mode bersih. Preferensi lokal browser; reset melalui profil N/H/R. Field/komponen tetap data proyek nyata.
- DesignSchema mendapat optional layoutMode/layouts berisi geometry per mode; konten/ID/target/asset tetap tunggal. Desktop -> mobile -> presentation -> desktop pada 18 halaman mengembalikan geometry desktop persis. Duplicate layout memetakan ID baru tanpa memutasi sumber. Sebelum konversi perangkat pertama, App membuat checkpoint History.
- Legacy constrained geometry dapat ditata ulang saat memilih format atau via Rapikan susunan. Tidak merekonstruksi posisi yang telah hilang. Responsive projection menginfer kelompok visual; desain kompleks tetap perlu penataan. Maksimal tinggi mobile otomatis 4000px; overflow memberi error yang jelas.
- PrototypeViewer / FitDesign dipakai oleh preview, presentasi dan client. Frame HP hanya pada preview desktop; HP asli memakai lebar layar. Client mempunyai pemilih halaman dan brief baca dengan kontras jelas. Poll / RLS / revoke per proyek dipertahankan; client tidak menulis format ke proyek. Live di samping ruang dihapus; error/conflict saves tetap terlihat.
- Tidak ada perubahan dependency, migration, project/key atau akses Supabase. Payload JSON varian diverifikasi melalui SQL lokal PGlite dan SDK roundtrip. Tidak ada cloud live write atau deploy. Frontend lama tidak memahami field baru; semua editor/client perlu MAP-007. Rollback source tidak menurunkan data/History baru.
- Verifikasi: typecheck/lint, 46 tes Node, UI JSDOM termasuk pointer dock/resize, drop panel, checkbox/select, layout roundtrip/backup checkpoint, reset prefs, phone/presentation view, fullscreen fallback, client 347px dan brief readonly. Build lokal/portable/Pages dan installer dua baseline/rollback/source/port guards lulus. Browser cloud tidak menjangkau dev; tidak mengklaim browser native/Safari/touch/dua laptop.
- Paket kumulatif blueprint-map-007-patch.cjs, baseline MAP-005 dan MAP-006/RYAN-002; Mac ~/Desktop/0. Canvas UI-UX; Node24; 127.0.0.1:5174/?template=ryan-002&view=design. Backup luar root dan rollback guarded. Belum dipasang di Mac atau diterbitkan.

## Catatan versi sebelumnya

# PROJECT_STATE — MAP-006 / RYAN-002

- Bukti screenshot user: MAP-005 sudah terpasang, tetapi proyek aktif masih seed lama 9 layar / 9 koneksi. Installer sebelumnya hanya memasang editor; JSON Ryan belum diterapkan. User meminta susunan persis mindmap Ryan, bukan perluasan 37 layar.
- Rancangan baru: 18 layar, 21 koneksi, tiga cabang Employee / User / HR dan Account Settings / Interactive Demo / proses bersama. Posisi ditelusuri dari screenshot Ryan lalu diskalakan sesuai ukuran kartu editor. Welcome tetap tanpa branding ADF sesuai permintaan sebelumnya. Tidak mengklaim pixel-identical terhadap editor lama.
- Penerapan: URL ?template=ryan-002 setelah ruang tim ready, atau tombol Buka mindmap Ryan pada home/editor. Atomic create+named checkpoint melalui repository yang ada; project ID stabil per ruang, buka ulang memakai versi tersimpan tanpa reset. Save gagal tetap error. Race insert dapat membuka hasil yang sudah dibuat anggota lain. Draft proyek sebelumnya di-flush dahulu.
- Default Alur Personnel memakai rancangan Ryan. Canvas fit sekali saat pertama diukur, tidak mengubah zoom/pan saat node diedit. FAQ proses di Preview memakai tujuan/output/pertanyaan brief, bukan AI hidup atau enam node FAQ tambahan.
- Supabase project qjmwxezxtsuikywqoajj, schema, URL/key dan migration dipertahankan. Tidak ada operasi cloud / deploy dilakukan dari lingkungan ini pada revisi RYAN-002. Produk HR / AI / tanda tangan / stempel / OTP tetap rancangan.
- Verifikasi: typecheck/lint, 42 tes Node dan UI JSDOM (autoterapkan, auth gate, save error, History awal, preserve old projects dan team edits, HR journey, FAQ). Build lokal/portable/base Pages; installer baseline MAP-005, repeat/no-op, rollback, source mismatch dan port teridentifikasi diuji. Bukan QA browser native, Safari atau dua laptop nyata. Instalasi Mac belum dilakukan.
- Paket: blueprint-ryan-002-patch.cjs; root ~/Desktop/0. Canvas UI-UX; Node24; 127.0.0.1:5174/?template=ryan-002. Backup source luar root; rollback mempertahankan data tim. Jangan jalankan installer MAP-005 di atas MAP-006. Panduan docs/RYAN-002.md.

## Catatan versi sebelumnya

# PROJECT_STATE — MAP-005

- User meminta flow yang bisa dimanipulasi langsung, minim form, lebih banyak elemen draggable dan akses khusus client. Referensi image(20261019-060656).png benar-benar dibaca.
- Flow: port drag/click connect, reconnect kedua ujung, drag bend, rename/disconnect; semuanya terkait tombol Preview asli dan mempertahankan ID koneksi. Kolom geometris memindahkan node di dalamnya, resize/rename/delete kelompok; ikon drag/drop; quick output/PIC/type/integration; route auto untuk nama baru. Lihat docs/MAP-005.md.
- Canvas: 17 jenis/24 preset elemen dan blok, drag/drop posisi, layer reorder, kolom tabel, input prototype nyata. PDF/JSON mencakup elemen baru, kolom dan geometry.
- Client: #review code, sesi anonymous terpisah dari editor, visitor per link/proyek, RLS baca dokumen/gambar aktif saja, tanpa write RPC/membership/History. Poll 5 detik + focus/online/visibility, bukan klaim client websocket. Link 30 hari, rotate membersihkan visitor lama, revoke menutup akses berikutnya.
- Supabase qjmwxezxtsuikywqoajj dipertahankan. Migration blueprint_client_review sudah diterapkan. PGlite dan remote transaction rollback memverifikasi read/write isolation, RLS, rotate/revoke/refresh; fixture tidak dipersistenkan. Tidak membuat link client pengguna secara otomatis.
- Verifikasi: strict typecheck/lint, 39 tes Node termasuk PDF semua preset, alur JSDOM pointer/drop/reconnect/client. Build lokal/portable/Pages base. Bukan browser native/Safari/touch/dua laptop fisik; belum user accepted atau frontend deploy.
- Installer kumulatif SUPA-001/MAP-003/MAP-004, backup/rollback guarded; --stop-dev hanya SIGTERM Vite dari root yang sama setelah identifikasi. Mac root ~/Desktop/0. Canvas UI-UX, Node24, 127.0.0.1:5174.
- Semua editor/client perlu MAP-005. Source lama tidak memahami elemen/flowColumns baru; rollback source tidak mengonversi data cloud. Data lama/History/gambar tidak dibuang; ekspor JSON dan snapshot sebelum revisi tetap penting.
- Personnel HR asli tetap Feishu People/Lark Base/workflow; pilihan integrasi adalah rencana/simulasi, bukan koneksi produk aktif.

## Catatan sebelumnya

# PROJECT_STATE — MAP-004

- User meminta kolaborasi antarperangkat dan hierarki UI seperti referensi Canva. Audit cloud menunjukkan nol workspace/proyek pengguna; source GitHub main masih SUPA-001 60fca40. N/H/R sebelumnya hanya label, data belum dibagikan ke ruang yang sama.
- Cloud-first TeamGate membuat/gabung ruang melalui invite. Beranda proyek, format baru, panel alat kiri, toolbar objek, strip halaman, tab Desain/Alur, Preview/Presentasi, History dan handoff. Lihat docs/MAP-004.md.
- Field-level three-way merge server/client; advisory transaction lock per proyek. Same-field/delete-edit/relation/order conflicts melindungi draft. Tidak ada character-level CRDT atau presence palsu.
- Postgres Changes + focus/online + polling 15 detik; History terbuka ikut refresh. Local draft/journal serta snapshot lama tetap dapat ditemukan dan diekspor dari Data perangkat. Pemulihan awal menyalin rancangan aktif/draft; History asal tetap perangkat.
- Migration additive blueprint_collaborative_merge diterapkan pada qjmwxezxtsuikywqoajj. Remote rollback test dua anggota/merge/conflict/checkpoint/outsider lulus; nol workspace/proyek fixture tertinggal. RLS/private assets/membership tidak dilonggarkan. Advisor intentional authenticated definer/anonymous member access didokumentasikan.
- Verifikasi Linux Node24: typecheck/lint, 32 tes Node, UI JSDOM, PDF dan build lokal/base Pages. Browser QA timeout; Safari/mobile/fullscreen/dua laptop fisik belum diverifikasi. Jangan menyebut mock atau rollback SQL sebagai websocket dua perangkat live.
- Paket kumulatif MAP-004 menerima baseline SUPA-001 atau MAP-003 persis. Backup/rollback source hash guarded, tanpa membunuh proses/npm/SQL/deploy. Root Mac ~/Desktop/0. Canvas UI-UX; URL 127.0.0.1:5174.
- Source belum dipasang di Mac, frontend belum dipush/deploy, belum user accepted. HR Lark/Feishu asli dan WeChat tambahan belum dikerjakan.

## Catatan sebelumnya

# PROJECT_STATE — MAP-003

- Canvas berbasis komponen data; multi-sistem/halaman, live properties, button navigation, image delete, autosave/journal/conflict, named History, PDF/JSON handoff. Lihat docs/MAP-003.md.
- Schema tambahan bp_documents / bp_document_versions dan RPC dipasang lewat Supabase pada qjmwxezxtsuikywqoajj; publication Realtime ditambah tanpa mengganti publikasi lama. Tabel lama tetap ada.
- Remote rollback verification lulus untuk save/checkpoint/conflict/History/outsider. Tidak ada fixture Auth/workspace yang tertinggal. Belum ada workspace pengguna pada waktu pemeriksaan; owner dibuat dari browser pengguna.
- Data IndexedDB lama dipertahankan tanpa upgrade; satu kali disalin ke adfriends-blueprint-v1-003. Rollback source dapat membaca DB lama.
- Realtime whole-document optimistic concurrency; bukan CRDT. Konflik menjaga draft lokal. Browser dua perangkat dan fullscreen native belum diverifikasi. Lark/Feishu product integration masih spesifikasi, bukan koneksi aktif.
- Pengujian: typecheck/lint/26 tes Node + skenario UI JSDOM, actual PDF rendering/attachment, local portable dan Pages base build. Tidak mengklaim browser QA.
- Frontend belum dipush/deploy dari lingkungan ini. Installer MAP-003 ditargetkan ke source SUPA-001 / GitHub 60fca40. Mac root: ~/Desktop/0. Canvas UI-UX.

## Catatan sebelumnya

# PROJECT_STATE — SUPA-001

- Project Supabase qjmwxezxtsuikywqoajj berhasil diakses melalui koneksi pengguna. URL API dan publishable key diverifikasi HTTP 200.
- Enam tabel bp_* dan seluruh RPC/RLS/private bucket sudah dipasang pengguna. SQL awal tidak dijalankan ulang; schema tim tidak diubah.
- Anonymous Sign-Ins sudah ON, dikonfirmasi lewat API setelah pengguna mengaktifkannya.
- Verifikasi database save/load/rename/Trash/restore/conflict/invite/outsider/anon lulus dalam transaksi rollback. SDK/API live diverifikasi terpisah; lihat docs/SUPABASE-CONNECTION.md untuk batas pengujian.
- src/config/supabase.ts berisi konfigurasi publik; Settings memakai default URL/key dan Buat workspace pada koneksi pertama. Konfigurasi tersimpan atau env eksplisit tetap didahulukan.
- Tidak ada secret key, kode undangan atau sesi pengguna dalam bundle. Workspace tim pertama dibuat dari browser pengguna agar pengguna menjadi owner.
- Panduan aktif: docs/SUPABASE-CONNECTION.md. Patch SUPA-001 hanya source; tidak otomatis push/deploy. Jalankan push-github.cjs lalu workflow Pages untuk menerbitkan frontend terbaru.

## Catatan sebelumnya

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

# Aturan workspace Blueprint

1. Baca PROJECT_STATE.md, README dan source aktual. Terapkan standar kerja START-HERE yang telah diberikan pengguna.
2. Batas scope: tool perancangan/prototype dan presentasi; Personnel DEV-001 tetap diparkir. Jangan mengganti keputusan backend HR dengan asumsi Supabase.
3. Dev lokal, tanpa deploy sampai user meminta.
4. Pisahkan UI, domain/graf, repository dan data contoh. Pertahankan ID node stabil saat mengganti visual.
5. File gambar versi baru memakai ID baru; jangan menimpa file/versi lama secara diam-diam.
6. Simpanan gagal tidak boleh ditampilkan berhasil. Jangan membuang perubahan tab lain atau mengganti cloud schema tanpa membaca keadaan aktual.
7. TypeScript strict, validasi runtime, tanpa any. Jalankan pemeriksaan sesuai risiko; jangan mengklaim browser QA dari build/test Node.
8. Penyerahan memakai installer terverifikasi, instruksi Terminal macOS, lokasi file, hasil yang terlihat, batas tes dan rollback. Backup di luar root.
9. Jangan mencampur data rahasia dengan data presentasi/demo. Cloud key rahasia tetap di server.
10. Update state/checkpoint saat keputusan berubah.

11. Batas eksplisit pengguna MAP-018: jangan mengakses, menjalankan SQL, mengubah schema/data/akun, atau melakukan tes online di Supabase di belakang layar. Kirim SQL murni beserta arahan; pengguna mengeksekusi sendiri. Installer hanya source lokal; tidak menjalankan SQL atau deploy.

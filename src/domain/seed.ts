import { validateProject } from './model.ts';
import type { MapNode } from './model.ts';
const node = (id: string, title: string, subtitle: string, icon: MapNode['icon'], type: MapNode['type'], x: number, y: number, route: string, purpose: string, output: string, integration = '', status: MapNode['integrationStatus'] = 'none'): MapNode => ({ id, title, subtitle, icon, type, x, y, route, purpose, output, integration, integrationStatus: status, owner: 'Tim proyek', externalUrl: '', activeAssetId: null });
export function seedProject() {
  return validateProject({ schemaVersion: 1, id: 'personnel-blueprint', title: 'Personnel Management', description: 'Peta pengalaman HR — dari akses hingga dokumen tersimpan.', updatedAt: new Date().toISOString(),
    nodes: [
      node('welcome','Welcome','Dua cara masuk','login','entry',90,230,'/','Memperkenalkan manfaat sistem dan menawarkan Masuk atau Coba Demo.','Pengguna memilih sesi kerja atau panduan demo.'),
      node('login','Login HR','Identitas & akses','login','screen',400,90,'/login','Mengautentikasi HR dan menentukan akses sebelum membuka data.','Sesi HR terautentikasi. Pada blueprint ini hanya simulasi.','Login / OTP internal','planned'),
      node('demo','Demo interaktif','Panduan seperti game','play','screen',400,380,'/demo','Memulai panduan dengan data contoh dan langkah yang dapat diulang.','Sesi demo terisolasi, tanpa data karyawan nyata.'),
      node('dashboard','Beranda HR','Prioritas pekerjaan','grid','screen',720,230,'/app','Menampilkan kontrak mendekati berakhir dan tindakan berikutnya.','Daftar prioritas HR dan akses ke data karyawan.'),
      node('people','Data karyawan','Pilih & periksa data','users','screen',1040,230,'/app/employees','Memilih karyawan dan memeriksa sumber data sebelum membuat dokumen.','Snapshot data karyawan untuk draft kontrak.','Feishu People API','planned'),
      node('draft','Draft kontrak','Template & auto-fill','file','screen',1040,550,'/app/contracts/new','Membuat draft dari template dan informasi karyawan yang telah diperiksa.','Draft tersimpan untuk diperiksa; klausul final menunggu HR.'),
      node('review','Review dokumen','Periksa sebelum setuju','check','process',720,550,'/app/contracts/review','Memeriksa data dan perubahan. Kandidat bantuan AI: membaca kontrak lama, menampilkan sumber, lalu meminta konfirmasi HR.','Draft telah diperiksa. Fungsi AI masih usulan.'),
      node('approval','Persetujuan','Konfirmasi internal','check','process',400,680,'/app/contracts/approval','Mengonfirmasi persetujuan internal dengan identitas, waktu, dan riwayat. Urutan approver menunggu keputusan HR.','Keputusan dan timestamp tercatat. Penandatangan karyawan belum ditetapkan.','Lark Workflow','planned'),
      node('archive','Arsip dokumen','Hasil & jejak aktivitas','archive','output',90,680,'/app/archive','Menyimpan hasil, menyediakan pencarian, unduhan dan riwayat sesuai izin.','Dokumen, status, dan audit trail dapat ditelusuri.','Lark Base / Workflow','planned'),
    ],
    edges: [
      {id:'e1',source:'welcome',target:'login',label:'Masuk',feedback:'Simulasi membuka login HR.'},
      {id:'e2',source:'welcome',target:'demo',label:'Coba Demo',feedback:'Data contoh dipakai untuk simulasi.'},
      {id:'e3',source:'login',target:'dashboard',label:'Masuk ke workspace',feedback:'Simulasi identitas HR; belum mengautentikasi akun nyata.'},
      {id:'e4',source:'demo',target:'dashboard',label:'Mulai panduan',feedback:'Panduan masuk ke prioritas pekerjaan HR.'},
      {id:'e5',source:'dashboard',target:'people',label:'Lihat kontrak berakhir',feedback:'Tampilkan karyawan contoh yang kontraknya perlu ditinjau.'},
      {id:'e6',source:'people',target:'draft',label:'Buat perpanjangan',feedback:'Simulasi auto-fill informasi karyawan.'},
      {id:'e7',source:'draft',target:'review',label:'Simpan & review',feedback:'Draft contoh menuju pemeriksaan; tidak ada kontrak asli disimpan.'},
      {id:'e8',source:'review',target:'approval',label:'Ajukan persetujuan',feedback:'Simulasi mengajukan dokumen yang telah diperiksa.'},
      {id:'e9',source:'approval',target:'archive',label:'Konfirmasi & arsipkan',feedback:'Simulasi hasil dan audit trail; belum menjalankan Lark Workflow.'},
    ], assets: [], presentation: ['welcome','demo','dashboard','people','draft','review','approval','archive'],
  });
}

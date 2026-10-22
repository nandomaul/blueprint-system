import {validateProject} from './model.ts';
import type {Project,ProjectBrief} from './model.ts';
export const personnelFeatures=[
 {id:'FAQ',title:'FAQ interaktif AI',description:'FAQ tersedia dari setiap jendela. Pengguna dapat bertanya lewat teks atau gambar beserta deskripsi; AI menjawab dari knowledge proses yang diizinkan.',acceptance:'FAQ mempertahankan konteks halaman; teks/gambar dapat ditinjau sebelum dikirim. Jawaban menyebut sumber/versi dan mengakui ketika informasi belum tersedia.'},
 {id:'DEMO',title:'Demo interaktif',description:'Calon pengguna menjalankan alur dengan data contoh tanpa login, melalui panduan langkah demi langkah.',acceptance:'Demo dapat dimulai tanpa login, memakai ruang/data contoh terpisah, dapat diulang, dan tidak mengirim approval atau mengubah data produksi.'},
 {id:'ADMIN',title:'Superadmin',description:'Akun yang ditunjuk dapat mengakses seluruh data sistem dan mengatur hak akses sesuai kebijakan perusahaan.',acceptance:'Penetapan Superadmin memerlukan otorisasi; pemeriksaan hak berlaku di server dan akses/perubahan tercatat dalam audit.'},
 {id:'REVIEW',title:'Review Draft AI',description:'AI membantu memeriksa data diri, tanggal, kelengkapan dan typo sebelum dokumen diajukan untuk approval.',acceptance:'Temuan mengacu pada sumber dan versi draft; HR meninjau hasil dan mengonfirmasi pengajuan. AI tidak menyetujui atau menandatangani dokumen.'},
 {id:'ASSET',title:'Simpan tanda tangan & stempel',description:'Akun dapat menyimpan tanda tangan sendiri atau stempel perusahaan hanya dengan izin yang sesuai.',acceptance:'Aset disimpan privat dengan pemilik, lingkup penggunaan, masa berlaku dan pencabutan izin; menyimpan spesimen tidak otomatis mengizinkan pemakaian.'},
 {id:'SIGN',title:'Permintaan tanda tangan',description:'Pengguna dapat meminta tanda tangan pihak lain dalam proses approval dengan persetujuan pemilik tanda tangan.',acceptance:'Persetujuan terikat pada identitas, versi/hash dokumen dan waktu; izin dapat ditolak/dicabut. Perubahan dokumen memerlukan persetujuan baru.'},
 {id:'ARCHIVE',title:'Smart-database dokumen',description:'Dokumen tersimpan dengan pencarian, unduhan berbagai format, dan riwayat berdasarkan hak akses.',acceptance:'Pencarian, hasil unduhan dan riwayat menerapkan izin yang sama; ekspor mempertahankan versi dan jejak proses. Format final disetujui HR.'},
 {id:'CLASSIFY',title:'Analitik & klasifikasi AI',description:'AI mengelompokkan dokumen seperti KTP dan KK berdasarkan knowledge yang diberikan agar pencarian dan penarikan data lebih efisien.',acceptance:'AI menampilkan kategori, sumber aturan dan keyakinan; hasil meragukan masuk review manusia. Koreksi tercatat dan hanya dokumen yang berizin dapat dianalisis.'}
] as const;
const marker='[ADF-riends · 8 fitur]';
const additions:Partial<ProjectBrief>={
 scope:marker+'\nSpesifikasi produk yang akan dibangun:\n'+personnelFeatures.map((f,i)=>`${i+1}. ${f.title}: ${f.description}`).join('\n'),
 acceptance:marker+'\n'+personnelFeatures.map((f,i)=>`${i+1}. ${f.acceptance}`).join('\n'),
 dataModel:marker+'\nKnowledgeSource(id, versi, pemilik, lingkup_akses, status_terbit); ClassificationResult(document_version_id, kategori, sumber_aturan, confidence, review_status, koreksi); SignatureConsent(pemilik, pemohon, document_version_hash, lingkup, keputusan, waktu, pencabutan). Ini rancangan data produk HR, bukan tabel Blueprint aktif.',
 integrations:marker+'\nProvider AI, SOP/knowledge resmi dan kebijakan pemrosesan gambar dipilih saat implementasi. Retrieval, klasifikasi dan review hanya memproses data dalam izin pengguna; demo memakai data contoh terpisah. Fitur ini belum merupakan konektor AI atau approval produksi.'
};
export function hasPersonnelFeatures(p:Project){return Object.keys(additions).every(key=>p.brief[key as keyof ProjectBrief].includes(marker));}
/** Explicit, idempotent append: existing decisions, IDs, layouts and assets stay intact. */
export function addPersonnelFeatures(p:Project):Project{
 const brief={...p.brief};let changed=false;
 for(const [key,value] of Object.entries(additions)){const field=key as keyof ProjectBrief;if(!brief[field].includes(marker)){brief[field]=[brief[field].trimEnd(),value].filter(Boolean).join('\n\n');changed=true;}}
 return changed?validateProject({...p,brief}):p;
}

import type {MapNode,Project} from './model.ts';
export type AssistantMode='faq'|'review'|'classify';
export type DemoAnswer={text:string;sources:{label:string;excerpt:string}[]};
const words=(s:string):string[]=>s.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu)??[];
/** Local knowledge lookup for the prototype. No provider, network or image OCR. */
export function answerDemo(project:Project,node:MapNode,question:string,imageName?:string):DemoAnswer{
 const input=[...new Set(words(question))],sources=[{label:node.title,excerpt:[node.purpose,node.output,node.flowNote].filter(Boolean).join('\n')},...project.nodes.filter(n=>n.id!==node.id).map(n=>({label:n.title,excerpt:[n.purpose,n.output].filter(Boolean).join('\n')})),...Object.entries(project.brief).map(([label,excerpt])=>({label:'Brief · '+label,excerpt}))].filter(s=>s.excerpt.trim());
 const ranked=sources.map((s,i)=>{const tokens=new Set(words(s.label+' '+s.excerpt));return {...s,score:input.reduce((n,w)=>n+(w.length>2&&tokens.has(w)?1:0),0),i};}).filter(s=>s.score>0).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,3);
 const selected=ranked.length?ranked:input.some(w=>['ini','halaman','langkah','tujuan','output','this','page','step'].includes(w))?sources.slice(0,1):[];
 const context=selected.map(s=>({label:s.label,excerpt:s.excerpt.slice(0,700)})),text=context.length?context.map(s=>s.excerpt).join('\n\n'):'Belum ada jawaban dalam knowledge proyek ini. Tambahkan materi ke brief atau tanyakan kepada penanggung jawab proses.';
 return {text:(imageName?'Gambar terlampir: '+imageName+'. Simulasi ini memakai deskripsi yang Anda ketik; isi gambar belum dibaca dengan OCR.\n\n':'')+text,sources:context};
}
export type ReviewInput={name:string;start:string;end:string;body:string};
export function reviewDraft(input:ReviewInput){
 const findings:{field:keyof ReviewInput;message:string;correction?:string}[]=[];
 if(!input.name.trim())findings.push({field:'name',message:'Nama karyawan belum diisi.'});
 const valid=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!valid(input.start))findings.push({field:'start',message:'Tanggal mulai belum valid.'});if(!valid(input.end))findings.push({field:'end',message:'Tanggal selesai belum valid.'});
 if(valid(input.start)&&valid(input.end)&&input.end<input.start)findings.push({field:'end',message:'Tanggal selesai lebih awal dari tanggal mulai.'});
 if(!input.body.trim())findings.push({field:'body',message:'Isi draft belum diisi.'});
 const corrected=input.body.replace(/perusahann/gi,'perusahaan').replace(/karywan/gi,'karyawan').replace(/kontrakkk/gi,'kontrak');
 if(corrected!==input.body)findings.push({field:'body',message:'Ditemukan contoh typo yang dapat diperbaiki.',correction:corrected});
 return findings;
}
export function classifyDocument(name:string,description:string){
 const s=(name+' '+description).toLowerCase().replace(/[_.-]+/g,' ');
 if(/\bkk\b|kartu keluarga/.test(s))return {category:'Kartu Keluarga',reason:'Nama file/deskripsi menyebut KK atau Kartu Keluarga.'};
 if(/\bktp\b|kartu tanda penduduk/.test(s))return {category:'KTP',reason:'Nama file/deskripsi menyebut KTP atau Kartu Tanda Penduduk.'};
 if(/kontrak|contract/.test(s))return {category:'Kontrak',reason:'Nama file/deskripsi menyebut kontrak.'};
 if(/\bcv\b|curriculum|resume/.test(s))return {category:'CV',reason:'Nama file/deskripsi menyebut CV atau resume.'};
 return {category:'Perlu review',reason:'Belum ada petunjuk kategori dalam nama file/deskripsi.'};
}

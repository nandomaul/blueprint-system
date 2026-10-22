import {iconPaths} from '../domain/iconPaths.ts';
import {PDFDocument,rgb} from 'pdf-lib';
import type {PDFPage,RGB} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {exportProject,profileName,revision,validateProject} from '../domain/model.ts';
import type {ProfileId,Project} from '../domain/model.ts';
import {visualDesign} from '../domain/designLayer.ts';
import {readiness,upgradeDesign} from '../domain/designer.ts';
const labels={problem:'Masalah',audience:'Pengguna & hak akses',scope:'Ruang lingkup',decisions:'Keputusan terkonfirmasi',assumptions:'Asumsi',dataModel:'Struktur data',integrations:'Mapping integrasi',acceptance:'Kriteria penerimaan',questions:'Pertanyaan terbuka'};
const hex=(v:string):RGB=>rgb(parseInt(v.slice(1,3),16)/255,parseInt(v.slice(3,5),16)/255,parseInt(v.slice(5,7),16)/255);
export function handoffText(project:Project):string{
  const p=upgradeDesign(validateProject(project));return [
    `SPESIFIKASI PEMBANGUNAN: ${p.title}`,`ID sistem: ${p.id}`,p.description,
    'STATUS: Ini rancangan/prototype. Supabase menyimpan rancangan; integrasi aplikasi bisnis harus diimplementasikan dan diuji terpisah.',
    ...Object.entries(labels).map(([key,label])=>`${label}\n${p.brief[key as keyof typeof labels]||'BELUM DIISI - perlu konfirmasi.'}`),
    'KOLOM USER FLOW',...(p.flowColumns??[]).map(c=>`${c.title} | ${c.id} | posisi ${c.x},${c.y} | ukuran ${c.width}x${c.height}`),'HALAMAN DAN ALUR',...p.nodes.flatMap(n=>[
      `${n.title} | ID ${n.id} | ${n.route} | ${n.type}`,
      `Tujuan: ${n.purpose||'BELUM DIISI'}`,`Output: ${n.output||'BELUM DIISI'}`,`PIC: ${n.owner||'Belum ditentukan'}`,
      `Integrasi: ${n.integration||'Tidak ada'} | Status: ${n.integrationStatus}`,
      `Link referensi: ${n.externalUrl||'Tidak ada'}`,`Penanda alur: ${n.flowColor??'Tidak ada'} | Catatan: ${n.flowNote||'Tidak ada'}`,
      ...(p.designLayer?.canvases?.filter(c=>c.id===n.id).flatMap(c=>c.design.elements.map(e=>`Design UI ${e.id} | ${e.kind} | ${e.text} | posisi ${e.x},${e.y} ukuran ${e.width}x${e.height} | aset ${e.assetId??'-'}`))??[]),
      `Layout aktif: ${n.design!.layoutMode??'format awal'} ${n.design!.width}x${n.design!.height}. Layout tersimpan: ${Object.entries(n.design!.layouts??{}).map(([mode,d])=>mode+' '+d.width+'x'+d.height).join(', ')||'belum ada varian'}. Geometry setiap layout ada di JSON lengkap.`,
      ...n.design!.elements.map(e=>`Komponen ${e.id} | ${e.kind} | ${e.text} | posisi ${e.x},${e.y} ukuran ${e.width}x${e.height} | tombol ke ${e.target?`${p.nodes.find(n=>n.id===e.target)?.title} [${e.target}]`:'belum diatur'} | gambar ${e.assetId??'-'}`),
      ...p.edges.filter(e=>e.source===n.id).map(e=>`Koneksi: ${e.label} -> ${p.nodes.find(n=>n.id===e.target)?.title} [${e.target}]. ${e.feedback}`),
    ]),
    'REFERENSI GAMBAR',...p.assets.map(a=>`${a.name} | ID ${a.id} | halaman ${p.nodes.find(n=>n.id===a.nodeId)?.title} | V${a.version} | ${profileName(a.profile)} | ${a.createdAt}`),
    'URUTAN PRESENTASI',...p.presentation.map((id,i)=>`${i+1}. ${p.nodes.find(n=>n.id===id)?.title} [${id}]`),
    'KEKURANGAN RANCANGAN',...(readiness(p).length?readiness(p):['Bagian dasar sudah diisi; isi masih perlu direview.']),
    'INSTRUKSI CHAT BERIKUTNYA','Baca PDF dan JSON ini sebagai spesifikasi rancangan. Bangun aplikasi dari satu alur utama. Mulai dari dev, deploy setelah diminta. Pisahkan fakta, asumsi dan pertanyaan terbuka. Jangan menganggap integrasi berstatus rencana/simulasi sudah terhubung. Pertahankan ID halaman untuk traceability. Buat source nyata dan tes alur yang dipilih. Jangan masukkan credential di frontend atau PDF.',
  ].join('\n\n');
}
export async function buildHandoffPdf(project:Project,profile:ProfileId|null,fontBytes:Uint8Array,images:Map<string,Uint8Array>=new Map()):Promise<Uint8Array<ArrayBuffer>>{
  const p=upgradeDesign(validateProject(project)),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const font=await doc.embedFont(fontBytes,{subset:true});
  const text=handoffText(p),supported=new Set(font.getCharacterSet()),bad=[...new Set([...text].filter(c=>!['\n','\r','\t'].includes(c)&&!supported.has(c.codePointAt(0)!)))];
  if(bad.length)throw new Error('Font PDF belum mendukung karakter '+bad.slice(0,8).join(' ')+'. Gunakan JSON lengkap atau ubah karakter tersebut sebelum ekspor PDF.');
  doc.setTitle(p.title+' - Blueprint documentation');doc.setAuthor(profileName(profile));doc.setSubject('Spesifikasi rancangan aplikasi');doc.setCreator('Blueprint '+revision);
  let page!:PDFPage,y=0;const W=595,H=842,M=45,ink=rgb(.09,.09,.11),muted=rgb(.42,.42,.47);
  function newSheet(){page=doc.addPage([W,H]);y=H-65;page.drawText('BLUEPRINT / LARK HANDOFF',{x:M,y:H-34,size:8,font,color:muted});}
  function wrap(value:string,size:number,maxWidth:number):string[]{
    const lines:string[]=[];
    for(const paragraph of value.replace(/\r/g,'').split('\n')){
      if(!paragraph){lines.push('');continue;}let line='';
      for(const word of paragraph.split(/\s+/)){
        const candidate=line?line+' '+word:word;
        if(font.widthOfTextAtSize(candidate,size)<=maxWidth){line=candidate;continue;}
        if(line){lines.push(line);line='';}
        for(const char of word){if(line&&font.widthOfTextAtSize(line+char,size)>maxWidth){lines.push(line);line=char;}else line+=char;}
      }lines.push(line);
    }return lines;
  }
  function para(value:string,size=10,color=ink){for(const line of wrap(value,size,W-M*2)){if(y<55)newSheet();if(line)page.drawText(line,{x:M,y,size,font,color});y-=size*1.65;}y-=7;}
  function heading(value:string){if(y<115)newSheet();y-=10;para(value,16);}
  newSheet();para(p.title,27);para('Dokumentasi rancangan',12,muted);para(`${revision} | ${new Date().toISOString()} | ${profileName(profile)}`,9,muted);para(`ID sistem: ${p.id}`,9,muted);para(p.description||'Ringkasan belum diisi.');heading('Status dan cara menggunakan');para('Dokumen ini berisi rancangan yang dapat diedit, bukan bukti bahwa aplikasi bisnis atau integrasi sudah aktif. Supabase digunakan untuk menyimpan rancangan dan gambar.');para('Upload PDF ini ke chat baru. Sertakan JSON lengkap bila perlu membangun ulang struktur canvas. Salinan JSON lengkap dan handoff.md juga dilampirkan di PDF; dukungan pembacaan attachment tergantung pembaca PDF.');para(`${p.nodes.length} halaman / ${p.edges.length} koneksi / ${p.assets.length} referensi gambar`);
  heading('Kesiapan rancangan');const issues=readiness(p);for(const issue of issues)para('- '+issue,9);if(!issues.length)para('Bagian dasar terisi. Review keputusan dan kriteria penerimaan sebelum implementasi.');
  for(const [key,label] of Object.entries(labels)){heading(label);para(p.brief[key as keyof typeof labels]||'BELUM DIISI - perlu konfirmasi.');}
  heading('Urutan presentasi');p.presentation.forEach((id,i)=>para(`${i+1}. ${p.nodes.find(n=>n.id===id)?.title} [${id}]`,9));
  async function image(id:string){const a=p.assets.find(a=>a.id===id);if(!a)return null;const bytes=images.get(id);if(bytes)return doc.embedPng(bytes);if(a.mime==='image/png')return doc.embedPng(a.data);if(a.mime==='image/jpeg')return doc.embedJpg(a.data);throw new Error('Gambar WebP harus dikonversi sebelum PDF dibuat.');}
  const cache=new Map<string,Awaited<ReturnType<typeof image>>>();for(const a of p.assets)cache.set(a.id,await image(a.id));
  function componentText(value:string,x:number,top:number,width:number,height:number,size:number,color:RGB){const lines=wrap(value,size,Math.max(10,width));let yy=top-size;for(const line of lines){if(yy<top-height)break;if(line)page.drawText(line,{x,y:yy,size,font,color});yy-=size*1.4;}}
  for(const n of p.nodes){
    newSheet();heading(n.title);para(`${n.route||'/'} | ${n.type} | ID ${n.id}`,9,muted);const d=visualDesign(p,n),scale=Math.min((W-M*2)/d.width,380/d.height),w=d.width*scale,h=d.height*scale;const top=y;
    page.drawRectangle({x:M,y:top-h,width:w,height:h,color:hex(d.background),borderColor:rgb(.8,.8,.83),borderWidth:.5});
    for(const e of d.elements){const x=M+e.x*scale,topE=top-e.y*scale,ew=e.width*scale,eh=e.height*scale,pad=['heading','text'].includes(e.kind)?0:12*scale;
      if(['ellipse','avatar'].includes(e.kind))page.drawEllipse({x:x+ew/2,y:topE-eh/2,xScale:ew/2,yScale:eh/2,color:hex(e.background)});else if(e.kind!=='line')page.drawRectangle({x,y:topE-eh,width:ew,height:eh,color:hex(e.background),borderColor:['input','select','textarea'].includes(e.kind)?rgb(.78,.78,.8):undefined,borderWidth:['input','select','textarea'].includes(e.kind)?.5:0});
      if(e.kind==='line'){page.drawLine({start:{x,y:topE-eh/2},end:{x:x+ew,y:topE-eh/2},thickness:Math.max(.5,2*scale),color:hex(e.color)});}
      else if(e.kind==='progress'){componentText(e.text+' '+(e.value??50)+'%',x,topE,ew,eh,e.fontSize*scale,hex(e.color));page.drawRectangle({x,y:topE-eh,width:ew*(e.value??50)/100,height:Math.max(2,6*scale),color:hex(e.color)});}
      else if(e.kind==='checkbox'){page.drawRectangle({x:x+pad,y:topE-pad-12*scale,width:12*scale,height:12*scale,borderColor:hex(e.color),borderWidth:.5});componentText(e.text,x+pad+20*scale,topE-pad,ew-pad-20*scale,eh-pad*2,e.fontSize*scale,hex(e.color));}
      else if(e.kind==='icon'){const iconScale=Math.min(ew,eh)/26;page.drawSvgPath(iconPaths[e.icon??'users'],{x:x+(ew-24*iconScale)/2,y:topE-(eh-24*iconScale)/2,scale:iconScale,borderColor:hex(e.color),borderWidth:1.6});}
      else if(e.kind==='image'&&e.assetId){const im=cache.get(e.assetId);if(im){if(e.id.startsWith('visual-'))page.drawImage(im,{x,y:topE-eh,width:ew,height:eh});else{const k=Math.min(ew/im.width,eh/im.height);page.drawImage(im,{x:x+(ew-im.width*k)/2,y:topE-eh+(eh-im.height*k)/2,width:im.width*k,height:im.height*k});}}}
      else if(e.kind==='table'){
        let rowTop=topE-pad;const fontSize=e.fontSize*scale,rowHeight=fontSize*1.4+16*scale;
        for(const row of e.text.split('\n')){if(rowTop-rowHeight<topE-eh)break;const cells=row.split('|'),cellWidth=(ew-pad*2)/cells.length;cells.forEach((cell,i)=>componentText(cell.trim(),x+pad+i*cellWidth,rowTop-8*scale,cellWidth,rowHeight-8*scale,fontSize,hex(e.color)));page.drawLine({start:{x:x+pad,y:rowTop-rowHeight},end:{x:x+ew-pad,y:rowTop-rowHeight},thickness:.5,color:rgb(.84,.85,.87)});rowTop-=rowHeight;}
      }
      else componentText(e.text,x+pad,topE-pad,ew-pad*2,eh-pad*2,e.fontSize*scale,hex(e.color));
    }
    y=top-h-20;para('Canvas rancangan (skala disesuaikan untuk PDF). Detail ukuran, radius dan layer ada di JSON.',8,muted);
    para('Tujuan: '+(n.purpose||'BELUM DIISI'));para('Output: '+(n.output||'BELUM DIISI'));para('PIC: '+(n.owner||'Belum ditentukan'));para(`Integrasi: ${n.integration||'Tidak ada'} | Status: ${n.integrationStatus}`,9);if(n.externalUrl)para('Link: '+n.externalUrl,9);
    heading('Komponen & aksi');for(const e of n.design!.elements){para(`${e.kind}: ${e.text||'(tanpa teks)'}`,9);para(`ID ${e.id} | X ${e.x}, Y ${e.y} | ${e.width} x ${e.height} | font ${e.fontSize} | teks ${e.color} | isi ${e.background} | radius ${e.radius}`,8,muted);if(e.kind==='button')para('Jika diklik -> '+(e.target?`${p.nodes.find(n=>n.id===e.target)?.title} [${e.target}]`:'BELUM DIATUR'),9);}
    heading('Koneksi keluar');const edges=p.edges.filter(e=>e.source===n.id);if(!edges.length)para('Tidak ada koneksi keluar.');for(const e of edges)para(`${e.label} -> ${p.nodes.find(n=>n.id===e.target)?.title} [${e.target}]. ${e.feedback}`,9);
  }
  for(const a of p.assets){newSheet();heading('Referensi: '+a.name);para(`Halaman: ${p.nodes.find(n=>n.id===a.nodeId)?.title} | V${a.version} | ${profileName(a.profile)}`,9);para(`ID ${a.id} | ${a.createdAt}`,8,muted);const im=cache.get(a.id);if(im){const k=Math.min((W-M*2)/im.width,550/im.height);page.drawImage(im,{x:M,y:y-im.height*k,width:im.width*k,height:im.height*k});y-=im.height*k+15;}para(p.designLayer?.bindings.some(b=>b.assetId===a.id)?'Gambar ini dipakai pada Design UI. Binding layar dan area klik tercatat di JSON.':'Gambar referensi. Pemakaian di canvas mengikuti komponen gambar.',9);}
  newSheet();heading('Instruksi untuk chat berikutnya');para(text.slice(text.indexOf('INSTRUKSI CHAT BERIKUTNYA')));heading('Batas prototype');para('Tombol pada preview menjalankan navigasi yang dikonfigurasi. Input adalah data uji sementara. Autentikasi HR, penyimpanan data bisnis, approval, sinkronisasi API dan aturan izin produk harus dibangun serta diuji di aplikasi sebenarnya.');
  const pages=doc.getPages();pages.forEach((pg,i)=>pg.drawText(`${i+1} / ${pages.length}  |  ${revision}`,{x:M,y:28,size:8,font,color:muted}));
  await doc.attach(new TextEncoder().encode(exportProject(p)),'blueprint.json',{mimeType:'application/json',description:'Data lengkap termasuk gambar dan komponen'});await doc.attach(new TextEncoder().encode(text),'handoff.md',{mimeType:'text/markdown',description:'Spesifikasi rancangan'});
  return new Uint8Array(await doc.save());
}

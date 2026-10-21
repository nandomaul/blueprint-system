import fontData from '../assets/pdfFont.ts';
import type {ProfileId,Project} from '../domain/model.ts';
import {buildHandoffPdf} from './handoff.ts';
export async function downloadHandoff(project:Project,profile:ProfileId|null){
  const prepared=await preparePdfImages(project);
  const font=Uint8Array.from(atob(fontData),c=>c.charCodeAt(0)),bytes=await buildHandoffPdf(project,profile,font,prepared),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=(project.title.replace(/[^a-z0-9-]+/gi,'-')||'blueprint')+'-documentation.pdf';document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}

export async function preparePdfImages(project:Project){
  const prepared=new Map<string,Uint8Array>();
  for(const a of project.assets)if(a.mime==='image/webp'){
    const image=new Image();image.src=a.data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Konversi gambar PDF tidak tersedia.');ctx.drawImage(image,0,0);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Konversi WebP gagal.')),'image/png'));prepared.set(a.id,new Uint8Array(await blob.arrayBuffer()));
  }
  return prepared;
}

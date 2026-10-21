import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontData from '../assets/pdfFont.ts';
import {visualDesign} from '../domain/designLayer.ts';
import {iconPaths} from '../domain/iconPaths.ts';
import type {Project} from '../domain/model.ts';
import {exportProject,validateProject} from '../domain/model.ts';
export async function presentationPdf(project:Project,converted=new Map<string,Uint8Array>()):Promise<Uint8Array<ArrayBuffer>>{
 const p=validateProject(project),doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(Uint8Array.from(atob(fontData),c=>c.charCodeAt(0)),{subset:true}),charSet=new Set(font.getCharacterSet());
 const text=(s:string)=>{const missing=[...s].find(c=>c!=='\n'&&!charSet.has(c.codePointAt(0)!));if(missing)throw new Error('Font PDF belum mendukung karakter '+missing+'. Gunakan JSON / ZIP untuk mempertahankannya.');return s;};
 const color=(s:string)=>rgb(parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255);
 const images=new Map<string,Awaited<ReturnType<typeof doc.embedPng>>>();for(const a of p.assets.filter(a=>!a.deletedAt)){if(converted.has(a.id))images.set(a.id,await doc.embedPng(converted.get(a.id)!));else if(a.mime==='image/png')images.set(a.id,await doc.embedPng(a.data));else if(a.mime==='image/jpeg')images.set(a.id,await doc.embedJpg(a.data));else throw new Error('Konversi WebP diperlukan.');}
 for(const id of p.presentation){const n=p.nodes.find(n=>n.id===id)!;const d=visualDesign(p,n),page=doc.addPage([1600,900]),scale=Math.min(1520/d.width,800/d.height),ox=(1600-d.width*scale)/2,oy=(900-d.height*scale)/2;
 page.drawRectangle({x:0,y:0,width:1600,height:900,color:rgb(.97,.97,.98)});page.drawRectangle({x:ox,y:oy,width:d.width*scale,height:d.height*scale,color:color(d.background)});
 for(const e of d.elements){const x=ox+e.x*scale,y=oy+(d.height-e.y-e.height)*scale,w=e.width*scale,h=e.height*scale,fs=Math.max(4,e.fontSize*scale),pad=['text','heading','line','ellipse','rectangle','icon'].includes(e.kind)?0:12*scale;
 if(['ellipse','avatar'].includes(e.kind))page.drawEllipse({x:x+w/2,y:y+h/2,xScale:w/2,yScale:h/2,color:color(e.background)});else if(e.kind!=='line')page.drawRectangle({x,y,width:w,height:h,color:color(e.background)});
 if(e.kind==='image'&&e.assetId){const im=images.get(e.assetId);if(im)page.drawImage(im,{x,y,width:w,height:h});}
 else if(e.kind==='line')page.drawLine({start:{x,y:y+h/2},end:{x:x+w,y:y+h/2},thickness:Math.max(1,2*scale),color:color(e.color)});
 else if(e.kind==='icon')page.drawSvgPath(iconPaths[e.icon??'users'],{x:x+w*.15,y:y+h*.85,scale:Math.min(w,h)/30,borderColor:color(e.color),borderWidth:1.6});
 else if(e.kind==='table'){let top=y+h-pad;for(const row of e.text.split('\n')){const cells=row.split('|'),rh=fs*1.4+16*scale;if(top-rh<y)break;for(let i=0;i<cells.length;i++){let value=text(cells[i].trim());const cw=(w-2*pad)/cells.length;while(value&&font.widthOfTextAtSize(value,fs)>cw-8*scale)value=value.slice(0,-1);if(value)page.drawText(value,{x:x+pad+i*cw,y:top-8*scale-fs,size:fs,font,color:color(e.color)});}top-=rh;page.drawLine({start:{x:x+pad,y:top},end:{x:x+w-pad,y:top},thickness:.7*scale,color:rgb(.84,.85,.87)});}}
 else {const value=e.kind==='progress'?e.text+' '+(e.value??50)+'%':e.kind==='checkbox'?'[ ] '+e.text:e.text;let top=y+h-pad-fs;const lines:string[]=[];for(const paragraph of text(value).split('\n')){let line='';for(const word of paragraph.match(/\S+| +/g)??[]){if(line&&font.widthOfTextAtSize(line+word,fs)>Math.max(5,w-2*pad)){lines.push(line.trimEnd());line='';}for(const c of (line?word:word.trimStart())){if(line&&font.widthOfTextAtSize(line+c,fs)>Math.max(5,w-2*pad)){lines.push(line);line='';}line+=c;}}lines.push(line);}for(const s of lines){if(top<y+pad)break;if(s)page.drawText(s,{x:x+pad,y:top,size:fs,font,color:color(e.color)});top-=fs*1.4;}if(e.kind==='progress')page.drawRectangle({x,y,width:w*(e.value??50)/100,height:Math.max(2,5*scale),color:color(e.color)});}
 }
 page.drawText(text(n.title),{x:40,y:20,size:10,font,color:rgb(.5,.47,.55)});page.drawText(`${p.presentation.indexOf(id)+1} / ${p.presentation.length}`,{x:1500,y:20,size:10,font,color:rgb(.5,.47,.55)});
 }
 doc.setTitle(p.title);await doc.attach(new TextEncoder().encode(exportProject(p)),'blueprint.json',{mimeType:'application/json'});return new Uint8Array(await doc.save());
}

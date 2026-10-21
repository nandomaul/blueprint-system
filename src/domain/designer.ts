import { validateProject } from './model.ts';
import type { DesignElement, MapNode, PageDesign, Project } from './model.ts';
export const blankDesign = (): PageDesign => ({width:960,height:640,background:'#ffffff',elements:[]});
export function element(kind:DesignElement['kind'],index=0): DesignElement {
 const sizes:Partial<Record<DesignElement['kind'],[number,number]>>={heading:[600,64],text:[500,80],table:[700,220],card:[300,180],image:[360,220],textarea:[320,140],icon:[64,64],avatar:[64,64],ellipse:[160,160],rectangle:[260,160],line:[280,24],badge:[130,36],progress:[300,40]};
 const text:Record<DesignElement['kind'],string>={heading:'Judul halaman',text:'Tulis informasi untuk pengguna.',button:'Lanjutkan',input:'Nama lengkap',card:'Informasi',image:'Gambar',table:'Nama | Status\nData contoh | Draft',checkbox:'Saya menyetujui',select:'Pilih status',textarea:'Catatan',icon:'Ikon',rectangle:'',ellipse:'',line:'',badge:'Draft',avatar:'N',progress:'Progres'};
 const [width,height]=sizes[kind]??[280,48];
 return {id:crypto.randomUUID(),kind,text:text[kind],x:40,y:40+(index%6)*80,width,height,fontSize:kind==='heading'?32:16,color:kind==='button'?'#ffffff':'#171717',background:kind==='button'?'#171717':['card','input','table','rectangle','ellipse','badge','avatar'].includes(kind)?'#f1f2f4':'#ffffff',radius:['button','input','select','textarea','card'].includes(kind)?8:0,target:'',assetId:null,...(kind==='icon'?{icon:'users' as const}:{}),...(kind==='select'?{options:['Draft','Dalam proses','Selesai']}:{}),...(kind==='progress'?{value:50}:{})};
}
export function newPage(index:number): MapNode {
  return {id:crypto.randomUUID(),title:`Halaman ${index}`,subtitle:'',icon:'layers',type:'screen',x:90+((index-1)%4)*300,y:90+Math.floor((index-1)/4)*230,route:`/halaman-${index}`,purpose:'',output:'',integration:'',integrationStatus:'none',owner:'',externalUrl:'',activeAssetId:null,design:blankDesign()};
}
export function newProject(title:string): Project {
  const n=newPage(1);
  return validateProject({schemaVersion:1,id:crypto.randomUUID(),title,description:'',updatedAt:new Date().toISOString(),nodes:[n],edges:[],assets:[],presentation:[n.id]});
}
// Upgrade old snapshots into persisted, editable component data, once. No ID-based renderer.
export function upgradeDesign(project:Project): Project {
  const p=validateProject(project);
  if(p.nodes.every(n=>n.design))return p;
  return validateProject({...p,nodes:p.nodes.map(n=>{
    if(n.design)return n;
    const header={...element('heading'),id:n.id+'-heading',text:n.title,x:40,y:40,width:840};
    const body={...element('text'),id:n.id+'-body',text:n.purpose||n.subtitle,x:40,y:120,width:840,height:160};
    const buttons=p.edges.filter(e=>e.source===n.id).slice(0,8).map((e,i)=>({...element('button'),id:n.id+'-action-'+e.id,text:e.label,target:e.target,x:40+(i%2)*340,y:320+Math.floor(i/2)*64,width:300}));
    return {...n,design:{...blankDesign(),elements:[header,body,...buttons]}};
  })});
}
export function editDesign(p:Project,id:string,design:PageDesign): Project {
 const edges=design.elements.filter(e=>e.kind==='button'&&e.target).map(e=>{const old=p.edges.find(edge=>edge.id===(e.edgeId??'button:'+e.id)||e.id===id+'-action-'+edge.id);return {...old,id:e.edgeId??old?.id??'button:'+e.id,source:id,target:e.target,label:e.text.trim().slice(0,90)||'Buka halaman',feedback:'Navigasi prototype ke halaman tujuan.'};});
 return validateProject({...p,nodes:p.nodes.map(n=>n.id===id?{...n,design}:n),edges:[...p.edges.filter(e=>e.source!==id),...edges],updatedAt:new Date().toISOString()});
}
export function duplicatePage(p:Project,id:string): Project {
  const old=p.nodes.find(n=>n.id===id);if(!old)throw new Error('Halaman tidak ada.');
  const nodeId=crypto.randomUUID(), assets=p.assets.filter(a=>a.nodeId===id).map(a=>({...a,id:crypto.randomUUID(),nodeId}));
  const elementMap=new Map(old.design?.elements.map(e=>[e.id,crypto.randomUUID()])??[]);
  const assetMap=new Map(p.assets.filter(a=>a.nodeId===id).map((a,i)=>[a.id,assets[i].id]));
  const node={...old,id:nodeId,title:(old.title+' salinan').slice(0,80),route:old.route+'-copy',x:old.x+50,y:old.y+170,activeAssetId:old.activeAssetId?assetMap.get(old.activeAssetId)??null:null,design:old.design?{...old.design,...(old.design.layouts?{layouts:{...old.design.layouts}}:{}),elements:old.design.elements.map(e=>{const copy={...e,id:elementMap.get(e.id)!,assetId:e.assetId?assetMap.get(e.assetId)??null:null};delete copy.edgeId;return copy;})}:undefined};
  if(node.design?.layouts){for(const mode of ['web','mobile','presentation'] as const){const layout=node.design.layouts[mode];if(layout)node.design.layouts[mode]={...layout,elements:layout.elements.filter(e=>elementMap.has(e.id)).map(e=>({...e,id:elementMap.get(e.id)!}))};}}
  const result=validateProject({...p,nodes:[...p.nodes,node],assets:[...p.assets,...assets],presentation:[...p.presentation,nodeId],updatedAt:new Date().toISOString()});return node.design?editDesign(result,nodeId,node.design):result;
}
export function readiness(p:Project): string[] {
  const issues:string[]=[];
  if(!p.brief.problem.trim())issues.push('Masalah yang ingin diselesaikan belum diisi.');
  if(!p.brief.audience.trim())issues.push('Pengguna dan peran belum diisi.');
  if(!p.brief.dataModel.trim())issues.push('Struktur data belum ditentukan.');
  if(!p.brief.integrations.trim())issues.push('Mapping integrasi belum ditentukan.');
  if(!p.brief.acceptance.trim())issues.push('Kriteria penerimaan belum ditentukan.');
  for(const n of p.nodes){if(!n.purpose.trim())issues.push(`${n.title}: tujuan belum diisi.`);if(!n.design?.elements.length)issues.push(`${n.title}: canvas masih kosong.`);for(const e of n.design?.elements??[])if(e.kind==='button'&&!e.target)issues.push(`${n.title}: tombol “${e.text}” belum punya tujuan.`);}
  return issues;
}

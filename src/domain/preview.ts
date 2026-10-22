import type {LayoutMode,MapNode,PageDesign,Project} from './model.ts';
import {skinAsset} from './designLayer.ts';
import {upgradeDesign} from './designer.ts';
import {designMode,layoutForView,mobileDesign} from './responsive.ts';

// Preview derives geometry only. It never writes a device projection back to the project.
export function previewLayout(project:Project,node:MapNode,device:LayoutMode|'auto',viewport:number){
 const prepared=node.design?node:upgradeDesign(project).nodes.find(n=>n.id===node.id);
 if(!prepared?.design)throw new Error('Halaman preview tidak ditemukan.');
 const stored=project.designLayer?.enabled?project.designLayer.canvases?.find(c=>c.id===node.id)?.design:undefined;
 // An unfilled Design UI canvas must not hide an existing System UI.
 const visual=stored?.elements.length?stored:undefined;
 const useDesignLayer=Boolean(project.designLayer?.enabled)&&(!stored||Boolean(visual)),source=visual??prepared.design,narrow=viewport<=700;
 const requested=device==='auto'?(narrow?'mobile':designMode(source)):device;
 let design:PageDesign=prepared.design,custom=visual,mode=requested,notice=stored&&!visual?'Design UI kosong. Menampilkan System UI.':'';
 try{
  design=layoutForView(prepared.design,requested);custom=visual?layoutForView(visual,requested):undefined;
  if(requested==='mobile'&&narrow){const width=Math.max(320,viewport-24);if(design.width>width)design=mobileDesign(design,width);if(custom&&custom.width>width)custom=mobileDesign(custom,width);}
 }catch(e){design=prepared.design;custom=visual;mode=designMode(source);notice=(e instanceof Error?e.message:'Layout belum dapat disusun.')+' Menampilkan layout asli.';}
 const d=custom??design,phone=mode==='mobile'&&!narrow;
 return {node:{...prepared,design},visual:custom,useDesignLayer,mode,narrow,phone,width:phone?d.width+24:d.width,height:phone?884:d.height,notice,empty:d.elements.length===0&&!(useDesignLayer&&skinAsset(project,node.id,null))};
}

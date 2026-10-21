import {t} from '../i18n.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {LayoutMode,MapNode,Project} from '../domain/model.ts';
import {designMode,layoutForView,mobileDesign} from '../domain/responsive.ts';
import {DesignSurface} from './DesignSurface.tsx';
import {FitDesign} from './FitDesign.tsx';
import {ToolButton} from './ToolButton.tsx';
export function PrototypeViewer({project,node,onNavigate,initialDevice='auto',device:value,onDeviceChange}:{project:Project;node:MapNode;onNavigate:(id:string)=>void;initialDevice?:LayoutMode|'auto';device?:LayoutMode|'auto';onDeviceChange?:(device:LayoutMode|'auto')=>void}){
 const [localDevice,setLocalDevice]=useState<LayoutMode|'auto'>(initialDevice),[viewport,setViewport]=useState(window.innerWidth),[zoom,setZoom]=useState<number|undefined>();
 useEffect(()=>{const resize=()=>setViewport(window.innerWidth);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const device=value??localDevice;
 function setDevice(next:LayoutMode|'auto'){setLocalDevice(next);onDeviceChange?.(next);}
 const actualScale=useRef(1);
 const narrow=viewport<=700,mode=device==='auto'?(narrow?'mobile':designMode(node.design!)):device;
 const rendered=useMemo(()=>{try{let design=layoutForView(node.design!,mode);if(mode==='mobile'&&narrow&&design.width>Math.max(320,viewport-24))design=mobileDesign(design,Math.max(320,viewport-24));return {node:{...node,design},error:''};}catch(e){return {node,error:e instanceof Error?e.message:'Layout belum dapat disusun.'};}},[node,mode,narrow,viewport]);
 const d=rendered.node.design!,phone=mode==='mobile'&&!narrow,width=phone?d.width+24:d.width,height=phone?884:d.height;
 return <section className="prototype-viewer" data-device={mode}><div className="prototype-controls"><div className="icon-tabs">{([['auto','Otomatis','grid'],['web','Tampilan desktop','monitor'],['mobile','Tampilan smartphone','phone'],['presentation','Tampilan presentasi','presentation']] as const).map(([id,label,icon])=><ToolButton key={id} label={label} icon={icon} active={device===id} aria-pressed={device===id} onClick={()=>{setDevice(id);setZoom(undefined);}}/>)}</div><span className="prototype-page-name">{node.title}</span><ToolButton label={t("Perkecil preview")} icon="minus" onClick={()=>setZoom(v=>Math.max(.1,(v??actualScale.current)-.1))}/><ToolButton label={t("Perbesar preview")} icon="plus" onClick={()=>setZoom(v=>Math.min(2,(v??actualScale.current)+.1))}/><ToolButton label={t("Fit preview")} icon="zoom" onClick={()=>setZoom(undefined)}/></div>{rendered.error&&<p className="inline-error" role="alert">{rendered.error} {t("Tampilan asli ditampilkan.")}</p>}<div className="prototype-stage"><FitDesign width={width} height={height} zoom={zoom} onScale={scale=>{actualScale.current=scale;}} fit={narrow&&mode==='mobile'?'width':'contain'}>{phone?<div className="device-phone" style={{width,height}}><div className="device-notch"/><div className="device-phone-screen"><DesignSurface key={node.id} project={project} node={rendered.node} onNavigate={onNavigate}/></div></div>:<DesignSurface key={node.id} project={project} node={rendered.node} onNavigate={onNavigate}/>}</FitDesign></div></section>;
}

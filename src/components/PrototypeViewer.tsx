import {t} from '../i18n.ts';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {LayoutMode,MapNode,Project} from '../domain/model.ts';
import {previewLayout} from '../domain/preview.ts';
import {DesignSurface} from './DesignSurface.tsx';
import {FitDesign} from './FitDesign.tsx';
import {PreviewBoundary} from './PreviewBoundary.tsx';
import {ToolButton} from './ToolButton.tsx';
type ViewerProps={project:Project;node:MapNode;onNavigate:(id:string)=>void;initialDevice?:LayoutMode|'auto';device?:LayoutMode|'auto';onDeviceChange?:(device:LayoutMode|'auto')=>void};
export function PrototypeViewer(props:ViewerProps){return <PreviewBoundary resetKey={props.project.id+'/'+props.node.id+'/'+(props.device??'auto')}><Viewer {...props}/></PreviewBoundary>;}
function Viewer({project,node,onNavigate,initialDevice='auto',device:value,onDeviceChange}:ViewerProps){
 const [localDevice,setLocalDevice]=useState<LayoutMode|'auto'>(initialDevice),[viewport,setViewport]=useState(window.innerWidth),[zoom,setZoom]=useState<number|undefined>();
 useEffect(()=>{const resize=()=>setViewport(window.innerWidth);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const device=value??localDevice,actualScale=useRef(1);
 function setDevice(next:LayoutMode|'auto'){setLocalDevice(next);onDeviceChange?.(next);setZoom(undefined);}
 const rendered=useMemo(()=>previewLayout(project,node,device,viewport),[project,node,device,viewport]);
 const {mode,narrow,phone,width,height}=rendered;
 return <section className="prototype-viewer" data-device={mode}>
  <div className="prototype-controls"><div className="icon-tabs">{([['auto','Otomatis','grid'],['web','Tampilan desktop','monitor'],['mobile','Tampilan smartphone','phone']] as const).map(([id,label,icon])=><ToolButton key={id} label={label} icon={icon} active={device===id} aria-pressed={device===id} onClick={()=>setDevice(id)}/>)}</div><span className="prototype-page-name">{node.title}</span><ToolButton label={t('Perkecil preview')} icon="minus" onClick={()=>setZoom(v=>Math.max(.1,(v??actualScale.current)-.1))}/><ToolButton label={t('Perbesar preview')} icon="plus" onClick={()=>setZoom(v=>Math.min(2,(v??actualScale.current)+.1))}/><ToolButton label={t('Fit preview')} icon="fit" onClick={()=>setZoom(undefined)}/></div>
  {rendered.notice&&<p className="preview-layout-note" role="status">{t(rendered.notice)}</p>}
  {rendered.empty&&<p className="preview-layout-note" role="status">{t('Halaman ini belum berisi elemen. Tambahkan elemen di System UI atau gambar di Design UI.')}</p>}
  <div className="prototype-stage"><FitDesign motion width={width} height={height} zoom={zoom} onScale={scale=>{actualScale.current=scale;}} fit={narrow&&mode==='mobile'?'width':'contain'}><div className={'prototype-frame'+(phone?' device-phone':'')} style={{width,height}}><div className="device-notch" aria-hidden="true"/><div className={'prototype-frame-screen'+(phone?' device-phone-screen':'')}><DesignSurface useDesignLayer={rendered.useDesignLayer} visualLayout={rendered.visual} key={node.id} project={project} node={rendered.node} onNavigate={onNavigate}/></div></div></FitDesign></div>
 </section>;
}

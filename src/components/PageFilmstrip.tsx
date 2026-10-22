import {t} from '../i18n.ts';
import {useEffect,useRef,useState} from 'react';
import {visualDesign,skinAsset} from '../domain/designLayer.ts';
import type {Project,MapNode} from '../domain/model.ts';
import {CanvasThumbnail} from './CanvasThumbnail.tsx';
import {Icon} from './Icon.tsx';
import {ToolButton} from './ToolButton.tsx';

export function PageFilmstrip({nodes,selected,height,onSelect,onAdd,project,allowAdd=true}:{nodes:MapNode[];selected:string;height:number;onSelect:(id:string)=>void;onAdd:()=>void;project?:Project;allowAdd?:boolean}){
 const strip=useRef<HTMLElement>(null),[scroll,setScroll]=useState({before:false,after:false});
 function measure(){const el=strip.current;if(el)setScroll({before:el.scrollLeft>2,after:el.scrollLeft+el.clientWidth<el.scrollWidth-2});}
 useEffect(()=>{measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);if(strip.current)observer?.observe(strip.current);return()=>observer?.disconnect();},[nodes.length,height]);
 useEffect(()=>{strip.current?.querySelector('[aria-current=page]')?.scrollIntoView?.({block:'nearest',inline:'nearest'});measure();},[selected]);
 function move(direction:number){const el=strip.current;if(!el)return;const left=direction*Math.max(120,el.clientWidth*.75);if(el.scrollBy)el.scrollBy({left,behavior:'smooth'});else {el.scrollLeft+=left;measure();}}
 return <div className="page-strip-row"><ToolButton label={t("Halaman sebelumnya pada strip")} icon="chevron" className="strip-back" disabled={!scroll.before} onClick={()=>move(-1)}/><nav ref={strip} aria-label={t("Daftar halaman")} className="page-filmstrip" data-compact={height<72} style={{height}} onScroll={measure}>{nodes.map((n,i)=><button className={'page-thumbnail '+(selected===n.id?'active':'')} key={n.id} title={(i+1)+t(". ")+(n.title)} aria-current={selected===n.id?'page':undefined} aria-label={t("Buka halaman ")+(n.title)} onClick={()=>onSelect(n.id)}><span className="page-thumbnail-preview">{project?(project.designLayer?.canvases?.some(c=>c.id===n.id)?<CanvasThumbnail design={visualDesign(project,n)} assets={project.assets}/>:skinAsset(project,n.id,null)?<img className="filmstrip-image" src={skinAsset(project,n.id,null)!.data} alt=""/>:<Icon name="image" size={18}/>):<CanvasThumbnail design={n.design}/>}</span><span className="page-thumbnail-caption"><b>{i+1}</b><span>{n.title}</span></span></button>)}{allowAdd&&<button className="add-page-tile" onClick={onAdd} disabled={nodes.length>=80} aria-label={t("Tambah halaman")} title={t("Tambah halaman")}><Icon name="plus" size={20}/></button>}</nav><ToolButton label={t("Halaman berikutnya pada strip")} icon="chevron" disabled={!scroll.after} onClick={()=>move(1)}/></div>;
}

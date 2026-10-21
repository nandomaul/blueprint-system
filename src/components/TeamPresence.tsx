import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {t} from '../i18n.ts';
import {groupPresence} from '../domain/presence.ts';
import type {Presence} from '../domain/presence.ts';
import type {EditorProfile} from '../domain/catalog.ts';
import type {DocumentSummary} from '../services/workspace.ts';
import type {Project} from '../domain/model.ts';
import {ProfileAvatar} from './ProfileAvatar.tsx';
export type PresenceDisplay={members:Presence[];error:string;sessionId:string;profiles:EditorProfile[];documents:DocumentSummary[];project:Project|null;onGo:(member:Presence)=>void};
export function TeamPresence({members,error,sessionId,profiles,documents,project,onGo}:PresenceDisplay){
 const groups=groupPresence(members),[open,setOpen]=useState(false),[position,setPosition]=useState({top:60,right:12}),root=useRef<HTMLDivElement>(null),popup=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(e:Event)=>{if(!root.current?.contains(e.target as Node)&&!popup.current?.contains(e.target as Node))setOpen(false);},key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',close);window.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('keydown',key);};},[]);
 function label(p:Presence){const page=project?.id===p.projectId?project.nodes.find(n=>n.id===p.nodeId)?.title:null,name=profiles.find(x=>x.id===p.profileId)?.name??p.profileId,where=p.view==='home'?t('Semua proyek'):[documents.find(x=>x.id===p.projectId)?.title??p.projectTitle,page??p.nodeTitle??(p.nodeId?t('Halaman lain'):null),t(p.view==='flow'?'Alur':p.view==='assets'?'Design UI':p.view==='brief'?'Brief':'System UI')].filter(Boolean).join(' · ');return {name,where,activity:t(p.activity==='editing'?'Mengedit':p.activity==='chat'?'Membuka chat':p.activity==='presenting'?'Presentasi':'Melihat')};}
 function toggle(){const r=root.current?.getBoundingClientRect();if(r)setPosition({top:r.bottom+8,right:Math.max(8,window.innerWidth-r.right)});setOpen(v=>!v);}
 return <div className="team-presence" ref={root} aria-label={t('Editor aktif')}>
 {groups.slice(0,3).map(list=>{const p=list[0],info=label(p);return <button key={p.profileId} className={'presence-avatar '+(list.some(x=>x.sessionId===sessionId)?'is-self':'')} aria-label={info.name+' · '+info.where+' · '+info.activity} title={info.name+' · '+info.where+' · '+info.activity} onClick={toggle}><ProfileAvatar profile={profiles.find(x=>x.id===p.profileId)} name={info.name}/></button>;})}
 {groups.length>3&&<button className="presence-overflow" aria-label={t('Editor lainnya')+' '+(groups.length-3)} onClick={toggle}>+{groups.length-3}</button>}{error&&<button className="presence-error" aria-label={t(error)} title={t(error)} onClick={toggle}>!</button>}
 {open&&createPortal(<div className="presence-popover" ref={popup} style={position} role="region" aria-label={t('Aktivitas tim')}><header><strong>{t('Aktivitas tim')}</strong><button aria-label={t('Tutup aktivitas tim')} onClick={()=>setOpen(false)}>×</button></header>{error&&<p role="alert">{t(error)}</p>}{groups.map(list=>{const p=list[0],info=label(p);return <button className="presence-person" key={p.profileId} disabled={!p.projectId} onClick={()=>{onGo(p);setOpen(false);}}><ProfileAvatar profile={profiles.find(x=>x.id===p.profileId)} name={info.name}/><span><strong>{info.name}{list.some(x=>x.sessionId===sessionId)?' · '+t('Anda'):''}</strong><small>{info.where}</small><small>{info.activity}{list.length>1?' · '+list.length+' '+t('sesi'):''}</small></span></button>;})}</div>,document.body)}
 </div>;
}

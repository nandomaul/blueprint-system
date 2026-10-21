import {t} from '../i18n.ts';
import {useState} from 'react';
import type {MapNode,Project} from '../domain/model.ts';
import {PrototypeViewer} from './PrototypeViewer.tsx';
import {ProcessFAQ} from './ProcessFAQ.tsx';
import {ToolButton} from './ToolButton.tsx';
export function PrototypeSession({project,node,guided,onNavigate,onBack,canBack}:{project:Project;node:MapNode;guided:boolean;onNavigate:(id:string)=>void;onBack:()=>void;canBack:boolean}){
 const [details,setDetails]=useState(false),index=project.presentation.indexOf(node.id),next=project.presentation[index+1];
 return <div className="prototype-session"><div className="session-toolbar"><ToolButton label={t("Informasi halaman")} icon="book" active={details} onClick={()=>setDetails(v=>!v)}/><ToolButton label={t("Kembali")} icon="arrow" className="back-arrow" disabled={!canBack} onClick={onBack}/><select aria-label={t("Halaman preview")} value={node.id} onChange={e=>onNavigate(e.target.value)}>{project.nodes.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select>{guided&&<><span className="help-text">{index+1} / {project.presentation.length}</span><ToolButton label={t("Lanjut presentasi")} icon="arrow" disabled={!next} onClick={()=>onNavigate(next)}/></>}</div><div className="session-body">{details&&<aside className="session-details"><h2>{node.title}</h2><p>{node.purpose}</p><strong>{t("Hasil")}</strong><p>{node.output}</p>{guided&&node.design!.elements.filter(e=>e.kind==='button').map(e=><button className="session-action-link" key={e.id} onClick={()=>onNavigate(e.target)}>{e.text} → {project.nodes.find(n=>n.id===e.target)?.title}</button>)}<ProcessFAQ key={node.id} project={project} node={node}/></aside>}<PrototypeViewer initialDevice={guided?'presentation':'auto'} project={project} node={node} onNavigate={onNavigate}/></div></div>;
}

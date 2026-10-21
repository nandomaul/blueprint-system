import {t} from '../i18n.ts';
import {useState} from 'react';
import type {Project} from '../domain/model.ts';
import {BriefEditor} from './BriefEditor.tsx';
import {PresentationOrder} from './PresentationOrder.tsx';
import {Icon} from './Icon.tsx';
export function BriefWorkspace({project,onChange}:{project:Project;onChange:(p:Project)=>void}){
 const [tab,setTab]=useState<'brief'|'presentation'>('brief');return <div className="brief-workspace"><nav className="brief-workspace-tabs" aria-label={t("Dokumen proyek")}><button className={tab==='brief'?'active':''} onClick={()=>setTab('brief')}><Icon name="book" size={16}/>{t("Brief & data")}</button><button className={tab==='presentation'?'active':''} onClick={()=>setTab('presentation')}><Icon name="presentation" size={16}/>{t("Urutan presentasi")} <small>{project.presentation.length}</small></button><span>{t("Ruang tim · autosave")}</span></nav>{tab==='brief'?<BriefEditor project={project} onChange={onChange}/>:<PresentationOrder project={project} onChange={ids=>onChange({...project,presentation:ids})}/>}</div>;
}

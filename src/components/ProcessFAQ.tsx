import {t} from '../i18n.ts';
import {useState} from 'react';
import type {MapNode,Project} from '../domain/model.ts';
import {AssistantDemo} from './AssistantDemo.tsx';
export function ProcessFAQ({node,project}:{node:MapNode;project:Project}){
 const [open,setOpen]=useState(false);
 return <section className="process-faq"><button className="button outline small full-width" aria-expanded={open} aria-controls="process-faq-content" onClick={()=>setOpen(v=>!v)}>{t('? FAQ proses')}</button>{open&&<div id="process-faq-content" role="region" aria-label={t('FAQ proses')}><AssistantDemo key={node.id} project={project} node={node} compact/></div>}</section>;
}

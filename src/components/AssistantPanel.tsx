import {useState} from 'react';
import type {MapNode,Project} from '../domain/model.ts';
import {ryanPersonnel} from '../domain/ryanPersonnel.ts';
import {AssistantDemo} from './AssistantDemo.tsx';
import {ToolButton} from './ToolButton.tsx';
import {t} from '../i18n.ts';
export function AssistantPanel({project,node,onClose}:{project:Project|null;node?:MapNode;onClose:()=>void}){
 const [sample]=useState(()=>project??ryanPersonnel()),p=project??sample,n=node??p.nodes[0];
 return <aside className="team-chat assistant-panel" aria-label={t('Asisten AI')}><header className="chat-heading"><strong>{t('Asisten AI')}</strong><ToolButton label={t('Tutup asisten AI')} icon="close" onClick={onClose}/></header><div className="assistant-panel-content"><AssistantDemo key={p.id+':'+n.id} project={p} node={n}/></div></aside>;
}

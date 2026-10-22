import {useState} from 'react';
import {ryanPersonnel} from '../domain/ryanPersonnel.ts';
import {PrototypeSession} from './PrototypeSession.tsx';
import {AssistantDemo} from './AssistantDemo.tsx';
import {Icon} from './Icon.tsx';
import {t} from '../i18n.ts';
import type {AssistantMode} from '../domain/assistantDemo.ts';
export function SampleDemo(){
 const [project]=useState(ryanPersonnel),[page,setPage]=useState(project.nodes[0].id),[trail,setTrail]=useState([page]),[reset,setReset]=useState(0),[tab,setTab]=useState<'flow'|AssistantMode>(()=>{const feature=new URLSearchParams(window.location.search).get('feature');return feature==='FAQ'?'faq':feature==='REVIEW'?'review':feature==='CLASSIFY'?'classify':'flow';}),node=project.nodes.find(n=>n.id===page)!;
 function navigate(id:string){if(project.nodes.some(n=>n.id===id)){setPage(id);setTrail(t=>[...t,id]);}}
 return <main className="sample-demo"><header className="sample-demo-header"><div><strong>Personnel</strong><span>{t('Demo · data contoh')}</span></div><nav aria-label={t('Fitur demo')}>{([['flow','Alur'],['faq','FAQ'],['review','Review Draft'],['classify','Klasifikasi']] as const).map(([id,label])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{t(label)}</button>)}</nav><button className="icon-button" aria-label={t('Ulangi demo')} title={t('Ulangi demo')} onClick={()=>{setPage(project.nodes[0].id);setTrail([project.nodes[0].id]);setReset(v=>v+1);}}><Icon name="reset" size={17}/></button><a className="button outline small" href={import.meta.env.BASE_URL}>{t('Masuk Blueprint')}</a></header>{tab==='flow'?<PrototypeSession key={reset} project={project} node={node} guided onNavigate={navigate} canBack={trail.length>1} onBack={()=>{const next=trail.slice(0,-1);setTrail(next);setPage(next.at(-1)??project.nodes[0].id);}}/>:<div className="sample-ai-stage"><AssistantDemo key={tab+':'+reset} initialMode={tab} project={project} node={node}/></div>}</main>;
}

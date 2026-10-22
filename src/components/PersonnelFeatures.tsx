import {useState} from 'react';
import {t} from '../i18n.ts';
import {addPersonnelFeatures,hasPersonnelFeatures,personnelFeatures} from '../domain/personnelFeatures.ts';
import type {Project} from '../domain/model.ts';
export function PersonnelFeatures({project,onChange}:{project:Project;onChange:(p:Project)=>void}){
 const [error,setError]=useState(''),included=hasPersonnelFeatures(project);
 return <section className="personnel-features"><header><div><h2>ADF-riends</h2><p>{t('Spesifikasi produk · 8 fitur')}</p></div><button className="button black" disabled={included} onClick={()=>{try{onChange(addPersonnelFeatures(project));setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}}}>{included?t('Sudah di brief'):t('Tambahkan ke brief')}</button></header><p className="help-text">{t('Tersimpan di cakupan, kriteria penerimaan, data dan integrasi. Rancangan fitur untuk aplikasi yang akan dibangun.')}</p>{error&&<p className="inline-error" role="alert">{error}</p>}<div className="personnel-feature-grid">{personnelFeatures.map((f,i)=><article key={f.id}><small>{String(i+1).padStart(2,'0')}</small><div><h3>{t(f.title)}</h3><p>{t(f.description)}</p><details><summary>{t('Kriteria penerimaan')}</summary><p>{t(f.acceptance)}</p></details>{["FAQ","REVIEW","CLASSIFY","DEMO"].includes(f.id)?<a className="feature-demo-link" href={import.meta.env.BASE_URL+"?demo=personnel&feature="+f.id} target="_blank" rel="noreferrer">{t("Coba simulasi")} ↗</a>:<small className="feature-status">{t("Rancangan")}</small>}</div></article>)}</div></section>;
}

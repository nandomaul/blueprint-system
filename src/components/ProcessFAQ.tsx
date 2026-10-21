import {t} from '../i18n.ts';
import {useState} from 'react';
import type {MapNode,Project} from '../domain/model.ts';

export function ProcessFAQ({node,project}:{node:MapNode;project:Project}){
 const [open,setOpen]=useState(false);
 return <section className="process-faq"><button className="button outline small full-width" aria-expanded={open} aria-controls="process-faq-content" onClick={()=>setOpen(v=>!v)}>{t("? FAQ proses")}</button>{open&&<div id="process-faq-content" role="region" aria-label={t("FAQ proses")}><p><strong>{t("Materi dari brief · AI belum terhubung")}</strong></p><p><strong>{t("Apa tujuan langkah ini?")}</strong><br/>{node.purpose||'Belum ditulis.'}</p><p><strong>{t("Apa hasilnya?")}</strong><br/>{node.output||'Belum ditentukan.'}</p><details><summary>{t("Keputusan yang masih menunggu HR")}</summary><p style={{whiteSpace:'pre-wrap'}}>{project.brief.questions||'Belum ada keputusan terbuka yang ditulis.'}</p></details><p className="help-text">{t("FAQ mengikuti data halaman yang sedang dibuka. Belum mengambil jawaban dari AI.")}</p></div>}</section>;
}

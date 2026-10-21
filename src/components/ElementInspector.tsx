import {t} from '../i18n.ts';
import type {DesignElement,MapNode,Project} from '../domain/model.ts';
import {Icon} from './Icon.tsx';

export function ElementInspector({element:e,project,node,onPatch}:{element:DesignElement|undefined;project:Project;node:MapNode;onPatch:(value:Partial<DesignElement>)=>void}){
 if(!e)return <div className="inspector-empty"><Icon name="form" size={28}/><strong>{t("Pilih objek")}</strong><p>{t("Klik objek di canvas atau Layer untuk mengatur isi, ukuran, warna dan tujuannya.")}</p></div>;
 const color=(key:'color'|'background',label:string)=><label className="inspector-color">{t(label)}<span><input type="color" aria-label={label+t(" objek")} value={e[key]} onChange={ev=>onPatch({[key]:ev.target.value})}/><code>{e[key].toUpperCase()}</code></span></label>;
 return <div className="element-inspector">
  <div className="inspector-object"><span>{e.kind}</span><strong>{e.text||'Objek tanpa teks'}</strong></div>
  <details className="inspector-section" open><summary>{t("Layout")}</summary><div className="property-grid">{(['x','y','width','height'] as const).map(key=><label key={key}>{({x:'X',y:'Y',width:'Lebar',height:'Tinggi'})[key]}<input aria-label={key} type="number" value={e[key]} min={key==='width'||key==='height'?24:0} max={4000} onChange={ev=>onPatch({[key]:Number(ev.target.value)})}/></label>)}</div></details>
  {e.kind!=='image'&&<details className="inspector-section" open><summary>{t("Konten")}</summary><label>{t("Teks")}<textarea aria-label={t("Isi teks objek")} value={e.text} rows={3} maxLength={4000} onChange={ev=>onPatch({text:ev.target.value})}/></label><label>{t("Ukuran font")}<input type="number" aria-label={t("Ukuran font objek")} min={8} max={120} value={e.fontSize} onChange={ev=>onPatch({fontSize:Math.max(8,Math.min(120,Number(ev.target.value)||8))})}/></label></details>}
  <details className="inspector-section" open><summary>{t("Tampilan")}</summary>{color('background','Warna isi')}{color('color','Warna teks')}<label>{t("Radius sudut")}<input aria-label={t("radius")} type="number" value={e.radius} min={0} max={100} onChange={ev=>onPatch({radius:Math.max(0,Math.min(100,Number(ev.target.value)))})}/></label></details>
  {e.kind==='button'&&<details className="inspector-section" open><summary>{t("Navigasi")}</summary><label>{t("Buka halaman")}<select aria-label={t("Tujuan tombol di properti")} value={e.target} onChange={ev=>onPatch({target:ev.target.value})}><option value="">{t("Belum terhubung")}</option>{project.nodes.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></label><p className="help-text">{t("Tujuan ini dipakai saat Preview dan terhubung ke panah di User Flow.")}</p></details>}
  {e.kind==='image'&&<label>{t("Referensi gambar")}<select aria-label={t("Gambar komponen")} value={e.assetId??''} onChange={ev=>onPatch({assetId:ev.target.value||null})}><option value="">{t("Pilih gambar…")}</option>{project.assets.filter(a=>a.nodeId===node.id).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
  {e.kind==='select'&&<label>{t("Pilihan dropdown")}<textarea aria-label={t("Pilihan dropdown")} value={e.options?.join('\n')??''} onChange={ev=>onPatch({options:ev.target.value.split('\n').slice(0,20).map(v=>v.slice(0,100))})}/></label>}
  {e.kind==='progress'&&<label>{t("Progres")}<input aria-label={t("Nilai progress")} type="range" min={0} max={100} value={e.value??50} onChange={ev=>onPatch({value:Number(ev.target.value)})}/></label>}
 </div>;
}

import {t} from '../i18n.ts';
import {Icon} from './Icon.tsx';
import type {libraryItems} from '../domain/library.ts';

export function LibraryPreview({item}:{item:typeof libraryItems[number][0]}){
 const lines=<><i/><i/><i/></>;
 return <span className={'library-preview sample-'+item} aria-hidden="true">
  {item==='button'?<span className="sample-button">{t("Button")}</span>
   :item==='input'||item==='select'||item==='textarea'?<span className="sample-input">{item==='select'?t("Pilih… ▾"):item==='textarea'?t("Catatan…"):t("Input…")}</span>
   :item==='checkbox'?<span className="sample-check">☑ <i/></span>
   :item==='table'||item==='block-employees'?<span className="sample-table">{lines}</span>
   :item==='rectangle'||item==='ellipse'||item==='line'?<i className="sample-shape"/>
   :item==='badge'?<span className="sample-badge">{t("Aktif")}</span>
   :item==='avatar'?<span className="sample-avatar">{t("N")}</span>
   :item==='progress'?<span className="sample-progress"><i/></span>
   :item==='card'?<span className="sample-card">{lines}</span>
   :item.startsWith('block-')?<span className={'sample-block '+item}><b/>{lines}<em/></span>
   :<Icon name={item==='image'?'image':item==='icon'?'spark':'file'} size={25}/>}
 </span>;
}

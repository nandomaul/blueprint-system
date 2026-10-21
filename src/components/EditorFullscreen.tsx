import {t} from '../i18n.ts';
import {useEffect,useRef,useState} from 'react';
import {ToolButton} from './ToolButton.tsx';

export function EditorFullscreen(){
 const root=useRef<HTMLSpanElement>(null),[active,setActive]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const changed=()=>setActive(document.fullscreenElement===root.current?.closest('.editor-shell'));document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
 async function toggle(){const host=root.current?.closest<HTMLElement>('.editor-shell');if(!host)return;try{if(document.fullscreenElement===host)await document.exitFullscreen();else if(host.requestFullscreen)await host.requestFullscreen();else throw new Error('Fullscreen tidak tersedia di browser ini.');setError('');}catch{setError('Fullscreen tidak tersedia. Gunakan kontrol fullscreen browser.');}}
 return <span ref={root} className="editor-fullscreen-control"><ToolButton label={active?t("Keluar fullscreen editor"):t("Fullscreen editor")} icon="zoom" onClick={()=>void toggle()}/>{error&&<span className="fullscreen-error" role="alert">{error}<ToolButton label={t("Tutup informasi fullscreen")} icon="close" onClick={()=>setError('')}/></span>}</span>;
}

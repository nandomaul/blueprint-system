import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
// Workspace zoom never changes document geometry or the scale of editor chrome.
export function useWorkspaceZoom(viewport:RefObject<HTMLElement|null>,onStep:(step:number)=>void,onFit:()=>void){
 const actions=useRef({onStep,onFit});actions.current={onStep,onFit};
 useEffect(()=>{
  const typing=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable=true]'));
  const key=(e:KeyboardEvent)=>{if(!(e.metaKey||e.ctrlKey)||e.altKey||typing(e.target)||document.querySelector('dialog[open]'))return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')actions.current.onFit();else actions.current.onStep(e.key==='-'?-.1:.1);}};
  const wheel=(e:WheelEvent)=>{if(!(e.ctrlKey||e.metaKey)||typing(e.target))return;e.preventDefault();if(e.deltaY)actions.current.onStep(e.deltaY<0?.08:-.08);};
  window.addEventListener('keydown',key);const element=viewport.current;element?.addEventListener('wheel',wheel,{passive:false});return()=>{window.removeEventListener('keydown',key);element?.removeEventListener('wheel',wheel);};
 },[viewport]);
}

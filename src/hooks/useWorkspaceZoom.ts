import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
// Workspace zoom never changes document geometry or the scale of editor chrome.
export function useWorkspaceZoom(viewport:RefObject<HTMLElement|null>,onStep:(step:number)=>void,onFit:()=>void,onPan?:(dx:number,dy:number)=>void){
 const actions=useRef({onStep,onFit,onPan});actions.current={onStep,onFit,onPan};
 useEffect(()=>{
  const typing=(target:EventTarget|null)=>target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable=true]'));
  const key=(e:KeyboardEvent)=>{if(!(e.metaKey||e.ctrlKey)||e.altKey||typing(e.target)||document.querySelector('dialog[open]'))return;if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')actions.current.onFit();else actions.current.onStep(e.key==='-'?-.1:.1);}};
  const wheel=(e:WheelEvent)=>{if(typing(e.target))return;const factor=e.deltaMode===1?16:e.deltaMode===2?(viewport.current?.clientHeight??600):1;if(e.ctrlKey||e.metaKey){e.preventDefault();if(e.deltaY)actions.current.onStep(e.deltaY<0?.08:-.08);}else if(actions.current.onPan){e.preventDefault();actions.current.onPan((e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX)*factor,(e.shiftKey&&!e.deltaX?0:e.deltaY)*factor);}};
  window.addEventListener('keydown',key);const element=viewport.current;element?.addEventListener('wheel',wheel,{passive:false});return()=>{window.removeEventListener('keydown',key);element?.removeEventListener('wheel',wheel);};
 },[viewport]);
}

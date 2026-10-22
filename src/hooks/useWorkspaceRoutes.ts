import {useEffect,useRef,useState} from 'react';
import {readWorkspaceRoute,workspacePath} from '../domain/navigation.ts';
import type {WorkspaceRoute} from '../domain/navigation.ts';
import {browserBase} from '../services/browserNavigation.ts';
export function useWorkspaceRoutes({ready,busy,value,onApply,onError}:{ready:boolean;busy:boolean;value:WorkspaceRoute;onApply:(route:WorkspaceRoute)=>Promise<void>;onError:(message:string)=>void}){
 const base=browserBase(),serial=useRef(0),applying=useRef(false),restored=useRef(false),alive=useRef(true),apply=useRef(onApply),error=useRef(onError);
 apply.current=onApply;error.current=onError;
 const read=()=>readWorkspaceRoute(window.location.pathname,window.location.search,base);
 const [pending,setPending]=useState<{serial:number;route:WorkspaceRoute}|null>(()=>({serial:0,route:read()})),[routing,setRouting]=useState(false);
 useEffect(()=>{alive.current=true;const pop=()=>setPending({serial:++serial.current,route:read()});window.addEventListener('popstate',pop);return()=>{alive.current=false;window.removeEventListener('popstate',pop);};},[base]);
 useEffect(()=>{if(window.location.protocol==='file:')return;if(!ready){restored.current=false;return;}if(!restored.current&&!pending&&!applying.current){setPending({serial:++serial.current,route:read()});return;}if(!pending||busy||applying.current)return;const request=pending;applying.current=true;restored.current=true;setRouting(true);void apply.current(request.route).catch(e=>{if(alive.current)error.current(e instanceof Error?e.message:String(e));}).finally(()=>{applying.current=false;if(alive.current){setPending(current=>current?.serial===request.serial?null:current);setRouting(false);}});},[ready,busy,pending,base]);
 const path=workspacePath(value,base);
 useEffect(()=>{if(new URLSearchParams(window.location.search).has('template')||window.location.protocol==='file:'||!ready||busy||routing||pending||!restored.current)return;const current=window.location.pathname+window.location.search;if(current!==path)window.history.pushState({blueprint:true},'',path);},[ready,busy,routing,pending,path]);
}

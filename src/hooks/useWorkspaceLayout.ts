import {useEffect,useState} from 'react';
import {defaultWorkspaceLayout,layoutKey,openPanel,positionPanel,readWorkspaceLayout,resetLayoutEvent} from '../domain/workspaceLayout.ts';
import type {PanelId,PanelLayout,WorkspaceLayout} from '../domain/workspaceLayout.ts';
export function useWorkspaceLayout(){
 const [layout,setLayout]=useState(()=>{try{return readWorkspaceLayout(localStorage.getItem(layoutKey));}catch{return defaultWorkspaceLayout();}});
 useEffect(()=>{try{localStorage.setItem(layoutKey,JSON.stringify(layout));}catch{/* Optional browser preference only. */}},[layout]);
 useEffect(()=>{const reset=()=>setLayout(defaultWorkspaceLayout());window.addEventListener(resetLayoutEvent,reset);return()=>window.removeEventListener(resetLayoutEvent,reset);},[]);
 return {layout,setLayout,togglePanel:(id:PanelId)=>setLayout(s=>openPanel(s,id)),panel:(id:PanelId,changes:Partial<PanelLayout>)=>setLayout(s=>positionPanel(s,id,changes)),set:(changes:Partial<WorkspaceLayout>)=>setLayout(s=>({...s,...changes}))};
}

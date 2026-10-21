import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {IDBFactory} from 'fake-indexeddb';
import {useTeamWorkspace} from '../src/hooks/useTeamWorkspace.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {newProject,newPage} from '../src/domain/designer.ts';
import type {WorkspaceRepository} from '../src/services/workspace.ts';

export async function runSharedWorkspaceUiTests(){
 const host=document.getElementById('test-root')!,storage=createLocalWorkspace(new IDBFactory(),'map013-canonical-fixture'),watchers=new Set<()=>void>();let unavailable=false;
 const repository:WorkspaceRepository={...storage,kind:'supabase',scope:'shared-fixture',async write(...args){if(unavailable)throw new Error('Network unavailable fixture');const r=await storage.write(...args);watchers.forEach(fn=>fn());return r;},watch(fn,status){watchers.add(fn);status('live');return()=>watchers.delete(fn);},async close(){}};
 const previous=Object.getOwnPropertyDescriptor(window,'indexedDB');Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){throw new Error('Browser recovery unavailable fixture');}}});
 const state:Partial<Record<'a'|'b',ReturnType<typeof useTeamWorkspace>>>={};
 function Session({id}:{id:'a'|'b'}){state[id]=useTeamWorkspace(repository);return <div data-session={id}>{state[id]!.project?.title}</div>;}
 const root=createRoot(host),until=async(check:()=>boolean)=>{for(let i=0;i<100;i++){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});if(check())return;}throw new Error('Shared workspace wait: '+JSON.stringify(Object.values(state).map(w=>({ready:w?.ready,error:w?.error,saveState:w?.saveState}))));};
 try{
  await act(async()=>root.render(<><Session id="a"/><Session id="b"/></>));await until(()=>Boolean(state.a?.ready&&state.b?.ready&&!state.a.loading&&!state.b.loading));
  const project=newProject('Shared document');await act(async()=>state.a!.create(project));await act(async()=>state.b!.open(project.id));
  await act(async()=>state.a!.change({...state.a!.project!,title:'A edited without manual Save'}));await until(()=>state.b?.project?.title==='A edited without manual Save');assert.equal(state.a!.saveState,'saved');
  const p=state.b!.project!,page=newPage(2);await act(async()=>state.b!.change({...p,nodes:[...p.nodes,page],presentation:[...p.presentation,page.id]}));await until(()=>state.a?.project?.nodes.length===2);
  unavailable=true;await act(async()=>state.a!.change({...state.a!.project!,description:'Retry this edit'}));await until(()=>state.a?.saveState==='error');assert.notEqual((await storage.load(project.id))!.project.description,'Retry this edit');unavailable=false;
  await act(async()=>{watchers.forEach(fn=>fn());});await until(()=>state.a?.saveState==='saved'&&state.b?.project?.description==='Retry this edit');assert.equal(state.a!.project!.nodes.length,2);assert.equal(state.a!.error,'');
  console.log('MAP-013 shared hook DOM: independent editors, automatic bidirectional save/refresh, blocked recovery storage, network failure and retry passed.');
 }finally{await act(async()=>root.unmount());if(previous)Object.defineProperty(window,'indexedDB',previous);await storage.close();assert.equal(watchers.size,0);}
}

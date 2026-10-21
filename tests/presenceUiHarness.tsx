import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {TeamPresence} from '../src/components/TeamPresence.tsx';
import {emptyCatalog} from '../src/domain/catalog.ts';
import {newProject} from '../src/domain/designer.ts';
import type {Presence} from '../src/domain/presence.ts';
export async function runPresenceUiTests(){
 const host=document.getElementById('test-root')!,root=createRoot(host),project=newProject('Shared design'),profiles=emptyCatalog().profiles;
 profiles.push({id:'p_'+crypto.randomUUID(),name:'Client',base:false,deletedAt:null},{id:'p_'+crypto.randomUUID(),name:'Client II',base:false,deletedAt:null});
 const members:Presence[]=profiles.map((p,i)=>({sessionId:crypto.randomUUID(),profileId:p.id,projectId:project.id,nodeId:project.nodes[0].id,nodeTitle:'Approval detail',projectTitle:project.title,view:i===1?'flow':'canvas',activity:i===1?'editing':'viewing',updatedAt:new Date().toISOString()}));let selected:Presence|undefined;
 const props={members,profiles,documents:[{id:project.id,title:project.title,updatedAt:project.updatedAt}],project:null,sessionId:members[0].sessionId,error:'',onGo:(p:Presence)=>{selected=p;}};
 await act(async()=>root.render(<TeamPresence {...props}/>));assert.equal(host.querySelectorAll('.presence-avatar').length,3);assert.equal(host.querySelector('.presence-overflow')!.textContent,'+1');assert.ok([...host.querySelectorAll('button')].some(e=>e.title.includes('Approval detail')));
 await act(async()=>host.querySelector<HTMLButtonElement>('.presence-overflow')!.click());assert.equal(document.querySelectorAll('.presence-person').length,4);assert.ok(document.querySelector('.presence-popover')!.textContent?.includes('Mengedit'));
 await act(async()=>[...document.querySelectorAll<HTMLButtonElement>('.presence-person')].find(e=>e.textContent?.includes('Hadist'))!.click());assert.equal(selected!.profileId,'hadist');assert.equal(document.querySelector('.presence-popover'),null);
 await act(async()=>host.querySelector<HTMLButtonElement>('.presence-avatar')!.click());assert.equal(document.querySelectorAll('.presence-person').length,1);assert.ok(!document.querySelector('.presence-popover')!.textContent?.includes('Nando'));await act(async()=>document.querySelector<HTMLButtonElement>('[aria-label="Tutup aktivitas tim"]')!.click());
 await act(async()=>root.render(<TeamPresence {...props} members={[members[0]]}/>));assert.equal(host.querySelectorAll('.presence-avatar').length,0);assert.equal(host.querySelector('.presence-overflow'),null);await act(async()=>root.unmount());console.log('MAP-014 Presence DOM: three avatar limit, +N overflow, exact page/activity, follow navigation and departed editors passed.');
}

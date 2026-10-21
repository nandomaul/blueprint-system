import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {TeamGate} from '../src/components/TeamGate.tsx';
import {ProjectHome} from '../src/components/ProjectHome.tsx';
import {FlowEditor} from '../src/components/FlowEditor.tsx';
import {EditorFullscreen} from '../src/components/EditorFullscreen.tsx';
import {ryanPersonnel} from '../src/domain/ryanPersonnel.ts';
import {resetWorkspaceLayout} from '../src/domain/workspaceLayout.ts';

export async function runCleanUiTests(){
 const host=document.getElementById('test-root')!,entered:Array<[string,string,boolean,string?]>=[],opened:Array<[string,string?]>=[];let root=createRoot(host);
 const click=async(label:string)=>{const el=[...host.querySelectorAll('button,summary')].find(el=>el.getAttribute('aria-label')===label||el.textContent?.trim()===label);assert.ok(el,'Missing '+label);await act(async()=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});};
 const fill=async(label:string,value:string)=>{const el=host.querySelector<HTMLInputElement|HTMLSelectElement>(`[aria-label="${label}"]`);assert.ok(el);await act(async()=>{Object.getOwnPropertyDescriptor(el instanceof HTMLInputElement?HTMLInputElement.prototype:window.HTMLSelectElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event(el instanceof HTMLInputElement?'input':'change',{bubbles:true}));});};
 const gate=(busy=false)=><TeamGate profile="nando" onProfile={()=>{}} busy={busy} error="" invitation=" invite-code " localCount={1} onRecovery={()=>{}} onEnter={(...values)=>{entered.push(values);}}/>;
 await act(async()=>root.render(gate()));assert.ok(host.querySelector('[aria-label="Tautan atau kode undangan"]'));await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.deepEqual(entered[0],['join','invite-code',false]);
 await click('Buat baru');await fill('Nama ruang tim',' Ruang baru ');await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.deepEqual(entered[1],['create','Ruang baru',true]);await act(async()=>root.render(gate(true)));assert.equal(host.querySelector('fieldset')!.disabled,true);await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(entered.length,2);await act(async()=>root.unmount());
 root=createRoot(host);await act(async()=>root.render(<ProjectHome projects={[{id:'z',title:'Zeta',updatedAt:'2026-10-20T02:00:00Z',pages:18},{id:'a',title:'Alpha',updatedAt:'2026-10-19T02:00:00Z',pages:9}]} teamName="Tim" profile="nando" sync="connecting" localCount={1} onOpen={(...values)=>{opened.push(values);}} onCreate={()=>{}} onShare={()=>{}} onSettings={()=>{}} onRyan={()=>{}} onRecovery={()=>{}}/>));
 assert.equal(host.querySelector('.connection-dot.live'),null);await fill('Urutkan proyek','name');assert.equal(host.querySelector('.project-card-open')!.getAttribute('aria-label'),'Buka proyek Alpha');await fill('Cari proyek',' ALPHA ');assert.equal(host.querySelectorAll('.project-card').length,1);await click('Aksi proyek Alpha');assert.equal(host.querySelector<HTMLDetailsElement>('details')!.open,true);await click('Buka alur');assert.deepEqual(opened,[['a','flow']]);assert.equal(host.querySelector<HTMLDetailsElement>('details')!.open,false);await click('Semua proyek');assert.equal(host.querySelectorAll('.project-card').length,2);await act(async()=>root.unmount());
 const previousBounds=HTMLElement.prototype.getBoundingClientRect;HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:1200,bottom:750,width:1200,height:750,toJSON(){return {};}});
 resetWorkspaceLayout();const p=ryanPersonnel();root=createRoot(host);
 try{
  await act(async()=>root.render(<FlowEditor project={p} node={p.nodes[0]} onSelect={()=>{}} onChange={()=>{throw new Error('Moving a panel must not change the project');}} onCanvas={()=>{}} onPreview={()=>{}}/>));
  const pointer=async(type:string,x:number,y:number)=>{await act(async()=>{const ev=new MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(ev,'pointerId',{value:99});host.querySelector('.drawer-title')!.dispatchEvent(ev);});};
  await pointer('pointerdown',120,30);await pointer('pointermove',410,170);await pointer('pointerup',410,170);assert.ok(host.querySelector('.flow-details.flow-floating'));assert.equal(JSON.parse(localStorage.getItem('blueprint-flow-panel-v1')!).dock,'float');await click('Tempel panel alur kiri');assert.equal(host.querySelector('.flow-floating'),null);await click('Sembunyikan panel alur');assert.equal(host.querySelector('.flow-details'),null);await click('Alat alur');assert.ok(host.querySelector('.flow-details'));await act(async()=>root.unmount());
 }finally{HTMLElement.prototype.getBoundingClientRect=previousBounds;resetWorkspaceLayout();}
 const fullscreen=Object.getOwnPropertyDescriptor(document,'fullscreenElement'),request=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'requestFullscreen'),exit=Object.getOwnPropertyDescriptor(document,'exitFullscreen');
 Object.defineProperty(document,'fullscreenElement',{value:null,configurable:true});Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:async function(this:HTMLElement){Object.defineProperty(document,'fullscreenElement',{value:this,configurable:true});document.dispatchEvent(new Event('fullscreenchange'));}});Object.defineProperty(document,'exitFullscreen',{configurable:true,value:async()=>{Object.defineProperty(document,'fullscreenElement',{value:null,configurable:true});document.dispatchEvent(new Event('fullscreenchange'));}});
 root=createRoot(host);
 try{await act(async()=>root.render(<div className="editor-shell"><EditorFullscreen/></div>));await click('Fullscreen editor');assert.equal(document.fullscreenElement,host.querySelector('.editor-shell'));await click('Keluar fullscreen editor');assert.equal(document.fullscreenElement,null);await act(async()=>root.unmount());}
 finally{for(const [target,name,descriptor] of [[document,'fullscreenElement',fullscreen],[HTMLElement.prototype,'requestFullscreen',request],[document,'exitFullscreen',exit]] as const){if(descriptor)Object.defineProperty(target,name,descriptor);else Reflect.deleteProperty(target,name);}}
 console.log('Clean UI DOM: create/join payload and busy gate, honest connection state, search/sort/project menu, movable flow panel without document writes, editor fullscreen API lifecycle passed.');
}

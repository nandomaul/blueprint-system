import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../src/App.tsx';
import {ryanPersonnel,RYAN_PROJECT_ID,RYAN_CHECKPOINT} from '../src/domain/ryanPersonnel.ts';
import {newProject} from '../src/domain/designer.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';

export async function runRyanUiTests(){
 const host=document.getElementById('test-root')!;
 const until=async(check:()=>boolean)=>{for(let i=0;i<120;i++){await act(async()=>{await new Promise(r=>setTimeout(r,25));});if(check())return;}throw new Error('Ryan UI timeout: '+document.body.textContent?.slice(-1500));};
 const click=async(text:string)=>{const scope=document.querySelector('dialog[open]')??document;const el=[...scope.querySelectorAll('button')].find(b=>b.textContent?.trim()===text||b.getAttribute('aria-label')===text);assert.ok(el,'Missing button '+text);await act(async()=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});};
 const fill=async(el:HTMLInputElement,value:string)=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});};
 window.history.replaceState(null,'','/?template=ryan-002&keep=1');
 let root=createRoot(host);await act(async()=>root.render(<App/>));await until(()=>Boolean(document.querySelector('.team-gate')));assert.equal(document.querySelector('.flow-node'),null);assert.ok(window.location.search.includes('template=ryan-002'));await act(async()=>root.unmount());
 const repo=createLocalWorkspace(window.indexedDB,'ryan-ui'),old=newProject('Existing protected project');await repo.write(old,null,'nando','Old checkpoint');
 const oldBounds=HTMLElement.prototype.getBoundingClientRect;
 HTMLElement.prototype.getBoundingClientRect=function(){return {x:0,y:0,left:0,top:0,right:1200,bottom:750,width:1200,height:750,toJSON(){return {};}};};
 try{
  root=createRoot(host);await act(async()=>root.render(<App initialRepository={repo}/>));await until(()=>document.querySelectorAll('.flow-node').length===18&&!window.location.search.includes('template='));
  assert.equal(document.querySelectorAll('.edge').length,21);assert.equal(new URLSearchParams(window.location.search).get('template'),null);assert.ok(window.location.pathname.endsWith('/userflow'));assert.equal((await repo.history(RYAN_PROJECT_ID))[0].label,RYAN_CHECKPOINT);assert.equal((await repo.list()).length,2);assert.deepEqual((await repo.load(old.id))!.project,old);
  assert.notEqual(document.querySelector<HTMLElement>('.canvas-plane')!.style.transform,'translate(30px,35px) scale(0.66)');
  await click('File');const title=document.querySelector<HTMLInputElement>('[aria-label="Nama proyek"]')!;await act(async()=>title.focus());await fill(title,'Ryan edited by team');await act(async()=>title.blur());await until(()=>document.body.textContent?.includes('Tersimpan ke ruang tim')??false);
  if(!document.querySelector('dialog[open]')&&!document.querySelector('.editor-menu-popup[aria-label="File"]'))await click('File');await click('Buka alur');await until(()=>!document.querySelector('.working-indicator'));await click('File');assert.equal(document.querySelector<HTMLInputElement>('[aria-label="Nama proyek"]')!.value,'Ryan edited by team');assert.equal((await repo.history(RYAN_PROJECT_ID)).length,1);
  await click('Preview');assert.ok(document.querySelector('.session-details'));await click('? FAQ proses');assert.ok(document.querySelector('#process-faq-content')?.textContent?.includes(ryanPersonnel().nodes[0].purpose));await click('HR Login');await click('HR Workspace');await click('Employee Data');await click('Buat document draft');await click('Review Draft');await click('Submit Approval Request');await click('Archived Document');assert.equal(document.querySelector('.session-details h2')?.textContent,'Archived Document');await click('Tutup');
  await act(async()=>root.unmount());
  const reopened=createLocalWorkspace(window.indexedDB,'ryan-ui');window.history.replaceState(null,'','/?template=ryan-002');root=createRoot(host);await act(async()=>root.render(<App initialRepository={reopened}/>));await until(()=>document.querySelectorAll('.flow-node').length===18&&!document.querySelector('.working-indicator'));await click('File');assert.equal(document.querySelector<HTMLInputElement>('[aria-label="Nama proyek"]')!.value,'Ryan edited by team');assert.equal((await reopened.history(RYAN_PROJECT_ID)).length,1);assert.equal((await reopened.history(old.id)).length,1);await act(async()=>root.unmount());
  const failed=createLocalWorkspace(window.indexedDB,'ryan-ui-failure');window.history.replaceState(null,'','/?template=ryan-002');root=createRoot(host);await act(async()=>root.render(<App initialRepository={{...failed,write:async()=>{throw new Error('Template save denied fixture');}}}/>));await until(()=>document.body.textContent?.includes('Template save denied fixture')??false);assert.equal(document.querySelectorAll('.flow-node').length,0);assert.equal((await failed.list()).length,0);assert.ok(window.location.search.includes('template='));await act(async()=>root.unmount());
 }finally{HTMLElement.prototype.getBoundingClientRect=oldBounds;window.history.replaceState(null,'','/');}
 console.log('Ryan UI DOM: auth gate, automatic apply, 18 screens, fit, atomic checkpoint, HR journey, FAQ, reopen preserving edits, old projects and save failure passed.');
}

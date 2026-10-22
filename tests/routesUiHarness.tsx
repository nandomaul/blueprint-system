import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../src/App.tsx';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {newProject,newPage} from '../src/domain/designer.ts';
import {enableDesign} from '../src/domain/designLayer.ts';
import {restoreDeepLink} from '../src/services/browserNavigation.ts';
import {workspacePath} from '../src/domain/navigation.ts';
import {setLanguage,getLanguage} from '../src/i18n.ts';
export async function runRoutesUiTests(){
 const host=document.getElementById('test-root')!,db='routes-ui-'+crypto.randomUUID();let repo=createLocalWorkspace(window.indexedDB,db),root=createRoot(host);const p=enableDesign(newProject('One shared project')),second=newPage(2);second.title='Approval';const project={...p,nodes:[...p.nodes,second],presentation:[...p.presentation,second.id]};await repo.write(project,null,'nando');setLanguage('id');
 const start=workspacePath({projectId:p.id,title:p.title,mode:'assets',nodeId:second.id});window.history.replaceState(null,'','/?bp_path='+encodeURIComponent(start)+'#review=fragment-only');restoreDeepLink();assert.equal(window.location.pathname,new URL('http://test'+start).pathname);assert.equal(window.location.hash,'#review=fragment-only');assert.ok(!window.location.search.includes('review='));window.history.replaceState(null,'','/?bp_path=https://outside.invalid');restoreDeepLink();assert.equal(window.location.pathname,'/');assert.equal(window.location.search,'');window.history.replaceState(null,'',start);
 const until=async(check:()=>boolean)=>{for(let i=0;i<120;i++){await act(async()=>{await new Promise(r=>setTimeout(r,15));});if(check())return;}throw new Error('Routes UI timeout '+window.location.href+' '+host.textContent?.slice(-800));};
 const click=async(label:string)=>{const scope=host.querySelector('dialog[open]')??host,button=[...scope.querySelectorAll('button')].find(e=>e.getAttribute('aria-label')===label||e.textContent?.trim()===label);assert.ok(button,label);await act(async()=>button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));};
 try{
  await act(async()=>root.render(<App initialRepository={repo}/>));await until(()=>Boolean(host.querySelector('.design-assets'))&&!host.querySelector('.working-indicator'));assert.equal(host.querySelector('.current-page-label')?.textContent,'Approval');assert.equal(window.location.pathname,new URL('http://test'+start).pathname);
  await click('Alur');await until(()=>window.location.pathname.endsWith('/userflow'));assert.equal(new URLSearchParams(window.location.search).get('page'),second.id);assert.ok(host.querySelector(`[data-node="${second.id}"].selected`));const flow=window.location.pathname+window.location.search;
  await click('System UI');await until(()=>window.location.pathname.endsWith('/system'));
  await act(async()=>{window.history.replaceState(null,'',flow);window.dispatchEvent(new window.PopStateEvent('popstate'));});await until(()=>Boolean(host.querySelector('.flow-editor'))&&!host.querySelector('.working-indicator'));assert.equal(host.querySelector('.current-page-label')?.textContent,'Approval');
  await click('Pengaturan');await click('Bahasa');await until(()=>window.location.pathname.endsWith('/settings')&&new URLSearchParams(window.location.search).get('section')==='language');const settingsLink=window.location.pathname+window.location.search;
  const lang=host.querySelector<HTMLSelectElement>('[aria-label="Bahasa aplikasi"]')!;const before=(await repo.load(p.id))!.project;await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value')!.set!.call(lang,'en');lang.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(getLanguage(),'en');assert.equal(document.documentElement.lang,'en');assert.deepEqual((await repo.load(p.id))!.project,before);assert.ok(!settingsLink.includes('language=en'));
  await act(async()=>root.unmount());repo=createLocalWorkspace(window.indexedDB,db);root=createRoot(host);await act(async()=>root.render(<App initialRepository={repo}/>));await until(()=>Boolean(host.querySelector('[aria-label="App language"]'))&&!host.querySelector('.working-indicator'));assert.ok(host.querySelector('dialog[open]'));assert.equal(host.querySelector('.current-page-label')?.textContent,'Approval');
  await click('Close');await click('Design UI');await until(()=>window.location.pathname.endsWith('/design'));const copied=window.location.pathname+window.location.search;await act(async()=>root.unmount());
  root=createRoot(host);await act(async()=>root.render(<App/>));await until(()=>Boolean(host.querySelector('.team-gate')));assert.equal(window.location.pathname+window.location.search,copied);await act(async()=>root.unmount());
 }finally{setLanguage('id');window.history.replaceState(null,'','/');await repo.close();}
 console.log('MAP-016 routes DOM: exact page/mode from copied URL, back navigation event, Settings section reload, auth-gate URL retention and device-only language without document mutation passed.');
}

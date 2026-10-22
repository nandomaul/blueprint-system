import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {newProject,element} from '../src/domain/designer.ts';
import {enableDesign,prepareDesignCanvases} from '../src/domain/designLayer.ts';
import {PrototypeViewer} from '../src/components/PrototypeViewer.tsx';
import {PrototypeSession} from '../src/components/PrototypeSession.tsx';
import {PreviewBoundary} from '../src/components/PreviewBoundary.tsx';
import {Overlay} from '../src/components/Overlay.tsx';
export async function runPreviewUiTests(){
 const host=document.getElementById('test-root')!,root=createRoot(host),bounds=HTMLElement.prototype.getBoundingClientRect,show=HTMLDialogElement.prototype.showModal;
 HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,width:1000,height:700,right:1000,bottom:700,toJSON(){return {};}});
 const p=newProject('Preview test');p.nodes[0].design!.elements=[{...element('heading'),text:'System stays visible'},{...element('input'),id:'test-field',text:'Draft input',y:160}];
 const project=prepareDesignCanvases(enableDesign(p)),before=JSON.stringify(project);const click=async(label:string)=>{const el=host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);assert.ok(el,label);await act(async()=>el.click());};
 try{
  await act(async()=>root.render(<PrototypeViewer project={project} node={project.nodes[0]} onNavigate={()=>{}}/>));
  assert.ok(host.querySelector('.design-surface')?.textContent?.includes('System stays visible'),'repro: an empty Design UI used to render a white surface');assert.ok(host.querySelector('[role=status]')?.textContent?.includes('System UI'));
  const frame=host.querySelector('.prototype-frame'),surface=host.querySelector('.design-surface'),input=host.querySelector<HTMLInputElement>('[aria-label="Draft input"]')!;input.value='Temporary form draft';
  for(const mode of ['Tampilan smartphone','Tampilan desktop','Tampilan smartphone','Otomatis'])await click(mode);
  assert.equal(host.querySelector('.prototype-frame'),frame,'one frame stretches instead of remounting');assert.equal(host.querySelector('.design-surface'),surface);assert.equal(host.querySelector('[aria-label="Draft input"]'),input);assert.equal(input.value,'Temporary form draft');assert.equal(JSON.stringify(project),before);assert.equal(host.querySelector('.fit-design')?.getAttribute('data-motion'),'true');assert.ok(host.querySelector<HTMLElement>('.fit-design-content')!.style.transform.startsWith('scale('));
  const legacy={...p,nodes:p.nodes.map(n=>{const old={...n};delete old.design;return old;})};await act(async()=>root.render(<PrototypeSession project={legacy} node={legacy.nodes[0]} guided onNavigate={()=>{}} onBack={()=>{}} canBack={false}/>));assert.ok(host.querySelector('.design-surface')?.textContent?.includes(legacy.nodes[0].title));
  function Broken(){throw new Error('Preview fixture failure');return null;}
  const logged=console.error;try{console.error=()=>{};await act(async()=>root.render(<PreviewBoundary resetKey="broken"><Broken/></PreviewBoundary>));}finally{console.error=logged;}
  assert.ok(host.querySelector('[role=alert]')?.textContent?.includes('Preview belum dapat ditampilkan'));assert.ok(host.querySelector('pre')?.textContent?.includes('Preview fixture failure'));
  await act(async()=>root.render(<PreviewBoundary resetKey="fixed"><p>Recovered</p></PreviewBoundary>));assert.equal(host.textContent,'Recovered');
  let closed=false;HTMLDialogElement.prototype.showModal=()=>{throw new Error('Native dialog unavailable');};await act(async()=>root.render(<Overlay stage title="Preview" onClose={()=>{closed=true;}}><p>Preview content survives</p></Overlay>));assert.ok(host.querySelector('dialog[open].dialog-fallback'));assert.ok(host.textContent?.includes('Preview content survives'));await act(async()=>host.querySelector('dialog')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));assert.equal(closed,true);
 }finally{await act(async()=>root.unmount());HTMLElement.prototype.getBoundingClientRect=bounds;HTMLDialogElement.prototype.showModal=show;}
 assert.notEqual(document.body.style.overflow,'hidden');console.log('MAP-020 DOM: empty-design preview regression, stable PC/mobile frame and form draft, no project writes, legacy preview, isolated recovery and native-dialog fallback passed.');
}

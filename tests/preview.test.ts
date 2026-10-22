import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,element} from '../src/domain/designer.ts';
import {enableDesign,prepareDesignCanvases} from '../src/domain/designLayer.ts';
import {previewLayout} from '../src/domain/preview.ts';

test('empty design canvas does not mask System UI, and preview never mutates project',()=>{
 const p=newProject('Preview');p.nodes[0].design!.elements=[{...element('heading'),text:'System visible'}];
 const prepared=prepareDesignCanvases(enableDesign(p)),before=JSON.stringify(prepared);
 for(const mode of ['auto','web','mobile'] as const){const r=previewLayout(prepared,prepared.nodes[0],mode,1280);assert.equal(r.visual,undefined);assert.equal(r.useDesignLayer,false);assert.equal(r.node.design.elements[0].text,'System visible');assert.equal(r.empty,false);assert.ok(r.width>0&&r.height>0);}
 assert.equal(JSON.stringify(prepared),before);
});
test('filled design canvas and old snapshots render, disabled design cannot mask system',()=>{
 const p=newProject('Preview'),n=p.nodes[0];n.design!.elements=[element('heading')];
 p.designLayer={enabled:true,bindings:[],canvases:[{id:n.id,design:{...n.design!,elements:[{...element('text'),text:'Visual design'}]}}]};
 assert.equal(previewLayout(p,n,'web',1280).visual?.elements[0].text,'Visual design');
 p.designLayer.enabled=false;assert.equal(previewLayout(p,n,'web',1280).visual,undefined);
 delete n.design;assert.ok(previewLayout(p,n,'auto',1280).node.design.elements.some(e=>e.text===n.title));
});
test('oversize mobile projection falls back to original with visible notice',()=>{
 const p=newProject('Long');p.nodes[0].design!.elements=Array.from({length:100},(_,i)=>({...element('text'),id:'e'+i,text:'Content '.repeat(80),x:0,y:0,width:900,height:100}));
 const r=previewLayout(p,p.nodes[0],'mobile',1280);assert.ok(r.notice.includes('4000'));assert.equal(r.mode,'web');assert.equal(r.width,p.nodes[0].design!.width);
});
test('narrow mobile preview is readable, empty pages are identified',()=>{
 const p=newProject('Empty');const r=previewLayout(p,p.nodes[0],'auto',375);assert.equal(r.mode,'mobile');assert.equal(r.phone,false);assert.equal(r.empty,true);assert.ok(r.width<=375);
});

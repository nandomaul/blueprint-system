import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {IDBFactory} from 'fake-indexeddb';
import {importProject,exportProject,validateProject} from '../src/domain/model.ts';
import {duplicatePage,editDesign,element} from '../src/domain/designer.ts';
import {arrangeDesign,changeLayout,layoutForView} from '../src/domain/responsive.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {defaultWorkspaceLayout,openPanel,positionPanel,readWorkspaceLayout,WorkspaceLayoutSchema} from '../src/domain/workspaceLayout.ts';
const project=importProject(await readFile(new URL('../src/data/ryan-personnel.blueprint.json',import.meta.url),'utf8'));
test('All 18 screens keep content, IDs, navigation and exact web geometry through mobile/presentation/web',()=>{
 for(const n of project.nodes){let d=n.design!;for(const mode of ['mobile','presentation','web'] as const){d=changeLayout(d,mode);validateProject({...project,nodes:project.nodes.map(v=>v.id===n.id?{...n,design:d}:v)});assert.deepEqual(d.elements.map(e=>[e.id,e.kind,e.text,e.target,e.assetId]),n.design!.elements.map(e=>[e.id,e.kind,e.text,e.target,e.assetId]));if(mode==='mobile')assert.ok(d.elements.filter(e=>e.kind==='button').every(e=>e.height>=44&&e.fontSize>=14));}assert.deepEqual(d.elements,n.design!.elements);assert.equal(d.width,n.design!.width);assert.equal(d.height,n.design!.height);}
});
test('Mobile edits share semantic content; saved layout geometry survives JSON, IndexedDB and duplicate pages',async()=>{
 const id=project.nodes[0].id;let d=changeLayout(project.nodes[0].design!,'mobile');const button=d.elements.find(e=>e.kind==='button')!;d={...d,elements:d.elements.map(e=>e.id===button.id?{...e,text:'Uji lintas format',target:project.nodes[1].id}:e)};
 let p=editDesign(project,id,d);p=editDesign(p,id,changeLayout(d,'web'));assert.equal(p.nodes[0].design!.elements.find(e=>e.id===button.id)!.text,'Uji lintas format');assert.equal(p.edges.find(e=>e.id===button.edgeId)!.target,project.nodes[1].id);
 const duplicated=duplicatePage(p,id),copy=duplicated.nodes.at(-1)!,copyMobile=changeLayout(copy.design!,'mobile');assert.equal(copyMobile.elements.find(e=>e.text==='Uji lintas format')!.width,d.elements.find(e=>e.id===button.id)!.width);
 const restored=importProject(exportProject(duplicated));assert.deepEqual(restored.nodes,duplicated.nodes);assert.deepEqual(restored.edges,duplicated.edges);assert.equal(restored.assets.length,duplicated.assets.length);
 const repo=createLocalWorkspace(new IDBFactory(),'layout-007');try{await repo.write(p,null,'nando','Responsive checkpoint');assert.deepEqual((await repo.load(p.id))!.project,p);assert.deepEqual((await repo.history(p.id))[0].project,p);}finally{await repo.close();}
});
test('Legacy squeezed design can be arranged without deleting components and read-only projection never mutates source',()=>{
 const d=project.nodes[0].design!,squeezed={...d,width:1920,height:1080,elements:d.elements.map(e=>({...e,width:Math.min(390,e.width),x:0,y:Math.min(e.y,844-Math.min(e.height,844)),height:Math.min(e.height,844)}))};
 const source=JSON.stringify(squeezed),mobile=layoutForView(squeezed,'mobile');assert.equal(JSON.stringify(squeezed),source);assert.ok(mobile.elements.filter(e=>e.kind==='button').every(e=>e.height>=44));
 const repaired=changeLayout(squeezed,'web');assert.ok(Math.max(...repaired.elements.map(e=>e.x+e.width))>repaired.width*.8);assert.equal(repaired.elements.length,d.elements.length);
 const arranged=arrangeDesign(d);validateProject({...project,nodes:project.nodes.map((n,i)=>i===0?{...n,design:arranged}:n)});
 const added={...mobile,elements:[...mobile.elements,{...element('input'),id:'new-field',width:200,height:70,x:20,y:20}]};assert.equal(changeLayout(added,'web').elements.length,d.elements.length+1);
});
test('Panel docking, floating, ordering, persistence and reset defaults are independent of document data',()=>{
 const defaults=defaultWorkspaceLayout();assert.ok(Object.values(defaults.panels).every(p=>!p.open));const base=positionPanel(defaults,'elements',{open:true}),opened=openPanel(base,'page');assert.equal(opened.panels.layers.open,false);assert.equal(opened.panels.elements.open,true);assert.equal(opened.panels.page.open,true);
 const floating=positionPanel(opened,'page',{dock:'float',width:340,x:150,y:90}),withLayers=openPanel(floating,'layers');assert.equal(withLayers.panels.page.open,true);assert.equal(withLayers.panels.layers.open,true);
 assert.deepEqual(readWorkspaceLayout(JSON.stringify(withLayers)),withLayers);assert.deepEqual(readWorkspaceLayout('{bad'),defaults);assert.deepEqual(readWorkspaceLayout(JSON.stringify({...base,order:['page']})),defaults);assert.throws(()=>WorkspaceLayoutSchema.parse({...base,stripHeight:900}));
});

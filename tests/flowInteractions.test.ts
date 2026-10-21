import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {newProject,newPage,editDesign,upgradeDesign} from '../src/domain/designer.ts';
import {seedProject} from '../src/domain/seed.ts';
import {wireFlow,connectionButton,disconnectFlow,renameConnection,addFlowColumn,moveFlowColumn} from '../src/domain/flow.ts';
import {libraryElements,libraryItems} from '../src/domain/library.ts';
import {validateProject,exportProject,importProject} from '../src/domain/model.ts';
import {mergeProjects} from '../src/domain/merge.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
test('flow connections create a real preview button; reconnect both ends preserves edge identity and geometry',()=>{
 let p=newProject('Flow');p={...p,nodes:[...p.nodes,newPage(2),newPage(3)]};const [a,b,c]=p.nodes;p=wireFlow(p,a.id,b.id,undefined,'right','top');const edge=p.edges[0],id=edge.id,button=connectionButton(p,edge)!;assert.equal(button.target,b.id);
 p={...p,edges:p.edges.map(e=>({...e,bend:{x:400,y:300}}))};p=wireFlow(p,a.id,c.id,id,'bottom','left');assert.equal(p.edges[0].id,id);assert.deepEqual(p.edges[0].bend,{x:400,y:300});assert.equal(connectionButton(p,p.edges[0])?.target,c.id);
 p=wireFlow(p,b.id,c.id,id,'right','left');assert.equal(p.nodes[0].design!.elements.length,0);assert.equal(p.edges[0].source,b.id);assert.equal(connectionButton(p,p.edges[0])?.target,c.id);p=renameConnection(p,id,'Setujui');assert.equal(connectionButton(p,p.edges[0])?.text,'Setujui');p=disconnectFlow(p,id);assert.equal(p.edges.length,0);assert.equal(p.nodes[1].design!.elements[0].target,'');
});
test('legacy edge IDs and bends survive subsequent design edits',()=>{let p=upgradeDesign(seedProject());const edge=p.edges[0];p={...p,edges:p.edges.map(e=>e.id===edge.id?{...e,bend:{x:600,y:100}}:e)};const n=p.nodes.find(n=>n.id===edge.source)!;p=editDesign(p,n.id,{...n.design!,background:'#eeeeee'});assert.deepEqual(p.edges.find(e=>e.id===edge.id)?.bend,{x:600,y:100});});
test('dragging a column moves only screens inside it, plus persistence, History and concurrent merge',async()=>{
 let p=addFlowColumn(newProject('Kolom'),{x:50,y:50},'HR');p={...p,nodes:[...p.nodes,newPage(2)]};p.nodes[1].x=700;const moved=moveFlowColumn(p,p.flowColumns![0].id,250,150);assert.equal(moved.nodes[0].x,p.nodes[0].x+200);assert.equal(moved.nodes[1].x,700);assert.equal(moved.flowColumns![0].x,250);
 const remote={...p,description:'Catatan Ryan'};assert.equal(mergeProjects(p,moved,remote).description,remote.description);const repo=createLocalWorkspace(new IDBFactory(),'flow005'),r=await repo.write(p,null,'nando');await repo.write(moved,r.token,'hadist','Kolom dipindah',p);assert.deepEqual((await repo.load(p.id))?.project.flowColumns,moved.flowColumns);assert.equal((await repo.history(p.id))[0].project.nodes[0].x,moved.nodes[0].x);await repo.close();
});
test('all 24 element and block presets fit small/mobile/web canvases and survive JSON roundtrip',()=>{
 assert.equal(libraryItems.length,24);for(const size of [[320,320],[390,844],[1440,900]])for(const [key] of libraryItems){const p=newProject(key),n=p.nodes[0],design={...n.design!,width:size[0],height:size[1]},elements=libraryElements(key,design,{x:9999,y:9999}),result=editDesign(p,n.id,{...design,elements});assert.ok(elements.length);assert.equal(new Set(elements.map(e=>e.id)).size,elements.length);assert.deepEqual(importProject(exportProject(result)),validateProject(result));}
});

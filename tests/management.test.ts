import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {validateProject,importProject,exportProject} from '../src/domain/model.ts';
import {trashGroup,trashPage,trashElement,trashAsset,trashBinding,restoreTrash} from '../src/domain/projectTrash.ts';
import {skinAsset} from '../src/domain/designLayer.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {wireFlow} from '../src/domain/flow.ts';
import {fixture} from './managementFixture.ts';
test('Trash preserves groups, page links, component skins and images through export and restore',()=>{
 const p=fixture(),group=trashGroup(p,'group');assert.equal(group.nodes.length,2);assert.equal(restoreTrash(group,group.trash![0].id).flowColumns!.length,1);
 const screen=trashPage(p,p.nodes[1].id);assert.equal(screen.nodes[0].design!.elements[0].target,'');const back=restoreTrash(importProject(exportProject(screen)),screen.trash![0].id);assert.equal(back.nodes[0].design!.elements[0].target,p.nodes[1].id);assert.deepEqual(back.edges[0],p.edges[0]);
 const component=trashElement(p,p.nodes[0].id,'go');assert.equal(component.designLayer!.bindings.length,0);const restored=restoreTrash(component,component.trash![0].id);assert.equal(skinAsset(restored,p.nodes[0].id,'go')!.id,'a1');assert.deepEqual(restored.edges[0],p.edges[0]);
 const image=trashAsset(p,'a1');assert.ok(image.assets[0].deletedAt);assert.equal(image.designLayer!.bindings.length,0);assert.equal(skinAsset(restoreTrash(image,image.trash![0].id),p.nodes[0].id,'go')!.id,'a1');
 const binding=trashBinding(p,p.designLayer!.bindings[0].id);assert.equal(restoreTrash(binding,binding.trash![0].id).designLayer!.bindings[0].id,p.designLayer!.bindings[0].id);
 assert.throws(()=>validateProject({...p,trash:[{id:'bad',kind:'page',label:'broken',at:'now'}]}));
});
test('Shared repository metadata roundtrip: archived profiles, cover, pin, quick access, confirmation Trash and restore',async()=>{
 const f=new IDBFactory(),a=createLocalWorkspace(f,'management-test'),b=createLocalWorkspace(f,'management-test');try{const p=fixture();await a.write(p,null,'nando');const custom=await a.management!.profile('create',null,'Client');assert.equal((await b.management!.read()).profiles[3].id,custom.id);await a.management!.profile('trash','nando');await a.management!.profile('restore','nando');await a.management!.profile('trash',custom.id);assert.ok((await b.management!.read()).profiles[3].deletedAt);await a.management!.profile('restore',custom.id);
 await a.management!.projects('cover',[p.id],'a1');await a.management!.projects('pin',[p.id]);await a.management!.projects('hideShortcut',[p.id]);assert.ok((await b.list())[0].cover);const s=(await b.management!.read()).projects[0];assert.equal(s.pinned,true);assert.equal(s.shortcut,false);await assert.rejects(()=>a.management!.projects('trash',[p.id],null,'bad'),/Passcode/);await a.management!.projects('trash',[p.id],null,'systemdelete');const r=await b.load(p.id);assert.ok(r);await assert.rejects(()=>b.write(r!.project,r!.token,'nando'),/Trash/);await a.management!.projects('restore',[p.id]);await b.management!.projects('rename',[p.id],'Renamed');assert.equal((await a.load(p.id))!.project.title,'Renamed');}finally{await a.close();await b.close();}
});

test('Moving a connection source carries its Design UI skin to the same stable button in the destination page',()=>{const p=fixture(),moved=wireFlow(p,p.nodes[1].id,p.nodes[0].id,p.edges[0].id);assert.equal(moved.edges[0].id,p.edges[0].id);assert.equal(moved.nodes[1].design!.elements[0].id,'go');assert.equal(skinAsset(moved,p.nodes[1].id,'go')!.nodeId,p.nodes[1].id);assert.equal(moved.nodes[0].design!.elements.some(e=>e.id==='go'),false);});

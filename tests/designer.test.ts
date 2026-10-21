import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {newProject,newPage,element,editDesign,duplicatePage,upgradeDesign} from '../src/domain/designer.ts';
import {appendReference,removeAsset,removeNode,exportProject,importProject} from '../src/domain/model.ts';
import type {Asset} from '../src/domain/model.ts';
import {createRepository} from '../src/services/localRepository.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {Autosaver} from '../src/services/autosave.ts';
import type {DraftRecord} from '../src/services/workspace.ts';
const image:Asset={id:'a1',nodeId:'',name:'design.png',mime:'image/png',size:68,data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',version:1,createdAt:new Date().toISOString()};
test('canvas: tombol membentuk koneksi, edit target mengubah koneksi, hapus halaman membersihkan target',()=>{
 let p=newProject('Sistem A');const n=newPage(2);p={...p,nodes:[...p.nodes,n],presentation:[...p.presentation,n.id]};const a=p.nodes[0],b={...element('button'),target:n.id};p=editDesign(p,a.id,{...a.design!,elements:[b]});assert.equal(p.edges[0].target,n.id);const copied=duplicatePage(p,a.id);assert.equal(copied.edges.find(e=>e.source===copied.nodes.at(-1)!.id)?.target,n.id);
 p=editDesign(p,a.id,{...a.design!,elements:[{...b,target:a.id}]});assert.equal(p.edges.length,1);assert.equal(p.edges[0].target,a.id);
 p=editDesign(p,a.id,{...a.design!,elements:[b]});p=removeNode(p,n.id);assert.equal(p.nodes[0].design!.elements[0].target,'');assert.equal(p.edges.length,0);
});
test('gambar dapat dihapus dari canvas aktif; snapshot lama dan ekspor tetap utuh',()=>{
 let p=newProject('Gambar');const n=p.nodes[0];p=appendReference(p,{...image,nodeId:n.id});p=editDesign(p,n.id,{...n.design!,elements:[{...element('image'),assetId:image.id}]});const snapshot=exportProject(p),clean=removeAsset(p,image.id);assert.equal(clean.assets.length,0);assert.equal(clean.nodes[0].design!.elements.length,0);assert.equal(importProject(snapshot).assets.length,1);
 const copy=duplicatePage(p,n.id);assert.equal(copy.nodes.length,2);assert.equal(copy.assets.length,2);assert.notEqual(copy.assets[0].id,copy.assets[1].id);assert.equal(copy.nodes[1].design!.elements[0].assetId,copy.assets[1].id);
});
test('IndexedDB lama disalin tanpa upgrade; rollback tetap bisa membaca v1 dan sistem baru terisolasi',async()=>{
 const f=new IDBFactory(),old=createRepository(f,'upgrade003');let p=newProject('Lama');p=appendReference(p,{...image,nodeId:p.nodes[0].id});const saved=await old.save(p,null,'Hadist lama','hadist');await old.close();
 const repo=createLocalWorkspace(f,'upgrade003');assert.equal((await repo.load(p.id))?.token,saved.token);assert.equal((await repo.history(p.id))[0].project.assets.length,1);
 const other=newProject('Sistem B'),r=await repo.write(other,null,'ryan');await repo.write({...other,title:'Sistem B baru'},r.token,'ryan','B1');assert.equal((await repo.list()).length,2);assert.equal((await repo.load(p.id))?.project.title,'Lama');assert.equal((await repo.history(p.id)).length,1);assert.equal((await repo.history(other.id)).length,1);
 await repo.version(saved.version.id,'trash');assert.ok((await repo.history(p.id))[0].deletedAt);await repo.version(saved.version.id,'untrash');await repo.version(saved.version.id,'rename','Nama baru');assert.equal((await repo.history(p.id))[0].label,'Nama baru');await repo.close();const rollback=createRepository(f,'upgrade003');assert.equal((await rollback.load())?.project.title,'Lama');await rollback.close();
});
test('autosave menampung edit saat request masih berjalan dan membuat checkpoint hanya saat diminta',async()=>{
 const local=createLocalWorkspace(new IDBFactory(),'autosave003'),p=newProject('Autosave'),r=await local.write(p,null,'nando');let journal:DraftRecord|null=null,release:()=>void=()=>{},writes=0;
 const gate=new Promise<void>(resolve=>{release=resolve;}),adapter={...local,async write(...args:Parameters<typeof local.write>){writes++;if(writes===1)await gate;return local.write(...args);}};
 const saver=new Autosaver(adapter,p,r.token,()=>'hadist',async v=>{journal=v;},()=>{},()=>{},60000);
 saver.edit({...p,title:'Edit pertama'});const saving=saver.flush();await new Promise(resolve=>setTimeout(resolve,0));saver.edit({...p,title:'Edit saat request'});release();await saving;
 assert.equal((await local.load(p.id))?.project.title,'Edit saat request');assert.equal((await local.history(p.id)).length,0);assert.equal(journal,null);assert.equal(saver.dirty,false);await saver.checkpoint('Checkpoint nyata');assert.equal((await local.history(p.id)).length,1);await saver.stop();await local.close();
});
test('autosave gagal menyimpan menjaga draft; konflik tidak menimpa data anggota lain',async()=>{
 const repo=createLocalWorkspace(new IDBFactory(),'conflict003'),p=newProject('Awal'),r=await repo.write(p,null,'nando');let journal:DraftRecord|null=null;const states:string[]=[];
 const saver=new Autosaver(repo,p,r.token,()=>'ryan',async v=>{journal=v;},s=>states.push(s),()=>{},60000);saver.edit({...p,title:'Draft Ryan'});await repo.write({...p,title:'Versi Hadist'},r.token,'hadist');await assert.rejects(()=>saver.flush(),/CONFLICT/);assert.ok(journal);assert.equal(states.at(-1),'conflict');assert.equal((await repo.load(p.id))?.project.title,'Versi Hadist');await saver.stop();await repo.close();
});
test('snapshot lama ditingkatkan menjadi komponen data yang dapat diedit',()=>{const p=newProject('Legacy');const legacy={...p,nodes:p.nodes.map(n=>{const copy={...n};delete copy.design;return copy;})};const a=upgradeDesign(legacy);assert.ok(a.nodes[0].design?.elements.length);assert.deepEqual(upgradeDesign(a),a);});

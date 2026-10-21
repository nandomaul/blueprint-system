import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {newProject,element,editDesign,newPage} from '../src/domain/designer.ts';
import {mergeProjects,mergeJson} from '../src/domain/merge.ts';
import {removeNode} from '../src/domain/model.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {createRepository} from '../src/services/localRepository.ts';
import {Autosaver} from '../src/services/autosave.ts';
import {invitationLink,inviteCode} from '../src/services/teamSession.ts';
function example(){const p=newProject('Kolaborasi'),n=p.nodes[0];return editDesign(p,n.id,{...n.design!,elements:[{...element('heading'),id:'title'},{...element('button'),id:'action',y:160}]});}
test('merge field-level: different objects, same object different fields, additions and deletion survive',()=>{
 const p=example(),local=structuredClone(p),remote=structuredClone(p);local.nodes[0].design!.elements[0].text='Ryan menulis';remote.nodes[0].design!.elements[1].background='#ff0000';remote.description='Brief Hadist';assert.equal(mergeProjects(p,local,remote).nodes[0].design!.elements[0].text,'Ryan menulis');assert.equal(mergeProjects(p,local,remote).nodes[0].design!.elements[1].background,'#ff0000');
 local.nodes[0].design!.elements[1].x=120;assert.equal(mergeProjects(p,local,remote).nodes[0].design!.elements[1].x,120);
 local.nodes[0].design!.elements.push({...element('text'),id:'local-added',y:300});remote.nodes[0].design!.elements.push({...element('text'),id:'remote-added',y:400});assert.equal(mergeProjects(p,local,remote).nodes[0].design!.elements.length,4);
 const deleted=structuredClone(p);deleted.nodes[0].design!.elements.pop();assert.equal(mergeProjects(p,deleted,{...p,description:'Remote'}).nodes[0].design!.elements.length,1);
});
test('merge protects same property, delete versus edit, independent invalid relationships and layer order',()=>{
 const p=example(),a=structuredClone(p),b=structuredClone(p);a.nodes[0].design!.elements[0].text='A';b.nodes[0].design!.elements[0].text='B';assert.throws(()=>mergeProjects(p,a,b),/CONFLICT/);a.nodes[0].design!.elements=[];assert.throws(()=>mergeProjects(p,a,b),/CONFLICT/);
 const other=newPage(2),base={...p,nodes:[...p.nodes,other],presentation:[...p.presentation,other.id]},removed=removeNode(base,other.id),linked=editDesign(base,p.nodes[0].id,{...p.nodes[0].design!,elements:p.nodes[0].design!.elements.map(e=>e.kind==='button'?{...e,target:other.id}:e)});assert.throws(()=>mergeProjects(base,removed,linked),/CONFLICT/);
 const q=[{id:'a'},{id:'b'},{id:'c'}];assert.throws(()=>mergeJson(q,[q[1],q[0],q[2]],[q[0],q[2],q[1]]),/CONFLICT/);assert.deepEqual(mergeJson(q,[q[1],q[0],q[2]],q),[q[1],q[0],q[2]]);
});
test('two independent sessions keep concurrent edits, merge a dirty remote refresh, checkpoint and reload',async()=>{
 const factory=new IDBFactory(),one=createLocalWorkspace(factory,'two004'),two=createLocalWorkspace(factory,'two004'),p=example(),r=await one.write(p,null,'nando');
 const first=new Autosaver(one,p,r.token,()=>'ryan',async()=>{},()=>{},()=>{},60000),second=new Autosaver(two,p,r.token,()=>'hadist',async()=>{},()=>{},()=>{},60000);
 const a=structuredClone(p),b=structuredClone(p);a.nodes[0].design!.elements[0].text='Ryan';b.nodes[0].design!.elements[1].text='Hadist';first.edit(a);second.edit(b);await first.flush();await second.flush();
 const combined=(await one.load(p.id))!;assert.equal(combined.project.nodes[0].design!.elements[0].text,'Ryan');assert.equal(combined.project.nodes[0].design!.elements[1].text,'Hadist');assert.equal(second.value.nodes[0].design!.elements[0].text,'Ryan');
 first.edit({...first.value,description:'Draft belum terkirim'});assert.equal(await first.acceptRemote(combined),true);await first.checkpoint('Review bersama');assert.equal((await two.history(p.id))[0].project.description,'Draft belum terkirim');assert.equal((await two.history(p.id))[0].project.nodes[0].design!.elements[1].text,'Hadist');await first.stop();await second.stop();await one.close();await two.close();
});
test('invitation is an explicit shared room capability and stays in URL fragment',()=>{const code='11111111-1111-4111-8111-111111111111',url=invitationLink(code,{origin:'https://nandomaul.github.io',pathname:'/blueprint-system/'});assert.equal(new URL(url).search,'');assert.equal(inviteCode(url),code);assert.equal(inviteCode(code),code);assert.throws(()=>inviteCode('nando'));});

test('legacy checkpoints from a different imported project remain discoverable after recovery',async()=>{
 const factory=new IDBFactory(),old=createRepository(factory,'archives004'),first=newProject('Proyek lama'),a=await old.save(first,null,'Lama','nando'),second=newProject('Proyek aktif');await old.save(second,a.token,'Aktif','hadist');await old.close();const repo=createLocalWorkspace(factory,'archives004');assert.equal((await repo.list()).length,2);assert.equal((await repo.load(first.id))?.project.title,'Proyek lama');assert.equal((await repo.history(first.id))[0].label,'Lama');await repo.close();
});

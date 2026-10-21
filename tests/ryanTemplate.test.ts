import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {IDBFactory} from 'fake-indexeddb';
import {importProject} from '../src/domain/model.ts';
import {readiness,editDesign} from '../src/domain/designer.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {openOrCreateTemplate} from '../src/services/projectTemplates.ts';
const project=importProject(await readFile(new URL('../src/data/ryan-personnel.blueprint.json',import.meta.url),'utf8'));
test('Ryan reference has 18 screens, three role rows and real Preview connections',()=>{
 assert.equal(project.nodes.length,18);assert.equal(project.edges.length,21);assert.equal(project.flowColumns?.length,0);assert.deepEqual(readiness(project),[]);
 const at=(key:string)=>project.nodes.find(n=>n.id==='ryan002-'+key)!;
 assert.ok(at('employee-login').y<at('user-login').y&&at('user-login').y<at('hr-login').y);
 assert.ok(at('draft').x>at('employee-data').x&&at('review').x>at('draft').x);
 for(const n of project.nodes){const buttons=n.design!.elements.filter(e=>e.kind==='button');assert.equal(buttons.length,project.edges.filter(e=>e.source===n.id).length);for(const b of buttons){const edge=project.edges.find(e=>e.id===b.edgeId)!;assert.equal(edge.source,n.id);assert.equal(edge.target,b.target);assert.equal(edge.label,b.text);}assert.equal(editDesign(project,n.id,n.design!).edges.length,21);}
 const reached=new Set([at('welcome').id]);let before=0;while(reached.size!==before){before=reached.size;for(const edge of project.edges)if(reached.has(edge.source))reached.add(edge.target);}assert.equal(reached.size,18);
});
test('Two members create one template/checkpoint and reopening preserves team edits and old projects',async()=>{
 const factory=new IDBFactory(),a=createLocalWorkspace(factory,'ryan-race'),b=createLocalWorkspace(factory,'ryan-race');
 try{
  const old={...project,id:'old-project',title:'Existing team project'};await a.write(old,null,'nando','Original');
  const results=await Promise.all([openOrCreateTemplate(a,project,'nando','Ryan initial'),openOrCreateTemplate(b,project,'ryan','Ryan initial')]);
  assert.equal(results.filter(r=>r.created).length,1);assert.equal((await a.list()).length,2);assert.equal((await a.history(project.id)).length,1);
  const current=(await a.load(project.id))!,edited={...current.project,title:'Edited by Hadist',nodes:current.project.nodes.map((n,i)=>i===0?{...n,x:n.x+80}:n)};
  await a.write(edited,current.token,'hadist');
  const reopened=await openOrCreateTemplate(b,project,'ryan','Ryan initial');assert.equal(reopened.created,false);assert.deepEqual(reopened.record.project,edited);assert.deepEqual((await a.load(old.id))!.project,old);assert.equal((await a.history(project.id)).length,1);
 }finally{await a.close();await b.close();}
});
test('Template write failure remains an error; lost acknowledgement reopens the saved project',async()=>{
 const local=createLocalWorkspace(new IDBFactory(),'ryan-failure');
 try{
  const failure=new Error('Save denied');await assert.rejects(openOrCreateTemplate({...local,write:async()=>{throw failure;}},project,'nando','Ryan'),failure);
  assert.equal((await local.list()).length,0);
  const recovered=await openOrCreateTemplate({...local,write:async(...args)=>{await local.write(...args);throw new Error('Lost acknowledgement');}},project,'nando','Ryan');
  assert.deepEqual(recovered.record.project,project);assert.equal((await local.history(project.id)).length,1);
 }finally{await local.close();}
});

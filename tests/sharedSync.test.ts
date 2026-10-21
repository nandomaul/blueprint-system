import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {Autosaver} from '../src/services/autosave.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import {newProject} from '../src/domain/designer.ts';

test('cloud acknowledgement is independent of an unavailable browser recovery journal',async()=>{
 const storage=createLocalWorkspace(new IDBFactory(),'cloud-journal-failure'),p=newProject('Before'),r=await storage.write(p,null,'nando'),states:string[]=[];
 const cloud={...storage,kind:'supabase' as const};
 const saver=new Autosaver(cloud,p,r.token,()=>'nando',async()=>{throw new Error('QuotaExceededError');},state=>states.push(state),()=>{},60000);
 saver.edit({...p,title:'Saved online'});await saver.flush();assert.equal(states.at(-1),'saved');assert.equal(saver.dirty,false);assert.equal((await storage.load(p.id))!.project.title,'Saved online');await saver.stop();await storage.close();
});

test('cloud errors never report saved, including when the recovery journal is unavailable',async()=>{
 const storage=createLocalWorkspace(new IDBFactory(),'cloud-write-failure'),p=newProject('Before'),r=await storage.write(p,null,'nando'),states:string[]=[];
 let fail=true;const cloud={...storage,kind:'supabase' as const,write:async(...args:Parameters<typeof storage.write>)=>{if(fail)throw new Error('Network unavailable');return storage.write(...args);}};
 const saver=new Autosaver(cloud,p,r.token,()=>'nando',async()=>{throw new Error('QuotaExceededError');},state=>states.push(state),()=>{},60000);
 saver.edit({...p,title:'Pending online'});await assert.rejects(()=>saver.flush(),/Network unavailable/);assert.equal(states.at(-1),'error');assert.equal(saver.dirty,true);assert.equal((await storage.load(p.id))!.project.title,'Before');fail=false;await saver.flush();assert.equal(states.at(-1),'saved');assert.equal((await storage.load(p.id))!.project.title,'Pending online');await saver.stop();await storage.close();
});

test('device-only repositories still require a durable journal before acknowledging a save',async()=>{
 const storage=createLocalWorkspace(new IDBFactory(),'device-journal-failure'),p=newProject('Before'),r=await storage.write(p,null,'nando'),states:string[]=[];
 const saver=new Autosaver(storage,p,r.token,()=>'nando',async()=>{throw new Error('QuotaExceededError');},state=>states.push(state),()=>{},60000);
 saver.edit({...p,title:'Not durable'});await assert.rejects(()=>saver.flush(),/QuotaExceededError/);assert.equal(states.at(-1),'error');assert.equal(saver.dirty,true);assert.equal((await storage.load(p.id))!.project.title,'Before');await saver.stop().catch(()=>{});await storage.close();
});

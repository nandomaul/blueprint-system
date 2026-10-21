import {changeLayout} from '../src/domain/responsive.ts';
import {mergeJson} from '../src/domain/merge.ts';
import type {Json} from '../src/domain/merge.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createCloudWorkspace} from '../src/services/cloudWorkspace.ts';
import {newProject,element,editDesign} from '../src/domain/designer.ts';
import {appendReference,removeAsset} from '../src/domain/model.ts';
const w='11111111-1111-4111-8111-111111111111';
test('SDK MAP-003: multiple documents, private images, autosave/checkpoint, conflict and reload',async()=>{
 type Row={project_id:string;token:string;title:string;payload:unknown;updated_at:string};type VersionRow={id:string;project_id:string;snapshot:unknown;label:string;saved_at:string;profile:string;deleted_at:string|null};
 const docs=new Map<string,Row>(),versions:VersionRow[]=[],objects=new Map<string,ArrayBuffer>(),registry=new Map<string,{storage_path:string;sha256:string}>();let uploads=0;
 const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
 const fake:typeof fetch=async(input,init)=>{const r=new Request(input,init),url=new URL(r.url),path=url.pathname,id=url.searchParams.get('project_id')?.slice(3);
  if(path.startsWith('/storage/v1/object/')){const key=decodeURIComponent(path.replace('/storage/v1/object/authenticated/','').replace('/storage/v1/object/',''));if(r.method==='POST'){objects.set(key,await r.arrayBuffer());uploads++;return json({Key:key});}assert.ok(objects.has(key));return new Response(objects.get(key),{headers:{'Content-Type':'image/png'}});}
  if(path.endsWith('/bp_assets')){const a=registry.get(url.searchParams.get('asset_id')?.slice(3)??'');return json(a?[a]:[]);}
  if(path.endsWith('/bp_documents'))return json(id?(docs.has(id)?[docs.get(id)]:[]):[...docs.values()]);
  if(path.endsWith('/bp_document_versions'))return json(versions.filter(v=>v.project_id===id));
  const p=await r.json() as Record<string,unknown>;
  if(path.endsWith('/bp_register_asset')){registry.set(String(p.p_asset_id),{storage_path:String(p.p_path),sha256:String(p.p_sha256)});return json(null);}
  if(path.endsWith('/bp_write_document')||path.endsWith('/bp_merge_document')){const id=String(p.p_project_id),old=docs.get(id);const merging=path.endsWith('/bp_merge_document');if(!merging&&(old?.token??null)!==p.p_expected_token)return json({message:'CONFLICT: anggota lain',code:'40001'},409);let payload:{title:string};try{payload=(merging?mergeJson(p.p_base as Json,p.p_local as Json,old?.payload as Json):p.p_payload) as {title:string};}catch{return json({message:'CONFLICT: anggota lain',code:'40001'},409);}const token=crypto.randomUUID();docs.set(id,{project_id:id,token,title:payload.title,payload,updated_at:new Date().toISOString()});if(p.p_label!==null)versions.push({id:crypto.randomUUID(),project_id:id,snapshot:payload,label:String(p.p_label),saved_at:new Date().toISOString(),profile:String(p.p_profile),deleted_at:null});return json({token,...(merging?{payload}:{})});}
  if(path.endsWith('/bp_edit_document_version')){const v=versions.find(v=>v.id===p.p_id)!;if(p.p_action==='rename')v.label=String(p.p_label);else v.deleted_at=p.p_action==='trash'?new Date().toISOString():null;return json(null);}
  throw new Error('Unexpected route '+path);
 };
 const client=createClient('https://test.supabase.co','fake-publishable-key',{global:{fetch:fake},auth:{persistSession:false,autoRefreshToken:false}}),repo=createCloudWorkspace(client,w);
 let p=newProject('Cloud A');const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';p=appendReference(p,{id:'a1',nodeId:p.nodes[0].id,name:'mock.png',mime:'image/png',size:Buffer.from(data.split(',')[1],'base64').length,data,version:1,createdAt:new Date().toISOString()});p=editDesign(p,p.nodes[0].id,{...p.nodes[0].design!,elements:[{...element('image'),assetId:'a1'}]});
 p=editDesign(p,p.nodes[0].id,changeLayout(p.nodes[0].design!,'mobile'));
 const first=await repo.write(p,null,'hadist');assert.equal(versions.length,0);assert.equal(uploads,1);assert.ok(!JSON.stringify([...docs.values()]).includes('base64'));const checkpoint=await repo.write(p,first.token,'ryan','Review');assert.equal(versions.length,1);await assert.rejects(()=>repo.write(p,first.token,'nando'),/CONFLICT/);
 await repo.write(newProject('Cloud B'),null,'ryan');assert.equal((await repo.list()).length,2);
 const reopened=createCloudWorkspace(client,w);assert.deepEqual((await reopened.load(p.id))?.project,p);assert.equal((await reopened.history(p.id))[0].project.assets[0].data,data);
 const local={...p,description:'Nando di laptop A'},remote={...p,title:'Hadist di laptop B'};await repo.write(local,checkpoint.token,'nando',undefined,p);const merged=await reopened.write(remote,checkpoint.token,'hadist',undefined,p);assert.equal(merged.project.description,local.description);assert.equal(merged.project.title,remote.title);
 await repo.write(removeAsset(merged.project,'a1'),merged.token,'hadist');assert.equal((await reopened.load(p.id))?.project.assets.length,0);assert.equal((await reopened.history(p.id))[0].project.assets.length,1);assert.equal(objects.size,1);
 const id=(await repo.history(p.id))[0].id;await repo.version(id,'rename','Final');await repo.version(id,'trash');assert.ok((await repo.history(p.id))[0].deletedAt);await repo.version(id,'untrash');assert.equal((await repo.history(p.id))[0].label,'Final');
 await repo.close();await reopened.close();
});
test('Realtime lifecycle: database-ready signal, canonical refresh and unsubscribe cleanup',async()=>{
 const callbacks=new Map<string,()=>void>();let subscription:(status:string)=>void=()=>{},removed=0,changes=0;const statuses:string[]=[];
 const channel={on(type:string,_filter:unknown,callback:(payload:unknown)=>void){callbacks.set(type==='system'?'system':String(callbacks.size),()=>callback(type==='system'?{extension:'postgres_changes',status:'ok'}:{}));return this;},subscribe(cb:(status:string)=>void){subscription=cb;return this;}};
 const client={channel:()=>channel,removeChannel:async()=>{removed++;}} as unknown as Parameters<typeof createCloudWorkspace>[0];
 const repo=createCloudWorkspace(client,w),stop=repo.watch(()=>changes++,s=>statuses.push(s));assert.equal(statuses.at(-1),'connecting');subscription('SUBSCRIBED');assert.equal(changes,1);assert.equal(statuses.at(-1),'connecting');callbacks.get('system')!();assert.equal(statuses.at(-1),'live');callbacks.get('0')!();assert.equal(changes,3);subscription('CHANNEL_ERROR');assert.equal(statuses.at(-1),'reconnecting');stop();assert.equal(removed,1);await repo.close();
});

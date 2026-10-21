import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {newProject,element,editDesign,newPage} from '../src/domain/designer.ts';
import {mergeJson} from '../src/domain/merge.ts';
import type {Json} from '../src/domain/merge.ts';
import {changeLayout} from '../src/domain/responsive.ts';
import {removeNode} from '../src/domain/model.ts';
const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',outsider='33333333-3333-4333-8333-333333333333';
test('SQL MAP-004: client/server merge parity, stale-token collaboration, invalid links, checkpoints and access isolation',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${member}'),('${outsider}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
 const sqlMerge=async(b:Json,l:Json,r:Json,path='project')=>(await db.query<{r:Json}>('select bp_merge_json($1::jsonb,$2::jsonb,$3::jsonb,$4) r',[JSON.stringify(b),JSON.stringify(l),JSON.stringify(r),path])).rows[0].r;
 const cases:[Json,Json,Json,string?][]=[
  [{a:1,b:2},{a:3,b:2},{a:1,b:4}], [{a:null,b:1},{b:1},{a:null,b:2}],
  [[{id:'a',x:1},{id:'b',x:2}],[{id:'b',x:2}],[{id:'a',x:1},{id:'b',x:3},{id:'c',x:4}]],
  [[{id:'a'},{id:'b'},{id:'c'}],[{id:'b'},{id:'a'},{id:'c'},{id:'d'}],[{id:'a'},{id:'b'},{id:'c'},{id:'e'}]],
  [['a','b'],['a','b','c'],['a','b','d'],'project.presentation'],
  [{id:'a',updatedAt:'2026-01-01'},{id:'a',updatedAt:'2026-02-01'},{id:'a',updatedAt:'2026-03-01'}],
 ];for(const [b,l,r,path] of cases)assert.deepEqual(await sqlMerge(b,l,r,path),mergeJson(b,l,r,path));
 await assert.rejects(()=>sqlMerge({x:1},{x:2},{x:3}),/CONFLICT/);await assert.rejects(()=>sqlMerge([{id:'a',text:'old'}],[],[{id:'a',text:'new'}]),/CONFLICT/);
 const auth=async(id:string)=>{await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);};await auth(owner);
 const w=(await db.query<{r:{workspaceId:string}}>('select bp_create_workspace($1) r',['SQL004'])).rows[0].r.workspaceId,code=(await db.query<{r:string}>('select bp_invite_code($1) r',[w])).rows[0].r;await auth(member);await db.query('select bp_join_workspace($1)',[code]);await auth(owner);
 let p=newProject('Shared');p=editDesign(p,p.nodes[0].id,{...p.nodes[0].design!,elements:[{...element('heading'),id:'title'},{...element('button'),id:'action',y:180}]});p=editDesign(p,p.nodes[0].id,changeLayout(p.nodes[0].design!,'mobile'));
 const token=(await db.query<{r:{token:string}}>('select bp_write_document($1,$2,null,$3::jsonb,$4) r',[w,p.id,JSON.stringify(p),'nando'])).rows[0].r.token;
 const write=async(base:typeof p,local:typeof p,expected:string,label:string|null=null)=>(await db.query<{r:{token:string;payload:typeof p;versionId:string|null}}>('select bp_merge_document($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) r',[w,p.id,expected,JSON.stringify(base),JSON.stringify(local),'ryan',label])).rows[0].r;
 const a=structuredClone(p),b=structuredClone(p);a.nodes[0].design!.elements[0].text='Ryan';b.nodes[0].design!.elements[1].text='Hadist';await write(p,a,token);await auth(member);const merged=await write(p,b,token,'Checkpoint bersama');assert.equal(merged.payload.nodes[0].design!.elements[0].text,'Ryan');assert.equal(merged.payload.nodes[0].design!.elements[1].text,'Hadist');assert.equal((await db.query('select * from bp_document_versions')).rows.length,1);assert.equal(merged.payload.nodes[0].design!.layouts!.web!.width,p.nodes[0].design!.layouts!.web!.width);
 const same=structuredClone(p);same.nodes[0].design!.elements[0].text='Nando';await assert.rejects(()=>write(p,same,token),/CONFLICT/);assert.equal((await db.query<{token:string}>('select token from bp_documents')).rows[0].token,merged.token);
 const next=newPage(2),two={...merged.payload,nodes:[...merged.payload.nodes,next],presentation:[...merged.payload.presentation,next.id]},seed=await write(merged.payload,two,merged.token),removed=removeNode(two,next.id),linked=editDesign(two,two.nodes[0].id,{...two.nodes[0].design!,elements:two.nodes[0].design!.elements.map(e=>e.kind==='button'?{...e,target:next.id}:e)});await write(two,removed,seed.token);await assert.rejects(()=>write(two,linked,seed.token),/CONFLICT/);
 await assert.rejects(()=>db.query('select bp_merge_json($1,$2,$3)',['{}','{}','{}']),/permission denied/);
 await auth(outsider);assert.equal((await db.query('select * from bp_documents')).rows.length,0);await assert.rejects(()=>write(p,a,token),/Akses/);
 await db.exec('reset role;set role anon');await assert.rejects(()=>write(p,a,token),/permission denied/);
 }finally{await db.close();}
});

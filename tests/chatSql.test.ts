import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {newProject} from '../src/domain/designer.ts';
const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',outsider='33333333-3333-4333-8333-333333333333';
test('MAP-012 SQL: shared chat, canonical mentions, cursors, retry deduplication, archived authors, paging and RLS',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${member}'),('${outsider}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
 const auth=async(id:string)=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);await auth(owner);
 const w=(await db.query<{r:{workspaceId:string}}>("select bp_create_workspace('Chat') r")).rows[0].r.workspaceId,invite=(await db.query<{r:string}>('select bp_invite_code($1) r',[w])).rows[0].r;
 const p=newProject('Client project');await db.query('select bp_write_document($1,$2,null,$3::jsonb,$4,null)',[w,p.id,JSON.stringify(p),'nando']);
 const custom=(await db.query<{r:{id:string}}>("select bp_editor_profile($1,'create',null,'Client') r",[w])).rows[0].r.id;
 const photo='data:image/webp;base64,UklGRg==';await db.query('select bp_update_editor_profile($1,$2,$3,$4)',[w,custom,'Customer',photo]);
 const cat=(await db.query<{r:{profiles:{id:string;name:string;avatar:string}[]}}>('select bp_workspace_catalog_v12($1) r',[w])).rows[0].r;assert.equal(cat.profiles.find(x=>x.id===custom)?.avatar,photo);
 await assert.rejects(()=>db.query('select bp_update_editor_profile($1,$2,$3,$4)',[w,custom,'X','data:image/svg+xml;base64,abc']),/Foto/);
 const send=async(profile:string,body:string,context:unknown=null,mentions:string[]=[],client=crypto.randomUUID(),kind='chat')=>(await db.query<{id:string}>('select bp_chat_send($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) id',[w,profile,client,body,kind,JSON.stringify(context),JSON.stringify(mentions)])).rows[0].id;
 const page=async(profile:string,before:string|null=null)=>(await db.query<{r:{messages:{id:string;authorName:string;context:{projectTitle:string;nodeTitle:string};mentions:{name:string}[]}[];unread:number;lastRead:string;hasMore:boolean}}>('select bp_chat_page($1,$2,$3) r',[w,profile,before])).rows[0].r;
 const client=crypto.randomUUID(),target={projectId:p.id,nodeId:p.nodes[0].id,view:'assets',projectTitle:'Spoof',nodeTitle:'Spoof'},first=await send(custom,'Please review',target,['ryan'],client);
 assert.equal(await send(custom,'Please review',target,['ryan'],client),first);await assert.rejects(()=>send(custom,'Changed body',target,['ryan'],client),/sudah dipakai/);await assert.rejects(()=>send(custom,'Please review',{...target,view:'flow'},['ryan'],client),/sudah dipakai/);
 const own=await page(custom);assert.equal(own.unread,0);assert.equal(own.messages[0].context.projectTitle,p.title);assert.equal(own.messages[0].context.nodeTitle,p.nodes[0].title);assert.equal(own.messages[0].mentions[0].name,'Ryan');
 await assert.rejects(()=>send(custom,'Bad page',{...target,nodeId:'missing'}),/Halaman/);await assert.rejects(()=>send(custom,'Bad mention',null,['p_11111111-1111-4111-8111-111111111111']),/mention/);
 await auth(member);await db.query('select bp_join_workspace($1)',[invite]);assert.equal((await page('ryan')).unread,1);await db.query('select bp_chat_read($1,$2,$3)',[w,'ryan',first]);assert.equal((await page('ryan')).unread,0);
 await auth(owner);assert.equal((await page('ryan')).unread,1);assert.equal((await page('hadist')).unread,1);await send('nando','Note',null,[],crypto.randomUUID(),'note');
 await db.query('select bp_chat_read($1,$2,$3)',[w,'ryan','9223372036854775807']);await send('hadist','New');assert.equal((await page('ryan')).unread,1);
 await db.query("select bp_editor_profile($1,'trash',$2,null)",[w,custom]);assert.equal((await page('ryan')).messages[0].authorName,'Customer');await assert.rejects(()=>send(custom,'Archived'),/Profil/);
 for(let i=0;i<51;i++)await send('hadist','Message '+i);const recent=await page('ryan');assert.equal(recent.messages.length,50);assert.equal(recent.hasMore,true);const earlier=await page('ryan',recent.messages[0].id);assert.equal(earlier.messages.length,4);assert.equal(earlier.hasMore,false);
 await db.query("select bp_editor_profile($1,'trash','nando',null)",[w]);await db.query("select bp_editor_profile($1,'trash','hadist',null)",[w]);await assert.rejects(()=>db.query("select bp_editor_profile($1,'trash','ryan',null)",[w]),/Sisakan/);await db.query("select bp_editor_profile($1,'restore','nando',null)",[w]);
 await assert.rejects(()=>db.query("update bp_chat_messages set body='hack'"),/permission denied/);await auth(outsider);assert.equal((await db.query('select * from bp_chat_messages')).rows.length,0);await assert.rejects(()=>page('ryan'),/Akses/);await assert.rejects(()=>send('nando','Hack'),/Akses/);await assert.rejects(()=>db.query('select bp_update_editor_profile($1,$2,$3,null)',[w,'nando','Hack']),/Akses/);await db.exec('reset role;set role anon');await assert.rejects(()=>page('ryan'),/permission denied/);
 }finally{await db.close();}
});

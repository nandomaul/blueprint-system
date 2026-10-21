import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
test('MAP-014 SQL: shared entry never grants new membership and selects only the configured workspace; Presence scoped to members and correct topic',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${member}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;create function realtime.topic() returns text language sql as $$select current_setting('test.topic',true)$$;`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();for(const f of files)await db.exec(await readFile(new URL(f,dir),'utf8'));
 const as=async(id:string)=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);await as(owner);
 const w=(await db.query<{r:{workspaceId:string}}>("select bp_create_workspace('Original team') r")).rows[0].r.workspaceId;
 await as(member);const other=(await db.query<{r:{workspaceId:string}}>("select bp_create_workspace('Separate room') r")).rows[0].r.workspaceId;
 await assert.rejects(()=>db.query('select bp_enter_shared_workspace()'),/belum dikonfigurasi/);
 await db.exec('reset role');await db.exec(await readFile(new URL(files.at(-1)!,dir),'utf8'));await as(member);
 await assert.rejects(()=>db.query('select bp_enter_shared_workspace()'),/belum diberi akses/);await as(owner);const invitation=(await db.query<{r:string}>('select bp_invite_code($1) r',[w])).rows[0].r;await as(member);await db.query('select bp_join_workspace($1)',[invitation]);
 assert.equal((await db.query<{r:string}>('select bp_enter_shared_workspace() r')).rows[0].r,w);assert.equal((await db.query<{r:string}>('select bp_enter_shared_workspace() r')).rows[0].r,w);
 assert.equal((await db.query('select * from bp_members where workspace_id=$1',[w])).rows.length,2);await assert.rejects(()=>db.query('select * from blueprint_private.shared_entry'),/permission denied/);
 await db.query("select set_config('test.topic',$1,false)",['blueprint-presence:'+w]);await db.exec("insert into realtime.messages values('presence')");assert.equal((await db.query('select * from realtime.messages')).rows.length,1);
 await db.query("select set_config('test.topic',$1,false)",['blueprint-presence:'+crypto.randomUUID()]);assert.equal((await db.query('select * from realtime.messages')).rows.length,0);await assert.rejects(()=>db.exec("insert into realtime.messages values('presence')"),/row-level security/);
 await db.query("select set_config('test.topic',$1,false)",['blueprint-presence:'+w]);await assert.rejects(()=>db.exec("insert into realtime.messages values('broadcast')"),/row-level security/);
 await db.exec('reset role');await db.exec(await readFile(new URL(files.at(-1)!,dir),'utf8'));assert.equal((await db.query<{workspace_id:string}>('select workspace_id from blueprint_private.shared_entry')).rows[0].workspace_id,w);assert.equal((await db.query('select * from bp_workspaces where id=$1',[other])).rows.length,1);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select bp_enter_shared_workspace()'),/permission denied/);
 }finally{await db.close();}
});

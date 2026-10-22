import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const query=await readFile(new URL('../supabase/manual/blueprint-check-MAP-020.sql',import.meta.url),'utf8');
type Check={bagian:string;item:string;status:string;detail:string};
test('SQL diagnostic is read-only, verifies exact source RPC signatures, and reports missing structure',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
  // The exact delivered query must execute even before Blueprint tables/functions exist.
  await db.exec('begin transaction read only');let rows=(await db.query<Check>(query)).rows;await db.exec('rollback');assert.ok(rows.filter(r=>r.bagian==='TABEL & RLS').every(r=>r.status==='MISSING'));assert.ok(rows.filter(r=>r.bagian==='RPC').every(r=>r.status==='MISSING'));
  const dir=new URL('../supabase/migrations/',import.meta.url);for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
  await db.exec('begin transaction read only');rows=(await db.query<Check>(query)).rows;await db.exec('rollback');assert.ok(rows.length>40);assert.deepEqual(rows.filter(r=>r.status==='MISSING'),[]);assert.deepEqual(rows.filter(r=>r.bagian==='RPC'&&r.status!=='OK'),[]);assert.deepEqual(rows.filter(r=>r.bagian==='TABEL & RLS'&&r.status!=='OK'),[]);assert.equal(rows.find(r=>r.bagian==='STORAGE')?.status,'OK');
  const actor='11111111-1111-4111-8111-111111111111',room='22222222-2222-4222-8222-222222222222';
  await db.exec(`insert into auth.users values('${actor}');insert into bp_workspaces(id,name,created_by) values('${room}','History fixture','${actor}');insert into bp_chat_messages(workspace_id,client_id,profile_id,author_name,body,kind,created_by,deleted_at) values('${room}',gen_random_uuid(),'nando','Nando','Keep 1','chat','${actor}',null),('${room}',gen_random_uuid(),'nando','Nando','Keep note','note','${actor}',null),('${room}',gen_random_uuid(),'nando','Nando','Deleted','chat','${actor}',now());`);
  const audit=await readFile(new URL('../supabase/manual/blueprint-chat-check-MAP-021.sql',import.meta.url),'utf8');await db.exec('begin transaction read only');const stats=(await db.query<{total_pesan:number;pesan_aktif:number;penanda_pesan_dihapus:number;catatan:number}>(audit)).rows;await db.exec('rollback');assert.equal(Number(stats[0].total_pesan),3);assert.equal(Number(stats[0].pesan_aktif),2);assert.equal(Number(stats[0].penanda_pesan_dihapus),1);assert.equal(Number(stats[0].catatan),1);
  // Drop only a disposable local fixture function; query must identify the exact omission.
  await db.exec('drop function public.bp_chat_page_v17(uuid,text,bigint,text)');await db.exec('begin transaction read only');rows=(await db.query<Check>(query)).rows;await db.exec('rollback');assert.deepEqual(rows.filter(r=>r.status==='MISSING').map(r=>r.item),['public.bp_chat_page_v17(uuid,text,bigint,text)']);
 }finally{await db.close();}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {newProject} from '../src/domain/designer.ts';
const owner='11111111-1111-4111-8111-111111111111',outsider='33333333-3333-4333-8333-333333333333';
test('SQL MAP-003: migration copy, isolation, autosave, atomic checkpoints, RLS, conflict, version Trash',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${outsider}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url);await db.exec(await readFile(new URL('202610150001_blueprint_workspace.sql',dir),'utf8'));
 const auth=async(id:string)=>{await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);};await auth(owner);
 const w=(await db.query<{r:{workspaceId:string}}> ('select bp_create_workspace($1) r',['SQL003'])).rows[0].r.workspaceId;
 const p=newProject('System A');const old=(await db.query<{r:{token:string;id:string}}> ('select bp_save_project($1,null,$2::jsonb,$3,$4) r',[w,JSON.stringify(p),'Old','nando'])).rows[0].r;
 await db.exec('reset role');const migration=await readFile(new URL((await readdir(dir)).find(n=>n.endsWith('_blueprint_canvas_documents.sql'))!,dir),'utf8');await db.exec(migration);await auth(owner);
 const copied=(await db.query<{token:string}>('select token from bp_documents where workspace_id=$1 and project_id=$2',[w,p.id])).rows[0];assert.equal(copied.token,old.token);assert.equal((await db.query('select * from bp_document_versions')).rows.length,1);
 async function write(project:typeof p,token:string|null,label:string|null=null){return (await db.query<{r:{token:string;versionId:string|null}}> ('select bp_write_document($1,$2,$3,$4::jsonb,$5,$6) r',[w,project.id,token,JSON.stringify(project),'ryan',label])).rows[0].r;}
 const first=await write({...p,title:'Autosave'},old.token);assert.equal(first.versionId,null);assert.equal((await db.query('select * from bp_document_versions')).rows.length,1);
 await assert.rejects(()=>write(p,old.token),/CONFLICT/);const b=newProject('System B');await write(b,null,'B1');assert.equal((await db.query('select * from bp_documents')).rows.length,2);
 const v=await write(p,first.token,'A2');await assert.rejects(()=>write(p,v.token,''));assert.equal((await db.query<{token:string}>('select token from bp_documents where project_id=$1',[p.id])).rows[0].token,v.token);
 await db.query('select bp_edit_document_version($1,$2,$3,$4)',[w,v.versionId,'rename','Rename']);await db.query('select bp_edit_document_version($1,$2,$3)',[w,v.versionId,'trash']);assert.ok((await db.query<{deleted_at:string}>('select deleted_at from bp_document_versions where id=$1',[v.versionId])).rows[0].deleted_at);await db.query('select bp_edit_document_version($1,$2,$3)',[w,v.versionId,'untrash']);
 await auth(outsider);assert.equal((await db.query('select * from bp_documents')).rows.length,0);assert.equal((await db.query('select * from bp_document_versions')).rows.length,0);await assert.rejects(()=>write(p,v.token),/Akses/);await assert.rejects(()=>db.query('select bp_edit_document_version($1,$2,$3)',[w,v.versionId,'trash']),/Akses/);
 await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from bp_documents'),/permission denied/);await assert.rejects(()=>write(p,v.token),/permission denied/);
 await db.exec('reset role');const pub=(await db.query<{tablename:string}>("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows;assert.ok(pub.some(r=>r.tablename==='bp_documents'));assert.ok(pub.some(r=>r.tablename==='bp_document_versions'));
 }finally{await db.close();}
});

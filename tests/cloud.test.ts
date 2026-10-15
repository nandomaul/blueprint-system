import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { seedProject } from '../src/domain/seed.ts';
const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',outsider='33333333-3333-4333-8333-333333333333';
test('SQL PostgreSQL: undangan, RLS, simpan atomik, konflik, Trash dan restore',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${member}'),('${outsider}'); create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb); alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
    const migration=await readFile(new URL('../supabase/migrations/202610150001_blueprint_workspace.sql',import.meta.url),'utf8');
    await db.exec(migration);
    async function as(id:string){await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);}
    await as(owner);
    const created=await db.query<{w:{workspaceId:string;inviteCode:string}}>(`select public.bp_create_workspace('Blueprint tim') as w`);
    const {workspaceId:w,inviteCode:code}=created.rows[0].w;
    const p=seedProject();
    async function save(token:string|null,label:string){return (await db.query<{r:{token:string;id:string}}>('select public.bp_save_project($1,$2,$3::jsonb,$4,$5) as r',[w,token,JSON.stringify(p),label,'nando'])).rows[0].r;}
    const first=await save(null,'Awal'),second=await save(first.token,'Kedua');
    await assert.rejects(()=>save(first.token,'Stale'),/berubah/);
    assert.equal((await db.query<{n:number}>('select count(*)::int as n from public.bp_versions')).rows[0].n,2);
    await db.query('select public.bp_rename_version($1,$2)',[first.id,'Referensi Ryan']);
    assert.deepEqual((await db.query<{snapshot:unknown}>('select snapshot from public.bp_versions where id=$1',[first.id])).rows[0].snapshot,p);
    await db.query('select public.bp_trash_version($1)',[first.id]);
    await assert.rejects(()=>db.query('select public.bp_restore_version($1,$2,$3)',[first.id,second.token,'hadist']),/Trash/);
    assert.equal((await db.query<{n:number}>('select count(*)::int as n from public.bp_versions')).rows[0].n,2);
    await db.query('select public.bp_untrash_version($1)',[first.id]);
    const restored=(await db.query<{r:{token:string;id:string}}> ('select public.bp_restore_version($1,$2,$3) as r',[first.id,second.token,'hadist'])).rows[0].r;
    assert.notEqual(restored.id,first.id);assert.notEqual(restored.token,second.token);
    assert.equal((await db.query<{n:number}>('select count(*)::int as n from public.bp_versions')).rows[0].n,3);
    // Empty/bad label rolls back active token and new checkpoint together.
    await assert.rejects(()=>save(restored.token,''));
    assert.equal((await db.query<{token:string}>('select token from public.bp_projects')).rows[0].token,restored.token);
    await as(outsider);
    assert.equal((await db.query('select * from public.bp_projects')).rows.length,0);
    assert.equal((await db.query('select * from public.bp_versions')).rows.length,0);
    await assert.rejects(()=>save(null,'Outside'),/Akses/);
    await assert.rejects(()=>db.query('select public.bp_rename_version($1,$2)',[first.id,'Hacked']),/ditolak/);
    await assert.rejects(()=>db.query('select public.bp_join_workspace($1)',[crypto.randomUUID()]),/undangan/);
    await assert.rejects(()=>db.query('insert into public.bp_members values($1,$2,$3)',[w,outsider,'owner']),/permission denied/);
    await assert.rejects(()=>db.query('select code from public.bp_invites'),/permission denied/);
    const path=w+'/'+'a'.repeat(64)+'.png';
    await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['blueprint-designs',path]),/row-level security/);
    await as(member);
    await db.query('select public.bp_join_workspace($1)',[code]);
    assert.equal((await db.query('select * from public.bp_projects')).rows.length,1);
    await assert.rejects(()=>db.query('select public.bp_invite_code($1)',[w]),/Hanya/);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['blueprint-designs',path]);
    await db.query('select public.bp_register_asset($1,$2,$3,$4)',[w,'asset-1',path,'a'.repeat(64)]);
    await assert.rejects(()=>db.query('select public.bp_register_asset($1,$2,$3,$4)',[w,'asset-1',w+'/'+'b'.repeat(64)+'.png','b'.repeat(64)]),/Upload/);
    await as(outsider);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await db.exec('reset role;set role anon');
    await assert.rejects(()=>db.query('select * from public.bp_versions'),/permission denied/);
    await assert.rejects(()=>db.query("select public.bp_create_workspace('No session')"),/permission denied/);
    await db.exec('reset role');
    await assert.rejects(()=>db.exec(migration),/already exists/);await db.exec('rollback');
    assert.equal((await db.query<{n:number}>('select count(*)::int as n from public.bp_versions')).rows[0].n,3);
  } finally {await db.close();}
});

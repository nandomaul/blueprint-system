import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {accountEmail,parseAccountInput} from '../supabase/functions/blueprint-accounts/rules.ts';
import {newProject} from '../src/domain/designer.ts';
test('Account validation normalizes usernames and rejects malformed credentials before provisioning',()=>{
 const input={action:'create',workspaceId:crypto.randomUUID(),login:' Hadist.Team ',name:' Hadist ',password:'Test credential 10+',profileId:'hadist'};
 assert.equal(accountEmail(input.login),'hadist.team@accounts.blueprint.invalid');assert.equal(parseAccountInput(input).name,'Hadist');
 for(const change of [{action:'delete'},{workspaceId:'other'},{login:'a@b.com'},{password:'short'},{name:''},{profileId:'foreign'}])assert.throws(()=>parseAccountInput({...input,...change}));
});
test('Password registry: service-only provisioning, account RLS, canonical workspace, legacy revocation, preserved project shares and idempotent migration',async()=>{
 const db=new PGlite(),owner=crypto.randomUUID(),member=crypto.randomUUID(),legacy=crypto.randomUUID(),viewer=crypto.randomUUID();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${member}'),('${legacy}'),('${viewer}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
 const dir=new URL('../supabase/migrations/',import.meta.url),files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();for(const f of files)await db.exec(await readFile(new URL(f,dir),'utf8'));
 const as=async(id:string)=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);await as(owner);
 const w=(await db.query<{r:{workspaceId:string}}>("select bp_create_workspace('Account QA') r")).rows[0].r.workspaceId;
 const invite=(await db.query<{r:string}>('select bp_invite_code($1) r',[w])).rows[0].r,p=newProject('Shared project'),secret=newProject('Private project');
 for(const v of [p,secret])await db.query('select bp_write_document($1,$2,null,$3::jsonb,$4,null)',[w,v.id,JSON.stringify(v),'nando']);
 const code=(await db.query<{r:{code:string}}>("select bp_review_link($1,$2,'create') r",[w,p.id])).rows[0].r.code;
 await as(legacy);await db.query('select bp_join_workspace($1)',[invite]);assert.equal((await db.query('select * from bp_documents')).rows.length,2);
 const register=async(actor:string,user:string,login:string,profile:string|null)=>(await db.query<{r:{workspace_id:string;profile_id:string}}>('select bp_register_account($1,$2,$3,$4,$5,$6) r',[actor,w,user,login,profile,login])).rows[0].r;
 await assert.rejects(()=>register(owner,legacy,'forged','hadist'),/permission denied/);
 await db.exec('reset role;set role service_role');await assert.rejects(()=>register(legacy,member,'forged','hadist'),/Hanya pemilik/);
 await register(owner,owner,'nando.test','nando');const account=await register(owner,member,'hadist.test','hadist');assert.equal(account.workspace_id,w);assert.equal(account.profile_id,'hadist');assert.equal((await register(owner,member,'hadist.test','hadist')).profile_id,'hadist');
 await as(member);assert.equal((await db.query('select * from bp_accounts')).rows.length,1);assert.equal((await db.query('select * from bp_documents')).rows.length,2);await assert.rejects(()=>db.exec("insert into bp_accounts values(gen_random_uuid(),gen_random_uuid(),'nando','hack',now())"),/permission denied/);
 await as(owner);assert.equal((await db.query('select * from bp_accounts')).rows.length,2);
 await as(legacy);assert.equal((await db.query('select * from bp_documents')).rows.length,0);await assert.rejects(()=>db.query('select bp_join_workspace($1)',[invite]),/password/);assert.equal((await db.query<{r:boolean}>('select bp_can_access_path($1) r',[w+'/image.png'])).rows[0].r,false);
 await as(viewer);await db.query('select bp_join_review($1)',[code]);assert.equal((await db.query('select * from bp_documents')).rows.length,1);assert.equal((await db.query('select * from bp_accounts')).rows.length,0);await assert.rejects(()=>db.query('select bp_write_document($1,$2,null,$3::jsonb,$4,null)',[w,p.id,JSON.stringify(p),'nando']),/Akses/);
 await as(owner);await db.query("select bp_editor_profile($1,'trash','hadist',null)",[w]);await as(member);assert.equal((await db.query('select * from bp_documents')).rows.length,0);
 await db.exec('reset role');await db.exec(await readFile(new URL(files.find(f=>f.endsWith('_blueprint_password_accounts.sql'))!,dir),'utf8'));assert.equal((await db.query('select * from bp_accounts')).rows.length,2);assert.equal((await db.query('select * from bp_documents')).rows.length,2);
 assert.deepEqual((await db.query<{column_name:string}>("select column_name from information_schema.columns where table_name='bp_accounts' order by ordinal_position")).rows.map(r=>r.column_name),['user_id','workspace_id','profile_id','login_name','created_at']);
 }finally{await db.close();}
});

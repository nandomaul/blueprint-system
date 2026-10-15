import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRepository } from '../src/services/supabaseRepository.ts';
import { appendReference } from '../src/domain/model.ts';
import { seedProject } from '../src/domain/seed.ts';
const w='11111111-1111-4111-8111-111111111111';
test('SDK adapter roundtrip: gambar privat terpisah, versi bernama, download/hash dan restore',async()=>{
  type Row={id:string;label:string;saved_at:string;profile:string;deleted_at:string|null;snapshot:unknown};
  let active:{token:string;payload:unknown}|null=null,uploads=0,downloads=0;
  const versions:Row[]=[],registry=new Map<string,{storage_path:string;sha256:string}>(),objects=new Map<string,ArrayBuffer>();
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  const fakeFetch:typeof fetch=async(input,init)=>{
    const request=new Request(input,init),url=new URL(request.url),route=url.pathname;
    if(route.startsWith('/storage/v1/object/')){
      const object=decodeURIComponent(route.replace('/storage/v1/object/authenticated/','').replace('/storage/v1/object/',''));
      if(request.method==='POST'){
        if(objects.has(object))return json({statusCode:'409',message:'The resource already exists',error:'Duplicate'},409);
        objects.set(object,await request.arrayBuffer());uploads++;return json({Key:object});
      }
      const bytes=objects.get(object);assert.ok(bytes,'private download path');downloads++;return new Response(bytes,{headers:{'Content-Type':'image/png'}});
    }
    if(route.endsWith('/bp_workspaces'))return json({id:w});
    if(route.endsWith('/bp_assets')){
      const id=url.searchParams.get('asset_id')?.slice(3),record=id?registry.get(id):null;return json(record?[record]:[]);
    }
    if(route.endsWith('/bp_projects'))return json(active?[active]:[]);
    if(route.endsWith('/bp_versions')){
      const id=url.searchParams.get('id')?.slice(3);return id?json({snapshot:versions.find(v=>v.id===id)?.snapshot}):json([...versions].reverse());
    }
    const params=await request.json() as Record<string,unknown>;
    if(route.endsWith('/bp_register_asset')){registry.set(String(params.p_asset_id),{storage_path:String(params.p_path),sha256:String(params.p_sha256)});return json(null);}
    if(route.endsWith('/bp_save_project')||route.endsWith('/bp_restore_version')){
      if((active?.token??null)!==params.p_expected_token)return json({message:'Proyek berubah',code:'40001'},409);
      const old=versions.find(v=>v.id===params.p_id),snapshot=old?.snapshot??params.p_payload;
      const row:Row={id:crypto.randomUUID(),label:old?'Restore — '+old.label:String(params.p_label),saved_at:new Date().toISOString(),profile:String(params.p_profile),deleted_at:null,snapshot};
      active={token:crypto.randomUUID(),payload:snapshot};versions.push(row);
      return json({token:active.token,id:row.id,label:row.label,savedAt:row.saved_at,profile:row.profile});
    }
    throw new Error('Unexpected request '+route);
  };
  const client=createClient('https://example.supabase.co','fake-publishable-key',{global:{fetch:fakeFetch},auth:{persistSession:false,autoRefreshToken:false}});
  const repo=createSupabaseRepository(client,w);assert.equal(await repo.load(),null);
  const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const p=appendReference(seedProject(),{id:'reference-1',nodeId:'welcome',name:'login.png',mime:'image/png',size:Buffer.from(data.split(',')[1],'base64').length,data,version:1,createdAt:new Date().toISOString(),profile:'hadist'});
  const first=await repo.save(p,null,'UI Login','hadist');assert.equal(first.version.profile,'hadist');assert.equal(first.version.label,'UI Login');
  assert.equal(uploads,1);assert.ok(!JSON.stringify(active).includes('base64'));assert.equal(registry.size,1);
  const second=await repo.save(p,first.token,'Review Ryan','ryan');assert.equal(uploads,1);
  await assert.rejects(()=>repo.save(p,first.token,'Stale','nando'),/berubah/);assert.equal(versions.length,2);
  const reopened=createSupabaseRepository(client,w),loaded=await reopened.load();assert.deepEqual(loaded?.project,p);assert.equal(downloads,1);
  const history=await reopened.history();assert.equal(history.length,2);assert.equal(downloads,1);assert.equal(history[1].project.assets[0].data,data);
  const restored=await reopened.restore(first.version.id,second.token,'nando');assert.deepEqual(restored.version.project,p);assert.equal(restored.version.label,'Restore — UI Login');assert.equal(restored.version.profile,'nando');assert.equal(versions.length,3);
  await repo.close();await reopened.close();
});

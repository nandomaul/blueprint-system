import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createReviewReader,reviewUrl,manageReview} from '../src/services/clientReview.ts';
import {newProject} from '../src/domain/designer.ts';
test('client SDK: canonical payload, unchanged token refresh, revisions, revoked access and URL capability',async()=>{
 const code='11111111-1111-4111-8111-111111111111',workspace='22222222-2222-4222-8222-222222222222',p=newProject('Review'),first=crypto.randomUUID();let token=first,title=p.title,revoked=false,loads=0;
 const client=createClient('https://test.supabase.co','fake-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{const request=new Request(input,init),params=await request.json() as Record<string,unknown>;if(revoked)return new Response(JSON.stringify({message:'Tautan review tidak aktif'}),{status:403});if(request.url.endsWith('bp_review_link'))return Response.json({code,expiresAt:'2026-11-19'});assert.ok(request.url.endsWith('bp_read_review'));loads++;assert.equal(params.p_code,code);const unchanged=token===params.p_known_token;return Response.json({workspaceId:workspace,projectId:p.id,token,updatedAt:p.updatedAt,expiresAt:'2026-11-19',unchanged,payload:unchanged?null:{...p,title}});}}});
 const reader=createReviewReader(client,code);assert.equal((await reader.load()).project.title,p.title);assert.equal((await reader.load()).token,first);token=crypto.randomUUID();title='Revisi tim';assert.equal((await reader.load()).project.title,title);assert.equal(loads,3);assert.equal((await manageReview(client,workspace,p.id,'create'))?.code,code);const url=reviewUrl(code,{origin:'http://127.0.0.1:5174',pathname:'/'});assert.equal(new URL(url).hash,'#review='+code);assert.equal(new URL(url).search,'');revoked=true;await assert.rejects(()=>reader.load(),/tidak aktif/);await reader.close();
});

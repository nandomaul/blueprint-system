import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {accountEmail} from '../src/services/accounts.ts';
test('Supabase Auth SDK remembers the session across clients and local logout removes it without persisting passwords',async()=>{
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}},id=crypto.randomUUID(),expires=Math.floor(Date.now()/1000)+3600;
 const token=[{alg:'HS256',typ:'JWT'},{sub:id,exp:expires,role:'authenticated'},{fixture:true}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.'),user={id,aud:'authenticated',role:'authenticated',email:accountEmail('Nando.Test'),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}};
 const options={auth:{storage,persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'account-session-fixture'},global:{fetch:async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(String(url).includes('/token?grant_type=password')){const request=JSON.parse(String(init?.body)) as {email:string;password:string};assert.equal(request.email,user.email);assert.equal(request.password,'Fixture passphrase 123');return Response.json({access_token:token,token_type:'bearer',expires_in:3600,expires_at:expires,refresh_token:'fixture-refresh',user});}
  if(String(url).includes('/logout'))return new Response(null,{status:204});return Response.json(user);
 }}};
 const a=createClient('https://auth.test','public-fixture',options);const signed=await a.auth.signInWithPassword({email:accountEmail('Nando.Test'),password:'Fixture passphrase 123'});assert.ifError(signed.error);assert.ok(values.size);assert.ok(![...values.values()].join('').includes('Fixture passphrase'));
 const b=createClient('https://auth.test','public-fixture',options);assert.equal((await b.auth.getSession()).data.session?.user.id,id);assert.ifError((await b.auth.signOut({scope:'local'})).error);assert.equal((await b.auth.getSession()).data.session,null);assert.equal(values.get('account-session-fixture'),undefined);await a.removeAllChannels();await b.removeAllChannels();
});

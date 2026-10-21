import assert from 'node:assert/strict';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {AccountSettings} from '../src/components/AccountSettings.tsx';
import {emptyCatalog} from '../src/domain/catalog.ts';
import {createLocalWorkspace} from '../src/services/localWorkspace.ts';
import type {Account} from '../src/services/accounts.ts';
export async function runAccountUiTests(){
 const host=document.getElementById('test-root')!,root=createRoot(host),workspaceId=crypto.randomUUID(),owner:Account={user_id:crypto.randomUUID(),workspace_id:workspaceId,profile_id:'nando',login_name:'nando.test',created_at:new Date().toISOString()};
 let reject=true,updated=0,calls=0;const accounts=[owner];
 const client=createClient('https://accounts.test','public-fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,options)=>{
  if(String(url).includes('/functions/v1/blueprint-accounts')){calls++;const input=JSON.parse(String(options?.body)) as {password:string;login:string;profileId:string};assert.equal(input.profileId,'hadist');assert.equal(input.login,'hadist.test');assert.equal(input.password,'Fixture passphrase 123');if(reject)return new Response(JSON.stringify({error:'Database unavailable'}),{status:400,headers:{'content-type':'application/json'}});const account={...owner,user_id:crypto.randomUUID(),profile_id:'hadist' as const,login_name:input.login};accounts.push(account);return Response.json({account});}
  return Response.json(accounts);
 }}}),repository=createLocalWorkspace(window.indexedDB,'account-ui'),team={client,repository,name:'QA',owner:true,account:owner,config:{url:'https://accounts.test',key:'public-fixture',workspaceId}};
 const fill=async(label:string,value:string)=>{const el=host.querySelector<HTMLInputElement|HTMLSelectElement>(`[aria-label="${label}"]`)!;assert.ok(el,label);const proto=el instanceof HTMLInputElement?HTMLInputElement.prototype:window.HTMLSelectElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,value);el.dispatchEvent(new Event(el instanceof HTMLInputElement?'input':'change',{bubbles:true}));});};
 const submit=async()=>act(async()=>{host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,25));});
 await act(async()=>root.render(<AccountSettings team={team} profiles={emptyCatalog().profiles} onUpdated={async()=>{updated++;}}/>));
 await fill('Profil akun','hadist');await fill('Username akun','Hadist.Test');await fill('Password akun','Fixture passphrase 123');await submit();assert.equal(updated,0);assert.equal(host.querySelector('[role="alert"]')?.textContent,'Database unavailable');assert.equal((host.querySelector('[aria-label="Password akun"]') as HTMLInputElement).value,'Fixture passphrase 123');assert.equal(host.querySelector('[role="status"]'),null);
 reject=false;await submit();assert.equal(updated,1);assert.equal(calls,2);assert.equal((host.querySelector('[aria-label="Password akun"]') as HTMLInputElement).value,'');assert.ok(host.querySelector('[role="status"]')?.textContent?.includes('Supabase'));assert.ok(host.querySelector('.account-list')?.textContent?.includes('hadist.test'));
 await act(async()=>root.unmount());await repository.close();await client.removeAllChannels();console.log('MAP-015 account DOM: existing-profile binding, provisioning failure, safe retry, canonical account list and credential clearing passed.');
}

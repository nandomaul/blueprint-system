import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {cloudChat} from '../src/services/cloudChat.ts';
import {mergeMessages,visibleMessage} from '../src/domain/chat.ts';
import type {ChatMessage} from '../src/domain/chat.ts';
import {chatLinks} from '../src/domain/chatLinks.ts';
import {chatStickers,stickerSrc,stickerName,messageSticker} from '../src/domain/stickers.ts';
const row=(id:string):ChatMessage=>({id,clientId:crypto.randomUUID(),profileId:'nando',authorName:'Nando',body:'Keep this history',kind:'chat',context:{projectId:'p',nodeId:'n',view:'assets'},mentions:[{id:'ryan',name:'Ryan'}],createdAt:new Date().toISOString(),canDelete:true});
test('deleted tombstones remove references, media, mentions and replies, and beat older pages',()=>{
 const old=row('1'),deleted={...old,deletedAt:new Date().toISOString(),attachments:[{id:'img',name:'sticker.png',mime:'image/png' as const,size:1,storagePath:'w/a',sha256:'a'.repeat(64)}]};
 const safe=visibleMessage(deleted);assert.equal(safe.body,'');assert.equal(safe.context,null);assert.deepEqual(safe.mentions,[]);assert.deepEqual(safe.attachments,[]);assert.equal(safe.reply,null);assert.equal(safe.canDelete,false);assert.equal(deleted.context?.nodeId,'n');
 assert.equal(mergeMessages([deleted],[old])[0].deletedAt,deleted.deletedAt);assert.equal(mergeMessages([old],[deleted])[0].body,'');
});
test('chat links preserve punctuation, query parameters and multiline text without accepting script schemes',()=>{
 const text='Cek (https://example.com/a?x=1&y=2).\nwww.example.org/test! javascript:alert(1) <img onerror=x>';
 const parts=chatLinks(text),links=parts.filter(p=>p.href);assert.equal(parts.map(p=>p.text).join(''),text);assert.deepEqual(links.map(p=>p.href),['https://example.com/a?x=1&y=2','https://www.example.org/test']);assert.equal(chatLinks('javascript:alert(1)').some(p=>p.href),false);assert.equal(chatLinks('https://example.com/a_(b)').find(p=>p.href)?.text,'https://example.com/a_(b)');
});
test('eight versioned sticker identities work on local and Pages bases without new message fields',()=>{
 assert.deepEqual(chatStickers.map(s=>s.label),['OK','NICE','GO IT','PLEASE','MAKE SURE','CHECK IT','HERE','+1']);
 for(const s of chatStickers){assert.equal(stickerSrc(s,'/blueprint-system/'),'/blueprint-system/stickers/v1/'+s.id+'.png');assert.equal(messageSticker({attachments:[{name:stickerName(s)}]})?.id,s.id);}
});
test('one failed private attachment never hides other messages; deleted media is never fetched',async()=>{
 const w='11111111-1111-4111-8111-111111111111',bytes=new Uint8Array([7]),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),paths:string[]=[];
 const ref=(name:string)=>({id:name,name,mime:'image/png' as const,size:1,storagePath:w+'/'+name,sha256:sha});
 const rows=[{...row('1'),attachments:[ref('bad.png')]},{...row('2'),attachments:[ref('good.png')]},{...row('3'),deletedAt:new Date().toISOString(),attachments:[ref('deleted.png')]}];
 const client=createClient('https://fixture.invalid','fixture-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{const url=String(input);if(url.includes('/rest/v1/rpc/'))return new Response(JSON.stringify({messages:rows,lastRead:'0',unread:0,hasMore:false}),{headers:{'content-type':'application/json'}});paths.push(url);return url.endsWith('good.png')?new Response(bytes):new Response('{"message":"fixture missing"}',{status:404,headers:{'content-type':'application/json'}});}}});
 try{const page=await cloudChat(client,w).page('nando');assert.equal(page.messages.length,3);assert.equal(page.messages[0].body,'Keep this history');assert.equal(page.messages[0].attachments![0].data,undefined);assert.ok(page.messages[1].attachments![0].data?.startsWith('data:image/png;base64,'));assert.equal(page.messages[2].context,null);assert.deepEqual(page.messages[2].mentions,[]);assert.equal(paths.length,2);assert.ok(paths.every(p=>!p.endsWith('deleted.png')));}finally{client.auth.stopAutoRefresh();await client.removeAllChannels();}
});

import type {SupabaseClient} from '@supabase/supabase-js';
import {visibleMessage,ChatMessageSchema,ChatPageSchema,CursorSchema,ChatAttachmentSchema} from '../domain/chat.ts';
import type {ChatAttachment,ChatMessage,DraftImage} from '../domain/chat.ts';
import {bytesOf,digest,dataUrl} from './assetCodec.ts';
import type {ChatRepository} from './workspace.ts';
import {rpc} from './supabaseRepository.ts';
export function cloudChat(client:SupabaseClient,workspaceId:string):ChatRepository{
 const cache=new Map<string,string>();
 async function hydrate(raw:ChatMessage):Promise<ChatMessage>{
  const message=visibleMessage(raw);if(message.deletedAt)return message;
  const attachments:ChatAttachment[]=[];
  for(const ref of message.attachments??[]){
   try{
    if(!ref.storagePath.startsWith(workspaceId+'/'))throw new Error('Gambar chat berbeda ruang.');
    let data=cache.get(ref.storagePath);if(!data){const r=await client.storage.from('blueprint-designs').download(ref.storagePath);if(r.error)throw new Error(r.error.message);const bytes=new Uint8Array(await r.data.arrayBuffer());if(bytes.length!==ref.size||await digest(bytes)!==ref.sha256)throw new Error('Gambar chat gagal diverifikasi.');data=dataUrl(bytes,ref.mime);if(cache.size>=160)cache.delete(cache.keys().next().value!);cache.set(ref.storagePath,data);}
    attachments.push({...ref,data});
   }catch{const unavailable={...ref};delete unavailable.data;attachments.push(unavailable);}
  }
  return{...message,attachments};
 }
 async function upload(asset:DraftImage){const bytes=bytesOf(asset),sha256=await digest(bytes),ext=asset.mime==='image/png'?'png':asset.mime==='image/jpeg'?'jpg':'webp',storagePath=`${workspaceId}/${sha256}.${ext}`;const {data,error}=await client.from('bp_assets').select('storage_path,sha256').eq('workspace_id',workspaceId).eq('asset_id',asset.id).maybeSingle();if(error)throw new Error(error.message);if(data){if(data.storage_path!==storagePath||data.sha256!==sha256)throw new Error('ID gambar sudah dipakai.');}else{const r=await client.storage.from('blueprint-designs').upload(storagePath,bytes,{contentType:asset.mime,upsert:false});if(r.error&&!['409','Duplicate'].includes(String(r.error.statusCode))&&!/already exists|duplicate/i.test(r.error.message))throw new Error(r.error.message);await rpc(client,'bp_register_asset',{p_workspace_id:workspaceId,p_asset_id:asset.id,p_path:storagePath,p_sha256:sha256});}cache.set(storagePath,asset.data);return ChatAttachmentSchema.omit({data:true}).parse({storagePath,sha256,id:asset.id,name:asset.name,mime:asset.mime,size:asset.size});}
 return{
 async page(profile,before,mode='chat'){const page=ChatPageSchema.parse(await rpc(client,'bp_chat_page_v17',{p_workspace_id:workspaceId,p_profile:profile,p_before:before??null,p_mode:mode}));return{...page,messages:await Promise.all(page.messages.map(hydrate)),reminders:await Promise.all((page.reminders??[]).map(hydrate))};},
 async send(profile,draft){const attachments=[];if((draft.attachments?.length??0)>3)throw new Error('Maksimal 3 gambar per pesan.');for(const asset of draft.attachments??[])attachments.push(await upload(asset));return CursorSchema.parse(await rpc(client,'bp_chat_send_v17',{p_workspace_id:workspaceId,p_profile:profile,p_client_id:draft.clientId,p_body:draft.body,p_kind:draft.kind,p_context:draft.context,p_mentions:draft.mentions,p_attachments:attachments,p_reply_to:draft.replyTo??null}));},
 async action(profile,action,id,ids){const value=await rpc(client,'bp_chat_action_v17',{p_workspace_id:workspaceId,p_profile:profile,p_action:action,p_message_id:id??null,p_ids:ids??[]});return value?hydrate(ChatMessageSchema.parse(value)):null;},
 async read(profile,lastId){return CursorSchema.parse(await rpc(client,'bp_chat_read',{p_workspace_id:workspaceId,p_profile:profile,p_last_id:lastId}));},
 watch(changed){const channel=client.channel('blueprint-chat-'+workspaceId+'-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'bp_chat_messages',filter:'workspace_id=eq.'+workspaceId},changed).subscribe(s=>{if(s==='SUBSCRIBED')changed();});const focus=()=>{if(document.visibilityState!=='hidden')changed();};window.addEventListener('focus',focus);window.addEventListener('online',focus);document.addEventListener('visibilitychange',focus);const timer=setInterval(focus,15000);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);document.removeEventListener('visibilitychange',focus);void client.removeChannel(channel);cache.clear();};}
 };
}

import type {SupabaseClient} from '@supabase/supabase-js';
import {ChatPageSchema,CursorSchema} from '../domain/chat.ts';
import type {ChatRepository} from './workspace.ts';
import {rpc} from './supabaseRepository.ts';
export function cloudChat(client:SupabaseClient,workspaceId:string):ChatRepository{return{
 async page(profile,before){return ChatPageSchema.parse(await rpc(client,'bp_chat_page',{p_workspace_id:workspaceId,p_profile:profile,p_before:before??null}));},
 async send(profile,draft){return CursorSchema.parse(await rpc(client,'bp_chat_send',{p_workspace_id:workspaceId,p_profile:profile,p_client_id:draft.clientId,p_body:draft.body,p_kind:draft.kind,p_context:draft.context,p_mentions:draft.mentions}));},
 async read(profile,lastId){return CursorSchema.parse(await rpc(client,'bp_chat_read',{p_workspace_id:workspaceId,p_profile:profile,p_last_id:lastId}));},
 watch(changed){const channel=client.channel('blueprint-chat-'+workspaceId+'-'+crypto.randomUUID()).on('postgres_changes',{event:'INSERT',schema:'public',table:'bp_chat_messages',filter:'workspace_id=eq.'+workspaceId},changed).subscribe(s=>{if(s==='SUBSCRIBED')changed();});const focus=()=>{if(document.visibilityState!=='hidden')changed();};window.addEventListener('focus',focus);window.addEventListener('online',focus);document.addEventListener('visibilitychange',focus);const timer=setInterval(focus,15000);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);document.removeEventListener('visibilitychange',focus);void client.removeChannel(channel);};}
};}

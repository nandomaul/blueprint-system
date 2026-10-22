import {createClient} from '@supabase/supabase-js';
import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {workspacePath} from '../domain/navigation.ts';
import type {WorkspaceRoute} from '../domain/navigation.ts';
import {blueprintSupabase} from '../config/supabase.ts';
import {rpc} from './supabaseRepository.ts';
import {assetCodec} from './assetCodec.ts';
import type {Project} from '../domain/model.ts';
export const ReviewLinkSchema=z.object({code:z.string().uuid(),expiresAt:z.string()});
export type ReviewLink=z.infer<typeof ReviewLinkSchema>;
export type ReviewRecord={project:Project;token:string;updatedAt:string;expiresAt:string};
export interface ReviewReader{load():Promise<ReviewRecord>;close():Promise<void>}
export function reviewUrl(code:string,location:{origin:string;pathname:string},context?:WorkspaceRoute){const local=['127.0.0.1','localhost'].includes(new URL(location.origin).hostname),origin=local?'https://nandomaul.github.io':location.origin,base=local||location.pathname.startsWith('/blueprint-system/')?'/blueprint-system/':'/';return (context?origin+workspacePath(context,base):local?origin+base:origin+location.pathname)+'#review='+z.string().uuid().parse(code);}
export async function manageReview(client:SupabaseClient,workspaceId:string,projectId:string,action:'get'|'create'|'rotate'|'revoke'){const data=await rpc(client,'bp_review_link',{p_workspace_id:workspaceId,p_project_id:projectId,p_action:action});return data===null?null:ReviewLinkSchema.parse(data);}
export function createReviewReader(client:SupabaseClient,code:string):ReviewReader{
 z.string().uuid().parse(code);let record:ReviewRecord|null=null,codec:ReturnType<typeof assetCodec>|null=null;
 return{async load(){const raw=await rpc(client,'bp_read_review',{p_code:code,p_known_token:record?.token??null}),result=z.object({workspaceId:z.string().uuid(),projectId:z.string(),token:z.string().uuid(),updatedAt:z.string(),expiresAt:z.string(),unchanged:z.boolean().nullable(),payload:z.unknown()}).parse(raw);if(result.unchanged&&record){record={...record,expiresAt:result.expiresAt};return record;}codec??=assetCodec(client,result.workspaceId);record={project:await codec.hydrate(result.payload),token:result.token,updatedAt:result.updatedAt,expiresAt:result.expiresAt};return record;},async close(){codec?.clear();client.auth.stopAutoRefresh();await client.realtime.removeAllChannels();}};
}
export async function openReview(code:string):Promise<ReviewReader>{
 z.string().uuid().parse(code);const client=createClient(blueprintSupabase.url,blueprintSupabase.publishableKey,{auth:{storageKey:'blueprint-review-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}),session=await client.auth.getSession();if(session.error)throw session.error;if(!session.data.session){const signed=await client.auth.signInAnonymously();if(signed.error)throw new Error('Sesi client gagal: '+signed.error.message);}try{await rpc(client,'bp_join_review',{p_code:code});return createReviewReader(client,code);}catch(e){client.auth.stopAutoRefresh();await client.realtime.removeAllChannels();throw e;}
}

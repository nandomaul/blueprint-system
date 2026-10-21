import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import {blueprintSupabase} from '../config/supabase.ts';
import {connectClient,CreatedWorkspaceSchema,rpc,storeCloudConfig} from './supabaseRepository.ts';
import type {CloudConfig} from './supabaseRepository.ts';
import {createCloudWorkspace} from './cloudWorkspace.ts';
import type {WorkspaceRepository} from './workspace.ts';
export type TeamSession={config:CloudConfig;repository:WorkspaceRepository;name:string;owner:boolean;client:SupabaseClient};
let cached:Promise<SupabaseClient>|null=null;
export function teamClient(){cached??=connectClient(blueprintSupabase.url,blueprintSupabase.publishableKey).catch(e=>{cached=null;throw e;});return cached;}
export function inviteCode(input:string){const value=input.trim();try{const u=new URL(value);return z.string().uuid().parse(new URLSearchParams(u.hash.slice(1)).get('join'));}catch{return z.string().uuid().parse(value);}}
export function invitationLink(code:string,location:{origin:string;pathname:string}){return location.origin+location.pathname+'#join='+z.string().uuid().parse(code);}
export async function resumeTeam(config:CloudConfig):Promise<TeamSession>{
 const client=await teamClient();if(config.url.replace(/\/$/,'')!==blueprintSupabase.url)throw new Error('Workspace memakai project lain. Gunakan konfigurasi project Blueprint yang benar.');
 const {data,error}=await client.from('bp_workspaces').select('id,name,created_by').eq('id',config.workspaceId).single();if(error)throw new Error('Sesi ini belum punya akses ke ruang tim. Gabung memakai tautan/kode undangan dari pemilik ruang.');
 const session=await client.auth.getSession();const repository=createCloudWorkspace(client,config.workspaceId);await repository.list();storeCloudConfig(config);
 return {config,repository,client,name:String(data.name),owner:session.data.session?.user.id===data.created_by};
}
export async function enterTeam(mode:'create'|'join'|'shared',value:string):Promise<TeamSession>{
 const client=await teamClient();let workspaceId:string;
 try{workspaceId=mode==='shared'?z.string().uuid().parse(await rpc(client,'bp_enter_shared_workspace',{})):mode==='create'?CreatedWorkspaceSchema.parse(await rpc(client,'bp_create_workspace',{p_name:value.trim()||'Ruang tim'})).workspaceId:z.string().uuid().parse(await rpc(client,'bp_join_workspace',{p_code:inviteCode(value)}));}catch(e){if(mode==='shared'&&e instanceof Error&&/bp_enter_shared_workspace/.test(e.message))throw new Error('Pasang SQL MAP-014 di Supabase untuk masuk langsung.');throw e;}
 return resumeTeam({url:blueprintSupabase.url,key:blueprintSupabase.publishableKey,workspaceId,entry:mode==='shared'?'shared':'invite'});
}
export async function teamInvitation(team:TeamSession){return z.string().uuid().parse(await rpc(team.client,'bp_invite_code',{p_workspace_id:team.config.workspaceId}));}

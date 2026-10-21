import {z} from 'zod';
import {createClient} from '@supabase/supabase-js';
import {ownAccount,accountEmail} from './accounts.ts';
import type {Account} from './accounts.ts';
import type {SupabaseClient} from '@supabase/supabase-js';
import {blueprintSupabase} from '../config/supabase.ts';
import {CreatedWorkspaceSchema,rpc,storeCloudConfig} from './supabaseRepository.ts';
import type {CloudConfig} from './supabaseRepository.ts';
import {createCloudWorkspace} from './cloudWorkspace.ts';
import type {WorkspaceRepository} from './workspace.ts';
export type TeamSession={account?:Account;needsPassword?:boolean;config:CloudConfig;repository:WorkspaceRepository;name:string;owner:boolean;client:SupabaseClient};
let cached:Promise<SupabaseClient>|null=null;
export function teamClient(){cached??=Promise.resolve(createClient(blueprintSupabase.url,blueprintSupabase.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})).catch(e=>{cached=null;throw e;});return cached;}
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

export async function resumeIdentity():Promise<TeamSession|null>{
 const client=await teamClient(),session=await client.auth.getSession();if(session.error)throw session.error;if(!session.data.session)return null;
 const verified=await client.auth.getUser();if(verified.error||!verified.data.user)return null;const id=verified.data.user.id,account=await ownAccount(client,id);
 if(account){const active=await client.from('bp_editor_profiles').select('id').eq('workspace_id',account.workspace_id).eq('id',account.profile_id).is('deleted_at',null).maybeSingle();if(active.error||!active.data)throw new Error('Profil akun tidak aktif. Hubungi pemilik ruang.');const team=await resumeTeam({url:blueprintSupabase.url,key:blueprintSupabase.publishableKey,workspaceId:account.workspace_id,entry:'shared'});return {...team,account,needsPassword:false};}
 // One-time setup is restricted to a legacy owner session already authorized for this room.
 const config=await client.from('bp_workspaces').select('id').eq('created_by',id).order('created_at').limit(1).maybeSingle();if(config.error)throw config.error;if(!config.data)return null;
 const team=await resumeTeam({url:blueprintSupabase.url,key:blueprintSupabase.publishableKey,workspaceId:String(config.data.id),entry:'shared'});return {...team,needsPassword:true};
}
export async function passwordLogin(login:string,password:string){const client=await teamClient();const result=await client.auth.signInWithPassword({email:accountEmail(login),password});if(result.error)throw new Error('Username atau password tidak sesuai.');const identity=await resumeIdentity();if(!identity)throw new Error('Akun belum terhubung ke ruang tim.');return identity;}

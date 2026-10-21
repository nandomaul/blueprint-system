import {cloudChat} from './cloudChat.ts';
import {cloudManagement} from './cloudManagement.ts';
import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {DesignSchema,VersionSchema} from '../domain/model.ts';
import {assetCodec} from './assetCodec.ts';
import {rpc} from './supabaseRepository.ts';
import type {WorkspaceRepository} from './workspace.ts';
const response=z.object({token:z.string().uuid()});
export function createCloudWorkspace(client:SupabaseClient,workspaceId:string):WorkspaceRepository {
  z.string().uuid().parse(workspaceId);const codec=assetCodec(client,workspaceId),management=cloudManagement(client,workspaceId);let stop=()=>{};const covers=new Map<string,string>();management.cover=async(id,assetId)=>{const {data,error}=await client.from('bp_documents').select('assets:payload->assets').eq('workspace_id',workspaceId).eq('project_id',id).maybeSingle();if(error)throw error;const assets=z.array(z.object({id:z.string(),deletedAt:z.string().nullable().optional()}).passthrough()).parse(data?.assets??[]),ref=assets.find(a=>a.id===assetId&&!a.deletedAt);if(!ref)return;if(covers.has(assetId))return covers.get(assetId);const value=await codec.cover(ref);covers.set(assetId,value);return value;};
  return {kind:'supabase',scope:workspaceId,management,chat:cloudChat(client,workspaceId),
    async list(){const {data,error}=await client.from('bp_documents').select('project_id,title,updated_at,nodes:payload->nodes').eq('workspace_id',workspaceId).order('updated_at',{ascending:false});if(error)throw new Error(error.message+' (Database MAP-003 diperlukan.)');return data.map(r=>{const nodes=z.array(z.object({design:DesignSchema.optional()})).safeParse(r.nodes);return {id:String(r.project_id),title:String(r.title),updatedAt:String(r.updated_at),pages:nodes.success?nodes.data.length:undefined,preview:nodes.success?nodes.data[0]?.design:undefined};});},
    async load(id){const {data,error}=await client.from('bp_documents').select('project_id,token,payload').eq('workspace_id',workspaceId).eq('project_id',id).maybeSingle();if(error)throw new Error(error.message);return data?{id:String(data.project_id),token:z.string().uuid().parse(data.token),project:await codec.hydrate(data.payload as unknown)}:null;},
    async write(project,token,profile,label,baseProject){
      const payload=await codec.detach(project);
      if(baseProject){const base=await codec.detach(baseProject);const raw=await rpc(client,'bp_merge_document',{p_workspace_id:workspaceId,p_project_id:project.id,p_expected_token:token,p_base:base,p_local:payload,p_profile:profile,p_label:label??null});const result=z.object({token:z.string().uuid(),payload:z.unknown()}).parse(raw);return {id:project.id,token:result.token,project:await codec.hydrate(result.payload)};}
      const result=response.parse(await rpc(client,'bp_write_document',{p_workspace_id:workspaceId,p_project_id:project.id,p_expected_token:token,p_payload:payload,p_profile:profile,p_label:label??null}));return {id:project.id,token:result.token,project};
    },
    async history(id){const versions=[];for(let offset=0;;offset+=50){const {data,error}=await client.from('bp_document_versions').select('*').eq('workspace_id',workspaceId).eq('project_id',id).order('saved_at',{ascending:false}).order('id').range(offset,offset+49);if(error)throw new Error(error.message);for(const r of data)versions.push(VersionSchema.parse({id:r.id,label:r.label,project:await codec.hydrate(r.snapshot as unknown),profile:r.profile,savedAt:r.saved_at,deletedAt:r.deleted_at}));if(data.length<50)break;}return versions;},
    async version(id,action,label){await rpc(client,'bp_edit_document_version',{p_workspace_id:workspaceId,p_id:id,p_action:action,p_label:label??null});},
    watch(changed,status){
      stop();status('connecting');
      const c=client.channel('blueprint-documents-'+workspaceId+'-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'bp_documents',filter:'workspace_id=eq.'+workspaceId},()=>changed()).on('postgres_changes',{event:'*',schema:'public',table:'bp_document_versions',filter:'workspace_id=eq.'+workspaceId},()=>changed()).on('postgres_changes',{event:'*',schema:'public',table:'bp_editor_profiles',filter:'workspace_id=eq.'+workspaceId},()=>changed()).on('postgres_changes',{event:'*',schema:'public',table:'bp_document_settings',filter:'workspace_id=eq.'+workspaceId},()=>changed()).on('system',{},(message)=>{if(message.extension==='postgres_changes'&&message.status==='ok'){status('live');changed();}}).subscribe(s=>{if(s==='SUBSCRIBED')changed();else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'||s==='CLOSED')status('reconnecting');});
      const focus=()=>changed();if(typeof window!=='undefined'){window.addEventListener('focus',focus);window.addEventListener('online',focus);}
      const timer=setInterval(changed,15000); // canonical refresh covers reconnect/event loss
      stop=()=>{clearInterval(timer);if(typeof window!=='undefined'){window.removeEventListener('focus',focus);window.removeEventListener('online',focus);}void client.removeChannel(c);};return stop;
    },
    async close(){stop();codec.clear();},
  };
}

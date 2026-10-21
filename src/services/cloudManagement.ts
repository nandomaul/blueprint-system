import type {SupabaseClient} from '@supabase/supabase-js';
import {CatalogSchema,EditorProfileSchema} from '../domain/catalog.ts';
import {rpc} from './supabaseRepository.ts';
import type {WorkspaceRepository} from './workspace.ts';
export function cloudManagement(client:SupabaseClient,workspaceId:string):NonNullable<WorkspaceRepository['management']>{return{
 async updateProfile(id,name,avatar){return EditorProfileSchema.parse(await rpc(client,'bp_update_editor_profile',{p_workspace_id:workspaceId,p_id:id,p_name:name,p_avatar:avatar}));},
 async read(){return CatalogSchema.parse(await rpc(client,'bp_workspace_catalog_v12',{p_workspace_id:workspaceId}));},
 async profile(action,id,name){return EditorProfileSchema.parse(await rpc(client,'bp_editor_profile',{p_workspace_id:workspaceId,p_action:action,p_id:id,p_name:name??null}));},
 async projects(action,ids,value,passcode,profile='nando'){await rpc(client,'bp_manage_documents',{p_workspace_id:workspaceId,p_action:action,p_ids:ids,p_value:value??null,p_passcode:passcode??null,p_profile:profile});}
};}

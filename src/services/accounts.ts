import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {ProfileSchema} from '../domain/model.ts';
export {accountEmail,parseAccountInput} from '../../supabase/functions/blueprint-accounts/rules.ts';
export type {AccountInput} from '../../supabase/functions/blueprint-accounts/rules.ts';
import type {AccountInput} from '../../supabase/functions/blueprint-accounts/rules.ts';
export const AccountSchema=z.object({user_id:z.string().uuid(),workspace_id:z.string().uuid(),profile_id:ProfileSchema,login_name:z.string(),created_at:z.string()});
export type Account=z.infer<typeof AccountSchema>;
export async function ownAccount(client:SupabaseClient,userId:string){const {data,error}=await client.from('bp_accounts').select('*').eq('user_id',userId).maybeSingle();if(error)throw new Error('Database akun belum siap. Pasang SQL MAP-015.');return data?AccountSchema.parse(data):null;}
export async function listAccounts(client:SupabaseClient,workspaceId:string){const {data,error}=await client.from('bp_accounts').select('*').eq('workspace_id',workspaceId).order('login_name');if(error)throw new Error(error.message);return z.array(AccountSchema).parse(data);}
export async function saveAccount(client:SupabaseClient,input:AccountInput){const {data,error}=await client.functions.invoke('blueprint-accounts',{body:input});if(error){let detail='Layanan akun belum siap. Deploy Edge Function blueprint-accounts.';if('context' in error&&error.context instanceof Response){try{const body=await error.context.json() as {error?:string};if(body.error)detail=body.error;}catch{/* Keep actionable fallback. */}}throw new Error(detail);}return AccountSchema.parse(data.account);}

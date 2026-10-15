import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AssetSchema, ProjectSchema, VersionSchema, validateProject } from '../domain/model.ts';
import type { Asset, ProfileId, Project } from '../domain/model.ts';
import type { Repository, SaveResult } from './repository.ts';
const configKey = 'blueprint-cloud-v2';
export const CloudConfigSchema = z.object({ url: z.string().url(), key: z.string().min(20), workspaceId: z.string().uuid() });
export type CloudConfig = z.infer<typeof CloudConfigSchema>;
const RemoteAssetSchema = AssetSchema.omit({ data: true }).extend({ storagePath: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
const RemoteProjectSchema = ProjectSchema.innerType().extend({ assets: z.array(RemoteAssetSchema).max(30) });
const ResultSchema = z.object({ token: z.string().uuid(), id: z.string().uuid(), label: z.string(), savedAt: z.string(), profile: z.enum(['nando','hadist','ryan']) });
export function readCloudConfig(): CloudConfig | null {
  try { const raw = localStorage.getItem(configKey); return raw ? CloudConfigSchema.parse(JSON.parse(raw)) : null; } catch { return null; }
}
export function storeCloudConfig(config: CloudConfig | null) { if (config) localStorage.setItem(configKey, JSON.stringify(config)); else localStorage.removeItem(configKey); }
export async function connectClient(url: string, key: string): Promise<SupabaseClient> {
  const endpoint = new URL(url.trim());
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost','127.0.0.1'].includes(endpoint.hostname))) throw new Error('Gunakan URL HTTPS project Supabase.');
  const publishable = key.trim();
  let anon = false;
  try { anon = (JSON.parse(atob(publishable.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) as {role?:string}).role === 'anon'; } catch { /* Publishable key memakai format baru. */ }
  if (!publishable.startsWith('sb_publishable_') && !anon) throw new Error('Gunakan publishable key atau legacy anon key. Secret/service_role tidak boleh dipakai di aplikasi.');
  const client = createClient(endpoint.href.replace(/\/$/,''), publishable, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  const session = await client.auth.getSession(); if (session.error) throw session.error;
  if (!session.data.session) { const signed = await client.auth.signInAnonymously(); if (signed.error) throw new Error('Sesi Supabase gagal: '+signed.error.message+'. Aktifkan Anonymous Sign-Ins di Authentication → Sign In / Providers.'); }
  return client;
}
export async function rpc(client: SupabaseClient, name: string, params: Record<string, unknown>): Promise<unknown> {
  const {data,error} = await client.rpc(name, params); if (error) throw new Error(error.message); return data as unknown;
}
export const CreatedWorkspaceSchema = z.object({ workspaceId: z.string().uuid(), inviteCode: z.string().uuid() });
const bucket = 'blueprint-designs';
const digest = async (bytes: Uint8Array<ArrayBuffer>) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
function bytesOf(asset: Asset) {
  const binary = atob(asset.data.slice(asset.data.indexOf(',')+1));
  const bytes = Uint8Array.from(binary, c=>c.charCodeAt(0));
  if (bytes.length !== asset.size || bytes.length > 4*1024*1024) throw new Error('Ukuran isi gambar tidak cocok: '+asset.name);
  return bytes;
}
function dataUrl(bytes: Uint8Array, mime: string) {
  let binary = ''; for (let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return `data:${mime};base64,${btoa(binary)}`;
}
export function createSupabaseRepository(client: SupabaseClient, workspaceId: string): Repository {
  z.string().uuid().parse(workspaceId);
  const cache = new Map<string, string>();
  async function detach(project: Project) {
    const p = validateProject(project), assets: z.infer<typeof RemoteAssetSchema>[] = [];
    for (const asset of p.assets) {
      const bytes = bytesOf(asset), sha256 = await digest(bytes), ext = asset.mime === 'image/jpeg' ? 'jpg' : asset.mime === 'image/webp' ? 'webp' : 'png';
      const storagePath = `${workspaceId}/${sha256}.${ext}`;
      const { data: registered, error: lookupError } = await client.from('bp_assets').select('storage_path,sha256').eq('workspace_id',workspaceId).eq('asset_id',asset.id).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (registered) {
        if (registered.storage_path !== storagePath || registered.sha256 !== sha256) throw new Error('ID gambar sudah dipakai untuk isi lain. Upload sebagai versi baru.');
      } else {
        const uploaded = await client.storage.from(bucket).upload(storagePath, bytes, { contentType: asset.mime, upsert: false });
        if (uploaded.error && !['409','Duplicate'].includes(String(uploaded.error.statusCode)) && !/already exists|duplicate/i.test(uploaded.error.message)) throw new Error(uploaded.error.message);
        await rpc(client,'bp_register_asset',{ p_workspace_id: workspaceId, p_asset_id: asset.id, p_path: storagePath, p_sha256: sha256 });
      }
      const meta = AssetSchema.omit({ data: true }).strip().parse(asset);
      assets.push({ ...meta, storagePath, sha256 }); cache.set(storagePath, asset.data);
    }
    return RemoteProjectSchema.parse({ ...p, assets });
  }
  async function hydrate(value: unknown): Promise<Project> {
    const remote = RemoteProjectSchema.parse(value), assets: Asset[] = [];
    for (const ref of remote.assets) {
      if (!ref.storagePath.startsWith(workspaceId+'/')) throw new Error('Referensi gambar berada di workspace lain.');
      let data = cache.get(ref.storagePath);
      if (!data) {
        const downloaded = await client.storage.from(bucket).download(ref.storagePath); if (downloaded.error) throw new Error(downloaded.error.message);
        const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
        if (bytes.length !== ref.size || await digest(bytes) !== ref.sha256) throw new Error('Isi gambar gagal diverifikasi: '+ref.name);
        data = dataUrl(bytes,ref.mime); cache.set(ref.storagePath,data);
      }
      const meta = AssetSchema.omit({ data: true }).strip().parse(ref); assets.push({ ...meta, data });
    }
    return validateProject({ ...remote, assets });
  }
  async function result(raw: unknown, project?: Project): Promise<SaveResult> {
    const r = ResultSchema.parse(raw);
    let snapshot = project;
    if (!snapshot) { const {data,error} = await client.from('bp_versions').select('snapshot').eq('workspace_id',workspaceId).eq('id',r.id).single(); if (error) throw new Error(error.message); snapshot = await hydrate(data.snapshot as unknown); }
    const { token, ...meta } = r;
    return { token, version: VersionSchema.parse({ ...meta, project: snapshot, deletedAt: null }) };
  }
  return {
    kind: 'supabase',
    async load() {
      const membership = await client.from('bp_workspaces').select('id').eq('id',workspaceId).single(); if (membership.error) throw new Error('Workspace tidak dapat diakses. Gabung memakai kode undangan atau periksa ID workspace.');
      const {data,error} = await client.from('bp_projects').select('token,payload').eq('workspace_id',workspaceId).maybeSingle(); if (error) throw new Error(error.message);
      return data ? { key: 'active', token: z.string().uuid().parse(data.token), project: await hydrate(data.payload as unknown) } : null;
    },
    async history() {
      const versions = [];
      for (let offset=0;;offset+=100) {
        const {data,error} = await client.from('bp_versions').select('*').eq('workspace_id',workspaceId).order('saved_at',{ascending:false}).order('id').range(offset,offset+99); if(error) throw new Error(error.message);
        for (const v of data) versions.push(VersionSchema.parse({ id: v.id, label: v.label, savedAt: v.saved_at, profile: v.profile, deletedAt: v.deleted_at, project: await hydrate(v.snapshot as unknown) }));
        if (data.length<100) break;
      }
      return versions;
    },
    async save(project, token, label, profile='nando') {
      const remote = await detach(project);
      const raw = await rpc(client,'bp_save_project',{ p_workspace_id:workspaceId,p_expected_token:token,p_payload:remote,p_label:label,p_profile:profile });
      return result(raw,project);
    },
    async rename(id,label) { await rpc(client,'bp_rename_version',{p_id:id,p_label:label}); },
    async trash(id) { await rpc(client,'bp_trash_version',{p_id:id}); },
    async untrash(id) { await rpc(client,'bp_untrash_version',{p_id:id}); },
    async restore(id,token,profile: ProfileId) { return result(await rpc(client,'bp_restore_version',{p_id:id,p_expected_token:token,p_profile:profile})); },
    async close() { cache.clear(); await Promise.resolve(); },
  };
}

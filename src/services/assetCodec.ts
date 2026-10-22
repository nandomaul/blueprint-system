import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rpc } from './supabaseRepository.ts';
import { AssetSchema, ProjectSchema, validateProject } from '../domain/model.ts';
import type { Asset, Project } from '../domain/model.ts';

const RemoteAssetSchema = AssetSchema.omit({ data: true }).extend({ storagePath: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
const RemoteProjectSchema = ProjectSchema.innerType().extend({ assets: z.array(RemoteAssetSchema).max(120) });
const bucket = 'blueprint-designs';
export const digest = async (bytes: Uint8Array<ArrayBuffer>) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function bytesOf(asset: Asset) {
  const binary = atob(asset.data.slice(asset.data.indexOf(',')+1));
  const bytes = Uint8Array.from(binary, c=>c.charCodeAt(0));
  if (bytes.length !== asset.size || bytes.length > 4*1024*1024) throw new Error('Ukuran isi gambar tidak cocok: '+asset.name);
  return bytes;
}
export function dataUrl(bytes: Uint8Array, mime: string) {
  let binary = ''; for (let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return `data:${mime};base64,${btoa(binary)}`;
}

export function assetCodec(client:SupabaseClient,workspaceId:string) {
  const cache = new Map<string, string>(),registryCache=new Map<string,{storage_path:string;sha256:string}>();
  async function detach(project: Project) {
    const p = validateProject(project), assets: z.infer<typeof RemoteAssetSchema>[] = [];
    for (const asset of p.assets) {
      const bytes = bytesOf(asset), sha256 = await digest(bytes), ext = asset.mime === 'image/jpeg' ? 'jpg' : asset.mime === 'image/webp' ? 'webp' : 'png';
      const storagePath = `${workspaceId}/${sha256}.${ext}`;
      let registered=registryCache.get(asset.id);if(!registered){const lookup=await client.from('bp_assets').select('storage_path,sha256').eq('workspace_id',workspaceId).eq('asset_id',asset.id).maybeSingle();if(lookup.error)throw new Error(lookup.error.message);registered=lookup.data??undefined;}
      if (registered) {
        if (registered.storage_path !== storagePath || registered.sha256 !== sha256) throw new Error('ID gambar sudah dipakai untuk isi lain. Upload sebagai versi baru.');
      } else {
        const uploaded = await client.storage.from(bucket).upload(storagePath, bytes, { contentType: asset.mime, upsert: false });
        if (uploaded.error && !['409','Duplicate'].includes(String(uploaded.error.statusCode)) && !/already exists|duplicate/i.test(uploaded.error.message)) throw new Error(uploaded.error.message);
        await rpc(client,'bp_register_asset',{ p_workspace_id: workspaceId, p_asset_id: asset.id, p_path: storagePath, p_sha256: sha256 });
      }
      registryCache.set(asset.id,{storage_path:storagePath,sha256});
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
      registryCache.set(ref.id,{storage_path:ref.storagePath,sha256:ref.sha256});
      const meta = AssetSchema.omit({ data: true }).strip().parse(ref); assets.push({ ...meta, data });
    }
    return validateProject({ ...remote, assets });
  }
return {detach,hydrate,async cover(value:unknown){const ref=RemoteAssetSchema.parse(value);if(!ref.storagePath.startsWith(workspaceId+'/'))throw new Error('Cover berbeda ruang.');if(cache.has(ref.storagePath))return cache.get(ref.storagePath)!;const r=await client.storage.from(bucket).download(ref.storagePath);if(r.error)throw r.error;const bytes=new Uint8Array(await r.data.arrayBuffer());if(bytes.length!==ref.size||await digest(bytes)!==ref.sha256)throw new Error('Cover tidak valid.');const data=dataUrl(bytes,ref.mime);cache.set(ref.storagePath,data);return data;},clear:()=>{cache.clear();registryCache.clear();}};
}

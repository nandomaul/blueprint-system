import { z } from 'zod';

export const revision = 'MAP-015';
export const ProfileSchema = z.union([z.enum(['nando','hadist','ryan']),z.string().regex(/^p_[0-9a-f-]{36}$/)]);
export type ProfileId = z.infer<typeof ProfileSchema>;
export const profiles = [{ id: 'nando', name: 'Nando', initial: 'N' }, { id: 'hadist', name: 'Hadist', initial: 'H' }, { id: 'ryan', name: 'Ryan', initial: 'R' }] as const;
const profileCatalog=new Map<string,string>(profiles.map(p=>[p.id,p.name]));
export function setProfileCatalog(rows:{id:string;name:string}[]){profileCatalog.clear();for(const p of [...profiles,...rows])profileCatalog.set(p.id,p.name);}
export const profileName=(id:ProfileId|null|undefined)=>id?profileCatalog.get(id)??'Profil tambahan':'Tim';
export const icons = ['grid', 'login', 'play', 'users', 'file', 'check', 'archive', 'layers', 'spark', 'link', 'image', 'settings'] as const;
export const nodeTypes = ['entry', 'screen', 'process', 'integration', 'output'] as const;
export const AssetSchema = z.object({
  id: z.string().min(1).max(100), nodeId: z.string().min(1).max(100), name: z.string().max(180),
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp']), size: z.number().int().positive().max(4 * 1024 * 1024),
  data: z.string().max(6 * 1024 * 1024).refine(v => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), 'Gambar harus PNG/JPEG/WebP.'),
  deletedAt:z.string().nullable().optional(),version: z.number().int().positive(), createdAt: z.string(), profile: ProfileSchema.nullable().optional(),
}).strict();
export const elementKinds = ['heading','text','button','input','card','image','table','checkbox','select','textarea','icon','rectangle','ellipse','line','badge','avatar','progress'] as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const ElementSchema = z.object({
  id: z.string().min(1).max(100), kind: z.enum(elementKinds),
  text: z.string().max(4000), x: z.number().finite().min(0).max(4000), y: z.number().finite().min(0).max(4000),
  width: z.number().finite().min(24).max(2400), height: z.number().finite().min(24).max(2400),
  fontSize: z.number().min(8).max(120), color, background: color, radius: z.number().min(0).max(100),
  target: z.string().max(100), assetId: z.string().nullable(), edgeId:z.string().max(100).optional(), icon:z.enum(icons).optional(), options:z.array(z.string().max(100)).max(20).optional(), value:z.number().min(0).max(100).optional(),
}).strict();
export const LayoutModeSchema=z.enum(['web','mobile','presentation']);
export type LayoutMode=z.infer<typeof LayoutModeSchema>;
export const GeometrySchema=ElementSchema.pick({id:true,x:true,y:true,width:true,height:true,fontSize:true});
export const LayoutSchema=z.object({width:z.number().int().min(320).max(2400),height:z.number().int().min(320).max(4000),elements:z.array(GeometrySchema).max(100)}).strict().superRefine((d,ctx)=>{if(new Set(d.elements.map(e=>e.id)).size!==d.elements.length||d.elements.some(e=>e.x+e.width>d.width||e.y+e.height>d.height))ctx.addIssue({code:'custom',message:'Geometry layout tidak valid.'});});
export const DesignSchema = z.object({ width: z.number().int().min(320).max(2400), height: z.number().int().min(320).max(4000), background: color, elements: z.array(ElementSchema).max(100),layoutMode:LayoutModeSchema.optional(),layouts:z.object({web:LayoutSchema.optional(),mobile:LayoutSchema.optional(),presentation:LayoutSchema.optional()}).strict().optional() }).strict();
export type DesignElement = z.infer<typeof ElementSchema>;
export type PageDesign = z.infer<typeof DesignSchema>;
export const BriefSchema = z.object({
  problem: z.string().max(6000).default(''), audience: z.string().max(3000).default(''),
  scope: z.string().max(6000).default(''), decisions: z.string().max(10000).default(''),
  assumptions: z.string().max(6000).default(''), questions: z.string().max(6000).default(''),
  acceptance: z.string().max(10000).default(''),
  dataModel: z.string().max(16000).default(''), integrations: z.string().max(16000).default(''),
}).strict();
export type ProjectBrief = z.infer<typeof BriefSchema>;
export const NodeSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().trim().min(1).max(80), subtitle: z.string().max(100),
  icon: z.enum(icons), type: z.enum(nodeTypes), x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000),
  route: z.string().max(180), purpose: z.string().max(1200), output: z.string().max(1200),
  integration: z.string().max(180), integrationStatus: z.enum(['none', 'planned', 'simulated']),
  owner: z.string().max(100), externalUrl: z.string().max(1000).refine(v => !v || /^https?:\/\//i.test(v) && (() => { try { new URL(v); return true; } catch { return false; } })(), 'Gunakan URL http/https yang valid.'),
  activeAssetId: z.string().nullable(), design: DesignSchema.optional(),
}).strict();
export const PointSchema=z.object({x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000)}).strict();
export const SideSchema=z.enum(['left','right','top','bottom']);
export type FlowSide=z.infer<typeof SideSchema>;
export const FlowColumnSchema=z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1).max(80),x:z.number().finite().min(-10000).max(10000),y:z.number().finite().min(-10000).max(10000),width:z.number().min(280).max(4000),height:z.number().min(240).max(6000),color}).strict();
export type FlowColumn=z.infer<typeof FlowColumnSchema>;
export const EdgeSchema = z.object({ id: z.string().min(1).max(100), source: z.string(), target: z.string(), label: z.string().trim().min(1).max(90), feedback: z.string().max(500), bend:PointSchema.optional(),sourceSide:SideSchema.optional(),targetSide:SideSchema.optional() }).strict();
export const DesignBindingSchema=z.object({id:z.string().min(1).max(100),nodeId:z.string().min(1).max(100),elementId:z.string().max(100).nullable(),assetId:z.string().min(1).max(100)}).strict();
export type DesignBinding=z.infer<typeof DesignBindingSchema>;
export const TrashEntrySchema=z.object({id:z.string().min(1),kind:z.enum(['page','group','element','asset','binding','connections']),label:z.string().max(180),at:z.string(),node:NodeSchema.optional(),column:FlowColumnSchema.optional(),nodeId:z.string().optional(),element:ElementSchema.optional(),index:z.number().int().min(0).optional(),assetId:z.string().optional(),bindings:z.array(DesignBindingSchema).optional(),elements:z.array(z.object({nodeId:z.string(),element:ElementSchema,index:z.number().int().min(0)}).strict()).optional(),edges:z.array(EdgeSchema).optional(),presentationIndex:z.number().int().min(0).optional()}).strict().superRefine((t,c)=>{const valid=t.kind==='page'?Boolean(t.node):t.kind==='group'?Boolean(t.column):t.kind==='element'?Boolean(t.nodeId&&t.element):t.kind==='asset'?Boolean(t.assetId):t.kind==='binding'?Boolean(t.bindings?.length):Boolean(t.edges?.length);if(!valid)c.addIssue({code:z.ZodIssueCode.custom,message:'Item Trash tidak lengkap.'});});
export type TrashEntry=z.infer<typeof TrashEntrySchema>;
export const ProjectSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1), title: z.string().trim().min(1).max(100), description: z.string().max(1000),
  brief: BriefSchema.default({}), updatedAt: z.string(), nodes: z.array(NodeSchema).min(1).max(80), edges: z.array(EdgeSchema).max(240),
  designLayer:z.object({enabled:z.boolean(),bindings:z.array(DesignBindingSchema).max(1000)}).strict().optional(),trash:z.array(TrashEntrySchema).max(500).optional(),flowColumns:z.array(FlowColumnSchema).max(24).optional(), assets: z.array(AssetSchema).max(120), presentation: z.array(z.string()).min(1).max(80),
}).strict().superRefine((p, ctx) => {
  const ids = new Set(p.nodes.map(n => n.id));
  if(new Set(p.flowColumns?.map(c=>c.id)).size!==(p.flowColumns?.length??0))ctx.addIssue({code:'custom',message:'ID kolom ganda.'});
  const assets = new Map(p.assets.map(a => [a.id, a]));
  const owners=new Set([...ids,...(p.trash??[]).flatMap(t=>t.node?[t.node.id]:[])]);
  if(new Set(p.trash?.map(t=>t.id)).size!==(p.trash?.length??0))ctx.addIssue({code:'custom',message:'ID Trash ganda.'});
  for(const b of p.designLayer?.bindings??[]){const n=p.nodes.find(n=>n.id===b.nodeId),a=assets.get(b.assetId);if(!n||!a||a.nodeId!==b.nodeId||a.deletedAt||b.elementId&&!n.design?.elements.some(e=>e.id===b.elementId))ctx.addIssue({code:'custom',message:'Target Design UI tidak ditemukan.'});}
  if(new Set(p.designLayer?.bindings.map(b=>b.nodeId+'/'+(b.elementId??'page'))).size!==(p.designLayer?.bindings.length??0))ctx.addIssue({code:'custom',message:'Target Design UI ganda.'});
  if (ids.size !== p.nodes.length || new Set(p.edges.map(e => e.id)).size !== p.edges.length || assets.size !== p.assets.length) ctx.addIssue({ code: 'custom', message: 'ID node, koneksi, atau gambar ganda.' });
  for (const edge of p.edges) if (!ids.has(edge.source) || !ids.has(edge.target)) ctx.addIssue({ code: 'custom', message: 'Koneksi mengarah ke node yang tidak ada.' });
  for (const id of p.presentation) if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: 'Urutan presentasi berisi node yang tidak ada.' });
  for (const asset of p.assets) if (!owners.has(asset.nodeId) || !asset.data.startsWith(`data:${asset.mime};base64,`)) ctx.addIssue({ code: 'custom', message: 'Pemilik atau tipe gambar tidak valid.' });
  for (const node of p.nodes) {
    if (node.design) {
      if (new Set(node.design.elements.map(e => e.id)).size !== node.design.elements.length) ctx.addIssue({code:'custom',message:'ID komponen ganda.'});
      for (const e of node.design.elements) {
        if (e.target && !ids.has(e.target)) ctx.addIssue({code:'custom',message:'Tujuan tombol tidak ditemukan.'});
        if (e.assetId && assets.get(e.assetId)?.nodeId !== node.id) ctx.addIssue({code:'custom',message:'Gambar komponen tidak cocok dengan halaman.'});
        if (e.x+e.width>node.design.width || e.y+e.height>node.design.height) ctx.addIssue({code:'custom',message:'Komponen harus berada di dalam ukuran halaman.'});
      }
    }
  }
  for (const node of p.nodes) if (node.activeAssetId && assets.get(node.activeAssetId)?.nodeId !== node.id) ctx.addIssue({ code: 'custom', message: 'Gambar aktif tidak cocok dengan node.' });
  if (p.assets.reduce((sum, a) => sum + a.size, 0) > 20 * 1024 * 1024) ctx.addIssue({ code: 'custom', message: 'Total gambar maksimal 20 MB. Ekspor proyek sebelum mengurangi aset.' });
});
export type Project = z.infer<typeof ProjectSchema>;
export type MapNode = z.infer<typeof NodeSchema>;
export type MapEdge = z.infer<typeof EdgeSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type IconName = typeof icons[number];
export const VersionSchema = z.object({ id: z.string().min(1), label: z.string().trim().min(1).max(100), savedAt: z.string(), project: ProjectSchema, profile: ProfileSchema.nullable().default(null), deletedAt: z.string().nullable().default(null) }).strict();
export type Version = z.infer<typeof VersionSchema>;
export const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Terjadi kesalahan.';
export function validateProject(value: unknown): Project {
  const result = ProjectSchema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Format proyek tidak valid.');
  return result.data;
}
export function updateNode(project: Project, id: string, patch: Partial<MapNode>): Project {
  return validateProject({ ...project, nodes: project.nodes.map(n => n.id === id ? { ...n, ...patch, id } : n), updatedAt: new Date().toISOString() });
}
export function removeNode(project: Project, id: string): Project {
  if (project.nodes.length <= 1) throw new Error('Sisakan minimal satu node.');
  const nodes = project.nodes.filter(n => n.id !== id).map(n => n.design ? {...n,design:{...n.design,elements:n.design.elements.map(e=>e.target===id?{...e,target:''}:e)}} : n);
  const presentation = project.presentation.filter(n => n !== id);
  return validateProject({ ...project, nodes, edges: project.edges.filter(e => e.source !== id && e.target !== id), assets: project.assets.filter(a => a.nodeId !== id), presentation: presentation.length ? presentation : [nodes[0].id], updatedAt: new Date().toISOString() });
}
export function addEdge(project: Project, source: string, target: string, label: string): Project {
  if (source === target) throw new Error('Pilih node tujuan yang berbeda.');
  return validateProject({ ...project, edges: [...project.edges, { id: crypto.randomUUID(), source, target, label, feedback: 'Simulasi berpindah ke langkah berikutnya.' }], updatedAt: new Date().toISOString() });
}
export function attachAsset(project: Project, asset: Asset): Project {
  return validateProject({ ...project, assets: [...project.assets, asset], nodes: project.nodes.map(n => n.id === asset.nodeId ? { ...n, activeAssetId: asset.id } : n), updatedAt: new Date().toISOString() });
}
export function appendReference(project: Project, asset: Asset): Project {
  return validateProject({ ...project, assets: [...project.assets, asset], updatedAt: new Date().toISOString() });
}
export type RunState = { nodeId: string; history: string[]; logs: { id: string; message: string; at: string }[] };
export function beginRun(project: Project, id = project.presentation[0]): RunState {
  if (!project.nodes.some(n => n.id === id)) throw new Error('Layar awal tidak ditemukan.');
  return { nodeId: id, history: [id], logs: [] };
}
export function followEdge(project: Project, state: RunState, edgeId: string): RunState {
  const edge = project.edges.find(e => e.id === edgeId && e.source === state.nodeId);
  if (!edge || !project.nodes.some(n => n.id === edge.target)) throw new Error('Aksi tidak tersedia dari layar ini.');
  return { nodeId: edge.target, history: [...state.history, edge.target], logs: [...state.logs, { id: crypto.randomUUID(), message: `${edge.label}: ${edge.feedback}`, at: new Date().toISOString() }] };
}
export function exportProject(project: Project) { return JSON.stringify({ format: 'adfriends-blueprint', version: 1, project: validateProject(project) }, null, 2); }
export function importProject(json: string): Project {
  if (new TextEncoder().encode(json).byteLength > 35 * 1024 * 1024) throw new Error('File impor maksimal 35 MB.');
  const parsed: unknown = JSON.parse(json);
  const envelope = z.object({ format: z.literal('adfriends-blueprint'), version: z.literal(1), project: z.unknown() }).strict().parse(parsed);
  return validateProject(envelope.project);
}

export function removeAsset(project: Project, id: string): Project {
  return validateProject({...project, assets:project.assets.filter(a=>a.id!==id), nodes:project.nodes.map(n=>({...n,activeAssetId:n.activeAssetId===id?null:n.activeAssetId,...(n.design?{design:{...n.design,elements:n.design.elements.filter(e=>e.assetId!==id)}}:{})})),updatedAt:new Date().toISOString()});
}

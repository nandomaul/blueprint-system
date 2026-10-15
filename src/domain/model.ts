import { z } from 'zod';

export const revision = 'MAP-002';
export const ProfileSchema = z.enum(['nando', 'hadist', 'ryan']);
export type ProfileId = z.infer<typeof ProfileSchema>;
export const profiles = [{ id: 'nando', name: 'Nando', initial: 'N' }, { id: 'hadist', name: 'Hadist', initial: 'H' }, { id: 'ryan', name: 'Ryan', initial: 'R' }] as const;
export const profileName = (id: ProfileId | null | undefined) => profiles.find(p => p.id === id)?.name ?? 'Tim';
export const icons = ['grid', 'login', 'play', 'users', 'file', 'check', 'archive', 'layers', 'spark', 'link', 'image', 'settings'] as const;
export const nodeTypes = ['entry', 'screen', 'process', 'integration', 'output'] as const;
export const AssetSchema = z.object({
  id: z.string().min(1).max(100), nodeId: z.string().min(1).max(100), name: z.string().max(180),
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp']), size: z.number().int().positive().max(4 * 1024 * 1024),
  data: z.string().max(6 * 1024 * 1024).refine(v => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), 'Gambar harus PNG/JPEG/WebP.'),
  version: z.number().int().positive(), createdAt: z.string(), profile: ProfileSchema.nullable().optional(),
}).strict();
export const NodeSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().trim().min(1).max(80), subtitle: z.string().max(100),
  icon: z.enum(icons), type: z.enum(nodeTypes), x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000),
  route: z.string().max(180), purpose: z.string().max(1200), output: z.string().max(1200),
  integration: z.string().max(180), integrationStatus: z.enum(['none', 'planned', 'simulated']),
  owner: z.string().max(100), externalUrl: z.string().max(1000).refine(v => !v || /^https?:\/\//i.test(v) && (() => { try { new URL(v); return true; } catch { return false; } })(), 'Gunakan URL http/https yang valid.'),
  activeAssetId: z.string().nullable(),
}).strict();
export const EdgeSchema = z.object({ id: z.string().min(1).max(100), source: z.string(), target: z.string(), label: z.string().trim().min(1).max(90), feedback: z.string().max(500) }).strict();
export const ProjectSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().min(1), title: z.string().trim().min(1).max(100), description: z.string().max(1000),
  updatedAt: z.string(), nodes: z.array(NodeSchema).min(1).max(80), edges: z.array(EdgeSchema).max(240),
  assets: z.array(AssetSchema).max(30), presentation: z.array(z.string()).min(1).max(80),
}).strict().superRefine((p, ctx) => {
  const ids = new Set(p.nodes.map(n => n.id));
  const assets = new Map(p.assets.map(a => [a.id, a]));
  if (ids.size !== p.nodes.length || new Set(p.edges.map(e => e.id)).size !== p.edges.length || assets.size !== p.assets.length) ctx.addIssue({ code: 'custom', message: 'ID node, koneksi, atau gambar ganda.' });
  for (const edge of p.edges) if (!ids.has(edge.source) || !ids.has(edge.target)) ctx.addIssue({ code: 'custom', message: 'Koneksi mengarah ke node yang tidak ada.' });
  for (const id of p.presentation) if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: 'Urutan presentasi berisi node yang tidak ada.' });
  for (const asset of p.assets) if (!ids.has(asset.nodeId) || !asset.data.startsWith(`data:${asset.mime};base64,`)) ctx.addIssue({ code: 'custom', message: 'Pemilik atau tipe gambar tidak valid.' });
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
  const nodes = project.nodes.filter(n => n.id !== id);
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

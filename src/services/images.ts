import type { Asset } from '../domain/model.ts';
export async function readImage(file: File, nodeId: string, version: number): Promise<Asset> {
  if (file.size > 4 * 1024 * 1024 || file.size < 1) throw new Error('Gambar maksimal 4 MB per file.');
  const head = new Uint8Array(await file.slice(0,16).arrayBuffer());
  const mime = head[0]===137 && head[1]===80 && head[2]===78 && head[3]===71 ? 'image/png' : head[0]===255 && head[1]===216 && head[2]===255 ? 'image/jpeg' : new TextDecoder().decode(head.slice(0,4))==='RIFF' && new TextDecoder().decode(head.slice(8,12))==='WEBP' ? 'image/webp' : null;
  if (!mime) throw new Error('Gunakan file PNG, JPEG, atau WebP yang valid.');
  const buffer = await file.arrayBuffer(), bytes = new Uint8Array(buffer);
  let binary = ''; for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  const data = `data:${mime};base64,${btoa(binary)}`;
  const image = new Image(); image.src = data;
  try { await image.decode(); } catch { throw new Error('Gambar tidak dapat dibaca. Pilih file raster lain.'); }
  if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Resolusi gambar terlalu besar. Pilih gambar maksimal 40 megapiksel.');
  return { id: crypto.randomUUID(), nodeId, name: file.name.slice(0,180), mime, size: file.size, data, version, createdAt: new Date().toISOString() };
}
export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

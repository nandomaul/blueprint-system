import { cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const destination=resolve(dirname(root),'blueprint-checkpoints','MAP-002-'+new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(dirname(destination),{recursive:true});
cpSync(root,destination,{recursive:true,filter:p=>!/^\.env(?:\.|$)/.test(p.split('/').at(-1))&&!['node_modules','dist','.git'].some(name=>p===resolve(root,name)||p.startsWith(resolve(root,name)+'/'))});
console.log('Checkpoint source:',destination);
console.log('Peta/gambar tersimpan di browser. Gunakan Ekspor JSON di aplikasi untuk mencadangkan data proyeknya.');

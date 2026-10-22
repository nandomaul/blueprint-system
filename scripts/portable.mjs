import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve,sep } from 'node:path';
const root=process.cwd(),dist=resolve(root,'dist');
function localResource(ref){
 if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref))throw new Error('Resource eksternal tidak boleh di-inline.');
 const pathname=decodeURIComponent(ref.split(/[?#]/)[0]),index=pathname.indexOf('assets/');if(index<0)throw new Error('Resource bukan asset build.');
 const file=resolve(dist,pathname.slice(index));if(!file.startsWith(resolve(dist,'assets')+sep))throw new Error('Path resource keluar dari assets.');return file;
}
let html=readFileSync(resolve(dist,'index.html'),'utf8');
// Collect document resources before inlining JavaScript, which may itself contain HTML templates.
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)],styles=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)];
for(const match of styles){const href=/href="([^"]+)"/.exec(match[0]);if(!href)throw new Error('CSS href tidak ada.');html=html.replace(match[0],()=>`<style>${readFileSync(localResource(href[1]),'utf8')}</style>`);}
for(const match of scripts){const content=readFileSync(localResource(match[1]),'utf8').replace(/<\/script/gi,'<\\/script');html=html.replace(match[0],()=>`<script type="module">${content}</script>`);}
const documentShell=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
if(/<link\b[^>]*rel="stylesheet"/.test(documentShell))throw new Error('Preview belum mandiri.');
writeFileSync(resolve(root,'preview.html'),html);
console.log('Portable preview dibuat: preview.html; assets:',readdirSync(resolve(dist,'assets')).length);

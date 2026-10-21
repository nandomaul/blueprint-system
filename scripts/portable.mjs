import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root=process.cwd(),dist=resolve(root,'dist');
let html=readFileSync(resolve(dist,'index.html'),'utf8');
// Collect document resources before inlining JavaScript, which may itself contain HTML templates.
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)],styles=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)];
for(const match of styles){const href=/href="([^"]+)"/.exec(match[0]);if(!href)throw new Error('CSS href tidak ada.');html=html.replace(match[0],()=>`<style>${readFileSync(resolve(dist,href[1]),'utf8')}</style>`);}
for(const match of scripts){const content=readFileSync(resolve(dist,match[1]),'utf8').replace(/<\/script/gi,'<\\/script');html=html.replace(match[0],()=>`<script type="module">${content}</script>`);}
const documentShell=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
if(/<link\b[^>]*rel="stylesheet"/.test(documentShell))throw new Error('Preview belum mandiri.');
writeFileSync(resolve(root,'preview.html'),html);
console.log('Portable preview dibuat: preview.html; assets:',readdirSync(resolve(dist,'assets')).length);

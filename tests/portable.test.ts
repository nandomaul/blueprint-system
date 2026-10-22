import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
test('Portable build only inlines document resources, preserving HTML templates inside exported UI code',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'bp-portable-'));try{await mkdir(path.join(dir,'dist/assets'),{recursive:true});await writeFile(path.join(dir,'dist/index.html'),'<html><head><script type="module" src="./assets/app.js"></script><link rel="stylesheet" href="./assets/app.css"></head><body><div id="root"></div></body></html>');const js='const template=\'<link rel="stylesheet" href="style.css"><script src="app.js"></script>\';';await writeFile(path.join(dir,'dist/assets/app.js'),js);await writeFile(path.join(dir,'dist/assets/app.css'),'body{margin:0}');for(const base of ['./','/','/blueprint-system/']){await writeFile(path.join(dir,'dist/index.html'),`<html><head><script type="module" src="${base}assets/app.js"></script><link rel="stylesheet" href="${base}assets/app.css"></head><body><div id="root"></div></body></html>`);const r=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/portable.mjs',import.meta.url))],{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr);const html=await readFile(path.join(dir,'preview.html'),'utf8'),dom=new JSDOM(html);assert.equal(dom.window.document.querySelectorAll('link,script[src]').length,0);assert.equal(dom.window.document.querySelectorAll('style').length,1);assert.ok(dom.window.document.querySelector('script')!.textContent!.includes('style.css'));dom.window.close();}}finally{await rm(dir,{recursive:true,force:true});}
});

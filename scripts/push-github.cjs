#!/usr/bin/env node
'use strict';
// GH-001: upload reviewed project source to this one repository. No force push.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),remote='https://github.com/nandomaul/blueprint-system.git';
const allowedRoots=new Set(['src','scripts','tests','docs','supabase','public','.github']);
const allowedFiles=new Set(['package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json','eslint.config.mjs','README.md','PROJECT_STATE.md','AGENTS.md','.gitignore','.nvmrc','.env.example']);
function fail(m){throw new Error(m);}
function command(file,args,{capture=false,allowFailure=false}={}){
 const r=spawnSync(file,args,{cwd:root,encoding:'utf8',stdio:capture?'pipe':'inherit'});
 if(r.error)fail('Gagal menjalankan '+file+': '+r.error.message);
 if(r.status!==0&&!allowFailure)fail('Perintah berhenti: '+file+' '+args.join(' ')+(capture?'\n'+r.stderr:''));
 return r;
}
const git=(args,options={})=>command('git',args,{capture:true,...options});
function allowed(p){const parts=p.split('/');return !parts.some(v=>['node_modules','dist','.git','.temp','tmp'].includes(v)||v==='.DS_Store'||v.startsWith('.env')&&v!=='.env.example'||/\.(pem|key|log)$/i.test(v))&&(parts.length===1?(allowedFiles.has(p)||allowedRoots.has(p)):allowedRoots.has(parts[0]));}
function safeRemote(url){return /^(https:\/\/github\.com\/nandomaul\/blueprint-system(?:\.git)?\/?|git@github\.com:nandomaul\/blueprint-system(?:\.git)?)$/.test(url);}
function walk(folder,prefix=''){
 const paths=[];
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const rel=prefix?prefix+'/'+entry.name:entry.name;if(!allowed(rel))continue;
  const abs=path.join(folder,entry.name);
  if(entry.isSymbolicLink())fail('Source symlink perlu diperiksa sebelum dipush: '+rel);
  if(entry.isDirectory())paths.push(...walk(abs,rel));else if(entry.isFile())paths.push(rel);
 }
 return paths;
}
function main(){
 if(process.argv.length!==2)fail('Jalankan: node scripts/push-github.cjs');
 if(Number(process.versions.node.split('.')[0])!==24)fail('Gunakan Node 24.');
 if(root.includes(':'))fail('Ganti nama root menjadi 0. Canvas UI-UX, lalu buka ulang folder di VS Code.');
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));if(pkg.name!=='adfriends-personnel-blueprint')fail('Bukan source Blueprint yang dikenali.');
 if(!fs.existsSync(path.join(root,'.github/workflows/pages.yml')))fail('Pasang setup GH-001 dahulu.');
 let tracked=[];
 const existing=git(['rev-parse','--show-toplevel'],{allowFailure:true});
 if(existing.status===0&&fs.realpathSync(existing.stdout.trim())!==fs.realpathSync(root))fail('Folder ini berada di dalam repo lain. Buka root Blueprint yang tepat; repo induk tidak diubah.');
 if(existing.status===0){
  const branch=git(['branch','--show-current']).stdout.trim();if(branch!=='main')fail('Branch aktif '+(branch||'(detached)')+'. Script hanya menangani main; tidak merename/menimpa branch existing.');
  for(const direction of [[],['--push']]){
   const urls=git(['remote','get-url',...direction,'--all','origin'],{allowFailure:true});
   if(urls.status===0&&urls.stdout.trim().split('\n').some(u=>!safeRemote(u)))fail('Remote origin berbeda dari nandomaul/blueprint-system. Tidak diganti atau dipush.');
  }
  tracked=git(['ls-files','-z']).stdout.split('\0').filter(Boolean);
  for(const p of tracked)if(!allowed(p))fail('File di luar daftar source sudah tracked: '+p+'. Periksa dahulu; script tidak menghapus file/index.');
 }
 for(const setting of ['user.name','user.email'])if(!git(['config','--get',setting],{allowFailure:true}).stdout.trim())fail('Identitas commit '+setting+' belum diatur. Isi dengan identitas GitHub lo melalui git config '+setting+' "NILAI_LO", lalu ulangi. Jangan gunakan token/password sebagai identitas commit.');
 // Match the Pages build while keeping the normal dev/build configuration intact.
 const npm=process.platform==='win32'?'npm.cmd':'npm';
 for(const args of [['run','typecheck'],['run','lint'],['test'],['exec','--','vite','build','--base=/blueprint-system/']])command(npm,args);
 const paths=[...new Set([...walk(root),...tracked])];if(!paths.includes('src/App.tsx')||!paths.includes('package-lock.json'))fail('Source wajib belum lengkap.');
 if(existing.status!==0)command('git',['init','-b','main']);
 const origin=git(['remote','get-url','origin'],{allowFailure:true});if(origin.status!==0)command('git',['remote','add','origin',remote]);
 // Read the remote before committing; stop on incompatible history, never force.
 const refs=git(['ls-remote','--heads','origin']).stdout.trim();
 if(refs){
  const main=refs.split('\n').find(line=>line.endsWith('\trefs/heads/main'));
  if(!main)fail('Remote sudah berisi branch lain. History perlu diperiksa sebelum push pertama.');
  command('git',['fetch','origin','main']);
  if(git(['merge-base','--is-ancestor','FETCH_HEAD','HEAD'],{allowFailure:true}).status!==0)fail('History lokal belum memuat main di GitHub. Tidak force push; kirim hasil git status untuk rekonsiliasi.');
 }
 // Explicit files; uploads, checkpoints, generated HTML, dependencies and .env stay out.
 for(let i=0;i<paths.length;i+=80)command('git',['add','--',...paths.slice(i,i+80)]);
 for(const p of git(['diff','--cached','--name-only','-z']).stdout.split('\0').filter(Boolean))if(!allowed(p))fail('File staged di luar source yang diizinkan: '+p+'. Push belum dilakukan.');
 if(git(['diff','--cached','--quiet'],{allowFailure:true}).status!==0)command('git',['commit','-m','Prepare Blueprint source and manual GitHub Pages publishing']);
 command('git',['push','--set-upstream','origin','main']);
 console.log('\nSOURCE BERHASIL DIPUSH ke nandomaul/blueprint-system.\nBelum menerbitkan Pages.\n1. Settings > Pages > Source: GitHub Actions\n2. Actions > Publish Blueprint to GitHub Pages > Run workflow > main\n3. Setelah job deploy hijau: https://nandomaul.github.io/blueprint-system/');
}
try{main();}catch(e){console.error('BERHENTI:',e instanceof Error?e.message:String(e));process.exitCode=1;}

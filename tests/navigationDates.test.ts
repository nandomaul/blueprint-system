import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workspacePath,readWorkspaceRoute,slug} from '../src/domain/navigation.ts';
import {chatDateKey,chatDayLabel} from '../src/domain/chatDates.ts';
test('Project paths preserve stable project/page identity across mode, settings, chat, preview, names and encoded input',()=>{
 const id=crypto.randomUUID(),page='hr-approval';
 for(const base of ['/','/blueprint-system/'])for(const mode of ['canvas','flow','assets'] as const){const path=workspacePath({projectId:id,title:'Personnel / Équipe',nodeId:page,mode,panel:'settings',section:'language',chat:true,preview:page,guided:true},base),url=new URL(path,'https://example.test'),r=readWorkspaceRoute(url.pathname,url.search,base);assert.equal(r.projectId,id);assert.equal(r.nodeId,page);assert.equal(r.mode,mode);assert.equal(r.panel,'settings');assert.equal(r.section,'language');assert.equal(r.chat,true);assert.equal(r.preview,page);assert.equal(r.guided,true);assert.ok(path.includes('personnel-equipe~'));}
 const legacy='personnel-ryan-mindmap-20261020-002';const legacyUrl=new URL(workspacePath({projectId:legacy,title:'Ryan',mode:'flow'}),'https://example.test');assert.equal(readWorkspaceRoute(legacyUrl.pathname,'').projectId,legacy);assert.equal(slug('///'),'project');assert.deepEqual(readWorkspaceRoute('/%E0%A4%A',''),{mode:'canvas'});assert.deepEqual(readWorkspaceRoute('/other/settings','','/blueprint-system/'),{mode:'canvas'});
 assert.equal(readWorkspaceRoute('/blueprint-system/settings','?section=accounts','/blueprint-system/').section,'accounts');assert.equal(readWorkspaceRoute('/blueprint-system/settings','?section=bad','/blueprint-system/').section,undefined);
 assert.equal(readWorkspaceRoute('/personnel~'+id+'/design','?page=<script>').nodeId,'<script>');assert.ok(workspacePath({mode:'assets',projectId:id,nodeId:'<script>'}).includes('%3Cscript%3E'));
 assert.equal(readWorkspaceRoute('/renamed-old-slug~'+id+'/userflow','').projectId,id);
});
test('Chat dates group by local calendar day, show Today/Hari ini only for today, retain weekday/date/year and handle invalid timestamps',()=>{
 const now=new Date(2026,9,21,16,30),today=new Date(2026,9,21,1),older=new Date(2026,9,20,23,59);
 assert.equal(chatDateKey(today.toISOString()),'2026-10-21');assert.equal(chatDayLabel(today.toISOString(),now,'id-ID'),'Hari ini');assert.equal(chatDayLabel(today.toISOString(),now,'en-GB'),'Today');assert.match(chatDayLabel(older.toISOString(),now,'en-GB'),/Tuesday.*20 October 2026/);assert.match(chatDayLabel(older.toISOString(),now,'id-ID'),/Selasa.*20 Oktober 2026/);assert.notEqual(chatDayLabel(today.toISOString(),new Date(2026,9,22),'en-GB'),'Today');assert.equal(chatDayLabel('invalid',now,'en-GB'),'Unknown date');
});

test('GitHub Pages handoff keeps private review capability in the fragment, never root request query',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm'),html=await readFile(new URL('../public/404.html',import.meta.url),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)![1];let redirected='';const code=crypto.randomUUID(),location={pathname:'/blueprint-system/project~'+crypto.randomUUID()+'/design',search:'?page=approval',hash:'#review='+code,replace:(url:string)=>{redirected=url;}};
 runInNewContext(script,{location,document:{querySelector:()=>({textContent:''})}});const next=new URL(redirected,'https://nandomaul.github.io');assert.equal(next.hash,'#review='+code);assert.ok(!next.search.includes(code));assert.equal(next.searchParams.get('bp_path'),location.pathname+location.search);assert.ok(!next.searchParams.get('bp_path')!.includes('#'));
});

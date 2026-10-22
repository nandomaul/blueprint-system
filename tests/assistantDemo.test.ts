import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject} from '../src/domain/designer.ts';
import {answerDemo,reviewDraft,classifyDocument} from '../src/domain/assistantDemo.ts';
import {draggedPosition,boundedPosition,readDragAnchor,dragAnchorMime} from '../src/domain/drag.ts';
test('A grabbed point remains under the cursor from either panel edge and through a scaled workspace',()=>{
 const origin={x:80,y:16};assert.deepEqual(draggedPosition(origin,{x:375,y:100},{x:415,y:132}),{x:120,y:48});
 assert.deepEqual(draggedPosition(origin,{x:140,y:100},{x:180,y:132}),{x:120,y:48});assert.deepEqual(draggedPosition(origin,{x:375,y:100},{x:415,y:132},{x:.5,y:.5}),{x:160,y:80});assert.deepEqual(boundedPosition({x:1000,y:-20},{width:800,height:600},{width:260,height:400}),{x:540,y:0});
 const data={getData:(key:string)=>key===dragAnchorMime?JSON.stringify({kind:'ratio',x:.9,y:.1}):''};assert.deepEqual(readDragAnchor(data,{width:400,height:260}),{x:360,y:26});assert.deepEqual(readDragAnchor({getData:()=>'{bad'},{width:400,height:260}),{x:0,y:0});
});
test('FAQ simulation retrieves only current project knowledge, cites it, and handles missing answers honestly',()=>{
 const p=newProject('Client');p.nodes[0].purpose='Karyawan meminta approval dokumen ke HR.';p.brief.scope='HR memeriksa kontrak dan pengajuan.';const before=structuredClone(p),answer=answerDemo(p,p.nodes[0],'Bagaimana approval dokumen?');assert.ok(answer.sources.some(s=>s.label===p.nodes[0].title));assert.ok(answer.text.includes('Karyawan meminta'));assert.equal(answerDemo(p,p.nodes[0],'quantum entanglement').sources.length,0);assert.ok(answerDemo(p,p.nodes[0],'Apa tujuan langkah ini?','sample.png').text.includes('belum dibaca dengan OCR'));assert.deepEqual(p,before);
});
test('Draft simulation catches empty fields, invalid calendar dates, reversed dates and sample typos without mutating input',()=>{
 const input={name:'',start:'2026-02-30',end:'',body:'Perusahann menerima karywan.'},before={...input},findings=reviewDraft(input);assert.ok(findings.some(f=>f.field==='name'));assert.ok(findings.some(f=>f.field==='start'));assert.ok(findings.some(f=>f.field==='end'));assert.ok(findings.some(f=>f.correction?.includes('karyawan')));assert.deepEqual(input,before);assert.ok(reviewDraft({name:'Contoh',start:'2026-10-22',end:'2026-01-01',body:'Kontrak'}).some(f=>f.message.includes('lebih awal')));assert.equal(reviewDraft({name:'Contoh',start:'2026-01-01',end:'2026-12-31',body:'Kontrak kerja'}).length,0);
});
test('Classification is explicitly filename/description based and unknown material remains reviewable',()=>{
 assert.equal(classifyDocument('KTP_nando.png','').category,'KTP');assert.equal(classifyDocument('scan.png','kartu keluarga').category,'Kartu Keluarga');assert.equal(classifyDocument('cv-hadist.png','').category,'CV');assert.equal(classifyDocument('contract.png','').category,'Kontrak');assert.equal(classifyDocument('scan.png','').category,'Perlu review');
});

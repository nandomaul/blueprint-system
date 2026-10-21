import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {PDFDocument} from 'pdf-lib';
import {fixture} from './managementFixture.ts';
import {prototypeFiles,exportBytes} from '../src/services/projectExport.ts';
import {storedZip,crc32} from '../src/services/zip.ts';
import {importProject} from '../src/domain/model.ts';
test('Exports preserve JSON, valid ZIP CRC/images and functioning UI navigation across device layouts',async()=>{
 const p=fixture(),files=prototypeFiles(p),decode=(name:string)=>new TextDecoder().decode(files.find(f=>f.path===name)!.bytes);const json=importProject(decode('blueprint.json'));assert.equal(json.designLayer!.bindings[0].elementId,'go');assert.ok(files.some(f=>f.path.startsWith('assets/')));
 const dom=new JSDOM(decode('ui/index.html'),{runScripts:'outside-only',url:'https://example.test/ui/index.html',pretendToBeVisual:true});try{dom.window.eval(decode('ui/app.js'));const d=dom.window.document;assert.ok(d.querySelector('#page button img'));assert.equal(d.querySelectorAll('#page table tr').length,2);d.querySelector<HTMLButtonElement>('#page button')!.click();assert.equal(d.querySelector<HTMLSelectElement>('#pages')!.value,p.nodes[1].id);const select=d.querySelector<HTMLSelectElement>('#device')!;select.value='mobile';select.dispatchEvent(new dom.window.Event('change'));assert.equal(d.querySelector<HTMLElement>('#page')!.style.width,'390px');const pages=d.querySelector<HTMLSelectElement>('#pages')!;pages.value=p.nodes[0].id;pages.dispatchEvent(new dom.window.Event('change'));assert.ok(d.querySelector('#page button img'));}finally{dom.window.close();}
 const zip=await exportBytes([p],'zip');assert.equal(new DataView(zip.bytes.buffer).getUint32(0,true),0x04034b50);assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);assert.throws(()=>storedZip([{path:'../bad',bytes:new Uint8Array()}]));await mkdir('tmp/map010',{recursive:true});await writeFile('tmp/map010/export.zip',zip.bytes);const multi=await exportBytes([p,{...p,id:'other',title:'Other'}],'json');await writeFile('tmp/map010/bulk.zip',multi.bytes);
});
test('PDF slides are landscape, one per ordered page with editable JSON attached',async()=>{const p=fixture(),result=await exportBytes([p],'pdf'),pdf=await PDFDocument.load(result.bytes);assert.equal(pdf.getPageCount(),p.presentation.length);assert.deepEqual(pdf.getPage(0).getSize(),{width:1600,height:900});assert.ok(pdf.catalog.has((await import('pdf-lib')).PDFName.of('Names')));await writeFile('tmp/map010/slides.pdf',result.bytes);});

test('Full-page upload takes visual priority in PDF/ZIP while System UI button targets remain clickable',async()=>{
 const p=fixture(),{assignDesign,visualDesign}=await import('../src/domain/designLayer.ts'),full=assignDesign(p,p.nodes[0].id,null,'a1'),visual=visualDesign(full,full.nodes[0]);assert.equal(visual.elements.length,1);assert.equal(visual.elements[0].width,full.nodes[0].design!.width);assert.equal(full.nodes[0].design!.elements[0].target,p.nodes[1].id);
 const files=prototypeFiles(full),decode=(name:string)=>new TextDecoder().decode(files.find(f=>f.path===name)!.bytes),dom=new JSDOM(decode('ui/index.html'),{url:'https://example.test/ui/index.html',runScripts:'outside-only'});try{dom.window.eval(decode('ui/app.js'));const doc=dom.window.document;assert.equal(doc.querySelectorAll('#page>img').length,1);assert.equal(doc.querySelectorAll('#page button img').length,0);doc.querySelector<HTMLButtonElement>('#page button')!.click();assert.equal(doc.querySelector<HTMLSelectElement>('#pages')!.value,p.nodes[1].id);}finally{dom.window.close();}assert.equal((await PDFDocument.load((await exportBytes([full],'pdf')).bytes)).getPageCount(),2);
});

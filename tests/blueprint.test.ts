import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { seedProject } from '../src/domain/seed.ts';
import { addEdge, attachAsset, beginRun, exportProject, followEdge, importProject, removeNode, updateNode, validateProject } from '../src/domain/model.ts';
import type { Asset } from '../src/domain/model.ts';
import { createRepository } from '../src/services/localRepository.ts';

test('jalur demo berjalan sampai arsip dan mencatat hasil klik',()=>{
  const p=seedProject();let run=beginRun(p);
  for(const id of ['e2','e4','e5','e6','e7','e8','e9'])run=followEdge(p,run,id);
  assert.equal(run.nodeId,'archive');assert.equal(run.logs.length,7);assert.equal(run.history.length,8);
  assert.match(run.logs.at(-1)?.message??'',/belum menjalankan Lark/);
});
test('jalur login dan demo memakai koneksi yang berbeda',()=>{
  const p=seedProject(),start=beginRun(p);const login=followEdge(p,start,'e1');assert.equal(login.nodeId,'login');
  assert.throws(()=>followEdge(p,login,'e2'),/Aksi tidak tersedia/);assert.equal(followEdge(p,login,'e3').nodeId,'dashboard');
});
test('penggantian visual, judul, dan posisi menjaga ID serta koneksi',()=>{
  const p=seedProject(),changed=updateNode(p,'people',{title:'Direktori personel',icon:'grid',x:300,y:400});
  assert.equal(changed.edges.find(e=>e.id==='e5')?.target,'people');assert.equal(beginRun(changed,'people').nodeId,'people');assert.equal(changed.nodes.find(n=>n.id==='people')?.title,'Direktori personel');
});
test('menghapus node membersihkan koneksi, gambar dan urutan presentasi',()=>{
  const p=seedProject(),changed=removeNode(p,'draft');assert.equal(changed.nodes.some(n=>n.id==='draft'),false);assert.equal(changed.edges.some(e=>e.source==='draft'||e.target==='draft'),false);assert.equal(changed.presentation.includes('draft'),false);validateProject(changed);
});
test('ID ganda, koneksi hilang, URL berbahaya dan posisi tidak valid ditolak',()=>{
  const p=seedProject();
  assert.throws(()=>validateProject({...p,nodes:[...p.nodes,p.nodes[0]]}));
  assert.throws(()=>validateProject({...p,edges:[...p.edges,{...p.edges[0],id:'bad',target:'missing'}]}));
  assert.throws(()=>updateNode(p,'welcome',{externalUrl:'javascript:alert(1)'}));
  assert.throws(()=>updateNode(p,'welcome',{x:Infinity}));assert.throws(()=>addEdge(p,'welcome','welcome','Loop'));
});
const asset:Asset={id:'asset-v1',nodeId:'welcome',name:'mockup.png',mime:'image/png',size:68,data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',version:1,createdAt:'2026-10-15T00:00:00Z'};
test('upload versi baru menjaga gambar lama dan ekspor-impor mempertahankan gambar',()=>{
  let p=attachAsset(seedProject(),asset);p=attachAsset(p,{...asset,id:'asset-v2',version:2});
  assert.equal(p.assets.length,2);assert.equal(p.nodes.find(n=>n.id==='welcome')?.activeAssetId,'asset-v2');
  const restored=importProject(exportProject(p));assert.deepEqual(restored,p);assert.equal(restored.assets[0].data,asset.data);
  const removed=removeNode(p,'welcome');assert.equal(removed.assets.length,0);
});
test('impor rusak, file terlalu besar, gambar salah pemilik dan MIME ditolak',()=>{
  assert.throws(()=>importProject('{'));assert.throws(()=>importProject(JSON.stringify({format:'other',version:1,project:seedProject()})));
  assert.throws(()=>attachAsset(seedProject(),{...asset,nodeId:'missing'}));assert.throws(()=>attachAsset(seedProject(),{...asset,mime:'image/jpeg'}));
  assert.throws(()=>importProject(' '.repeat(35*1024*1024+1)),/maksimal 35 MB/);
});
test('node terakhir tidak bisa dihapus dan presentasi tetap memiliki langkah',()=>{
  let p=seedProject();for(const n of p.nodes.slice(1))p=removeNode(p,n.id);
  assert.equal(p.nodes.length,1);assert.equal(p.presentation.length,1);assert.throws(()=>removeNode(p,p.nodes[0].id));
});
test('IndexedDB menyimpan proyek/gambar dan checkpoint bertahan saat koneksi dibuka ulang',async()=>{
  const factory=new IDBFactory(),repo=createRepository(factory,'persist-test');assert.equal(await repo.load(),null);
  const p=attachAsset(seedProject(),asset),first=await repo.save(p,null,'Awal');
  const changed=updateNode(p,'welcome',{title:'Welcome versi baru'});const second=await repo.save(changed,first.token,'Revisi');
  await repo.close();const reopened=createRepository(factory,'persist-test');
  const current=await reopened.load();assert.equal(current?.token,second.token);assert.equal(current?.project.nodes[0].title,'Welcome versi baru');
  const history=await reopened.history();assert.equal(history.length,2);assert.equal(history.find(v=>v.id===first.version.id)?.project.nodes[0].title,'Welcome');assert.equal(history.find(v=>v.id===first.version.id)?.project.assets[0].data,asset.data);
  await reopened.close();
});
test('konflik tab lama dibatalkan tanpa menambah checkpoint',async()=>{
  const factory=new IDBFactory(),a=createRepository(factory,'conflict-test'),b=createRepository(factory,'conflict-test');
  const first=await a.save(seedProject(),null,'Awal');const stale=await b.load();assert.equal(stale?.token,first.token);
  await a.save(updateNode(first.version.project,'welcome',{title:'Perubahan A'}),first.token,'Tab A');
  await assert.rejects(()=>b.save(seedProject(),stale?.token??null,'Tab B'),/tab lain/);
  assert.equal((await a.history()).length,2);assert.equal((await b.load())?.project.nodes[0].title,'Perubahan A');await a.close();await b.close();
});
test('data invalid tidak mengubah simpanan yang sudah valid',async()=>{
  const repo=createRepository(new IDBFactory(),'invalid-test');const p=seedProject(),saved=await repo.save(p,null,'Valid');
  const bad={...p,edges:[{...p.edges[0],target:'invalid'}]};await assert.rejects(()=>repo.save(bad,saved.token,'Invalid'));
  assert.equal((await repo.history()).length,1);assert.equal((await repo.load())?.token,saved.token);await repo.close();
});
test('checkpoint lama bisa dipulihkan sebagai versi baru tanpa membuang riwayat',async()=>{
  const repo=createRepository(new IDBFactory(),'restore-test');const p=seedProject();const first=await repo.save(p,null,'Versi 1');
  const second=await repo.save(updateNode(p,'welcome',{title:'Versi 2'}),first.token,'Versi 2');await repo.save(first.version.project,second.token,'Pulihkan versi 1');
  assert.equal((await repo.history()).length,3);assert.equal((await repo.load())?.project.nodes[0].title,'Welcome');await repo.close();
});
test('History rename, Trash, untrash dan restore menjaga snapshot dan penulis',async()=>{
  const repo=createRepository(new IDBFactory(),'history-v2');
  const first=await repo.save(seedProject(),null,'Rancangan Ryan','ryan');
  await repo.rename(first.version.id,'Login yang disepakati');
  await repo.trash(first.version.id);
  let v=(await repo.history())[0];assert.ok(v.deletedAt);assert.equal(v.label,'Login yang disepakati');assert.equal(v.profile,'ryan');assert.deepEqual(v.project,first.version.project);
  await assert.rejects(()=>repo.restore(first.version.id,first.token,'hadist'),/Trash/);
  await repo.untrash(first.version.id);
  const restored=await repo.restore(first.version.id,first.token,'hadist');
  assert.equal(restored.version.profile,'hadist');assert.notEqual(restored.version.id,first.version.id);assert.equal(restored.version.deletedAt,null);
  assert.equal((await repo.history()).length,2);assert.equal((await repo.load())?.token,restored.token);
  await assert.rejects(()=>repo.restore(first.version.id,first.token,'nando'),/tab lain/);
  assert.equal((await repo.history()).length,2);v=(await repo.history()).find(x=>x.id===first.version.id)!;assert.equal(v.profile,'ryan');await repo.close();
});
test('referensi desain baru tidak mengubah visual atau gambar aktif node',async()=>{
  const {appendReference,VersionSchema}=await import('../src/domain/model.ts');
  const p=seedProject(),changed=appendReference(p,{...asset,profile:'hadist'});
  assert.deepEqual(changed.nodes,p.nodes);assert.equal(changed.assets[0].profile,'hadist');
  const legacy=VersionSchema.parse({id:'legacy',label:'Lama',savedAt:'2026-10-15',project:p});
  assert.equal(legacy.profile,null);assert.equal(legacy.deletedAt,null);
});

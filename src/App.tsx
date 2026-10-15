import { useEffect, useRef, useState } from 'react';
import { addEdge, appendReference, beginRun, errorMessage, exportProject, followEdge, importProject, removeNode, revision, profiles, ProfileSchema, updateNode, validateProject } from './domain/model.ts';
import type { Project, ProfileId, RunState, Version } from './domain/model.ts';
import { seedProject } from './domain/seed.ts';
import { createRepository } from './services/localRepository.ts';
import { downloadText, readImage } from './services/images.ts';
import { Icon } from './components/Icon.tsx';
import { Canvas } from './components/Canvas.tsx';
import { Inspector } from './components/Inspector.tsx';
import { ScreenPreview } from './components/ScreenPreview.tsx';
import { Overlay } from './components/Overlay.tsx';
import type { Repository } from './services/repository.ts';
import { connectClient, createSupabaseRepository, readCloudConfig, storeCloudConfig } from './services/supabaseRepository.ts';
import type { CloudConfig } from './services/supabaseRepository.ts';
import { History } from './components/History.tsx';
import { Settings } from './components/Settings.tsx';
import { DesignStudio } from './components/DesignStudio.tsx';
import { PresentationOrder } from './components/PresentationOrder.tsx';

type Page='map'|'screens'|'assets'|'versions'|'integrations';
function preference(key:string) { try { return localStorage.getItem('blueprint-ui-'+key); } catch { return null; } }
function remember(key:string,value:string) { try { localStorage.setItem('blueprint-ui-'+key,value); } catch { /* Preferensi tidak menghalangi editor. */ } }
export function App() {
  const [project,setProject]=useState<Project>(seedProject),model=useRef(project);model.current=project;
  const [selectedId,setSelectedId]=useState('welcome'),[page,setPage]=useState<Page>('map');
  const [dirty,setDirty]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [versions,setVersions]=useState<Version[]>([]),[run,setRun]=useState<RunState|null>(null),[present,setPresent]=useState<number|null>(null),[device,setDevice]=useState<'desktop'|'mobile'>('desktop');
  const [settingsWorking,setSettingsWorking]=useState(false);
  const [settings,setSettings]=useState(false),[design,setDesign]=useState(false),[saveDialog,setSaveDialog]=useState(false),[saveName,setSaveName]=useState('');
  const [opened,setOpened]=useState<Version|null>(null),[snapshotNode,setSnapshotNode]=useState('');
  const [profile,setProfile]=useState<ProfileId>(()=>ProfileSchema.safeParse(preference('profile')).data??'nando');
  const [railHidden,setRailHidden]=useState(()=>preference('rail')==='hidden'),[inspectorHidden,setInspectorHidden]=useState(()=>preference('inspector')==='hidden');
  const [cloud,setCloud]=useState<CloudConfig|null>(readCloudConfig),[connected,setConnected]=useState(false);
  const repository=useRef<Repository|null>(null),savedToken=useRef<string|null>(null),taskLock=useRef(false),importInput=useRef<HTMLInputElement>(null);
  const node=project.nodes.find(n=>n.id===selectedId)??project.nodes[0];
  useEffect(()=>{
    let alive=true; let active:Repository|null=null;
    void (async()=>{
      const local=createRepository(window.indexedDB);active=local;
      try {
        let [record,history]=await Promise.all([local.load(),local.history()]);
        const config=readCloudConfig();
        if(config) {
          try {
            const client=await connectClient(config.url,config.key), remote=createSupabaseRepository(client,config.workspaceId);
            const [remoteRecord,remoteHistory]=await Promise.all([remote.load(),remote.history()]);
            await local.close();active=remote;
            if(remoteRecord)record=remoteRecord;else if(alive)setDirty(true);
            history=remoteHistory;
            if(alive)setConnected(true);
            // Data IndexedDB sebelumnya tetap utuh; workspace kosong menunggu Simpan versi.
            if(!remoteRecord)record=record?{...record,token:''}:null;
          } catch(e) { if(alive)setError('Supabase belum dapat dihubungkan: '+errorMessage(e)+' Simpanan perangkat tetap tersedia melalui Settings.'); }
        }
        if(!alive)return;
        repository.current=active;
        if(record){model.current=record.project;setProject(record.project);setSelectedId(record.project.presentation[0]);savedToken.current=record.token||null;}
        setVersions(history);
      }catch(e){if(alive)setError(errorMessage(e)+' Gunakan Ekspor JSON sebagai cadangan.');}
      finally{if(alive)setLoading(false);else void active?.close();}
    })();
    return()=>{alive=false;void active?.close();};
  },[]);
  useEffect(()=>{const listener=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();}};window.addEventListener('beforeunload',listener);return()=>window.removeEventListener('beforeunload',listener);},[dirty]);
  function change(work:(current:Project)=>Project):boolean {try{const next=work(model.current);model.current=next;setProject(next);setDirty(true);setError('');return true;}catch(e){setError(errorMessage(e));return false;}}
  async function task(work:()=>Promise<void>) {if(taskLock.current)return;taskLock.current=true;setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(errorMessage(e));}finally{taskLock.current=false;setBusy(false);}}
  function save() {void task(async()=>{
    const repo=repository.current;if(!repo)throw new Error('Penyimpanan tidak tersedia. Gunakan Ekspor JSON.');
    const snapshot=model.current,result=await repo.save(snapshot,savedToken.current,saveName.trim(),profile);
    savedToken.current=result.token;setVersions(current=>[result.version,...current]);setDirty(model.current!==snapshot);setSaveDialog(false);
    setNotice(repo.kind==='supabase'?'Versi dan gambar tersimpan di Supabase.':'Versi tersimpan di browser ini. Hubungkan Supabase di Settings untuk berbagi dengan tim.');
  });}
  async function activate(repo:Repository,config:CloudConfig|null) {
    if(taskLock.current)throw new Error('Tunggu proses yang berjalan selesai.');
    taskLock.current=true;setBusy(true);
    try {
      const [record,history]=await Promise.all([repo.load(),repo.history()]);
      if(record) {
        if(!confirm('Buka peta workspace ini? Peta yang sedang tampil akan diekspor sebagai cadangan terlebih dahulu.'))throw new Error('Perpindahan workspace dibatalkan.');
        downloadText('blueprint-sebelum-pindah-workspace.json',exportProject(model.current));
      }
      storeCloudConfig(config);
      if(record){model.current=record.project;setProject(record.project);setSelectedId(record.project.presentation[0]);setDirty(false);}else setDirty(true);
      await repository.current?.close();repository.current=repo;savedToken.current=record?.token??null;
      setCloud(config);setConnected(repo.kind==='supabase');setVersions(history);setError('');
      setNotice(record?'Workspace dibuka.':'Workspace kosong. Klik Simpan versi untuk mengirim peta yang sedang tampil.');
    }catch(e){await repo.close();throw e;}finally{taskLock.current=false;setBusy(false);}
  }
  async function activateCloud(config:CloudConfig,repo:Repository){await activate(repo,config);}
  function toggleRail(){setRailHidden(v=>{remember('rail',v?'shown':'hidden');return !v;});}
  function toggleInspector(){setInspectorHidden(v=>{remember('inspector',v?'shown':'hidden');return !v;});}
  function chooseProfile(id:ProfileId){setProfile(id);remember('profile',id);}
  function versionAction(work:(repo:Repository)=>Promise<void>,message:string){void task(async()=>{const repo=repository.current;if(!repo)throw new Error('Penyimpanan belum siap.');await work(repo);setVersions(await repo.history());setNotice(message);});}
  function select(id:string) {setSelectedId(id);setNotice('');}
  function addNode() {const id=crypto.randomUUID();if(change(p=>validateProject({...p,nodes:[...p.nodes,{id,title:'Layar baru',subtitle:'Tentukan tujuan langkah',icon:'file',type:'screen',x:200+p.nodes.length*22,y:740,route:'/app/new',purpose:'Jelaskan kebutuhan pengguna di langkah ini.',output:'Tentukan hasil yang ingin dicapai.',integration:'',integrationStatus:'none',owner:'Tim proyek',externalUrl:'',activeAssetId:null}],presentation:[...p.presentation,id],updatedAt:new Date().toISOString()}))){select(id);setPage('map');}}
  function remove() {if(!confirm(`Hapus node “${node.title}” beserta koneksi dan gambar terkait?`))return;if(change(p=>removeNode(p,node.id)))setSelectedId(model.current.nodes[0].id);}
  function upload(file:File,ownerId=node.id) {const actor=profile;void task(async()=>{const version=Math.max(0,...model.current.assets.filter(a=>a.nodeId===ownerId).map(a=>a.version))+1;const asset=await readImage(file,ownerId,version);if(change(p=>appendReference(p,{...asset,profile:actor})))setNotice(`Referensi versi ${version} ditambahkan. Klik Simpan versi untuk menyimpan proyek.`);});}
  function importFile(file:File) {void task(async()=>{if(file.size>35*1024*1024)throw new Error('File impor maksimal 35 MB.');const imported=importProject(await file.text());if(dirty&&!confirm('Ada perubahan belum disimpan. Ganti peta dengan file impor?'))return;change(()=>imported);setSelectedId(imported.presentation[0]);setPage('map');setNotice('Proyek diimpor. Klik Simpan versi untuk menjadikannya checkpoint.');});}
  function exportFile() {try{downloadText('personnel-blueprint.json',exportProject(model.current));setNotice('Ekspor JSON dimulai, termasuk gambar dan koneksi proyek.');}catch(e){setError(errorMessage(e));}}
  function restore(version:Version) {
    if(!confirm(`Restore “${version.label}” sebagai peta aktif? ${dirty?'Ada perubahan belum disimpan; batalkan dan simpan/ekspor dulu jika ingin mempertahankannya. ':''}Checkpoint baru akan dibuat, riwayat lama tetap tersedia.`))return;
    setOpened(null);void task(async()=>{const repo=repository.current;if(!repo)throw new Error('Penyimpanan belum siap.');const result=await repo.restore(version.id,savedToken.current,profile);savedToken.current=result.token;model.current=result.version.project;setProject(result.version.project);setSelectedId(result.version.project.presentation[0]);setDirty(false);setVersions(await repo.history());setPage('map');setNotice('Versi dipulihkan sebagai peta aktif dan checkpoint baru dibuat.');});
  }
  function navigateRun(edgeId:string) {if(!run)return;try{setRun(followEdge(project,run,edgeId));}catch(e){setError(errorMessage(e));}}
  const nav:[Page,Parameters<typeof Icon>[0]['name'],string][]=[['map','map','Peta alur'],['screens','layers','Layar'],['assets','image','Gambar'],['versions','history','History'],['integrations','link','Integrasi']];
  const runNode=run?project.nodes.find(n=>n.id===run.nodeId):null;
  const presentNode=present!==null?project.nodes.find(n=>n.id===project.presentation[present]):null;
  const viewedNode=opened?(opened.project.nodes.find(n=>n.id===snapshotNode)??opened.project.nodes[0]):null;
  return <div className={`app-shell ${railHidden?'rail-hidden':''}`}>
  {railHidden?<button className="edge-handle rail-handle" title="Buka panel menu" aria-label="Buka panel menu" onClick={toggleRail}><span/></button>:<aside className="icon-rail"><button className="rail-item rail-hide" aria-label="Sembunyikan panel menu" title="Sembunyikan panel menu" onClick={toggleRail}><Icon name="hide" size={19}/></button><nav aria-label="Navigasi workspace">{nav.map(([key,icon,label])=><button key={key} title={label} aria-label={label} aria-current={page===key?'page':undefined} className={page===key?'rail-item active':'rail-item'} onClick={()=>setPage(key)}><Icon name={icon} size={21}/></button>)}</nav><div className="rail-bottom"><button className="profile-avatar" title={`Profil ${profiles.find(p=>p.id===profile)?.name}`} aria-label="Ganti profil" onClick={()=>setSettings(true)}>{profile[0].toUpperCase()}</button><button className="rail-item" title="Settings" aria-label="Settings" onClick={()=>setSettings(true)}><Icon name="settings"/></button></div></aside>}
  <div className="workspace"><main inert={busy||settingsWorking||undefined}><section className="page-heading"><div><div className="eyebrow">PERSONNEL MANAGEMENT SYSTEM</div><h1>{page==='map'?'Design the journey.':page==='screens'?'Screen library.':page==='assets'?'Visual versions.':page==='versions'?'Project checkpoints.':'Connected by design.'}</h1><p>{page==='map'?'Hubungkan layar, jelaskan keputusan, dan coba alurnya.':page==='screens'?'Satu daftar layar, siap menerima arah visual Hadist.':page==='assets'?'Referensi visual tetap tersimpan bersama node dan versinya.':page==='versions'?'Simpan keputusan hari ini. Buka kembali saat presentasi.':'Lihat tujuan integrasi dan bedakan rencana dari koneksi nyata.'}</p></div><div className="heading-actions"><button className="button outline" onClick={()=>setPresent(0)}><Icon name="play" size={14}/>Presentasi</button><button className="button outline" disabled={busy||loading} onClick={()=>setPage('versions')}><Icon name="history" size={14}/>History</button><button className="button black" disabled={busy||loading} onClick={()=>{setSaveName(`Checkpoint ${versions.length+1}`);setSaveDialog(true);}}><Icon name="save" size={14}/>{busy?'Memproses…':'Simpan versi'}</button></div></section>
  <section className="project-strip"><div className="project-name"><span className="project-monogram">P</span><div><strong>{project.title}</strong><small>{dirty?'Ada perubahan belum disimpan':versions.length?'Versi tersimpan':'Contoh awal · belum disimpan'}<span> · {revision}</span></small></div></div><div className="project-stats"><span><strong>{project.nodes.length}</strong> LAYAR</span><span><strong>{project.edges.length}</strong> KONEKSI</span><span><strong>{project.assets.length}</strong> GAMBAR</span></div><div className="project-tools"><button className="text-button" onClick={exportFile}><Icon name="download" size={13}/>Ekspor</button><button className="text-button" disabled={busy||loading} onClick={()=>importInput.current?.click()}><Icon name="upload" size={13}/>Impor</button><input hidden type="file" accept="application/json,.json" ref={importInput} onChange={e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value='';}}/></div></section>
  {error&&<div className="alert error" role="alert">{error}<button aria-label="Tutup pesan error" onClick={()=>setError('')}><Icon name="close" size={14}/></button></div>}{notice&&<div className="alert" role="status">{notice}<button aria-label="Tutup pesan" onClick={()=>setNotice('')}><Icon name="close" size={14}/></button></div>}
  {loading?<div className="loading-panel">Menyiapkan workspace…</div>:page==='map'?<div className={`map-workbench ${inspectorHidden?'inspector-hidden':''}`}><section className="map-panel"><div className="map-toolbar"><div className="panel-tab"><Icon name="map" size={15}/>Peta pengalaman<span>V.01</span></div><div><button className="text-button" onClick={()=>setDesign(true)}><Icon name="image" size={14}/>Edit design</button><button className="text-button" onClick={addNode}><Icon name="plus" size={14}/>Node</button><button className="button small black" onClick={()=>setRun(beginRun(project))}><Icon name="play" size={12}/>Uji alur</button></div></div><Canvas project={project} selectedId={node.id} onSelect={select} onMove={(id,x,y)=>change(p=>updateNode(p,id,{x,y}))}/><div className="canvas-footer"><span><i/>RANCANGAN INTERAKTIF</span><span>Preview adalah simulasi · integrasi belum aktif</span></div></section>{inspectorHidden&&<button className="edge-handle inspector-handle" title="Buka detail node" aria-label="Buka detail node" onClick={toggleInspector}><span/></button>}<div hidden={inspectorHidden}><Inspector key={node.id} project={project} node={node} onApply={patch=>change(p=>updateNode(p,node.id,patch))} onConnect={(target,label)=>change(p=>addEdge(p,node.id,target,label))} onRemoveEdge={id=>change(p=>validateProject({...p,edges:p.edges.filter(e=>e.id!==id),updatedAt:new Date().toISOString()}))} onDelete={remove} onUpload={upload} onAsset={()=>setDesign(true)} onHide={toggleInspector} onTest={()=>setRun(beginRun(project,node.id))}/></div></div>
  :page==='screens'?<><PresentationOrder project={project} onChange={ids=>change(p=>validateProject({...p,presentation:ids,updatedAt:new Date().toISOString()}))}/><section className="screen-library">{project.nodes.map(n=><article className="screen-card" key={n.id}><button className="screen-thumb" onClick={()=>setRun(beginRun(project,n.id))} aria-label={`Preview ${n.title}`}><ScreenPreview project={project} node={n} compact/></button><div className="screen-card-meta"><span><strong>{n.title}</strong><small>{n.route}</small></span><button className="icon-button" title="Edit node" aria-label={`Edit ${n.title}`} onClick={()=>{select(n.id);setPage('map');}}><Icon name="arrow" size={17}/></button></div></article>)}</section></>
  :page==='assets'?<section className="asset-library">{project.assets.length?project.assets.map(asset=><article className="asset-card" key={asset.id}><img src={asset.data} alt={asset.name}/><div><span className="pill">VERSI {asset.version}</span><h3>{project.nodes.find(n=>n.id===asset.nodeId)?.title}</h3><p>{asset.name}</p><button className="text-button" onClick={()=>{select(asset.nodeId);setPage('map');}}>Buka node <Icon name="arrow" size={13}/></button></div></article>):<div className="large-empty"><Icon name="image" size={36}/><h2>Ruang untuk visual berikutnya.</h2><p>Pilih node pada Peta alur, buka tab Gambar, lalu upload versi desain Hadist.</p><button className="button outline" onClick={()=>setPage('map')}>Buka peta</button></div>}</section>
  :page==='versions'?<History versions={versions} busy={busy} onOpen={v=>{setOpened(v);setSnapshotNode(v.project.presentation[0]);}} onRestore={restore} onRename={(id,label)=>versionAction(repo=>repo.rename(id,label),'Nama versi diperbarui.')} onTrash={id=>versionAction(repo=>repo.trash(id),'Versi dipindahkan ke Trash.')} onUntrash={id=>versionAction(repo=>repo.untrash(id),'Versi dikembalikan ke History.')}/>

  :<section className="integration-library"><article className="integration-card"><div className="integration-symbol">S</div><span className="pill">{connected?'TERHUBUNG':'SIAP DIKONFIGURASI'}</span><h2>Supabase</h2><p>Workspace tim untuk versi peta dan referensi desain bersama.</p><button className="button outline" onClick={()=>setSettings(true)}>Buka Settings</button><small>Profil N/H/R tanpa password. Sesi dan undangan menentukan akses workspace. File gambar tersimpan privat.</small></article>{[['Feishu People','MASTER DATA','Sumber data karyawan melalui sinkronisasi API. Belum mengakses tenant.'],['Lark Base / Workflow','OPERASIONAL HR','Target pengelolaan status dan workflow HR. Tetap arah sistem yang telah dipilih.']].map(([title,label,description])=><article className="integration-card" key={title}><div className="integration-symbol"><Icon name="link" size={23}/></div><span className="pill">RENCANA</span><h2>{title}</h2><span className="eyebrow">{label}</span><p>{description}</p><small>Supabase pada workspace perancangan tidak mengganti keputusan sumber master dan workflow HR.</small></article>)}</section>}
  <footer><span>PROJECT BLUEPRINT</span><span>Rancangan → Preview → Presentasi <b>{revision}</b></span></footer></main></div>
  {run&&runNode&&<Overlay title="Uji alur · simulasi interaksi" wide onClose={()=>setRun(null)}><div className="test-layout"><div className="test-stage"><div className="test-controls"><span className="pill">DATA CONTOH</span><div className="segmented"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>Desktop</button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}>Mobile</button></div></div><div className={`device-frame ${device}`}><ScreenPreview project={project} node={runNode} onAction={navigateRun}/></div><div className="test-navigation"><button className="text-button" disabled={run.history.length<2} onClick={()=>setRun(current=>current?{...current,nodeId:current.history[current.history.length-2],history:current.history.slice(0,-1)}:null)}>← Kembali</button><button className="text-button" onClick={()=>setRun(beginRun(project))}>Ulangi dari awal</button></div></div><aside className="test-info"><span className="eyebrow">LANGKAH {run.history.length}</span><h2>{runNode.title}</h2><div className="info-section"><span>TUJUAN</span><p>{runNode.purpose}</p></div><div className="info-section"><span>OUTPUT</span><p>{runNode.output}</p></div><div className="info-section"><span>INTEGRASI</span><p>{runNode.integration||'Tidak memakai integrasi'}<small>{runNode.integrationStatus==='planned'?'Rencana · belum terhubung':runNode.integrationStatus==='simulated'?'Simulasi':'—'}</small></p></div><div className="simulation-note">Tombol mengikuti koneksi peta. Login, data HR, persetujuan, dan integrasi pada preview ini adalah simulasi.</div><div className="run-logs"><span className="eyebrow">HASIL KLIK</span>{run.logs.length?run.logs.slice(-4).map(log=><p key={log.id}>{log.message}</p>):<p>Klik tombol di preview untuk mencoba perpindahan.</p>}</div></aside></div></Overlay>}
  {present!==null&&presentNode&&<Overlay title="Presentasi blueprint · hanya lihat" wide fullscreen onClose={()=>setPresent(null)}><div className="presentation-layout"><aside className="presentation-story"><span className="eyebrow">THE PERSONNEL JOURNEY</span><div className="presentation-step">{String(present+1).padStart(2,'0')}<span>/ {String(project.presentation.length).padStart(2,'0')}</span></div><h2>{presentNode.title}</h2><p>{presentNode.purpose}</p><div className="presentation-outcome"><span>HASIL YANG DITUJU</span><p>{presentNode.output}</p></div>{presentNode.integration&&<div className="presentation-integration">{presentNode.integration}<small>{presentNode.integrationStatus==='planned'?'RENCANA · BELUM TERHUBUNG':'SIMULASI'}</small></div>}</aside><div className="presentation-screen"><ScreenPreview project={project} node={presentNode} compact/></div></div><div className="presentation-bottom"><div className="step-dots">{project.presentation.map((id,index)=><button key={`${id}-${index}`} className={index===present?'active':''} onClick={()=>setPresent(index)} aria-label={`Langkah ${index+1}: ${project.nodes.find(n=>n.id===id)?.title}`}/>)}</div><div><button className="button outline" disabled={present===0} onClick={()=>setPresent(Math.max(0,present-1))}>Sebelumnya</button><button className="button black" onClick={()=>present===project.presentation.length-1?setPresent(null):setPresent(present+1)}>{present===project.presentation.length-1?'Selesai':'Berikutnya'}<Icon name="arrow" size={14}/></button></div></div></Overlay>}
  {saveDialog&&<Overlay title="Simpan versi" onClose={()=>{if(!busy)setSaveDialog(false);}}><form className="save-dialog" onSubmit={e=>{e.preventDefault();save();}}><label>Nama versi<input required maxLength={100} value={saveName} onChange={e=>setSaveName(e.target.value)}/></label><p className="help-text">Dicatat sebagai {profiles.find(p=>p.id===profile)?.name}. Peta, koneksi, urutan presentasi dan referensi gambar ikut disimpan.</p>{error&&<p className="inline-error" role="alert">{error}</p>}<button className="button black" disabled={busy||!saveName.trim()}>{busy?'Menyimpan…':'Simpan versi'}</button></form></Overlay>}
  {settings&&<Overlay title="Settings · profil & workspace" onClose={()=>{if(!busy&&!settingsWorking)setSettings(false);}}><Settings onBusyChange={setSettingsWorking} profile={profile} onProfile={chooseProfile} config={cloud} connected={connected} onConnect={activateCloud} onDevice={()=>activate(createRepository(window.indexedDB),null)}/></Overlay>}
  {design&&<Overlay title="Referensi desain · gambar tidak mengubah visual aplikasi" wide onClose={()=>{if(!busy)setDesign(false);}}>{error&&<p className="inline-error modal-message" role="alert">{error}</p>}{notice&&<p className="help-text modal-message" role="status">{notice}</p>}<DesignStudio project={project} initialNode={node.id} busy={busy} onUpload={upload}/></Overlay>}
  {opened&&viewedNode&&<Overlay title={`Snapshot · ${opened.label}`} wide onClose={()=>setOpened(null)}><div className="snapshot-preview"><div><span className="eyebrow">HANYA LIHAT</span><h2>{opened.label}</h2><label>Layar<select value={viewedNode.id} onChange={e=>setSnapshotNode(e.target.value)}>{opened.project.nodes.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></label><p>{viewedNode.purpose}</p><p className="help-text">{viewedNode.output}</p><span className="pill">{opened.project.assets.length} referensi gambar</span><div className="snapshot-images">{opened.project.assets.filter(a=>a.nodeId===viewedNode.id).map(a=><figure key={a.id}><img src={a.data} alt={a.name}/><figcaption>{a.name} · V{a.version}</figcaption></figure>)}</div><button className="button black" onClick={()=>restore(opened)}>Restore versi ini</button></div><ScreenPreview project={opened.project} node={viewedNode} compact/></div></Overlay>}
  </div>;
}

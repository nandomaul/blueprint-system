import {CatalogSchema,emptyCatalog,defaultProjectSettings} from '../domain/catalog.ts';
import type {Catalog} from '../domain/catalog.ts';
import {mergeProjects} from '../domain/merge.ts';
import {validateProject,VersionSchema} from '../domain/model.ts';
import type {DocumentRecord,DraftRecord,WorkspaceRepository} from './workspace.ts';
export function createLocalWorkspace(factory:IDBFactory,name='adfriends-blueprint-v1'):WorkspaceRepository & {journal:(key:string,value:DraftRecord|null)=>Promise<void>;draft:(key:string)=>Promise<DraftRecord|null>} {
  let pending:Promise<IDBDatabase>|null=null;
  const channel=typeof window!=='undefined'&&typeof BroadcastChannel!=='undefined'?new BroadcastChannel(name+'-003'):null;
  function db():Promise<IDBDatabase>{
    if(!pending)pending=new Promise((resolve,reject)=>{
      const request=factory.open(name+'-003',1);
      request.onupgradeneeded=()=>{
        const database=request.result;
        database.createObjectStore('documents',{keyPath:'id'});database.createObjectStore('documentVersions',{keyPath:'id'});database.createObjectStore('drafts',{keyPath:'key'});database.createObjectStore('meta',{keyPath:'key'});
      };
      request.onsuccess=()=>{const database=request.result;database.onversionchange=()=>{database.close();pending=null;};void migrateLegacy(database).then(()=>recoverHistoryDocuments(database)).then(()=>resolve(database)).catch(e=>{database.close();pending=null;reject(e);});};
      request.onerror=()=>{pending=null;reject(request.error);};request.onblocked=()=>reject(new Error('Tutup tab Blueprint versi lama, lalu muat ulang. Data tetap disimpan.'));
    });return pending;
  }
  async function migrateLegacy(database:IDBDatabase){
    const migrated=await new Promise<boolean>((resolve,reject)=>{const r=database.transaction('meta','readonly').objectStore('meta').get('legacy-import');r.onsuccess=()=>resolve(Boolean(r.result));r.onerror=()=>reject(r.error);});if(migrated)return;
    // Read the old database without increasing its version: source rollback remains usable.
    const legacy=await new Promise<IDBDatabase>((resolve,reject)=>{const r=factory.open(name);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('projects'))r.result.createObjectStore('projects',{keyPath:'key'});if(!r.result.objectStoreNames.contains('versions'))r.result.createObjectStore('versions',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    let active:{token:string;project:unknown}|undefined,versions:unknown[]=[];
    try{await new Promise<void>((resolve,reject)=>{const tx=legacy.transaction(['projects','versions'],'readonly'),a=tx.objectStore('projects').get('active'),v=tx.objectStore('versions').getAll();a.onsuccess=()=>{active=a.result as typeof active;};v.onsuccess=()=>{versions=v.result as unknown[];};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{legacy.close();}
    const project=active?validateProject(active.project):null,history=versions.map(v=>VersionSchema.parse(v));
    await new Promise<void>((resolve,reject)=>{const tx=database.transaction(['documents','documentVersions','meta'],'readwrite'),meta=tx.objectStore('meta'),check=meta.get('legacy-import');check.onsuccess=()=>{if(check.result)return;if(project)tx.objectStore('documents').put({id:project.id,token:active!.token,project});for(const v of history)tx.objectStore('documentVersions').put(v);meta.put({key:'legacy-import',done:true});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  }
  async function recoverHistoryDocuments(database:IDBDatabase){
    await new Promise<void>((resolve,reject)=>{const tx=database.transaction(['documents','documentVersions','meta'],'readwrite'),meta=tx.objectStore('meta'),check=meta.get('archives-import-004');check.onsuccess=()=>{if(check.result)return;const request=tx.objectStore('documentVersions').getAll();request.onsuccess=()=>{const rows=(request.result as unknown[]).map(v=>VersionSchema.parse(v)).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)),seen=new Set<string>();for(const v of rows){if(seen.has(v.project.id))continue;seen.add(v.project.id);const store=tx.objectStore('documents'),existing=store.get(v.project.id);existing.onsuccess=()=>{if(!existing.result)store.put({id:v.project.id,token:crypto.randomUUID(),project:v.project});};}meta.put({key:'archives-import-004',done:true});};};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error??new Error('Pemulihan riwayat perangkat gagal.'));});
  }
  async function read<T>(store:string,key?:string):Promise<T>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(store,'readonly'),r=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);let value:T;r.onsuccess=()=>{value=r.result as T;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);});}
  async function catalog(){const saved=await read<{value:Catalog}|undefined>('meta','catalog-010');return saved?CatalogSchema.parse(saved.value):emptyCatalog();}
  async function editCatalog(edit:(c:Catalog)=>void){const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction(['meta','documents'],'readwrite'),store=tx.objectStore('meta'),get=store.get('catalog-010');let failure:unknown;get.onsuccess=()=>{try{const c=get.result?CatalogSchema.parse(get.result.value):emptyCatalog();edit(c);store.put({key:'catalog-010',value:CatalogSchema.parse(c)});}catch(e){failure=e;tx.abort();}};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(failure??tx.error);});channel?.postMessage('catalog');}
  const api:ReturnType<typeof createLocalWorkspace>={
    kind:'device',scope:'device',
    management:{read:catalog,async updateProfile(id,name,avatar){let result=emptyCatalog().profiles[0];await editCatalog(c=>{const p=c.profiles.find(p=>p.id===id&&!p.deletedAt),value=name.trim();if(!p)throw new Error('Profil tidak ditemukan.');if(!value||value.length>60)throw new Error('Nama profil 1–60 karakter.');if(c.profiles.some(q=>q.id!==id&&q.name.toLowerCase()===value.toLowerCase()))throw new Error('Nama profil sudah ada.');p.name=value;p.avatar=avatar;result=p;});return result;},async cover(id,assetId){return (await api.load(id))?.project.assets.find(a=>a.id===assetId&&!a.deletedAt)?.data;},async profile(action,id,name){let result=emptyCatalog().profiles[0];await editCatalog(c=>{if(action==='create'){const value=name?.trim();if(!value||value.length>60)throw new Error('Nama profil 1–60 karakter.');if(c.profiles.some(p=>!p.deletedAt&&p.name.toLowerCase()===value.toLowerCase()))throw new Error('Nama profil sudah ada.');result={id:'p_'+crypto.randomUUID(),name:value,base:false,deletedAt:null};c.profiles.push(result);}else{const p=c.profiles.find(p=>p.id===id);if(!p)throw new Error('Profil tidak ditemukan.');if(action==='trash'&&!p.deletedAt&&c.profiles.filter(p=>!p.deletedAt).length<=1)throw new Error('Sisakan satu profil aktif');p.deletedAt=action==='trash'?new Date().toISOString():null;result=p;}});return result;},async projects(action,ids,value,passcode){if(!ids.length)throw new Error('Pilih proyek.');if(action==='trash'&&passcode!=='systemdelete')throw new Error('Passcode tidak sesuai.');const records=await Promise.all(ids.map(id=>api.load(id)));if(records.some(r=>!r))throw new Error('Proyek tidak ditemukan.');if(action==='rename'){if(ids.length!==1||!value?.trim())throw new Error('Nama proyek diperlukan.');const r=records[0]!;await api.write({...r.project,title:value.trim().slice(0,100),updatedAt:new Date().toISOString()},r.token,'nando');return;}await editCatalog(c=>{for(const id of new Set(ids)){let s=c.projects.find(p=>p.id===id);if(!s){s=defaultProjectSettings(id);c.projects.push(s);}if(action==='trash')s.trashedAt=new Date().toISOString();if(action==='restore')s.trashedAt=null;if(action==='pin')s.pinned=true;if(action==='unpin')s.pinned=false;if(action==='shortcut')s.shortcut=true;if(action==='hideShortcut')s.shortcut=false;if(action==='cover'){if(value&&!records.find(r=>r!.id===id)!.project.assets.some(a=>a.id===value&&!a.deletedAt))throw new Error('Cover tidak ditemukan.');s.coverAssetId=value??null;}}});}},
    async list(){const rows=await read<DocumentRecord[]>('documents'),c=await catalog();return rows.map(r=>({id:r.id,title:r.project.title,updatedAt:r.project.updatedAt,pages:r.project.nodes.length,preview:r.project.nodes[0].design,cover:r.project.assets.find(a=>a.id===c.projects.find(v=>v.id===r.id)?.coverAssetId&&!a.deletedAt)?.data})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));},
    async load(id){const r=await read<DocumentRecord|undefined>('documents',id);return r?{...r,project:validateProject(r.project)}:null;},
    async write(project,expectedToken,profile,label,baseProject){
      const p=validateProject(project),database=await db();if((await catalog()).projects.some(s=>s.id===p.id&&s.trashedAt))throw new Error('Proyek berada di Trash. Pulihkan dahulu.');
      const result=await new Promise<DocumentRecord>((resolve,reject)=>{
        const tx=database.transaction(['documents','documentVersions'],'readwrite'),store=tx.objectStore('documents'),r=store.get(p.id);let failure:unknown,result:DocumentRecord;
        r.onsuccess=()=>{try{
          const old=r.result as DocumentRecord|undefined;let saved=p;if((old?.token??null)!==expectedToken){if(!old||!baseProject)throw new Error('CONFLICT: Rancangan berubah di tab lain.');saved=mergeProjects(baseProject,p,old.project);}
          result={id:p.id,token:crypto.randomUUID(),project:saved};store.put(result);
          if(label!==undefined)tx.objectStore('documentVersions').put(VersionSchema.parse({id:crypto.randomUUID(),label,project:saved,profile,savedAt:new Date().toISOString(),deletedAt:null}));
        }catch(e){failure=e;tx.abort();}};
        tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(failure??tx.error??new Error('Simpan gagal.'));
      });channel?.postMessage(project.id);return result;
    },
    async history(id){return (await read<unknown[]>('documentVersions')).map(v=>VersionSchema.parse(v)).filter(v=>v.project.id===id).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));},
    async version(id,action,label){const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction('documentVersions','readwrite'),store=tx.objectStore('documentVersions'),r=store.get(id);let failure:unknown;r.onsuccess=()=>{try{const v=VersionSchema.parse(r.result);store.put(VersionSchema.parse({...v,label:action==='rename'?label:v.label,deletedAt:action==='trash'?v.deletedAt??new Date().toISOString():action==='untrash'?null:v.deletedAt}));}catch(e){failure=e;tx.abort();}};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(failure??tx.error);});channel?.postMessage(id);},
    watch(changed,status){status('device');const listener=()=>changed();channel?.addEventListener('message',listener);return()=>channel?.removeEventListener('message',listener);},
    async journal(key,value){const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction('drafts','readwrite'),store=tx.objectStore('drafts');if(value)store.put(value);else store.delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});},
    async draft(key){const r=await read<DraftRecord|undefined>('drafts',key);return r?{...r,project:validateProject(r.project)}:null;},
    async close(){channel?.close();if(pending)(await pending).close();pending=null;},
  };return api;
}

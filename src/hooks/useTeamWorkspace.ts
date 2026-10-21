import {useCallback,useEffect,useRef,useState} from 'react';
import {CatalogSchema,emptyCatalog} from '../domain/catalog.ts';
import type {Catalog,ProfileAction,ProjectAction} from '../domain/catalog.ts';
import {errorMessage,validateProject,ProfileSchema,setProfileCatalog} from '../domain/model.ts';
import type {Project,ProfileId,Version} from '../domain/model.ts';
import {upgradeDesign} from '../domain/designer.ts';
import {mergeProjects,sameProject} from '../domain/merge.ts';
import {createLocalWorkspace} from '../services/localWorkspace.ts';
import {Autosaver} from '../services/autosave.ts';
import type {SaveState} from '../services/autosave.ts';
import {readCloudConfig,storeCloudConfig} from '../services/supabaseRepository.ts';
import {openOrCreateTemplate} from '../services/projectTemplates.ts';
import {ownAccount} from '../services/accounts.ts';
import {enterTeam,resumeIdentity,passwordLogin} from '../services/teamSession.ts';
import type {TeamSession} from '../services/teamSession.ts';
import type {DocumentRecord,DocumentSummary,DraftRecord,WorkspaceRepository,SyncStatus} from '../services/workspace.ts';
export function useTeamWorkspace(initialRepository?:WorkspaceRepository){
 const running=useRef(false),saveError=useRef('');
 const [catalog,setCatalog]=useState<Catalog>(emptyCatalog);
 const [project,setProject]=useState<Project|null>(null),model=useRef<Project|null>(null),[documents,setDocuments]=useState<DocumentSummary[]>([]),[localDocuments,setLocalDocuments]=useState<DocumentSummary[]>([]),[versions,setVersions]=useState<Version[]>([]),[team,setTeam]=useState<TeamSession|null>(null),[ready,setReady]=useState(Boolean(initialRepository)),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[saveState,setSaveState]=useState<SaveState>('saved'),[sync,setSync]=useState<SyncStatus>('connecting');
 const [profile,setProfile]=useState<ProfileId>(()=>{try{const p=localStorage.getItem('blueprint-profile');return ProfileSchema.safeParse(p).success?p as ProfileId:'nando';}catch{return 'nando';}}),actor=useRef(profile);
 const local=useRef<ReturnType<typeof createLocalWorkspace>|null>(null),repo=useRef<WorkspaceRepository|null>(initialRepository??null),saver=useRef<Autosaver|null>(null),undo=useRef<Project[]>([]),redo=useRef<Project[]>([]),[undoCount,setUndoCount]=useState(0),[redoCount,setRedoCount]=useState(0),unsubscribe=useRef(()=>{}),refreshing=useRef(false),refreshAgain=useRef(false),alive=useRef(true),historyWatching=useRef(false);
 function show(p:Project){model.current=p;setProject(p);}
 function clearUndo(){undo.current=[];redo.current=[];setUndoCount(0);setRedoCount(0);}
 function chooseProfile(p:ProfileId){if(team?.account&&team.account.profile_id!==p)return;actor.current=p;setProfile(p);try{localStorage.setItem('blueprint-profile',p);}catch{/* Label preference only. */}}
 async function perform(fn:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(errorMessage(e));}finally{running.current=false;if(alive.current)setBusy(false);}}
 function applyCatalog(c:Catalog){setCatalog(c);setProfileCatalog(c.profiles);if(!c.profiles.some(p=>p.id===actor.current&&!p.deletedAt))chooseProfile(c.profiles.find(p=>!p.deletedAt)?.id??'nando');}
 async function readCatalog(r:WorkspaceRepository){const c=r.management?CatalogSchema.parse(await r.management.read()):emptyCatalog();if(r===repo.current&&alive.current)applyCatalog(c);return c;}
 async function enrich(rows:DocumentSummary[],r:WorkspaceRepository,c:Catalog){return Promise.all(rows.map(async row=>{const id=c.projects.find(s=>s.id===row.id)?.coverAssetId;return id&&r.management?.cover?{...row,cover:await r.management.cover(row.id,id)}:row;}));}
 const refresh=useCallback(async():Promise<void>=>{
  if(!repo.current)return;
  if(refreshing.current){refreshAgain.current=true;return;}
  refreshing.current=true;const r=repo.current,isCurrent=()=>alive.current&&r===repo.current;
  try{
   // The open canvas updates before slower thumbnail/catalog/history requests.
   const a=saver.current;
   if(a&&!a.saving){
    const current=await r.load(a.value.id);
    if(!isCurrent())return;
    if(current&&saver.current===a&&!a.saving&&current.token!==a.savedToken){
     const accepted=await a.acceptRemote({...current,project:upgradeDesign(current.project)});
     if(accepted){clearUndo();setNotice('Perubahan tim diterima.');}
    }
   }
   const [rows,c]=await Promise.all([r.list(),readCatalog(r)]),enriched=await enrich(rows,r,c);
   if(!isCurrent())return;setDocuments(enriched);
   if(a&&a===saver.current){
    if(c.projects.some(s=>s.id===a.value.id&&s.trashedAt)){setError('Proyek dipindahkan ke Trash. Download draft bila ada perubahan.');return;}
    if(historyWatching.current){const history=await r.history(a.value.id);if(isCurrent()&&saver.current===a)setVersions(history);}
    // Retry pending writes after focus/reconnect as well as on the next edit.
    if(isCurrent()&&saver.current===a&&!a.saving&&a.dirty&&!a.hasConflict)await a.flush();
   }
  }catch(e){if(isCurrent())setError('Sinkronisasi belum berhasil: '+errorMessage(e));}
  finally{refreshing.current=false;if(refreshAgain.current&&alive.current){refreshAgain.current=false;void refresh();}}
 },[]);
 async function loadRecord(record:DocumentRecord){
  await saver.current?.stop();const repository=repo.current!,journal=local.current!,base=validateProject(record.project),p=upgradeDesign(base),key=repository.scope+'/'+p.id;
  let draft:DraftRecord|null|undefined;try{draft=await journal.draft(key);}catch(e){if(repository.kind!=='supabase')throw e;}
  show(p);clearUndo();setError('');saveError.current='';setSaveState('saved');setVersions([]);
  const a:Autosaver=new Autosaver(repository,base,record.token,()=>actor.current,value=>journal.journal(key,value),(state,e)=>{if(alive.current&&saver.current===a){setSaveState(state);if(e){saveError.current=e.message;setError(e.message);}else if(state==='saved'&&saveError.current){const previous=saveError.current;setError(value=>value===previous||value==='Sinkronisasi belum berhasil: '+previous?'':value);saveError.current='';}}},r=>{if(alive.current&&saver.current===a){if(model.current&&!sameProject(model.current,r.project)){clearUndo();show(r.project);}setDocuments(rows=>rows.some(d=>d.id===r.id)?rows.map(d=>d.id===r.id?{...d,title:r.project.title,updatedAt:r.project.updatedAt,pages:r.project.nodes.length,preview:r.project.nodes[0].design}:d):[...rows,{id:r.id,title:r.project.title,updatedAt:r.project.updatedAt,pages:r.project.nodes.length,preview:r.project.nodes[0].design}]);}},500);
  saver.current=a;
  if(draft){let recovered=upgradeDesign(draft.project);try{if(draft.baseToken!==record.token){if(!draft.baseProject)throw new Error('CONFLICT: Draft lama belum terkirim, versi tim sudah berubah.');recovered=mergeProjects(draft.baseProject,recovered,p);}show(recovered);a.edit(recovered);setNotice('Draft perangkat yang belum terkirim dipulihkan.');}catch(e){show(recovered);a.edit(recovered);a.markConflict(errorMessage(e));}}
  else if(!sameProject(base,p))a.edit(p);
 }
 async function activate(repository:WorkspaceRepository,session:TeamSession|null){const rows=await repository.list(),catalog=await readCatalog(repository),enriched=await enrich(rows,repository,catalog);await saver.current?.flush();await saver.current?.stop();saver.current=null;model.current=null;setProject(null);unsubscribe.current();const old=repo.current;repo.current=repository;applyCatalog(catalog);setTeam(session);setDocuments(enriched);setReady(true);setSaveState('saved');clearUndo();unsubscribe.current=repository.watch(()=>void refresh(),setSync);if(old&&old!==repository&&old!==local.current)await old.close();}
 useEffect(()=>{alive.current=true;const device=createLocalWorkspace(window.indexedDB);local.current=device;let canceled=false;
  void device.list().then(rows=>{if(!canceled)setLocalDocuments(rows);}).catch(()=>{/* Optional legacy recovery must not block cloud access. */});
  void(async()=>{try{if(initialRepository)await activate(initialRepository,null);else{const identity=await resumeIdentity();if(identity&&!canceled){if(identity.account)chooseProfile(identity.account.profile_id);await activate(identity.repository,identity);}}}catch(e){if(!canceled){setError(errorMessage(e));setReady(false);}}finally{if(!canceled)setLoading(false);}})();
  const before=(event:BeforeUnloadEvent)=>{if(saver.current?.dirty){event.preventDefault();event.returnValue='';}};const hide=()=>{void saver.current?.persistDraft().catch(()=>{});};window.addEventListener('beforeunload',before);window.addEventListener('pagehide',hide);
  return()=>{canceled=true;alive.current=false;unsubscribe.current();const a=saver.current,r=repo.current;void(async()=>{await a?.stop();if(r&&r!==device)await r.close();await device.close();})().catch(()=>{});window.removeEventListener('beforeunload',before);window.removeEventListener('pagehide',hide);};
 },[]);
 async function login(loginName:string,password:string){await perform(async()=>{await saver.current?.flush();const identity=await passwordLogin(loginName,password);if(identity.account){actor.current=identity.account.profile_id;setProfile(identity.account.profile_id);}await activate(identity.repository,identity);});}
 async function accountChanged(){if(!team)return;const auth=await team.client.auth.getUser();if(auth.error||!auth.data.user)throw new Error('Sesi perlu dimuat ulang.');const account=await ownAccount(team.client,auth.data.user.id);if(account){actor.current=account.profile_id;setProfile(account.profile_id);setTeam({...team,account,needsPassword:false});}await refresh();}
 async function logout(){await saver.current?.flush();if(team){const result=await team.client.auth.signOut({scope:'local'});if(result.error)throw result.error;}await leave();setError('');}
 async function deviceProject(id:string){const record=await local.current!.load(id);if(!record)throw new Error('Proyek perangkat tidak ditemukan.');const draft=await local.current!.draft('device/'+id);return upgradeDesign(draft?.project??record.project);}
 async function connect(mode:'create'|'join'|'shared',value:string,copy:boolean,newProfile?:string){let connected=false;await perform(async()=>{await saver.current?.flush();const previous=readCloudConfig();let session:TeamSession|undefined;try{session=await enterTeam(mode,value);if(newProfile?.trim()){if(!session.repository.management)throw new Error('Database profil belum siap.');const p=await session.repository.management.profile('create',null,newProfile);chooseProfile(p.id);}if(copy&&(await session.repository.list()).length===0){for(const row of localDocuments){const p=await deviceProject(row.id);await session.repository.write(p,null,actor.current,'Dipulihkan dari perangkat');}}await activate(session.repository,session);connected=true;setNotice(mode==='create'?'Ruang tim siap. Bagikan undangan untuk laptop lain.':'Berhasil bergabung. Proyek tim yang sama sudah tersedia.');}catch(e){storeCloudConfig(previous);await session?.repository.close();throw e;}});return connected;}
 async function open(id:string){if(catalog.projects.some(s=>s.id===id&&s.trashedAt))throw new Error('Pulihkan proyek dari Trash dahulu.');await saver.current?.flush();const r=await repo.current!.load(id);if(!r)throw new Error('Proyek tidak ditemukan di ruang ini.');await loadRecord(r);}
 async function home(){await saver.current?.flush();await saver.current?.stop();saver.current=null;model.current=null;setProject(null);const r=repo.current!,c=await readCatalog(r);setDocuments(await enrich(await r.list(),r,c));clearUndo();}
 function change(input:Project,history=true){try{const p=validateProject({...input,updatedAt:new Date().toISOString()});if(history&&model.current){undo.current=[...undo.current.slice(-29),model.current];redo.current=[];setUndoCount(undo.current.length);setRedoCount(0);}show(p);saver.current?.edit(p);}catch(e){setError(errorMessage(e));}}
 function navigateUndo(back:boolean){const source=back?undo.current:redo.current,target=back?redo.current:undo.current,p=source.pop();if(!p||!model.current)return;target.push(model.current);change(p,false);setUndoCount(undo.current.length);setRedoCount(redo.current.length);}
 async function create(p:Project){await saver.current?.flush();const r=await repo.current!.write(p,null,actor.current);await loadRecord(r);}
 async function openTemplate(p:Project,label:string){
  await saver.current?.flush();const repository=repo.current;if(!repository)throw new Error('Hubungkan ruang tim terlebih dahulu.');
  const {record,created}=await openOrCreateTemplate(repository,p,actor.current,label);
  await loadRecord(record);return created;
 }
 async function history(){if(model.current)setVersions(await repo.current!.history(model.current.id));}
 async function checkpoint(label:string){await saver.current?.checkpoint(label);await history();}
 async function version(id:string,action:'rename'|'trash'|'untrash',label?:string){await repo.current!.version(id,action,label);await history();}
 async function restore(v:Version){await saver.current?.flush();change(upgradeDesign(v.project));await saver.current?.checkpoint(('Restore - '+v.label).slice(0,100));await history();}
 async function recover(id:string){const p=await deviceProject(id);await create({...p,id:crypto.randomUUID(),title:(p.title+' - dipulihkan').slice(0,100)});}
 async function discard(){const a=saver.current;if(!a)return;const r=await repo.current!.load(a.value.id);if(!r)throw new Error('Proyek tim belum dapat dimuat.');await a.stop();saver.current=null;await local.current!.journal(repo.current!.scope+'/'+r.id,null);await loadRecord(r);}
 async function leave(){await saver.current?.flush();await saver.current?.stop();saver.current=null;unsubscribe.current();await repo.current?.close();repo.current=null;setProject(null);model.current=null;storeCloudConfig(null);setTeam(null);setReady(false);}
 async function manageProfile(action:ProfileAction,id:string|null,name?:string){const r=repo.current;if(!r?.management)throw new Error('Database MAP-010 diperlukan.');const p=await r.management.profile(action,id,name);await readCatalog(r);return p;}
 async function updateProfile(id:ProfileId,name:string,avatar:string|null){const r=repo.current;if(!r?.management?.updateProfile)throw new Error('SQL MAP-012 diperlukan.');await r.management.updateProfile(id,name,avatar);await readCatalog(r);}
 async function manageProjects(action:ProjectAction,ids:string[],value?:string|null,passcode?:string){const r=repo.current;if(!r?.management)throw new Error('Database MAP-010 diperlukan.');await saver.current?.flush();await r.management.projects(action,ids,value,passcode,actor.current);await refresh();}
 async function mutateDocument(id:string,edit:(p:Project)=>Project){await saver.current?.flush();const r=repo.current;if(!r)throw new Error('Ruang belum terhubung.');const before=await r.load(id);if(!before)throw new Error('Proyek tidak ditemukan.');const next=validateProject({...edit(upgradeDesign(before.project)),updatedAt:new Date().toISOString()}),saved=await r.write(next,before.token,actor.current,undefined,before.project);if(model.current?.id===id)await loadRecord(saved);await refresh();}
 async function readDocument(id:string){await saver.current?.flush();const result=await repo.current?.load(id);if(!result)throw new Error('Proyek tidak ditemukan.');return upgradeDesign(result.project);}
 return {login,logout,accountChanged,catalog,repository:repo.current,updateProfile,manageProfile,manageProjects,readDocument,mutateDocument,project,model,documents,localDocuments,versions,team,ready,loading,busy,error,notice,saveState,sync,profile,undoCount,redoCount,chooseProfile,perform,connect,open,home,change,create,openTemplate,history,checkpoint,version,restore,recover,discard,leave,undo:()=>navigateUndo(true),redo:()=>navigateUndo(false),retry:()=>saver.current?.flush(),setError,setNotice,local,historyWatching,deviceProject};
}

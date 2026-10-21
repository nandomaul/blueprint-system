import {mergeProjects,sameProject} from '../domain/merge.ts';
import type {Project,ProfileId} from '../domain/model.ts';
import type {DraftRecord,WorkspaceRepository,DocumentRecord} from './workspace.ts';
export type SaveState='saved'|'editing'|'saving'|'error'|'conflict';
export class Autosaver {
  private current:Project; private persisted:Project; private token:string|null;
  private timer:ReturnType<typeof setTimeout>|undefined; private running:Promise<void>|null=null;
  private error:Error|null=null; private stopped=false; private state:SaveState='saved';private journalWork:Promise<void>=Promise.resolve();
  private repo:WorkspaceRepository;private profile:()=>ProfileId;private journal:(value:DraftRecord|null)=>Promise<void>;private onState:(state:SaveState,error?:Error)=>void;private onSaved:(r:DocumentRecord)=>void;private delay:number;
  constructor(repo:WorkspaceRepository,project:Project,token:string|null,profile:()=>ProfileId,journal:(value:DraftRecord|null)=>Promise<void>,onState:(state:SaveState,error?:Error)=>void,onSaved:(r:DocumentRecord)=>void,delay=700){this.repo=repo;this.profile=profile;this.journal=journal;this.onState=onState;this.onSaved=onSaved;this.delay=delay;this.current=project;this.persisted=project;this.token=token;}
  get dirty(){return !sameProject(this.current,this.persisted);}
  get saving(){return this.running!==null;}
  get value(){return this.current;}
  get savedToken(){return this.token;}
  get base(){return this.persisted;}
  get hasConflict(){return this.state==='conflict';}
  private notify(state:SaveState,error?:Error){this.state=state;this.onState(state,error);}
  private keep(value:DraftRecord|null){this.journalWork=this.journalWork.catch(()=>{}).then(()=>this.journal(value));return this.journalWork;}
  async persistDraft(){if(this.dirty)await this.keep({key:this.repo.scope+'/'+this.current.id,baseToken:this.token,project:this.current,baseProject:this.persisted});}
  edit(project:Project){if(this.stopped)return;this.current=project;void this.persistDraft().catch(e=>this.notify('error',e instanceof Error?e:new Error(String(e))));if(this.state!=='conflict'){this.error=null;this.notify('editing');}clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.flush().catch(()=>{});},this.delay);}
  async flush():Promise<void>{
    clearTimeout(this.timer);
    if(this.running){await this.running;if(this.dirty)return this.flush();return;}
    if(!this.dirty)return;
    if(this.state==='conflict')throw this.error??new Error('Konflik belum diselesaikan.');
    this.running=this.drain();try{await this.running;}finally{this.running=null;}
  }
  private async drain(){
    while(this.dirty&&!this.stopped){
      const snapshot=this.current;this.notify('saving');
      try{
        await this.keep({key:this.repo.scope+'/'+snapshot.id,baseToken:this.token,project:snapshot,baseProject:this.persisted});
        const r=await this.repo.write(snapshot,this.token,this.profile(),undefined,this.persisted);const value=mergeProjects(snapshot,this.current,r.project);this.token=r.token;this.persisted=r.project;this.current=value;this.onSaved({...r,project:value});
        // Keep the newest edit recoverable if it arrived while the previous write was in flight.
        await this.keep(this.dirty?{key:this.repo.scope+'/'+snapshot.id,baseToken:this.token,project:this.current,baseProject:this.persisted}:null);
        this.error=null;this.notify(this.dirty?'editing':'saved');
      }catch(e){this.error=e instanceof Error?e:new Error(String(e));this.notify(/CONFLICT|berubah di tab|40001/i.test(this.error.message)?'conflict':'error',this.error);throw this.error;}
    }
  }
  async checkpoint(label:string){await this.flush();const r=await this.repo.write(this.current,this.token,this.profile(),label,this.persisted);this.token=r.token;this.persisted=r.project;this.current=r.project;this.onSaved(r);return r;}
  async acceptRemote(r:DocumentRecord){if(this.running)return false;try{const value=mergeProjects(this.persisted,this.current,r.project);this.persisted=r.project;this.current=value;this.token=r.token;this.onSaved({...r,project:value});if(this.dirty){await this.persistDraft();this.notify('editing');clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.flush().catch(()=>{});},this.delay);}else this.notify('saved');return true;}catch(e){this.markConflict(e instanceof Error?e.message:undefined);return false;}}
  markConflict(message='CONFLICT: Anggota lain menyimpan perubahan. Download rancangan ini sebelum memuat versi tim.'){this.error=new Error(message);clearTimeout(this.timer);this.notify('conflict',this.error);}
  async stop(){clearTimeout(this.timer);if(this.running)await this.running.catch(()=>{});if(this.dirty)await this.keep({key:this.repo.scope+'/'+this.current.id,baseToken:this.token,project:this.current,baseProject:this.persisted});this.stopped=true;}
}

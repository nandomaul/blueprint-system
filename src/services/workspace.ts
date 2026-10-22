import type {ChatDraft,ChatPage,ChatMessage} from '../domain/chat.ts';
import type {PresenceRepository} from '../domain/presence.ts';
import type {Catalog,ProjectAction,ProfileAction,EditorProfile} from '../domain/catalog.ts';
import type { ProfileId, Project, Version, PageDesign } from '../domain/model.ts';
export type DocumentRecord={id:string;token:string;project:Project};
export type DocumentSummary={id:string;title:string;updatedAt:string;pages?:number;preview?:PageDesign;cover?:string};
export type DraftRecord={key:string;baseToken:string|null;project:Project;baseProject?:Project};
export type SyncStatus='connecting'|'live'|'reconnecting'|'device';
export interface ChatRepository {action?:(profile:ProfileId,action:'remind'|'unremind'|'delete'|'readReminders',id?:string,ids?:string[])=>Promise<ChatMessage|null>;page:(profile:ProfileId,before?:string,mode?:'chat'|'reminders')=>Promise<ChatPage>;send:(profile:ProfileId,draft:ChatDraft)=>Promise<string>;read:(profile:ProfileId,lastId:string)=>Promise<string>;watch:(changed:()=>void)=>()=>void;}
export interface WorkspaceRepository {
 presence?:PresenceRepository;
 chat?:ChatRepository;
  kind:'device'|'supabase';scope:string;
  management?:{updateProfile?:(id:ProfileId,name:string,avatar:string|null)=>Promise<EditorProfile>;cover?:(projectId:string,assetId:string)=>Promise<string|undefined>;read:()=>Promise<Catalog>;profile:(action:ProfileAction,id:string|null,name?:string)=>Promise<EditorProfile>;projects:(action:ProjectAction,ids:string[],value?:string|null,passcode?:string,profile?:ProfileId)=>Promise<void>};
  list():Promise<DocumentSummary[]>;
  load(id:string):Promise<DocumentRecord|null>;
  write(project:Project,expectedToken:string|null,profile:ProfileId,label?:string,baseProject?:Project):Promise<DocumentRecord>;
  history(id:string):Promise<Version[]>;
  version(id:string,action:'rename'|'trash'|'untrash',label?:string):Promise<void>;
  watch(changed:()=>void,status:(s:SyncStatus)=>void):()=>void;
  close():Promise<void>;
}

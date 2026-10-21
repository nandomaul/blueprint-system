import type {ProfileId,Project} from '../domain/model.ts';
import type {WorkspaceRepository} from './workspace.ts';

export async function openOrCreateTemplate(repository:WorkspaceRepository,project:Project,profile:ProfileId,label:string){
 const existing=await repository.load(project.id);
 if(existing)return {record:existing,created:false};
 try{return {record:await repository.write(project,null,profile,label),created:true};}catch(error){
  // Another member may have won the insert, or the acknowledgement was lost.
  const saved=await repository.load(project.id);
  if(saved)return {record:saved,created:false};
  throw error;
 }
}

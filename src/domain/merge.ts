import {validateProject} from './model.ts';
import type {Project} from './model.ts';
export type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
const equal=(a:Json|undefined,b:Json|undefined):boolean=>{
 if(a===b)return true;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
 if(object(a)&&object(b)){const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>equal(a[k],b[k]));}return false;
};
const object=(v:Json|undefined):v is {[key:string]:Json}=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export class MergeConflict extends Error{constructor(path:string){super('CONFLICT: Bagian yang sama diubah bersamaan: '+path+'. Draft tetap disimpan.');this.name='MergeConflict';}}
function ids(value:Json[]):string[]|null{const result=value.map(v=>object(v)&&typeof v.id==='string'?v.id:null);return result.every((v):v is string=>v!==null)&&new Set(result).size===result.length?result:null;}
export function mergeJson(base:Json|undefined,local:Json|undefined,remote:Json|undefined,path='project'):Json|undefined{
 if(equal(local,base))return remote;if(equal(remote,base)||equal(local,remote))return local;
 if(path==='project.updatedAt'&&typeof local==='string'&&typeof remote==='string')return local>remote?local:remote;
 if(object(local)&&object(remote)&&(object(base)||base===undefined)){
  const b=object(base)?base:{},out:{[key:string]:Json}={};for(const k of new Set([...Object.keys(b),...Object.keys(local),...Object.keys(remote)])){const value=mergeJson(b[k],local[k],remote[k],path+'.'+k);if(value!==undefined)out[k]=value;}return out;
 }
 if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)){
  const bi=ids(base),li=ids(local),ri=ids(remote);
  if(bi&&li&&ri){
   const bm=new Map(bi.map((id,i)=>[id,base[i]])),lm=new Map(li.map((id,i)=>[id,local[i]])),rm=new Map(ri.map((id,i)=>[id,remote[i]]));
   const common=bi.filter(id=>li.includes(id)&&ri.includes(id)),order=(list:string[])=>list.filter(id=>common.includes(id));
   const bo=order(bi),lo=order(li),ro=order(ri);if(!equal(lo,bo)&&!equal(ro,bo)&&!equal(lo,ro))throw new MergeConflict(path+'.layerOrder');
   const chosen=equal(lo,bo)?ri:li,result:Json[]=[];
   for(const id of new Set([...chosen,...ri,...li,...bi])){const value=mergeJson(bm.get(id),lm.get(id),rm.get(id),path+'['+id+']');if(value!==undefined)result.push(value);}return result;
  }
  if(path==='project.presentation'&&[...base,...local,...remote].every(v=>typeof v==='string')){
   const b=base as string[],l=local as string[],r=remote as string[],common=b.filter(id=>l.includes(id)&&r.includes(id)),order=(v:string[])=>v.filter(id=>common.includes(id));
   if(!equal(order(l),order(b))&&!equal(order(r),order(b))&&!equal(order(l),order(r)))throw new MergeConflict(path);
   const chosen=equal(order(l),order(b))?r:l;
   return [...new Set([...chosen,...r,...l])].filter(id=>!b.includes(id)||l.includes(id)&&r.includes(id));
  }
 }
 throw new MergeConflict(path);
}
export const sameProject=(a:Project,b:Project)=>equal(a as unknown as Json,b as unknown as Json);
export function mergeProjects(base:Project,local:Project,remote:Project):Project{const merged=mergeJson(base as unknown as Json,local as unknown as Json,remote as unknown as Json);try{return validateProject(merged);}catch(e){throw new MergeConflict(e instanceof Error?e.message:'relasi proyek');}}

import {z} from 'zod';
import {ProfileSchema} from './model.ts';
export const PresenceSchema=z.object({sessionId:z.string().uuid(),profileId:ProfileSchema,projectId:z.string().max(160).nullable(),nodeId:z.string().max(160).nullable(),projectTitle:z.string().max(200).optional(),nodeTitle:z.string().max(80).optional(),view:z.enum(['home','canvas','flow','assets','brief']),activity:z.enum(['viewing','editing','chat','presenting']),updatedAt:z.string().datetime()});
export type Presence=z.infer<typeof PresenceSchema>;
export type PresenceLocation=Omit<Presence,'sessionId'|'profileId'|'updatedAt'>;
export type PresenceConnection={update:(value:Presence)=>void;close:()=>void};
export interface PresenceRepository {connect:(sessionId:string,changed:(members:Presence[])=>void,status:(error:string)=>void)=>PresenceConnection;}
export function presenceMembers(value:unknown):Presence[]{if(!value||typeof value!=='object')return[];return Object.values(value).flatMap(rows=>Array.isArray(rows)?rows.flatMap(row=>{const r=PresenceSchema.safeParse(row);return r.success?[r.data]:[];}):[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function groupPresence(members:Presence[]){const groups=new Map<string,Presence[]>();for(const p of members){const list=groups.get(p.profileId)??[];list.push(p);groups.set(p.profileId,list);}return [...groups.values()].map(list=>list.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))).sort((a,b)=>a[0].profileId.localeCompare(b[0].profileId));}

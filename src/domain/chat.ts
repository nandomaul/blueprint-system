import {z} from 'zod';
import {ProfileSchema} from './model.ts';
export const ChatTargetSchema=z.object({projectId:z.string().min(1).max(160),projectTitle:z.string().max(200).optional(),nodeId:z.string().max(160).nullable(),nodeTitle:z.string().max(200).nullable().optional(),view:z.enum(['canvas','flow','assets','brief'])}).strict();
export type ChatTarget=z.infer<typeof ChatTargetSchema>;
export const CursorSchema=z.string().regex(/^\d{1,19}$/);
export const ChatMessageSchema=z.object({id:CursorSchema,clientId:z.string().uuid(),profileId:ProfileSchema,authorName:z.string().min(1).max(60),body:z.string().min(1).max(4000),kind:z.enum(['chat','note']),context:ChatTargetSchema.nullable(),mentions:z.array(z.object({id:ProfileSchema,name:z.string().max(60)})).max(12),createdAt:z.string().datetime({offset:true})}).strict();
export type ChatMessage=z.infer<typeof ChatMessageSchema>;
export const ChatPageSchema=z.object({messages:z.array(ChatMessageSchema).max(50),lastRead:CursorSchema,unread:z.number().int().nonnegative(),hasMore:z.boolean()}).strict();
export type ChatPage=z.infer<typeof ChatPageSchema>;
export type ChatDraft={clientId:string;body:string;kind:'chat'|'note';context:ChatTarget|null;mentions:string[]};
export function mergeMessages(old:ChatMessage[],incoming:ChatMessage[]){return [...new Map([...old,...incoming].map(m=>[m.id,m])).values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1);}

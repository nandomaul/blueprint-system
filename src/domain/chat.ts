import {z} from 'zod';
import {AssetSchema,ProfileSchema} from './model.ts';
export const ChatTargetSchema=z.object({projectId:z.string().min(1).max(160),projectTitle:z.string().max(200).optional(),nodeId:z.string().max(160).nullable(),nodeTitle:z.string().max(200).nullable().optional(),view:z.enum(['canvas','flow','assets','brief'])}).strict();
export type ChatTarget=z.infer<typeof ChatTargetSchema>;
export const CursorSchema=z.string().regex(/^\d{1,19}$/);
export const ChatAttachmentSchema=AssetSchema.pick({id:true,name:true,mime:true,size:true}).extend({storagePath:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/),data:z.string().optional()}).strict();
export type ChatAttachment=z.infer<typeof ChatAttachmentSchema>;
export type DraftImage=z.infer<typeof AssetSchema>;
export const ChatMessageSchema=z.object({id:CursorSchema,clientId:z.string().uuid(),profileId:ProfileSchema,authorName:z.string().min(1).max(60),body:z.string().max(4000),kind:z.enum(['chat','note']),context:ChatTargetSchema.nullable(),mentions:z.array(z.object({id:ProfileSchema,name:z.string().max(60)})).max(12),createdAt:z.string().datetime({offset:true}),attachments:z.array(ChatAttachmentSchema).max(3).optional(),replyTo:CursorSchema.nullable().optional(),reply:z.object({id:CursorSchema,authorName:z.string(),body:z.string(),deleted:z.boolean()}).nullable().optional(),deletedAt:z.string().nullable().optional(),canDelete:z.boolean().optional(),reminder:z.object({version:CursorSchema,at:z.string(),profileId:ProfileSchema,authorName:z.string().nullable()}).nullable().optional(),reminderUnread:z.boolean().optional()}).strict();
export type ChatMessage=z.infer<typeof ChatMessageSchema>;
export const ChatPageSchema=z.object({messages:z.array(ChatMessageSchema).max(50),lastRead:CursorSchema,unread:z.number().int().nonnegative(),hasMore:z.boolean(),reminders:z.array(ChatMessageSchema).max(50).optional(),unreadReminders:z.number().int().nonnegative().optional(),hasMoreReminders:z.boolean().optional()}).strict();
export type ChatPage=z.infer<typeof ChatPageSchema>;
export type ChatDraft={clientId:string;body:string;kind:'chat'|'note';context:ChatTarget|null;mentions:string[];attachments?:DraftImage[];replyTo?:string|null};
export function mergeMessages(old:ChatMessage[],incoming:ChatMessage[]){return [...new Map([...old,...incoming].map(m=>[m.id,m])).values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1);}

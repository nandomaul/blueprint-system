import {z} from 'zod';
export const panelIds=['elements','text','uploads','layers','page','properties'] as const;
export type PanelId=typeof panelIds[number];
const panelSchema=z.object({dock:z.enum(['left','right','float']),open:z.boolean(),collapsed:z.boolean(),width:z.number().min(220).max(480),height:z.number().min(180).max(900),x:z.number().min(0).max(10000),y:z.number().min(0).max(10000)}).strict();
export const WorkspaceLayoutSchema=z.object({panels:z.object({elements:panelSchema,text:panelSchema,uploads:panelSchema,layers:panelSchema,page:panelSchema,properties:panelSchema}).strict(),order:z.array(z.enum(panelIds)).length(6).refine(a=>new Set(a).size===6),zen:z.boolean(),stripHeight:z.number().min(48).max(200),stripHidden:z.boolean()}).strict();
export type WorkspaceLayout=z.infer<typeof WorkspaceLayoutSchema>;
export type PanelLayout=WorkspaceLayout['panels'][PanelId];
export const FlowPanelSchema=z.object({dock:z.enum(['left','float']),x:z.number().min(0).max(10000),y:z.number().min(0).max(10000)}).strict();
export type FlowPanelPosition=z.infer<typeof FlowPanelSchema>;
export function readFlowPanel(value:string|null):FlowPanelPosition{try{return FlowPanelSchema.parse(JSON.parse(value??''));}catch{return {dock:'left',x:100,y:16};}}
export const layoutKey='blueprint-editor-layout-v4',resetLayoutEvent='blueprint:reset-layout';
export function defaultWorkspaceLayout():WorkspaceLayout{const p=(dock:PanelLayout['dock'],open=false):PanelLayout=>({dock,open,collapsed:false,width:260,height:440,x:100,y:70});return {panels:{elements:p('left'),text:p('left'),uploads:p('left'),layers:p('left'),page:p('left'),properties:p('left')},order:[...panelIds],zen:false,stripHeight:88,stripHidden:false};}
export function readWorkspaceLayout(value:string|null){try{const layout=WorkspaceLayoutSchema.parse(JSON.parse(value??''));let found=false;for(const id of layout.order){if(layout.panels[id].open){layout.panels[id].open=!found;found=true;}}return layout;}catch{return defaultWorkspaceLayout();}}
export function openPanel(layout:WorkspaceLayout,id:PanelId):WorkspaceLayout{const panel=layout.panels[id];return {...layout,zen:false,panels:Object.fromEntries(panelIds.map(key=>[key,{...layout.panels[key],...(key===id?{open:!panel.open,collapsed:false}:{open:false})}])) as WorkspaceLayout['panels']};}
export function positionPanel(layout:WorkspaceLayout,id:PanelId,changes:Partial<PanelLayout>):WorkspaceLayout{
 const next={...layout.panels[id],...changes};return WorkspaceLayoutSchema.parse({...layout,panels:Object.fromEntries(panelIds.map(key=>[key,key===id?next:{...layout.panels[key],...(next.open?{open:false}:{})}]))});
}
export function resetWorkspaceLayout(){try{localStorage.removeItem(layoutKey);localStorage.removeItem('blueprint-context-toolbar-system');localStorage.removeItem('blueprint-context-toolbar-design');localStorage.removeItem('blueprint-editor-layout-v1');localStorage.removeItem('blueprint-editor-layout-v2');localStorage.removeItem('blueprint-editor-layout-v3');localStorage.removeItem('blueprint-flow-panel-v1');localStorage.removeItem('blueprint-flow-width');}catch{/* Layout settings are optional; document saves are independent. */}window.dispatchEvent(new Event(resetLayoutEvent));}

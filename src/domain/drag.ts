import type {DragEvent} from 'react';
export type DragPoint={x:number;y:number};
export const dragAnchorMime='application/x-blueprint-drag-anchor';
/** Preserve the exact point grabbed, including transformed containers. */
export function draggedPosition(origin:DragPoint,start:DragPoint,cursor:DragPoint,scale:DragPoint={x:1,y:1}){return {x:origin.x+(cursor.x-start.x)/scale.x,y:origin.y+(cursor.y-start.y)/scale.y};}
export function boundedPosition(point:DragPoint,bounds:{width:number;height:number},size:{width:number;height:number}){return {x:Math.max(0,Math.min(Math.max(0,bounds.width-size.width),point.x)),y:Math.max(0,Math.min(Math.max(0,bounds.height-size.height),point.y))};}
export function writeDragAnchor(event:DragEvent,kind:'ratio'|'pixels'='ratio'){
 const r=event.currentTarget.getBoundingClientRect();event.dataTransfer.setData(dragAnchorMime,JSON.stringify({kind,x:kind==='ratio'?(event.clientX-r.left)/Math.max(1,r.width):event.clientX-r.left,y:kind==='ratio'?(event.clientY-r.top)/Math.max(1,r.height):event.clientY-r.top}));
}
export function readDragAnchor(data:Pick<DataTransfer,'getData'>,size:{width:number;height:number},scale=1){try{const p=JSON.parse(data.getData(dragAnchorMime));if(!['ratio','pixels'].includes(p.kind)||!Number.isFinite(p.x)||!Number.isFinite(p.y))return {x:0,y:0};return p.kind==='ratio'?{x:Math.max(0,Math.min(1,p.x))*size.width,y:Math.max(0,Math.min(1,p.y))*size.height}:{x:p.x/scale,y:p.y/scale};}catch{return {x:0,y:0};}}

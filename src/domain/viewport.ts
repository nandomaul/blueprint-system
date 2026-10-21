export type Viewport={x:number;y:number;scale:number};
export function zoomViewport(view:Viewport,nextScale:number,anchor:{x:number;y:number}):Viewport{
 const scale=Math.max(.12,Math.min(1.8,nextScale)),ratio=scale/view.scale;
 return {x:anchor.x-(anchor.x-view.x)*ratio,y:anchor.y-(anchor.y-view.y)*ratio,scale};
}

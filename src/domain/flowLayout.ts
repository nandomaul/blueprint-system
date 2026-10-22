import {FLOW_HEIGHT,FLOW_WIDTH,edgeGeometry} from './flow.ts';
import type {MapNode,Project} from './model.ts';
import type {Obstacle,RoutePoint} from './flowRouting.ts';
export type FlowGeometry=ReturnType<typeof edgeGeometry>;
export function fitFlow(project:Project,width:number,height:number){
 const boxes:Obstacle[]=[...project.nodes.map(n=>({x:n.x,y:n.y,width:FLOW_WIDTH,height:FLOW_HEIGHT})),...(project.flowColumns??[])];
 for(const edge of project.edges)for(const point of edgeGeometry(edge,project.nodes).points)boxes.push({...point,width:0,height:0});
 const minX=Math.min(...boxes.map(b=>b.x)),minY=Math.min(...boxes.map(b=>b.y)),w=Math.max(1,...boxes.map(b=>b.x+b.width-minX)),h=Math.max(1,...boxes.map(b=>b.y+b.height-minY)),paddingX=Math.min(40,width*.08),paddingY=Math.min(52,height*.12),scale=Math.min(1,Math.max(1,width-2*paddingX)/w,Math.max(1,height-2*paddingY)/h);
 return {x:(width-w*scale)/2-minX*scale,y:(height-h*scale)/2-minY*scale,scale};
}
const overlaps=(a:Obstacle,b:Obstacle)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
/** Labels use free space along a connection; narrow gaps retain their accessible title instead. */
export function flowLabels(edges:{id:string;label:string;geometry:FlowGeometry}[],nodes:MapNode[]){
 const occupied:Obstacle[]=nodes.map(n=>({x:n.x-7,y:n.y-7,width:FLOW_WIDTH+14,height:FLOW_HEIGHT+14})),labels=new Map<string,RoutePoint>();
 for(const {id,label,geometry} of edges){const width=Math.min(180,Array.from(label).length*5.4+12),candidates:{point:RoutePoint;length:number}[]=[];
  for(let i=1;i<geometry.points.length;i++){const a=geometry.points[i-1],b=geometry.points[i],horizontal=a.y===b.y,length=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);if(length<32)continue;
   for(const ratio of [.5,.3,.7])for(const offset of [-12,14])candidates.push({point:{x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio+offset},length:horizontal?length:length*.5});
  }
  candidates.sort((a,b)=>b.length-a.length);
  for(const {point} of candidates){const box={x:point.x-width/2,y:point.y-10,width,height:15};if(occupied.some(b=>overlaps(box,b)))continue;labels.set(id,point);occupied.push(box);break;}
 }
 return labels;
}
/** One opaque stroke paints shared trunks once. Hit paths and edge IDs remain separate. */
export function flowNetwork(geometries:FlowGeometry[]){
 const paths=new Set<string>(),arrows=new Map<string,string>();
 for(const geometry of geometries){if(!geometry.path)continue;paths.add(geometry.path);const end=geometry.points.at(-1),previous=geometry.points.at(-2);if(!end||!previous)continue;const dx=Math.sign(end.x-previous.x),dy=Math.sign(end.y-previous.y),key=[end.x,end.y,dx,dy].join('/');arrows.set(key,`M ${end.x-dx*4} ${end.y-dy*4} L ${end.x} ${end.y}`);}
 return {path:[...paths].join(' '),arrows:[...arrows].map(([id,path])=>({id,path}))};
}

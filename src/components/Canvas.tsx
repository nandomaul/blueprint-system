import { useRef, useState } from 'react';
import type { Project } from '../domain/model.ts';
import { Icon } from './Icon.tsx';
const WIDTH=226, HEIGHT=137;
export function Canvas({ project, selectedId, onSelect, onMove }: { project: Project; selectedId: string; onSelect: (id: string) => void; onMove: (id: string,x:number,y:number) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view,setView] = useState({x:30,y:35,scale:.66});
  const [drag,setDrag] = useState<{id:string;dx:number;dy:number;x:number;y:number} | null>(null);
  const gesture=useRef<{kind:'node'|'pan'; id:string;startX:number;startY:number;x:number;y:number;pointerId:number} | null>(null);
  function fit() { const box=viewport.current?.getBoundingClientRect(); if(!box)return; const minX=Math.min(...project.nodes.map(n=>n.x)),minY=Math.min(...project.nodes.map(n=>n.y)),maxX=Math.max(...project.nodes.map(n=>n.x+WIDTH)),maxY=Math.max(...project.nodes.map(n=>n.y+HEIGHT)); const scale=Math.min(1,Math.max(.25,Math.min((box.width-60)/(maxX-minX),(box.height-100)/(maxY-minY)))); setView({x:(box.width-(maxX-minX)*scale)/2-minX*scale,y:30-minY*scale,scale}); }
  function down(event:React.PointerEvent<HTMLDivElement>) {
    if(event.button!==0)return; const element=event.target as Element;
    const nodeElement=element.closest<HTMLElement>('[data-node]'); const id=nodeElement?.dataset.node;
    if(id) { const node=project.nodes.find(n=>n.id===id); if(!node)return; onSelect(id); gesture.current={kind:'node',id,startX:event.clientX,startY:event.clientY,x:node.x,y:node.y,pointerId:event.pointerId}; setDrag({id,dx:0,dy:0,x:node.x,y:node.y}); }
    else if(!element.closest('button')) gesture.current={kind:'pan',id:'',startX:event.clientX,startY:event.clientY,x:view.x,y:view.y,pointerId:event.pointerId};
    if(gesture.current)event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event:React.PointerEvent<HTMLDivElement>) { const g=gesture.current;if(!g)return;const dx=event.clientX-g.startX,dy=event.clientY-g.startY;if(g.kind==='pan')setView(v=>({...v,x:g.x+dx,y:g.y+dy}));else setDrag({id:g.id,dx:dx/view.scale,dy:dy/view.scale,x:g.x,y:g.y}); }
  function up(event:React.PointerEvent<HTMLDivElement>,cancel=false) { const g=gesture.current; if(g?.kind==='node'&&drag&&!cancel&&(Math.abs(drag.dx)>1||Math.abs(drag.dy)>1))onMove(g.id,Math.max(-10000,Math.min(10000,g.x+drag.dx)),Math.max(-10000,Math.min(10000,g.y+drag.dy))); gesture.current=null;setDrag(null);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId); }
  const nodes=project.nodes.map(n=>drag?.id===n.id?{...n,x:drag.x+drag.dx,y:drag.y+drag.dy}:n);
  return <div className="canvas-viewport" ref={viewport} onPointerDown={down} onPointerMove={move} onPointerUp={e=>up(e)} onPointerCancel={e=>up(e,true)}>
    <div className="canvas-caption"><span className="tiny-square"/> USER FLOW <span>Drag node · Geser kanvas · Klik untuk detail</span></div>
    <div className="canvas-plane" style={{transform:`translate(${view.x}px,${view.y}px) scale(${view.scale})`}}>
    <svg className="connections" width="20000" height="20000" viewBox="-10000 -10000 20000 20000" style={{left:-10000,top:-10000}}><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a5a5a5"/></marker></defs>{project.edges.map(edge=>{const a=nodes.find(n=>n.id===edge.source),b=nodes.find(n=>n.id===edge.target);if(!a||!b)return null;const right=b.x>a.x,vertical=Math.abs(b.x-a.x)<50;const x1=vertical?a.x+WIDTH/2:right?a.x+WIDTH:a.x,y1=vertical?a.y+HEIGHT:a.y+HEIGHT/2,x2=vertical?b.x+WIDTH/2:right?b.x:b.x+WIDTH,y2=vertical?b.y:b.y+HEIGHT/2;const path=vertical?`M ${x1} ${y1} C ${x1} ${y1+75}, ${x2} ${y2-75}, ${x2} ${y2}`:`M ${x1} ${y1} C ${x1+(right?70:-70)} ${y1}, ${x2+(right?-70:70)} ${y2}, ${x2} ${y2}`;return <g key={edge.id} className={edge.source===selectedId||edge.target===selectedId?'edge selected':'edge'}><path d={path} markerEnd="url(#arrow)"/><text x={(x1+x2)/2} y={(y1+y2)/2-11} textAnchor="middle">{edge.label}</text></g>;})}</svg>
    {nodes.map((node,index)=><button type="button" key={node.id} data-node={node.id} className={`flow-node ${selectedId===node.id?'selected':''}`} style={{left:node.x,top:node.y,width:WIDTH,minHeight:HEIGHT}} onClick={()=>onSelect(node.id)} aria-pressed={selectedId===node.id}><span className="node-top"><span className="node-icon"><Icon name={node.icon} size={19}/></span><span className="node-type">{node.type}</span><small>{String(index+1).padStart(2,'0')}</small></span><strong>{node.title}</strong><span className="node-subtitle">{node.subtitle}</span><span className="node-route">{node.route||'Route belum diisi'} <Icon name="arrow" size={12}/></span><i className="port in"/><i className="port out"/></button>)}
    </div><div className="canvas-bottom"><div className="legend"><i/> SCREEN <span>◇ PROCESS</span><span>→ CONNECTION</span></div><div className="zoom-controls"><button aria-label="Perkecil" onClick={()=>setView(v=>({...v,scale:Math.max(.25,v.scale-.1)}))}><Icon name="minus" size={15}/></button><span>{Math.round(view.scale*100)}%</span><button aria-label="Perbesar" onClick={()=>setView(v=>({...v,scale:Math.min(1.8,v.scale+.1)}))}><Icon name="plus" size={15}/></button><button onClick={fit} aria-label="Tampilkan seluruh peta"><Icon name="zoom" size={16}/></button></div></div>
  </div>;
}

import type {MapNode,Project} from '../domain/model.ts';
import {DesignSurface} from './DesignSurface.tsx';
export function ScreenPreview({project,node,compact=false,onAction}:{project:Project;node:MapNode;compact?:boolean;onAction?:(edgeId:string)=>void}) {
  return <div className={compact?'screen-preview compact':'screen-preview'}><div className="browser-bar">{node.route||'/'} · {node.title}</div><div className="preview-scroll"><DesignSurface project={project} node={node} onNavigate={id=>{const edge=project.edges.find(e=>e.source===node.id&&e.target===id);if(edge)onAction?.(edge.id);}}/></div></div>;
}

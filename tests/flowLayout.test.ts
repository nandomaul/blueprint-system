import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject} from '../src/domain/designer.ts';
import {FLOW_HEIGHT,FLOW_WIDTH,edgeGeometry} from '../src/domain/flow.ts';
import {readFileSync} from 'node:fs';
const ryanPersonnel=()=>addPersonnelFeatures(importProject(readFileSync(new URL('../src/data/ryan-personnel.blueprint.json',import.meta.url),'utf8')));
import {fitFlow,flowLabels,flowNetwork} from '../src/domain/flowLayout.ts';
import {addPersonnelFeatures,hasPersonnelFeatures,personnelFeatures} from '../src/domain/personnelFeatures.ts';
import {exportProject,importProject} from '../src/domain/model.ts';
import {defaultWorkspaceLayout,readWorkspaceLayout,openPanel} from '../src/domain/workspaceLayout.ts';
test('Full-map fit includes every card, column and routed detour at phone and desktop sizes',()=>{
 const p=ryanPersonnel();p.flowColumns=[{id:'wide-column',title:'Far corner',x:-400,y:-300,width:300,height:300,color:'#eeeeee'}];
 for(const [width,height] of [[280,420],[390,600],[1200,750],[1800,920]]){
  const view=fitFlow(p,width,height),points=[...p.nodes.flatMap(n=>[{x:n.x,y:n.y},{x:n.x+FLOW_WIDTH,y:n.y+FLOW_HEIGHT}]),...p.edges.flatMap(e=>edgeGeometry(e,p.nodes).points),{x:-400,y:-300}];
  for(const v of points){const x=v.x*view.scale+view.x,y=v.y*view.scale+view.y;assert.ok(x>=0&&x<=width&&y>=0&&y<=height,JSON.stringify({width,height,v,view}));}
  const xs=points.map(v=>v.x*view.scale+view.x),ys=points.map(v=>v.y*view.scale+view.y);assert.ok(Math.abs((Math.min(...xs)+Math.max(...xs))/2-width/2)<1);assert.ok(Math.abs((Math.min(...ys)+Math.max(...ys))/2-height/2)<1);
 }
});
test('Shared connections paint once; arrows are unique and visible labels never cover a card or each other',()=>{
 const p=ryanPersonnel(),routed=p.edges.map(e=>({id:e.id,label:e.label,geometry:edgeGeometry(e,p.nodes)})),geometry=routed[0].geometry,network=flowNetwork([geometry,geometry]);assert.equal(network.path,geometry.path);assert.equal(network.arrows.length,1);
 const labels=flowLabels(routed,p.nodes),boxes:{x:number;y:number;width:number;height:number}[]=[];assert.ok(labels.size>0);
 for(const e of routed){const pos=labels.get(e.id);if(!pos)continue;const width=Math.min(180,Array.from(e.label).length*5.4+12),box={x:pos.x-width/2,y:pos.y-10,width,height:15};for(const b of [...boxes,...p.nodes.map(n=>({x:n.x,y:n.y,width:FLOW_WIDTH,height:FLOW_HEIGHT}))])assert.ok(!(box.x<b.x+b.width&&box.x+box.width>b.x&&box.y<b.y+b.height&&box.y+box.height>b.y));boxes.push(box);}
});
test('Old floating panel stacks normalize to one tool; switching docks closes the previous tool',()=>{
 const layout=defaultWorkspaceLayout();for(const p of Object.values(layout.panels)){p.dock='float';p.open=true;}const restored=readWorkspaceLayout(JSON.stringify(layout));assert.equal(Object.values(restored.panels).filter(p=>p.open).length,1);const next=openPanel(restored,'uploads');assert.equal(Object.values(next.panels).filter(p=>p.open).length,1);assert.ok(next.panels.uploads.open);
});
test('Eight HR requirements append once, export with the brief and retain team edits, IDs, layout and assets',()=>{
 const p=newProject('Client project');p.brief.scope='Existing client decision';const before=structuredClone(p),next=addPersonnelFeatures(p);assert.equal(personnelFeatures.length,8);assert.ok(hasPersonnelFeatures(next));assert.ok(next.brief.scope.startsWith(before.brief.scope));assert.deepEqual(next.nodes,before.nodes);assert.deepEqual(next.assets,before.assets);assert.equal(next.id,before.id);assert.deepEqual(p,before);assert.equal(addPersonnelFeatures(next),next);assert.deepEqual(importProject(exportProject(next)),next);assert.ok(hasPersonnelFeatures(ryanPersonnel()));
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zoomViewport} from '../src/domain/viewport.ts';
test('Zoom keeps the graph point under the visible center fixed, including min/max limits',()=>{
 const anchor={x:500,y:300},view={x:-240,y:95,scale:.55},point={x:(anchor.x-view.x)/view.scale,y:(anchor.y-view.y)/view.scale};
 for(const next of [.01,.9,10]){const result=zoomViewport(view,next,anchor);assert.ok(result.scale>=.12&&result.scale<=1.8);assert.ok(Math.abs(result.x+point.x*result.scale-anchor.x)<1e-9);assert.ok(Math.abs(result.y+point.y*result.scale-anchor.y)<1e-9);}
});

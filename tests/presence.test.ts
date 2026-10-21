import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presenceMembers,groupPresence} from '../src/domain/presence.ts';
import type {Presence} from '../src/domain/presence.ts';
import {cloudPresence} from '../src/services/cloudPresence.ts';
const person=(profileId='nando'):Presence=>({sessionId:crypto.randomUUID(),profileId,projectId:'project',nodeId:'page',nodeTitle:'Welcome',view:'canvas',activity:'viewing',updatedAt:new Date().toISOString()});
test('Presence validates remote state and groups browser sessions by editor without counting stale duplicate profiles',()=>{
 const a=person(),b={...person(),updatedAt:'2026-10-21T10:00:00.000Z'},c=person('hadist');
 const result=presenceMembers({a:[a],b:[b],c:[c],bad:[{...c,sessionId:'not-a-session'},null]});assert.equal(result.length,3);const groups=groupPresence(result);assert.equal(groups.length,2);assert.equal(groups.find(list=>list[0].profileId==='nando')!.length,2);
});
test('private Presence tracks latest location after subscribe, updates activity, reconnects and cleans timers/channel',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});let subscribe:(status:string)=>void=()=>{},sync=()=>{},removed=0,untracked=0;const tracked:Presence[]=[],statuses:string[]=[],states:Presence[][]=[];
 const channel={on(type:string,_filter:unknown,fn:()=>void){assert.equal(type,'presence');sync=fn;return this;},subscribe(fn:typeof subscribe){subscribe=fn;return this;},async track(value:Presence){tracked.push(value);return'ok';},presenceState(){return{key:tracked.slice(-1)};},async untrack(){untracked++;}};
 const client={channel(topic:string,options:unknown){assert.equal(topic,'blueprint-presence:workspace');assert.deepEqual(options,{config:{private:true,presence:{key:'session'}}});return channel;},async removeChannel(){removed++;}} as unknown as Parameters<typeof cloudPresence>[0];
 const connection=cloudPresence(client,'workspace').connect('session',members=>states.push(members),error=>statuses.push(error));const value=person();connection.update(value);t.mock.timers.tick(400);assert.equal(tracked.length,0);subscribe('SUBSCRIBED');await Promise.resolve();assert.equal(tracked.length,1);connection.update({...value,nodeTitle:'Approval',activity:'editing'});t.mock.timers.tick(400);await Promise.resolve();sync();assert.equal(states.at(-1)![0].nodeTitle,'Approval');assert.equal(states.at(-1)![0].activity,'editing');subscribe('CHANNEL_ERROR');assert.ok(statuses.at(-1));const count=tracked.length;subscribe('SUBSCRIBED');await Promise.resolve();assert.equal(tracked.length,count+1);assert.equal(tracked.at(-1)!.nodeTitle,'Approval');connection.update({...value,view:'flow'});subscribe('SUBSCRIBED');await Promise.resolve();assert.equal(tracked.at(-1)!.view,'flow');connection.close();connection.close();t.mock.timers.tick(10000);subscribe('SUBSCRIBED');assert.equal(removed,1);assert.equal(untracked,1);
});

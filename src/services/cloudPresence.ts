import type {SupabaseClient} from '@supabase/supabase-js';
import {PresenceSchema,presenceMembers} from '../domain/presence.ts';
import type {Presence,PresenceRepository} from '../domain/presence.ts';
export function cloudPresence(client:SupabaseClient,workspaceId:string):PresenceRepository{return{connect(sessionId,changed,status){
 let disposed=false,joined=false,pending:Presence|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 const channel=client.channel('blueprint-presence:'+workspaceId,{config:{private:true,presence:{key:sessionId}}});
 const publish=()=>{clearTimeout(timer);if(!disposed&&joined&&pending){const value=pending;void channel.track(value).then(result=>{if(!disposed)status(result==='ok'?'':'Kehadiran belum tersambung.');}).catch(()=>{if(!disposed)status('Kehadiran belum tersambung.');});}};
 channel.on('presence',{event:'sync'},()=>{if(!disposed)changed(presenceMembers(channel.presenceState()));}).subscribe(state=>{if(disposed)return;joined=state==='SUBSCRIBED';if(joined){status('');publish();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state))status('Kehadiran belum tersambung.');});
 return{update(value){pending=PresenceSchema.parse(value);clearTimeout(timer);timer=setTimeout(publish,350);},close(){if(disposed)return;disposed=true;clearTimeout(timer);void channel.untrack();void client.removeChannel(channel);}};
}};}

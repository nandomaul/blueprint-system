import {useEffect,useRef,useState} from 'react';
import type {ProfileId} from '../domain/model.ts';
import type {Presence,PresenceLocation,PresenceConnection,PresenceRepository} from '../domain/presence.ts';
export function useTeamPresence(repository:PresenceRepository|undefined,profile:ProfileId,location:PresenceLocation){
 const [members,setMembers]=useState<Presence[]>([]),[error,setError]=useState(''),[sessionId]=useState(()=>crypto.randomUUID()),connection=useRef<PresenceConnection|null>(null),current=useRef<Presence|null>(null);
 current.current={...location,profileId:profile,sessionId,updatedAt:new Date().toISOString()};
 useEffect(()=>{setMembers([]);setError('');if(!repository)return;let disposed=false;const c=repository.connect(sessionId,value=>{if(!disposed)setMembers(value);},message=>{if(!disposed)setError(message);});connection.current=c;const update=()=>{if(current.current)c.update({...current.current,updatedAt:new Date().toISOString()});};update();const timer=setInterval(update,30000);window.addEventListener('online',update);window.addEventListener('focus',update);return()=>{disposed=true;clearInterval(timer);window.removeEventListener('online',update);window.removeEventListener('focus',update);connection.current=null;c.close();};},[repository,sessionId]);
 useEffect(()=>{if(current.current)connection.current?.update(current.current);},[profile,location.projectId,location.nodeId,location.view,location.activity]);
 return{members,error,sessionId};
}

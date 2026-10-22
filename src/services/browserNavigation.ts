import {routeBase,readWorkspaceRoute} from '../domain/navigation.ts';
export function browserBase(){const configured=import.meta.env.BASE_URL;return routeBase(configured?.startsWith('/')?configured:window.location.pathname.startsWith('/blueprint-system/')?'/blueprint-system/':'/');}
export function restoreDeepLink(base=browserBase()){
 if(window.location.protocol==='file:')return;
 const current=new URL(window.location.href),path=current.searchParams.get('bp_path');if(!path)return;
 if(path.length<=4096&&!path.includes('#')&&path.startsWith(base)&&!path.startsWith('//')){const target=new URL(path,current.origin);if(target.origin===current.origin){const route=readWorkspaceRoute(target.pathname,target.search,base);if(route.projectId||route.panel){window.history.replaceState(null,'',target.pathname+target.search+current.hash);return;}}}
 current.searchParams.delete('bp_path');window.history.replaceState(null,'',current.pathname+current.search+current.hash);
}

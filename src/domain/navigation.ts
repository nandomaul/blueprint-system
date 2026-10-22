export const panels=['settings','history','brief','download','manage','projects','share','create','checkpoint','recovery','enable-design','cover','rename'] as const;
export type RoutePanel=typeof panels[number];
export type SettingsSection='profiles'|'accounts'|'language';
export type WorkspaceRoute={projectId?:string;title?:string;mode:'canvas'|'flow'|'assets';nodeId?:string;panel?:RoutePanel;chat?:boolean;preview?:string;guided?:boolean;section?:SettingsSection};
const validId=(value:string)=>value.length>0&&value.length<=100&&!/[\u0000-\u001f\u007f]/.test(value);
export function routeBase(base:string){return base.startsWith('/')?'/'+base.split('/').filter(Boolean).join('/')+(base.split('/').filter(Boolean).length?'/':''):'/';}
export function slug(title:string){return title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'project';}
const encodeId=(id:string)=>{try{return encodeURIComponent(id);}catch{return null;}};
export function workspacePath(route:WorkspaceRoute,base='/'){
 const root=routeBase(base),view={canvas:'system',flow:'userflow',assets:'design'}[route.mode];let path=root;const encoded=route.projectId&&validId(route.projectId)?encodeId(route.projectId):null;
 if(encoded)path+=slug(route.title??'project')+'~'+encoded+'/'+view;
 if(route.panel&&panels.includes(route.panel))path+=(path.endsWith('/')?'':'/')+route.panel;
 const search=new URLSearchParams();if(route.projectId&&route.nodeId)search.set('page',route.nodeId);if(route.chat)search.set('chat','1');if(route.projectId&&route.preview){search.set('preview',route.preview);if(route.guided)search.set('guided','1');}if(route.panel==='settings'&&route.section)search.set('section',route.section);
 return path+(search.size?'?'+search.toString():'');
}
export function readWorkspaceRoute(pathname:string,search:string,base='/'):WorkspaceRoute{
 const route:WorkspaceRoute={mode:'canvas'},root=routeBase(base);if(!pathname.startsWith(root))return route;
 let segments:string[];try{segments=pathname.slice(root.length).split('/').filter(Boolean).map(decodeURIComponent);}catch{return route;}
 const projectId=segments[0]?.includes('~')?segments[0].slice(segments[0].indexOf('~')+1):undefined;if(projectId&&validId(projectId)&&['system','design','userflow'].includes(segments[1])){route.projectId=projectId;route.mode=segments[1]==='design'?'assets':segments[1]==='userflow'?'flow':'canvas';if(panels.includes(segments[2] as RoutePanel))route.panel=segments[2] as RoutePanel;}
 else if(panels.includes(segments[0] as RoutePanel))route.panel=segments[0] as RoutePanel;
 const query=new URLSearchParams(search),page=query.get('page'),preview=query.get('preview'),section=query.get('section');if(route.projectId&&page&&page.length<=180)route.nodeId=page;if(route.projectId&&preview&&preview.length<=180){route.preview=preview;route.guided=query.get('guided')==='1';}if(query.get('chat')==='1')route.chat=true;if(section&&['profiles','accounts','language'].includes(section))route.section=section as SettingsSection;return route;
}

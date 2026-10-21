import type {DesignElement,LayoutMode,PageDesign} from './model.ts';

export const layoutSizes={web:[1440,900],mobile:[390,844],presentation:[1920,1080]} as const;
export const designMode=(d:PageDesign):LayoutMode=>d.layoutMode??(d.width<=600?'mobile':d.width>=1700?'presentation':'web');
function geometry(d:PageDesign){return {width:d.width,height:d.height,elements:d.elements.map(({id,x,y,width,height,fontSize})=>({id,x,y,width,height,fontSize}))};}
function fromGeometry(d:PageDesign,saved:ReturnType<typeof geometry>):PageDesign{
 const fallback=fitGeometry(d,saved.width,saved.height),byId=new Map(saved.elements.map(e=>[e.id,e]));
 return {...d,width:saved.width,height:saved.height,elements:d.elements.map((e,i)=>({...e,...(byId.get(e.id)??fallback.elements[i])}))};
}
function fitGeometry(d:PageDesign,width:number,height:number):PageDesign{
 const scale=Math.min(width/d.width,height/d.height),ox=(width-d.width*scale)/2,oy=(height-d.height*scale)/2;
 return {...d,width,height,elements:d.elements.map(e=>{const w=Math.max(24,Math.min(width,Math.round(e.width*scale))),h=Math.max(24,Math.min(height,Math.round(e.height*scale)));return {...e,x:Math.round(Math.max(0,Math.min(width-w,ox+e.x*scale))),y:Math.round(Math.max(0,Math.min(height-h,oy+e.y*scale))),width:w,height:h,fontSize:Math.max(8,Math.min(120,e.fontSize*scale))};})};
}
function textHeight(text:string,width:number,font:number,padding=0){return text.split('\n').reduce((h,line)=>h+Math.max(1,Math.ceil(line.length/Math.max(1,(width-padding*2)/(font*.52)))),0)*font*1.45+padding*2;}
function mobileHeight(e:DesignElement,width:number,font:number){
 if(e.kind==='image')return Math.max(120,Math.min(340,width*e.height/e.width));
 if(e.kind==='input'||e.kind==='select')return Math.max(84,textHeight(e.text,width,font,12)+42);
 if(e.kind==='textarea')return Math.max(132,textHeight(e.text,width,font,12)+70);
 if(e.kind==='checkbox')return Math.max(50,textHeight(e.text,width-32,font,8));
 if(e.kind==='table'){const rows=e.text.split('\n');return Math.max(100,rows.reduce((h,r)=>h+Math.max(...r.split('|').map(cell=>textHeight(cell.trim(),width/r.split('|').length,font,8)))+16,0));}
 if(e.kind==='button'||e.kind==='badge')return Math.max(46,textHeight(e.text,width,font,10));
 if(e.kind==='line')return 24;
 if(e.kind==='icon'||e.kind==='avatar')return 48;
 if(e.kind==='progress')return 66;
 if(e.kind==='rectangle'||e.kind==='ellipse')return Math.min(150,e.height);
 return Math.max(e.kind==='heading'?46:30,textHeight(e.text,width,font,['card'].includes(e.kind)?16:0));
}
// Infer existing visual groups by containment, then stack groups at readable type sizes.
// No component, semantic content, button target or asset identity is removed.
export function mobileDesign(d:PageDesign,width=390):PageDesign{
 const pad=20,gap=16,inner=width-pad*2,result=new Map<string,DesignElement>(),elements=d.elements;
 const backgrounds=elements.filter(e=>['rectangle','card'].includes(e.kind)&&!e.text.trim()&&e.width>=d.width*.9&&e.height>=d.height*.85);
 const normal=elements.filter(e=>!backgrounds.includes(e));
 const contains=(a:DesignElement,b:DesignElement)=>a.id!==b.id&&a.x<=b.x&&a.y<=b.y&&a.x+a.width>=b.x+b.width&&a.y+a.height>=b.y+b.height;
 const parents=new Map<string,string>();
 for(const e of normal){const container=normal.filter(p=>['card','rectangle','ellipse'].includes(p.kind)&&contains(p,e)&&(p.width>e.width||p.height>e.height)).sort((a,b)=>a.width*a.height-b.width*b.height)[0];if(container)parents.set(e.id,container.id);}
 const sorted=(rows:DesignElement[])=>rows.toSorted((a,b)=>Math.abs(a.y-b.y)<14?a.x-b.x:a.y-b.y);
 function place(e:DesignElement,x:number,y:number,available:number):number{
  const children=sorted(normal.filter(v=>parents.get(v.id)===e.id)),font=e.kind==='heading'?Math.min(30,Math.max(24,e.fontSize)):Math.min(18,Math.max(14,e.fontSize));
  const w=['icon','avatar','ellipse'].includes(e.kind)?Math.min(available,Math.max(48,Math.min(150,e.width))):available;
  let h=mobileHeight(e,w,font);
  if(children.length){let cy=y+(e.text.trim()?h+12:16);for(const child of children)cy=place(child,x+16,cy,Math.max(24,w-32))+12;h=Math.max(h,cy-y+4);}
  result.set(e.id,{...e,x,y,width:w,height:Math.ceil(h),fontSize:font});return y+Math.ceil(h);
 }
 let y=pad;for(const e of sorted(normal.filter(e=>!parents.has(e.id))))y=place(e,pad,y,inner)+gap;
 const height=Math.max(844,Math.ceil(y+pad));
 if(height>4000)throw new Error('Layout mobile melebihi 4000 px. Pisahkan konten menjadi beberapa halaman agar tetap terbaca.');
 for(const e of backgrounds)result.set(e.id,{...e,x:0,y:0,width,height});
 return {...d,width,height,elements:elements.map(e=>result.get(e.id)!),layoutMode:'mobile'};
}
export function layoutForView(d:PageDesign,mode:LayoutMode):PageDesign{
 if(designMode(d)===mode)return d;
 const saved=d.layouts?.[mode];if(saved)return {...fromGeometry(d,saved),layoutMode:mode};
 if(mode==='mobile')return mobileDesign(d);
 const source=d.layouts?.web?fromGeometry(d,d.layouts.web):d.layouts?.presentation?fromGeometry(d,d.layouts.presentation):d;
 const size=layoutSizes[mode];return {...fitGeometry(source,size[0],size[1]),layoutMode:mode};
}
export function changeLayout(input:PageDesign,mode:LayoutMode):PageDesign{
 const constrained=!input.layoutMode&&input.width>900&&input.elements.length>0&&Math.max(...input.elements.map(e=>e.x+e.width))<input.width*.6;
 const d=constrained?arrangeDesign(input):input;
 const layouts={...d.layouts,[designMode(d)]:geometry(d)},next=layoutForView({...d,layouts},mode);
 return {...next,layouts:{...layouts,[mode]:geometry(next)},layoutMode:mode};
}
export function arrangeDesign(d:PageDesign):PageDesign{
 const mode=designMode(d),flow=mobileDesign(d,mode==='mobile'?390:d.width);
 const arranged=mode==='mobile'?flow:{...fitGeometry(flow,d.width,d.height),layouts:d.layouts};
 if(!d.layoutMode)delete arranged.layoutMode;else arranged.layoutMode=d.layoutMode;return arranged;
}
export function resizeDesign(d:PageDesign,width:number,height:number):PageDesign{
 const next=fitGeometry(d,width,height);return d.layouts?{...next,layouts:{...d.layouts,[designMode(d)]:geometry(next)}}:next;
}

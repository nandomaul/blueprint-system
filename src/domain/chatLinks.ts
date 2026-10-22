export function chatLinks(text:string){
 const result:{text:string;href?:string}[]=[],pattern=/(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;let start=0;
 for(const m of text.matchAll(pattern)){
  let label=m[0].replace(/[.,!?;:]+$/u,'');
  for(const [close,open] of [[')', '('],[']','['],['}','{']])while(label.endsWith(close)&&label.split(close).length>label.split(open).length)label=label.slice(0,-1);
  let url:URL;try{url=new URL(label.startsWith('www.')?'https://'+label:label);if(!['http:','https:'].includes(url.protocol)||!url.hostname)continue;}catch{continue;}
  const i=m.index!;if(i>start)result.push({text:text.slice(start,i)});result.push({text:label,href:url.href});start=i+label.length;
 }
 if(start<text.length)result.push({text:text.slice(start)});return result;
}

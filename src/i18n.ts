import {useSyncExternalStore} from 'react';
import {english} from './locales/en.ts';
export type Language='id'|'en';
const listeners=new Set<()=>void>();let language:Language='id';try{language=localStorage.getItem('blueprint-language')==='en'?'en':'id';}catch{/* Optional storage. */}
if(typeof document!=='undefined')document.documentElement.lang=language;
export const getLanguage=()=>language;
export const getLocale=()=>language==='en'?'en-GB':'id-ID';
export function setLanguage(value:Language){language=value;try{localStorage.setItem('blueprint-language',value);}catch{/* In-memory preference. */}if(typeof document!=='undefined')document.documentElement.lang=value;listeners.forEach(fn=>fn());}
export function useLanguage(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getLanguage,getLanguage);}
export function t(text:string):string{if(language==='id')return text;if(english[text])return english[text];for(const [prefix,value] of Object.entries(english)){if(prefix.endsWith(' ')&&text.startsWith(prefix))return value+text.slice(prefix.length);}return text;}

import {chatLinks} from '../domain/chatLinks.ts';
export function ChatText({text}:{text:string}){return <>{chatLinks(text).map((part,i)=>part.href?<a key={i} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>:part.text)}</>;}

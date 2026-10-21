import {t} from '../i18n.ts';
import type {ButtonHTMLAttributes} from 'react';
import {Icon} from './Icon.tsx';
export function ToolButton({label,icon,active,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string;icon:Parameters<typeof Icon>[0]['name'];active?:boolean}){return <button type="button" {...props} aria-pressed={props['aria-pressed']??active} aria-label={t(label)} title={t(label)} className={`icon-button ${active?'active':''} ${className}`}><Icon name={icon} size={18}/></button>;}

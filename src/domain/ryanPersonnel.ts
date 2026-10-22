import data from '../data/ryan-personnel.blueprint.json?raw';
import {addPersonnelFeatures} from './personnelFeatures.ts';
import {importProject} from './model.ts';

export const RYAN_PROJECT_ID='personnel-ryan-mindmap-20261020-002';
export const RYAN_CHECKPOINT='Ryan · mindmap sesuai referensi · 20 Okt 2026';
export function ryanPersonnel(){return {...addPersonnelFeatures(importProject(data)),updatedAt:new Date().toISOString()};}
export function requestsRyanTemplate(search:string){return new URLSearchParams(search).get('template')==='ryan-002';}

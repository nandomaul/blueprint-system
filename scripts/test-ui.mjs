import {build} from 'vite';
import {JSDOM} from 'jsdom';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {IDBFactory} from 'fake-indexeddb';
import {File} from 'node:buffer';
process.env.NODE_ENV='development';
const dir=await mkdtemp(path.join(process.cwd(),'.ui-test-'));
try {
 await build({configFile:false,logLevel:'error',ssr:{external:['react','react-dom/client','react/jsx-runtime']},build:{ssr:'tests/uiHarness.tsx',outDir:dir,emptyOutDir:true,minify:false,rollupOptions:{output:{entryFileNames:'harness.mjs'}}}});
 const dom=new JSDOM('<!doctype html><html><body><div id="test-root"></div></body></html>',{url:'http://127.0.0.1:5174/',pretendToBeVisual:true});
 const {window}=dom;
 // JSDOM has no BroadcastChannel; do not leak Node host MessagePorts into the browser fixture.
 Object.defineProperty(globalThis,'BroadcastChannel',{value:window.BroadcastChannel,configurable:true});
 for(const key of ['window','document','navigator','HTMLElement','HTMLDialogElement','Element','HTMLInputElement','HTMLTextAreaElement','Event','MouseEvent','KeyboardEvent','localStorage','Image'])Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true});
 Object.defineProperty(globalThis,'File',{value:File,configurable:true});Object.defineProperty(window,'indexedDB',{value:new IDBFactory(),configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 window.HTMLElement.prototype.setPointerCapture=()=>{};window.HTMLElement.prototype.hasPointerCapture=()=>false;window.HTMLElement.prototype.releasePointerCapture=()=>{};
 window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 globalThis.confirm=()=>true;
 let downloads=0;globalThis.URL.createObjectURL=()=>{downloads++;return 'blob:ui-test';};globalThis.URL.revokeObjectURL=()=>{};window.HTMLAnchorElement.prototype.click=()=>{};
 Object.defineProperty(globalThis,'Image',{value:class {src='';naturalWidth=100;naturalHeight=100;async decode(){}},configurable:true});
 const {runUiTests}=await import(pathToFileURL(path.join(dir,'harness.mjs')).href);
 await runUiTests(()=>downloads);dom.window.close();console.log('UI DOM: create system/page, edit preview, button navigation, image deletion, profile, autosave reload, History and download passed.');
}finally{await rm(dir,{recursive:true,force:true});}

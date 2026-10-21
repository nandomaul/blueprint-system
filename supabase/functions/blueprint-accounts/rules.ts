// Shared browser/server validation. No credentials are persisted or logged here.
export type AccountInput={action:'create'|'bootstrap';workspaceId:string;login:string;name:string;password:string;profileId:string|null};
export function accountEmail(login:string){const value=login.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(value))throw new Error('Username 3–40 karakter: huruf, angka, titik, garis bawah atau minus.');return value+'@accounts.blueprint.invalid';}
export function parseAccountInput(raw:unknown):AccountInput{
 if(!raw||typeof raw!=='object')throw new Error('Akun tidak valid.');const r=raw as Record<string,unknown>;
 if(r.action!=='create'&&r.action!=='bootstrap')throw new Error('Aksi tidak valid.');
 if(typeof r.workspaceId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.workspaceId))throw new Error('Ruang tidak valid.');
 if(typeof r.login!=='string')throw new Error('Username diperlukan.');accountEmail(r.login);
 if(typeof r.password!=='string'||r.password.length<10||r.password.length>128)throw new Error('Password 10–128 karakter.');
 if(typeof r.name!=='string'||!r.name.trim()||r.name.trim().length>60)throw new Error('Nama 1–60 karakter.');
 if(r.profileId!==null&&r.profileId!==undefined&&(typeof r.profileId!=='string'||!/^(nando|hadist|ryan|p_[0-9a-f-]{36})$/.test(r.profileId)))throw new Error('Profil tidak valid.');
 return{action:r.action,workspaceId:r.workspaceId,login:r.login.trim().toLowerCase(),name:r.name.trim(),password:r.password,profileId:typeof r.profileId==='string'?r.profileId:null};
}

import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {accountEmail,parseAccountInput} from './rules.ts';
const allowed=new Set(['http://127.0.0.1:5174','http://localhost:5174','https://nandomaul.github.io',...(Deno.env.get('BLUEPRINT_ALLOWED_ORIGINS')??'').split(',').filter(Boolean)]);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')??'',headers={'Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://nandomaul.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const reply=(status:number,error:string)=>new Response(JSON.stringify({error}),{status,headers});
 if(origin&&!allowed.has(origin))return reply(403,'Origin tidak diizinkan.');if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,'Gunakan POST.');
 const bearer=req.headers.get('authorization');if(!bearer?.startsWith('Bearer '))return reply(401,'Login diperlukan.');
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const actor=await admin.auth.getUser(bearer.slice(7));if(actor.error||!actor.data.user)return reply(401,'Sesi tidak valid.');
 let input;try{const body=await req.text();if(body.length>10000)return reply(413,'Permintaan terlalu besar.');input=parseAccountInput(JSON.parse(body));}catch(e){return reply(400,e instanceof Error?e.message:'Akun tidak valid.');}
 const owner=await admin.from('bp_workspaces').select('id').eq('id',input.workspaceId).eq('created_by',actor.data.user.id).maybeSingle();if(owner.error)return reply(503,'Database akun belum siap.');if(!owner.data)return reply(403,'Hanya pemilik ruang dapat membuat akun editor.');
 const email=accountEmail(input.login);let userId=actor.data.user.id,created=false;
 try{
  if(input.action==='bootstrap'){
   const current=await admin.from('bp_accounts').select('login_name').eq('user_id',userId).maybeSingle();if(current.error)throw new Error('Pasang SQL MAP-015 terlebih dahulu.');if(current.data&&current.data.login_name!==input.login)throw new Error('Gunakan username akun yang sudah terdaftar.');
   const updated=await admin.auth.admin.updateUserById(userId,{email,password:input.password,email_confirm:true});if(updated.error)throw new Error(updated.error.message);
  }else{
   const fresh=await admin.auth.admin.createUser({email,password:input.password,email_confirm:true});if(fresh.error||!fresh.data.user)throw new Error(fresh.error?.message??'Akun belum dibuat.');userId=fresh.data.user.id;created=true;
  }
  const result=await admin.rpc('bp_register_account',{p_actor:actor.data.user.id,p_workspace_id:input.workspaceId,p_user_id:userId,p_login:input.login,p_profile_id:input.profileId,p_name:input.name});if(result.error)throw new Error(result.error.message);
  return new Response(JSON.stringify({account:result.data}),{headers});
 }catch(e){if(created)await admin.auth.admin.deleteUser(userId);return reply(400,e instanceof Error?e.message:'Akun belum tersimpan.');}
});

import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
const E=env as unknown as {ADMIN_EMAIL?:string;ADMIN_BRIDGE_SECRET?:string;MAIN_SITE_URL?:string;MAIN_SITE_ACCESS_TOKEN?:string};
const headers={'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
export async function adminIdentity(){const user=await getChatGPTUser();return user&&E.ADMIN_EMAIL&&user.email.toLowerCase()===E.ADMIN_EMAIL.toLowerCase()?user:null}
export async function proxy(request:Request){
 try{const user=await adminIdentity();if(!user)return Response.json({error:'Acesso exclusivo à conta administradora autorizada.'},{status:403,headers});
 if(request.method==='POST'){if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem não permitida.'},{status:403,headers});if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Formato inválido.'},{status:415,headers})}
 if(!E.MAIN_SITE_URL||!E.MAIN_SITE_ACCESS_TOKEN||!E.ADMIN_BRIDGE_SECRET)return Response.json({error:'Conexão com a agenda não configurada.'},{status:503,headers});
 const body=request.method==='POST'?await request.text():undefined;if(body&&body.length>40000)return Response.json({error:'Conteúdo maior que o permitido.'},{status:413,headers});
 const response=await fetch(new URL('/api/bridge',E.MAIN_SITE_URL),{method:request.method,redirect:'error',headers:{'Content-Type':'application/json','X-Admin-Bridge':E.ADMIN_BRIDGE_SECRET,'OAI-Sites-Authorization':'Bearer '+E.MAIN_SITE_ACCESS_TOKEN},body,signal:AbortSignal.timeout(15000)});
 if(!response.headers.get('content-type')?.includes('application/json'))return Response.json({error:'A agenda não respondeu. Tente novamente em instantes.'},{status:502,headers});const data:any=await response.json();if(response.ok)data.user={name:user.displayName,email:user.email};return Response.json(data,{status:response.status,headers});
 }catch{return Response.json({error:'Não foi possível conectar à agenda. Tente novamente.'},{status:502,headers})}
}

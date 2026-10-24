import http from 'node:http';
import { readFile, realpath, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createAuth } from './auth.mjs';
import { root, buildLocal } from './build.mjs';
import {adminEmails} from '../shared/admin-config.mjs';

export async function startLocal({dataDir=resolve(root,'.local-data'),build=true}={}){
  if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8085')throw Error('Inicie pelo comando npm start. O banco local deve estar em 127.0.0.1:8085.');
  adminEmails(process.env);
  if(build)await buildLocal();
  process.env.ADMIN_SITE_URL='http://127.0.0.1:8889';
  process.env.MAIN_SITE_URL='https://local-agenda.invalid';
  process.env.ADMIN_BRIDGE_SECRET=randomBytes(32).toString('hex');
  // No production credentials are loaded. This demo ID cannot address the real project.
  const {initializeApp}=await import('../site-principal/node_modules/firebase-admin/lib/app/index.js');
  const {getFirestore}=await import('../site-principal/node_modules/firebase-admin/lib/firestore/index.js');
  const db=getFirestore(initializeApp({projectId:'demo-iec-local'},'local-'+Date.now()));
  await mkdir(dataDir,{recursive:true});
  const auth=createAuth(resolve(dataDir,'accounts.json'));
  const {createHandler:mainFactory}=await import('../site-principal/.local-build/api.mjs');
  const {createHandler:adminFactory}=await import('../painel-administrativo/.local-build/api.mjs');
  const main=mainFactory(()=>db);
  const admin=adminFactory(async(url,options)=>{
    if(String(url)!=='https://local-agenda.invalid/api/bridge')throw Error('Destino local inválido.');
    return main(new Request('http://127.0.0.1:8888/api/bridge',options),{});
  });
  const servers=[];
  const json=(data,status=200,headers={})=>Response.json(data,{status,headers});
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
  for(const [port,mode,handler] of [[8888,'public',main],[8889,'admin',admin]]){
    const origin=`http://127.0.0.1:${port}`,cookieName=`iec_${mode}`,base=resolve(root,'.local-build',mode);
    const server=http.createServer(async(req,res)=>{
      try{
        if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);res.end('Use '+origin);return;}
        let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)throw Object.assign(Error('Conteúdo muito grande.'),{status:413});chunks.push(chunk);}
        const headers=new Headers(req.headers),method=req.method||'GET';
        const session=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
        if(session)headers.set('authorization','Bearer '+session);
        const request=new Request(new URL(req.url,origin),{method,headers,body:['GET','HEAD'].includes(method)?undefined:Buffer.concat(chunks)}),path=new URL(request.url).pathname;
        let result;
        if(path==='/.netlify/identity/token'&&method==='POST'){
          const body=await request.json();
          if(body.grant_type!=='password')throw Object.assign(Error('Operação inválida.'),{status:400});
          const payload=auth.execute('login',body,'',origin);
          result=json({access_token:payload.session,token_type:'bearer'});
        }else if(path==='/.netlify/identity/user'){
          const user=auth.user(headers.get('authorization')?.replace(/^Bearer /,''));result=json(user||{error:'Sessão inválida.'},user?200:401);
        }else if(path.startsWith('/local/auth/')){
          const action=path.slice('/local/auth/'.length);
          if(action==='session'&&method==='GET')result=json({user:auth.user(session)});
          else{
            if(method!=='POST')throw Object.assign(Error('Método inválido.'),{status:405});
            if(headers.get('origin')!==origin||!headers.get('content-type')?.startsWith('application/json'))throw Object.assign(Error('Origem ou formato inválido.'),{status:403});
            let body;try{body=await request.json();}catch{throw Object.assign(Error('JSON inválido.'),{status:400});}
            if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(Error('Solicitação inválida.'),{status:400});
            const payload=auth.execute(action,body,session,origin);
            const responseHeaders={};if('session' in payload)responseHeaders['Set-Cookie']=`${cookieName}=${payload.session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${payload.session?604800:0}`;
            delete payload.session;result=json(payload,200,responseHeaders);
          }
        }else if(path==='/local/inbox'||path==='/local/messages'){
          if(method!=='GET')throw Object.assign(Error('Método inválido.'),{status:405});
          const messages=auth.inbox();
          result=path.endsWith('messages')?json(messages):new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Mensagens locais IEC</title><body style="font:18px sans-serif;max-width:850px;margin:40px auto;padding:20px"><h1>Caixa de mensagens local</h1><p>Nenhum e-mail foi enviado. Use estes links para testar confirmação e recuperação. Expiram em uma hora e só funcionam uma vez.</p><p><a href="/local/inbox">Atualizar</a> · <a href="/acesso.html">Acessar conta</a> · <a href="http://127.0.0.1:8888/acesso.html">Criar conta no site</a></p>${messages.map(m=>`<p><strong>${esc(m.email)}</strong> — ${m.type==='confirm'?'Confirmar cadastro':'Redefinir senha'}<br><a href="${esc(m.url)}">Abrir link</a></p>`).join('')||'<p>Nenhuma mensagem pendente.</p>'}</body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8'}});
        }else if(path.startsWith('/api/')){
          if(!['/api/state','/api/session','/api/action','/api/bridge'].includes(path))result=json({error:'Rota não encontrada.'},404);
          else result=await handler(request,{});
        }else{
          if(!['GET','HEAD'].includes(method))throw Object.assign(Error('Método inválido.'),{status:405});
          let target;try{target=await realpath(resolve(base,'.'+decodeURIComponent(path==='/'?'/index.html':path)));}catch{throw Object.assign(Error('Página não encontrada.'),{status:404});}
          if(!target.startsWith(base+sep))throw Object.assign(Error('Acesso negado.'),{status:403});
          result=new Response(method==='HEAD'?null:await readFile(target),{headers:{'Content-Type':types[extname(target)]||'application/octet-stream'}});
        }
        res.writeHead(result.status,{...Object.fromEntries(result.headers),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});res.end(Buffer.from(await result.arrayBuffer()));
      }catch(error){res.writeHead(error.status||500,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:error.status?error.message:'Falha no servidor local. Confira o terminal.'}));if(!error.status)console.error(error);}
    });
    try{await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});servers.push(server);}catch(error){for(const s of servers)s.close();throw error;}
  }
  console.log('IEC LOCAL: site http://127.0.0.1:8888 | painel http://127.0.0.1:8889 | mensagens /local/inbox');
  return {db,close:async()=>{await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));await db.terminate();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const app=await startLocal();let closing=false;
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(closing)return;closing=true;await app.close();process.exit(0);});
}

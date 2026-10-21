import { verifiedIdentity, adminAllowed, publicIdentity, IdentityError } from '../../../shared/verified-identity.mjs';
import type { Context } from '@netlify/functions';

const headers = { 'Cache-Control':'no-store, private', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };

function response(data: unknown, status = 200) {
  return Response.json(data,{ status, headers });
}


export default async function handler(request: Request, _context: Context) {
  try {
    const user = await verifiedIdentity(request);
    if (!user) return response({ error:'Entre na conta administrativa para continuar.' },401);
    if (!adminAllowed(user,process.env)) return response({ error:'Esta conta não está autorizada no painel. Confira ADMIN_EMAILS na Netlify ou entre com outra conta.',code:'ADMIN_FORBIDDEN' },403);
    if(request.method==='GET'&&new URL(request.url).pathname==='/api/session')return response({user:publicIdentity(user),authVersion:'2026-10-20-session-v2'});
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== new URL(request.url).origin) return response({ error:'Origem não permitida.' },403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return response({ error:'Formato inválido.' },415);
    } else if (request.method !== 'GET') return response({ error:'Método não permitido.' },405);
    const mainUrl = process.env.MAIN_SITE_URL;
    const bridgeSecret = process.env.ADMIN_BRIDGE_SECRET;
    if (!mainUrl || !bridgeSecret) return response({ error:'Conexão com a agenda não configurada.' },503);
    const target=new URL(mainUrl);
    if(target.protocol!=='https:'||target.username||target.password)return response({error:'URL da agenda inválida.'},503);
    const body = request.method === 'POST' ? await request.text() : undefined;
    if (body && new TextEncoder().encode(body).byteLength > 65536) return response({ error:'Conteúdo maior que o permitido.' },413);
    const upstream = await fetch(new URL('/api/bridge',mainUrl),{
      method:request.method,
      redirect:'error',
      headers:{ 'Accept':'application/json', 'Content-Type':'application/json', 'Origin':new URL(request.url).origin, 'X-Admin-Bridge':bridgeSecret },
      body,
      signal:AbortSignal.timeout(15000)
    });
    if (!upstream.headers.get('content-type')?.includes('application/json')) return response({ error:'A agenda não respondeu. Tente novamente em instantes.' },502);
    const data: any = await upstream.json();
    if (upstream.ok) data.user = publicIdentity(user);
    return response(data,upstream.status);
  } catch (error: any) {
    if(error instanceof IdentityError)return response({error:error.message,code:error.code},error.status);
    console.error('Admin proxy failed',error?.name);
    return response({ error:'Não foi possível conectar à agenda. Tente novamente.' },502);
  }
}


import { getUser } from '@netlify/identity';
import type { Context } from '@netlify/functions';

const headers = { 'Cache-Control':'no-store, private', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };

function response(data: unknown, status = 200) {
  return Response.json(data,{ status, headers });
}

function authorized(user: any) {
  if (!user?.email) return false;
  const email = String(user.email).toLowerCase();
  // ADMIN_EMAILS accepts a comma-separated allowlist. ADMIN_EMAIL remains as a
  // backwards-compatible single-address fallback for existing deployments.
  const configured = String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email) || user.role === 'admin' || user.roles?.includes('admin') || user.appMetadata?.roles?.includes('admin');
}

export default async function handler(request: Request, _context: Context) {
  try {
    const user = await getUser();
    if (!user) return response({ error:'Entre na conta administrativa para continuar.' },401);
    if (!user.confirmedAt && !user.confirmed_at && !user.email_confirmed_at) return response({ error:'Confirme o e-mail administrativo antes de continuar.' },403);
    if (!authorized(user)) return response({ error:'Acesso exclusivo à conta administradora autorizada.' },403);
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
    if (upstream.ok) data.user = { name:user.name || user.userMetadata?.full_name || user.email, email:user.email };
    return response(data,upstream.status);
  } catch (error: any) {
    console.error('Admin proxy failed',error?.name);
    return response({ error:'Não foi possível conectar à agenda. Tente novamente.' },502);
  }
}


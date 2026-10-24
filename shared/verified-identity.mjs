// Verify with this site's Identity service, never trust decoded JWT payloads,
// user_metadata roles, or runtime globals as proof of a confirmed account.
import {adminEmails} from './admin-config.mjs';
export class IdentityError extends Error {
  constructor(message, status, code) { super(message); this.status=status; this.code=code; }
}
export function requestToken(request) {
  const authorization=request.headers.get('authorization');
  if(authorization) {
    const match=/^Bearer ([^\s]+)$/i.exec(authorization);
    if(!match) throw new IdentityError('Sessão inválida. Entre novamente.',401,'SESSION_EXPIRED');
    return match[1];
  }
  const cookie=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('nf_jwt='));
  if(!cookie)return null;
  try { return decodeURIComponent(cookie.slice(7))||null; }
  catch { throw new IdentityError('Sessão inválida. Entre novamente.',401,'SESSION_EXPIRED'); }
}
export async function verifiedIdentity(request, fetcher=fetch) {
  const token=requestToken(request);
  if(!token)return null;
  let result;
  try {
    result=await fetcher(new URL('/.netlify/identity/user',request.url),{
      headers:{Accept:'application/json',Authorization:`Bearer ${token}`},
      redirect:'error',signal:AbortSignal.timeout(8000),cache:'no-store'
    });
  } catch { throw new IdentityError('Não foi possível verificar sua sessão. Tente novamente.',503,'IDENTITY_UNAVAILABLE'); }
  if(result.status===401||result.status===403)throw new IdentityError('Sua sessão expirou. Entre novamente.',401,'SESSION_EXPIRED');
  if(!result.ok)throw new IdentityError('O serviço de acesso está temporariamente indisponível.',503,'IDENTITY_UNAVAILABLE');
  let user;
  try { user=await result.json(); } catch { throw new IdentityError('Resposta inválida do serviço de acesso.',503,'IDENTITY_UNAVAILABLE'); }
  if(!user?.id||!user?.email)throw new IdentityError('Sessão inválida. Entre novamente.',401,'SESSION_EXPIRED');
  if(!user.confirmed_at&&!user.email_confirmed_at)throw new IdentityError('Confirme seu e-mail pelo link recebido antes de continuar.',403,'EMAIL_UNCONFIRMED');
  return user;
}
export function adminAllowed(user, env) {
  if(!user?.email)return false;
  const emails=adminEmails(env);
  // This is a separate administrative site. Access is deliberately an explicit
  // server-side allowlist, rather than a profile field or a role claim that a
  // future identity-provider setting might expose to end users.
  return emails.includes(user.email.trim().toLowerCase());
}
export function publicIdentity(user) {
  return user?{id:user.id,email:user.email,name:user.user_metadata?.full_name||user.email}:null;
}

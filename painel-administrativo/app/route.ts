import html from '../ui/page.html?raw';
import { htmlHeaders } from '../lib/html';
import { adminIdentity } from '../lib/proxy';
import { getChatGPTUser,chatGPTSignInPath } from './chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return Response.redirect(new URL(chatGPTSignInPath('/'),request.url),302);if(!await adminIdentity())return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Acesso restrito</title><body><h1>Acesso restrito</h1><p>Este painel é exclusivo da conta administradora autorizada.</p><a href="/signout-with-chatgpt?return_to=%2F" target="_top">Trocar de conta</a></body></html>',{status:403,headers:htmlHeaders});return new Response(html,{headers:htmlHeaders})}

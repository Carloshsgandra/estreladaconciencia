import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const source=path=>readFile(new URL(path,root),'utf8');

test('convite administrativo abre a ativação de conta',async()=>{
  const identity=await source('src/identity-client.mjs');
  assert.match(identity,/import \{ acceptInvite,/);
  assert.match(identity,/callback\?\.type==='invite'&&callback\.token/);
  assert.match(identity,/mode='invite'/);
  assert.match(identity,/await acceptInvite\(inviteToken,password\)/);
});

test('links de recuperação e convite preservam o token até a tela de senha',async()=>{
  const redirect=await source('public/auth-callback-redirect.js');
  assert.match(redirect,/recovery_token/);
  assert.match(redirect,/invite_token/);
  assert.match(redirect,/location\.replace\('\/acesso\.html'\+location\.search\+location\.hash\)/);
  const page=await source('ui/page.html');
  assert.match(page,/auth-callback-redirect\.js/);
});

test('autorização reconhece lista de e-mails e função administrativa',async()=>{
  const api=await source('netlify/functions/api.mts');
  assert.match(api,/ADMIN_EMAILS \|\| process\.env\.ADMIN_EMAIL/);
  assert.match(api,/user\.role === 'admin'/);
  assert.match(api,/user\.appMetadata\?\.roles\?\.includes\('admin'\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled=await build({entryPoints:[new URL('../netlify/functions/api.mts',import.meta.url).pathname],bundle:true,write:false,platform:'node',format:'esm'});
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const confirmed={id:'test-user',email:'authorized@example.invalid',confirmed_at:'2026-01-01',user_metadata:{full_name:'Teste'}};
const request=(path='/api/session',method='GET',headers={})=>new Request('https://admin.example.invalid'+path,{method,headers:{cookie:'nf_jwt=test-token',...headers}});
test('API administrativa: sessão, autorização e ponte',async t=>{
 const savedFetch=globalThis.fetch,env={...process.env};
 process.env.ADMIN_EMAILS=confirmed.email;delete process.env.MAIN_SITE_URL;delete process.env.ADMIN_BRIDGE_SECRET;
 try {
  await t.test('anônimo não chama Identity nem banco',async()=>{globalThis.fetch=()=>{throw Error('unexpected fetch')};assert.equal((await handler(new Request('https://admin.example.invalid/api/session'),{})).status,401);});
  globalThis.fetch=async()=>Response.json(confirmed);
  await t.test('sessão independe da configuração da ponte',async()=>{const res=await handler(request(),{});assert.equal(res.status,200);const data=await res.json();assert.equal(data.user.email,confirmed.email);assert.equal(data.user.confirmed_at,undefined);assert.match(res.headers.get('cache-control'),/no-store/);});
  await t.test('conta sem permissão recebe 403',async()=>{globalThis.fetch=async()=>Response.json({...confirmed,email:'other@example.invalid'});assert.equal((await handler(request(),{})).status,403);});
  await t.test('email pendente recebe erro específico',async()=>{globalThis.fetch=async()=>Response.json({...confirmed,confirmed_at:null});const res=await handler(request(),{});assert.equal(res.status,403);assert.equal((await res.json()).code,'EMAIL_UNCONFIRMED');});
  await t.test('sessão expirada recebe 401',async()=>{globalThis.fetch=async()=>new Response('',{status:401});assert.equal((await handler(request(),{})).status,401);});
  globalThis.fetch=async()=>Response.json(confirmed);
  await t.test('ponte ausente não é tratada como falha de senha',async()=>{assert.equal((await handler(request('/api/state'),{})).status,503);});
  await t.test('POST de outra origem é bloqueado',async()=>{assert.equal((await handler(request('/api/state','POST',{origin:'https://other.example.invalid','content-type':'application/json'}),{})).status,403);});
 } finally {globalThis.fetch=savedFetch;for(const key of ['ADMIN_EMAILS','MAIN_SITE_URL','ADMIN_BRIDGE_SECRET']){if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];}}
});

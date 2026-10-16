import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const state = { services:[], settings:{}, appointments:[], rev:7 };
for (const project of ['site-principal','painel-administrativo']) {
 const source=readFileSync(new URL('../../'+project+'/public/app.js',import.meta.url),'utf8').split('const activeStatus=')[0];
 function client(fetch, extras={}) {
  return runInNewContext(source+';({requestApi,fetchState,transact,read})', { fetch, AbortController, setTimeout, clearTimeout, TypeError, structuredClone, ...extras });
 }
 test(project+': carrega JSON e usa credenciais da mesma origem',async()=>{
  let requested;
  const api=client(async(path,options)=>{requested={path,options};return Response.json(state)});
  assert.deepEqual(await api.fetchState(),state);
  assert.equal(api.read().rev,7);
  assert.equal(requested.path,'/api/state');
  assert.equal(requested.options.credentials,'same-origin');
  assert.equal(requested.options.headers.Accept,'application/json');
 });
 for(const status of [200,404,500]) test(project+': HTML '+status+' gera mensagem legível sem substituir o estado',async()=>{
  const api=client(async()=>new Response('<!DOCTYPE html><html>404</html>',{status,headers:{'Content-Type':'text/html'}}));
  const before=api.read();
  await assert.rejects(api.fetchState(),error=>error.message.includes('servidor não respondeu')&&error.status===status);
  assert.equal(api.read(),before);
 });
 test(project+': rejeita JSON quebrado e dados incompletos',async()=>{
  for(const body of ['{broken','null','{}']) {
   const api=client(async()=>new Response(body,{headers:{'Content-Type':'application/json'}}));
   await assert.rejects(api.fetchState(),/resposta inválida|dados da agenda estão incompletos/);
  }
 });
 test(project+': preserva status de autenticação e mensagens do servidor',async()=>{
  const api=client(async()=>Response.json({error:'Entre na conta.'},{status:401}));
  await assert.rejects(api.fetchState(),error=>error.status===401&&error.message==='Entre na conta.');
 });
 test(project+': trata falha de rede',async()=>{
  const api=client(async()=>{throw new TypeError('Failed to fetch')});
  await assert.rejects(api.fetchState(),/Verifique sua conexão/);
 });
 test(project+': encerra requisição demorada',async()=>{
  const api=client(async(_path,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'})))),{setTimeout:fn=>setTimeout(fn,1)});
  await assert.rejects(api.fetchState(),/demorou para responder/);
 });
 test(project+': conflito atualiza agenda sem repetir POST',async()=>{
  const methods=[];
  const api=client(async(_path,options)=>{
   methods.push(options.method||'GET');
   return options.method==='POST'?Response.json({error:'Horário ocupado.'},{status:409}):Response.json(state);
  });
  await assert.rejects(api.transact(next=>next.appointments.push({id:'new-booking'})),error=>error.status===409);
  assert.deepEqual(methods,['POST','GET']);
  assert.equal(api.read().rev,7);
 });
 test(project+': erro de gravação não confirma dados no navegador',async()=>{
  const api=client(async()=>new Response('<!DOCTYPE html>',{status:502,headers:{'Content-Type':'text/html'}}));
  const before=api.read();
  await assert.rejects(api.transact(next=>next.appointments.push({id:'new-booking'})),/servidor não respondeu/);
  assert.equal(api.read(),before);
 });
}

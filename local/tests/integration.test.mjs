import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { startLocal } from '../server.mjs';
import { createAuth } from '../auth.mjs';
import { addDays,today } from '../../site-principal/lib/domain.js';
const directory=await mkdtemp(join(tmpdir(),'iec-local-test-'));
process.env.ADMIN_EMAILS='manager@example.invalid';
const app=await startLocal({dataDir:directory});
const site='http://127.0.0.1:8888',admin='http://127.0.0.1:8889';
const password='Senha-local-123!';
const makeClient=origin=>({origin,cookie:''});
const client=makeClient(site),manager=makeClient(admin),other=makeClient(site);
async function request(c,path,body,options={}){
  const r=await fetch(c.origin+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:c.origin,Cookie:c.cookie,...options.headers},body:body?JSON.stringify(body):undefined});
  const cookie=r.headers.get('set-cookie');if(cookie)c.cookie=cookie.split(';')[0];
  return {status:r.status,data:await r.json()};
}
const auth=(c,action,body)=>request(c,'/local/auth/'+action,body);
async function register(c,email){
  assert.equal((await auth(c,'signup',{email,password,name:'Pessoa Teste'})).status,200);
  const messages=(await request(c,'/local/messages')).data;
  const link=messages.find(m=>m.email===email&&m.type==='confirm');
  const token=new URL(link.url).hash.split('=')[1];
  return {token};
}
let booking,date;
test('site e painel servem telas, bundles e cabeçalhos defensivos',async()=>{
  for(const base of [site,admin]){const r=await fetch(base+'/acesso.html');assert.equal(r.status,200);assert.match(await r.text(),/AMBIENTE LOCAL/);assert.match(r.headers.get('content-security-policy'),/default-src 'self'/);assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal(r.headers.get('cross-origin-resource-policy'),'same-origin');const bundle=await (await fetch(base+'/identity-client.js')).text();assert.match(bundle,/local\/auth/);}
});
test('acesso anônimo e origem externa são rejeitados',async()=>{
  assert.equal((await request(manager,'/api/state')).status,401);
  assert.equal((await request(client,'/api/action',{type:'create'})).status,401);
  assert.equal((await request(client,'/local/auth/signup',{}, {headers:{Origin:'https://example.invalid'}})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>{http.get(site+'/',{headers:{Host:'evil.invalid'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
  assert.equal(hostStatus,403);
  assert.equal((await request(client,'/local/auth/signup',[])).status,400);
  const malformed=await fetch(site+'/local/auth/signup',{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:'invalid json'});
  assert.equal(malformed.status,400);
  const large=await fetch(site+'/local/auth/signup',{method:'POST',headers:{Origin:site,'Content-Type':'application/json'},body:'x'.repeat(65537)});
  assert.equal(large.status,413);
});
test('cadastro exige confirmação; token só pode ser usado uma vez',async()=>{
  const {token}=await register(client,'cliente@example.invalid');
  assert.equal((await auth(client,'login',{email:'cliente@example.invalid',password})).status,403);
  assert.equal((await auth(client,'confirm',{token})).status,200);
  assert.equal((await auth(client,'confirm',{token})).status,400);
  assert.equal((await request(client,'/api/session')).data.user.email,'cliente@example.invalid');
  assert.equal((await auth(client,'signup',{email:'cliente@example.invalid',password,name:'Outra'})).status,400);
});
test('senha errada falha; logout revoga sessão; login restaura sessão',async()=>{
  const old=client.cookie;assert.equal((await auth(client,'logout',{})).status,200);
  assert.equal((await request({...client,cookie:old},'/api/session')).status,401);
  assert.equal((await auth(client,'login',{email:'cliente@example.invalid',password:'incorreta'})).status,401);
  assert.equal((await auth(client,'login',{email:'cliente@example.invalid',password})).status,200);
});
test('cliente comum não ganha acesso administrativo; e-mail autorizado entra',async()=>{
  await auth(manager,'login',{email:'cliente@example.invalid',password});
  assert.equal((await request(manager,'/api/state')).status,403);
  await register(client,'manager@example.invalid');
  const link=(await request(client,'/local/messages')).data.find(m=>m.email==='manager@example.invalid');
  await auth(client,'confirm',{token:new URL(link.url).hash.split('=')[1]});
  assert.equal((await auth(manager,'login',{email:'manager@example.invalid',password})).status,200);
  assert.equal((await request(manager,'/api/state')).status,200);
  await auth(client,'login',{email:'cliente@example.invalid',password});
});
test('configuração, reserva e colisão passam pelas funções reais e pelo Firestore',async()=>{
  const state=(await request(manager,'/api/state')).data;
  state.settings.week.forEach(w=>w.on=true);state.settings.lead=0;
  const saved=await request(manager,'/api/action',{type:'config',version:state.rev,services:state.services,settings:state.settings});
  assert.equal(saved.status,200,JSON.stringify(saved));
  date=addDays(today(),14);booking={id:crypto.randomUUID(),service:'avulsa',date,time:'10:00',mode:'online',name:'Pessoa Teste',phone:'11999999999',topic:'Teste local'};
  const result=await request(client,'/api/action',{type:'create',consent:true,appointment:booking});assert.equal(result.status,200,JSON.stringify(result));
  assert.equal((await app.db.doc('bookings/'+booking.id).get()).exists,true);
  const conflict=await request(client,'/api/action',{type:'create',consent:true,appointment:{...booking,id:crypto.randomUUID()}});assert.equal(conflict.status,409);
});
test('reserva aparece ao dono e ao admin; outro cliente não vê dados privados',async()=>{
  const {token}=await register(other,'outro@example.invalid');await auth(other,'confirm',{token});
  assert.equal((await request(other,'/api/state')).data.appointments.length,0);
  const own=(await request(client,'/api/state')).data.appointments.find(x=>x.id===booking.id);assert.ok(own);
  const changed=await request(manager,'/api/action',{type:'update',version:own.version,appointment:{...own,status:'confirmado',video:'https://example.invalid/reuniao'}});assert.equal(changed.status,200,JSON.stringify(changed));
  assert.equal((await request(client,'/api/state')).data.appointments.find(x=>x.id===booking.id).status,'confirmado');
});
test('recuperação não revela conta inexistente; nova senha revoga sessão anterior',async()=>{
  const old=client.cookie;
  assert.equal((await auth(client,'recovery',{email:'ninguem@example.invalid'})).status,200);
  await auth(client,'recovery',{email:'cliente@example.invalid'});
  const link=(await request(client,'/local/messages')).data.find(m=>m.email==='cliente@example.invalid'&&m.type==='reset');
  assert.ok(link.url.includes('#recovery_token='));const token=new URL(link.url).hash.split('=')[1];
  assert.equal((await auth(client,'reset',{token,password:'Nova-senha-456!'})).status,200);
  assert.equal((await auth(client,'reset',{token,password})).status,400);
  assert.equal((await request({...client,cookie:old},'/api/session')).status,401);
  assert.equal((await auth(client,'login',{email:'cliente@example.invalid',password})).status,401);
  assert.equal((await auth(client,'login',{email:'cliente@example.invalid',password:'Nova-senha-456!'})).status,200);
});
test('contas persistem em disco sem senha em texto; links expiram',async()=>{
  const disk=await readFile(join(directory,'accounts.json'),'utf8');assert.ok(!disk.includes(password));assert.ok(!disk.includes('Nova-senha-456!'));
  const reopened=createAuth(join(directory,'accounts.json'));
  assert.equal(reopened.execute('login',{email:'cliente@example.invalid',password:'Nova-senha-456!'},'',site).user.email,'cliente@example.invalid');
  const expired=createAuth(join(directory,'accounts.json'),()=>Date.now()+2*3600000);assert.equal(expired.inbox().length,0);
});
test('privacidade HTTP: exportação exige senha e não aceita prova forjada',async()=>{
  assert.equal((await request(manager,'/api/action',{type:'privacy:export'},{headers:{'X-Admin-Reauthenticated-At':String(Date.now()),'X-Admin-Actor':'forged'}})).status,401);
  assert.equal((await request(manager,'/api/action',{type:'privacy:export',password:'wrong'})).status,401);
  const exported=await request(manager,'/api/action',{type:'privacy:export',password});
  assert.equal(exported.status,200,JSON.stringify(exported));assert.ok(Array.isArray(exported.data.records));
  const bridge=await fetch(site+'/api/bridge',{method:'POST',headers:{Origin:admin,'Content-Type':'application/json','X-Admin-Bridge':process.env.ADMIN_BRIDGE_SECRET},body:JSON.stringify({type:'privacy:export'})});assert.equal(bridge.status,401);
});
test('privacidade HTTP: titular A exporta/exclui sua ficha sem atingir B',async()=>{
  const owner=(await request(client,'/api/session')).data.user.id,otherId=(await request(other,'/api/session')).data.user.id;
  for(const [id,userId] of [['privacy-owner',owner],['privacy-other',otherId]])await app.db.doc('bookings/'+id).set({type:'ceremony',userId,ceremonyId:id,seatNumber:1,status:'pendente',version:0,date, time:'14:00',startAt:Date.now()+86400000,createdAt:Date.now(),name:'Pessoa Teste',email:'synthetic@example.invalid',anamnesis:{health:'PRIVATE_SYNTHETIC'},internal:{notes:'INTERNAL_SYNTHETIC'}});
  const exported=await request(client,'/api/action',{type:'privacy:export',password:'Nova-senha-456!',userId:otherId});
  assert.equal(exported.status,200,JSON.stringify(exported));assert.ok(exported.data.records.some(x=>x.id==='privacy-owner'));assert.ok(!exported.data.records.some(x=>x.id==='privacy-other'));
  assert.doesNotMatch(JSON.stringify(exported.data),/INTERNAL_SYNTHETIC/);
  const erased=await request(client,'/api/action',{type:'privacy:erase',password:'Nova-senha-456!',confirmation:'EXCLUIR_MINHAS_FICHAS',userId:otherId});assert.equal(erased.status,200,JSON.stringify(erased));assert.equal(erased.data.removed,1);
  assert.equal((await app.db.doc('bookings/privacy-owner').get()).data().anamnesis,undefined);assert.ok((await app.db.doc('bookings/privacy-other').get()).data().anamnesis);
  const denied=await request(manager,'/api/action',{type:'update',version:1,appointment:{id:'privacy-owner',status:'confirmado',internal:{notes:'restore'}}});assert.equal(denied.status,409);
});
test.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});

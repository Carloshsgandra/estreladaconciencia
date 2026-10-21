import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { startAccessPage, safeReturn, verifySession, authMessage } from './access-page.mjs';
import { verifiedIdentity, adminAllowed, requestToken } from './verified-identity.mjs';
import { installSessionBridge } from './session-bridge.mjs';

const account={id:'test-user',email:'person@example.invalid',confirmed_at:'2026-01-01',user_metadata:{full_name:'Pessoa'}};
const request=(headers={})=>new Request('https://test.example/api/session',{headers});
test('anônimo não faz consulta de identidade',async()=>{assert.equal(await verifiedIdentity(request(),()=>{throw Error('não deve chamar');}),null);});
test('cookie é verificado na Identity da própria origem',async()=>{
  let call;const user=await verifiedIdentity(request({cookie:'other=x; nf_jwt=test-only-token'}),async(url,options)=>{call={url,options};return Response.json(account);});
  assert.equal(user.email,account.email);assert.equal(call.url.href,'https://test.example/.netlify/identity/user');assert.equal(call.options.headers.Authorization,'Bearer test-only-token');assert.equal(call.options.redirect,'error');
});
test('Bearer é verificado e não confia em cookies conflitantes',()=>{assert.equal(requestToken(request({authorization:'Bearer header-token',cookie:'nf_jwt=cookie-token'})),'header-token');});
test('cookie malformado e Authorization inválida falham fechados',()=>{
  assert.throws(()=>requestToken(request({cookie:'nf_jwt=%ZZ'})),e=>e.status===401);
  assert.throws(()=>requestToken(request({authorization:'Basic wrong'})),e=>e.status===401);
});
for(const status of [401,403,429,500])test(`Identity HTTP ${status} nunca autentica`,async()=>{
  await assert.rejects(verifiedIdentity(request({cookie:'nf_jwt=test'}),async()=>new Response('',{status})),e=>e.status===(status===401||status===403?401:503));
});
test('falha de rede e JSON inválido não viram conta confirmada',async()=>{
  for(const fetcher of [async()=>{throw Error('network');},async()=>new Response('not json')])await assert.rejects(verifiedIdentity(request({cookie:'nf_jwt=test'}),fetcher),e=>e.status===503);
});
test('usuário realmente não confirmado recebe erro específico',async()=>{await assert.rejects(verifiedIdentity(request({cookie:'nf_jwt=test'}),async()=>Response.json({...account,confirmed_at:null})),e=>e.code==='EMAIL_UNCONFIRMED');});
test('somente lista ou roles gerenciadas no servidor autorizam admin',()=>{
  assert.equal(adminAllowed(account,{ADMIN_EMAILS:' OTHER@example.invalid, PERSON@example.invalid '}),true);
  assert.equal(adminAllowed(account,{ADMIN_EMAIL:account.email}),true);
  assert.equal(adminAllowed({...account,app_metadata:{roles:['admin']}},{}),true);
  for(const patch of [{user_metadata:{roles:['admin']}},{role:'admin'},{app_metadata:{roles:'not-admin'}}])assert.equal(adminAllowed({...account,...patch},{}),false);
  assert.equal(adminAllowed(account,{ADMIN_EMAILS:'wrong@example.invalid',ADMIN_EMAIL:account.email}),false);
});
test('retorno não permite origem externa nem ciclo para login/API',()=>{
  for(const target of ['https://evil.example/','//evil.example/','/acesso.html','/api/state','/.netlify/identity/user'])assert.equal(safeReturn(target,'https://test.example','/#client'),'/#client');
  assert.equal(safeReturn('/#book/avulsa','https://test.example','/#client'),'/#book/avulsa');
});
test('preflight rejeita sessão ausente, 403 e resposta HTML',async()=>{
  for(const response of [Response.json({user:null}),Response.json({error:'Conta não autorizada'},{status:403}),new Response('<html>')])await assert.rejects(verifySession(async()=>response));
});
test('mensagem de limite não promete prazo inventado',()=>{assert.match(authMessage(Error('Rate limit exceeded')),/prazo é definido/);});

async function fixture({admin=true,hash='',search='',preflight=200,existing=false,failLogin=false}={}){
  const ids=['auth-form','auth-submit','auth-message','auth-title','auth-intro','email-field','password-field','confirm-field','name-field','password-label','auth-toggle','auth-recovery','auth-back','auth-email','auth-password','auth-confirm','auth-name'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:'',hidden:false,disabled:false,listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},reportValidity(){return true;}}]));
  const calls=[],navigation=[];
  const env={document:{body:{dataset:{mode:admin?'admin':'client'}},querySelector:s=>elements[s.slice(1)]},location:{origin:'https://test.example',pathname:'/acesso.html',hash,search,replace:url=>navigation.push(url)},history:{replaceState(){calls.push('clearHash');}},fetch:async()=>{calls.push('preflight');return Response.json(preflight===200?{user:account}:{error:'Sessão não autorizada'},{status:preflight});}};
  const identity={getUser:async()=>{calls.push('getUser');return existing?account:null;},refreshSession:async()=>calls.push('refresh'),login:async(email,password)=>{calls.push('login');if(failLogin)throw Error('Invalid login credentials');return account;},logout:async()=>calls.push('logout'),signup:async()=>{calls.push('signup');return account;},requestPasswordRecovery:async()=>calls.push('recoverEmail'),handleAuthCallback:async()=>calls.push('callback'),acceptInvite:async()=>{calls.push('invite');return account;},recoverPassword:async()=>{calls.push('reset');return account;},updateUser:async()=>calls.push('update')};
  await startAccessPage(identity,env);
  elements['auth-email'].value=account.email;elements['auth-password'].value='example-test-password';elements['auth-confirm'].value='example-test-password';elements['auth-name'].value='Pessoa Teste';
  return {elements,calls,navigation,env,identity,click:id=>elements[id].listeners.click(),submit:()=>elements['auth-form'].listeners.submit({preventDefault(){}})};
}
for(const admin of [true,false]){
  test(`${admin?'painel':'site'} login valida API antes de navegar`,async()=>{const f=await fixture({admin});await f.submit();assert.ok(f.calls.indexOf('login')<f.calls.indexOf('preflight'));assert.deepEqual(f.navigation,[admin?'/#admin':'/#client']);});
  test(`${admin?'painel':'site'} sessão local não cria redirecionamento automático`,async()=>{const f=await fixture({admin,existing:true});assert.deepEqual(f.navigation,[]);});
  for(const preflight of [401,403,503])test(`${admin?'painel':'site'} preflight ${preflight} deixa erro visível`,async()=>{const f=await fixture({admin,preflight});await f.submit();assert.deepEqual(f.navigation,[]);assert.match(f.elements['auth-message'].textContent,/não autorizada/);assert.equal(f.elements['auth-submit'].disabled,false);});
}
for(const [token,type,title] of [['invite_token','invite','Ativar conta'],['recovery_token','reset','Definir nova senha']]){
  test(`${type}: só consome token ao salvar e sincroniza cookie com login`,async()=>{
    const f=await fixture({hash:`#${token}=test-token`});assert.equal(f.elements['auth-title'].textContent,title);assert.equal(f.calls.includes(type),false);assert.equal(f.calls.includes('callback'),false);
    await f.submit();assert.ok(f.calls.indexOf(type)<f.calls.indexOf('login'));assert.ok(f.calls.indexOf('login')<f.calls.indexOf('preflight'));assert.deepEqual(f.navigation,['/#admin']);
  });
  test(`${type}: senha divergente não consome link`,async()=>{const f=await fixture({hash:`#${token}=test-token`});f.elements['auth-confirm'].value='different';await f.submit();assert.equal(f.calls.includes(type),false);assert.deepEqual(f.navigation,[]);});
}
test('senha incorreta permanece no formulário',async()=>{const f=await fixture({failLogin:true});await f.submit();assert.deepEqual(f.navigation,[]);assert.match(f.elements['auth-message'].textContent,/incorretos/);});
test('cadastro pede confirmação e não navega como autenticado',async()=>{const f=await fixture({admin:false});f.click('auth-toggle');await f.submit();assert.ok(f.calls.includes('signup'));assert.deepEqual(f.navigation,[]);assert.match(f.elements['auth-message'].textContent,/Confirme seu e-mail/);});
test('recuperação evita pedidos repetidos imediatos',async()=>{const f=await fixture();f.click('auth-recovery');await f.submit();await f.submit();assert.equal(f.calls.filter(c=>c==='recoverEmail').length,1);});
test('logout não verifica nem redireciona à área protegida',async()=>{const f=await fixture({search:'?action=logout'});assert.deepEqual(f.calls,['logout']);assert.deepEqual(f.navigation,['/acesso.html']);});
test('troca de senha exige sessão e encerra sessão depois de salvar',async()=>{const f=await fixture({search:'?action=change-password',existing:true});await f.submit();assert.ok(f.calls.includes('update'));assert.ok(f.calls.includes('logout'));assert.deepEqual(f.navigation,[]);});
test('troca sem sessão não oferece formulário de nova senha',async()=>{const f=await fixture({search:'?action=change-password'});assert.equal(f.elements['auth-title'].textContent,'Entrar no painel');assert.match(f.elements['auth-message'].textContent,/Entre novamente/);});
test('confirmação chama callback e valida sessão',async()=>{const f=await fixture({hash:'#confirmation_token=test'});assert.ok(f.calls.includes('callback'));assert.deepEqual(f.navigation,['/#admin']);});
test('retorno de convite na raiz marca redirecionamento antes de inicializar app',async()=>{
  const source=await readFile(new URL('./auth-callback-redirect.js',import.meta.url),'utf8');
  for(const name of ['invite_token','recovery_token','confirmation_token','email_change_token','access_token']){
    const window={},urls=[];const location={hash:`#${name}=test`,search:'',replace:u=>urls.push(u)};runInNewContext(source,{location,window,URLSearchParams});assert.equal(window.iecAuthRedirect,true);assert.equal(urls[0],'/acesso.html'+location.hash);
  }
  const window={};runInNewContext(source,{window,location:{hash:'#client',replace(){throw Error('unexpected');}},URLSearchParams});assert.equal(window.iecAuthRedirect,undefined);
});
test('renovação é aguardada e chamadas concorrentes compartilham uma operação',async()=>{
  const calls=[],env={};let release;const wait=new Promise(r=>release=r);
  installSessionBridge({getUser:async()=>account,refreshSession:async()=>{calls.push('refresh');await wait;}},env);
  const a=env.iecEnsureSession(),b=env.iecEnsureSession();assert.equal(a,b);release();await a;assert.deepEqual(calls,['refresh']);
});

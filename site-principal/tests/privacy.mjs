import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {healthConsentReceipt,HEALTH_CONSENT_VERSION,HEALTH_CONSENT_TEXT} from '../../shared/consent.mjs';
import {reauthenticate} from '../../shared/reauth.mjs';
import {validatePrivacyRelease} from '../../shared/privacy-build.mjs';
const user={id:'privacy-user',email:'privacy@example.invalid',confirmed_at:'2026-01-01'};
const request=new Request('https://example.invalid/api/action');
test('consentimento exige escolha explícita e versão atual; ignora prova forjada',()=>{
  for(const input of [{},{healthDataConsent:'true'},{healthDataConsent:false},{healthDataConsent:true,healthConsentVersion:'old'}])assert.throws(()=>healthConsentReceipt(input,user.id));
  const receipt=healthConsentReceipt({healthDataConsent:true,healthConsentVersion:HEALTH_CONSENT_VERSION,acceptedAt:'fake',subjectId:'forged'},user.id,0);
  assert.equal(receipt.acceptedAt,'1970-01-01T00:00:00.000Z');assert.equal(receipt.subjectId,user.id);assert.equal(receipt.text,HEALTH_CONSENT_TEXT);assert.match(receipt.id,/^[a-f0-9-]{36}$/);
});
test('formulário exibe consentimento separado sem pré-marcação',()=>{
  const source=readFileSync(new URL('../public/ceremonies.js',import.meta.url),'utf8');
  const input=source.match(/<input[^>]+name="healthDataConsent"[^>]*>/)?.[0];
  assert.ok(input);assert.doesNotMatch(input,/checked/);assert.match(source,/name="healthConsentVersion"/);assert.match(source,/\/privacidade.html/);
});
test('reautenticação valida senha na mesma origem e confere nova identidade',async()=>{
  const calls=[];
  const proof=await reauthenticate(request,user,'Synthetic-password!',async(url,options)=>{
    calls.push({url:String(url),options});
    return Response.json(calls.length===1?{access_token:'new-token'}:user);
  });
  assert.equal(proof.actor,user.id);assert.ok(Date.now()-proof.at<1000);
  assert.equal(calls[0].url,'https://example.invalid/.netlify/identity/token');
  assert.equal(JSON.parse(calls[0].options.body).email,user.email);
  assert.equal(calls[1].options.headers.Authorization,'Bearer new-token');
});
test('reautenticação recusa senha ausente, erro, limite e troca de conta',async()=>{
  await assert.rejects(reauthenticate(request,user,'',()=>{throw Error('não chamar');}),e=>e.status===401);
  for(const code of [401,429])await assert.rejects(reauthenticate(request,user,'wrong',async()=>new Response('',{status:code})),e=>e.status===code);
  let n=0;await assert.rejects(reauthenticate(request,user,'test',async()=>Response.json(++n===1?{access_token:'token'}:{...user,id:'other'})),e=>e.status===403);
  await assert.rejects(reauthenticate(request,user,'test',async()=>{throw Error('network');}),e=>e.status===503);
});
test('produção final exige revisão, campos e prazo coincidente',()=>{
  assert.throws(()=>validatePrivacyRelease({IEC_PRODUCTION_FINAL:'true'}),/PENDENTE/);
  const approved={reviewStatus:'APROVADA',version:'test',controller:'Sintético',officer:'Sintético',contact:'test@example.invalid',retentionMonths:6};
  assert.throws(()=>validatePrivacyRelease({IEC_PRODUCTION_FINAL:'true',HEALTH_RETENTION_MONTHS:'12'},approved),/corresponder/);
  assert.doesNotThrow(()=>validatePrivacyRelease({IEC_PRODUCTION_FINAL:'true',HEALTH_RETENTION_MONTHS:'6'},approved));
});
for(const project of ['site-principal','painel-administrativo'])test(`${project}: build final bloqueia política pendente`,()=>{
  const result=spawnSync(process.execPath,[new URL(`../../${project}/scripts/build-netlify.mjs`,import.meta.url).pathname],{encoding:'utf8',env:{...process.env,ADMIN_SITE_URL:'https://admin.example.invalid',MAIN_SITE_URL:'https://site.example.invalid',IEC_PRODUCTION_FINAL:'true'}});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Produção final bloqueada/);
});

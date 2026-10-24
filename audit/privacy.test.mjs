import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {initializeApp,deleteApp} from '../site-principal/node_modules/firebase-admin/lib/app/index.js';
import {getFirestore} from '../site-principal/node_modules/firebase-admin/lib/firestore/index.js';
import {exportPersonalData,eraseOwnHealth,retainHealthBatch,retentionMonths,retentionDeadline} from '../shared/privacy-store.mjs';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8085');
const app=initializeApp({projectId:'demo-iec-privacy'},'privacy-tests'),db=getFirestore(app);
async function seed(id,owner,extra={}){
  const row={type:'ceremony',ceremonyId:id,userId:owner,name:'Synthetic Name',email:owner+'@example.invalid',phone:'11999999999',seatNumber:1,status:'pendente',version:0,anamnesis:{submittedAt:'2026-01-31T12:00:00.000Z',health:'SYNTHETIC_HEALTH'},internal:{notes:'SYNTHETIC_INTERNAL'},intention:'SYNTHETIC_HEALTH',notes:'SYNTHETIC_HEALTH',cards:'SYNTHETIC_HEALTH',...extra};
  await db.doc('bookings/'+id).set(row);await db.doc('ceremonySeats/'+id+'_1').set({bookingId:id});await db.doc('activeBookings/'+owner+'_'+id).set({bookingId:id});return row;
}
test('titular exporta apenas seus registros e agenda admin exclui saúde',async()=>{
  await seed('export-a','owner-a',{reason:'SYNTHETIC_HEALTH',futureSensitiveField:'SYNTHETIC_HEALTH'});await seed('export-b','owner-b');
  const own=await exportPersonalData(db,'owner-a');assert.equal(own.records.length,1);assert.equal(own.records[0].id,'export-a');assert.ok(own.records[0].anamnesis);assert.equal(own.records[0].internal,undefined);
  const agenda=await exportPersonalData(db,'manager',{admin:true});assert.equal(agenda.records.length,2);assert.doesNotMatch(JSON.stringify(agenda),/SYNTHETIC_HEALTH|SYNTHETIC_INTERNAL/);
  const logs=(await db.collection('privacyAudit').get()).docs.map(d=>d.data());assert.equal(logs.length,2);
  assert.doesNotMatch(JSON.stringify(logs),/owner-a|manager|@|SYNTHETIC|Synthetic Name/);assert.match(logs[0].actorHash,/^[a-f0-9]{64}$/);
});
test('exclusão exige confirmação, isola titular, libera vaga e é repetível',async()=>{
  await assert.rejects(eraseOwnHealth(db,'owner-a','wrong'));
  assert.ok((await db.doc('bookings/export-a').get()).data().anamnesis);
  assert.equal((await eraseOwnHealth(db,'owner-a','EXCLUIR_MINHAS_FICHAS')).removed,1);
  const row=(await db.doc('bookings/export-a').get()).data();assert.equal(row.version,1);assert.equal(row.status,'cancelado');assert.equal(row.anamnesis,undefined);assert.equal(row.internal,undefined);assert.equal(row.intention,undefined);assert.equal(row.email,'owner-a@example.invalid');
  assert.equal(row.reason,undefined);
  assert.equal((await db.doc('ceremonySeats/export-a_1').get()).exists,false);assert.equal((await db.doc('activeBookings/owner-a_export-a').get()).exists,false);
  assert.ok((await db.doc('bookings/export-b').get()).data().anamnesis);
  assert.equal((await eraseOwnHealth(db,'owner-a','EXCLUIR_MINHAS_FICHAS')).removed,0);
});
test('retenção exige prazo aprovado e trata último dia do mês',()=>{
  for(const raw of [undefined,'','0','-1','121','1.5'])assert.throws(()=>retentionMonths({HEALTH_RETENTION_MONTHS:raw}));
  assert.equal(new Date(retentionDeadline('2026-01-31T12:00:00Z',1)).toISOString(),'2026-02-28T12:00:00.000Z');
  assert.equal(retentionDeadline('invalid',1),null);
});
test('retenção: antes do prazo preserva; na fronteira simula e remove',async t=>{
  await seed('retention-boundary','retention-owner');
  await seed('retention-legacy','legacy-owner',{anamnesis:{health:'SYNTHETIC_HEALTH'}});
  const env={HEALTH_RETENTION_MONTHS:'1'};
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-02-28T11:59:59Z')});
  assert.equal((await retainHealthBatch(db,'manager',{},env)).eligible,0);
  t.mock.timers.setTime(Date.parse('2026-02-28T12:00:00Z'));
  const preview=await retainHealthBatch(db,'manager',{},env);assert.equal(preview.eligible,2);assert.equal(preview.removed,0);assert.equal(preview.needsReview,1);
  await assert.rejects(retainHealthBatch(db,'manager',{dryRun:false},env));
  const done=await retainHealthBatch(db,'manager',{dryRun:false,confirmation:'ELIMINAR_FICHAS_VENCIDAS'},env);assert.equal(done.removed,2);
  assert.equal((await db.doc('bookings/retention-boundary').get()).data().anamnesis,undefined);assert.ok((await db.doc('bookings/retention-legacy').get()).data().anamnesis);
});
test('paginação de retenção atravessa mais de cem registros sem truncar',async()=>{
  const batch=db.batch();for(let n=0;n<105;n++)batch.set(db.doc('bookings/page-'+String(n).padStart(3,'0')),{type:'appointment'});await batch.commit();
  const first=await retainHealthBatch(db,'manager',{}, {HEALTH_RETENTION_MONTHS:'12'});assert.equal(first.scanned,100);assert.ok(first.nextCursor);
  const second=await retainHealthBatch(db,'manager',{cursor:first.nextCursor},{HEALTH_RETENTION_MONTHS:'12'});assert.equal(second.scanned,9);assert.equal(second.nextCursor,null);
});
test('volume excessivo na exclusão falha antes de remover qualquer ficha',async()=>{
  const batch=db.batch();for(let n=0;n<101;n++)batch.set(db.doc('bookings/large-'+n),{type:'ceremony',userId:'large-owner',anamnesis:{health:'SYNTHETIC_HEALTH'}});await batch.commit();
  await assert.rejects(eraseOwnHealth(db,'large-owner','EXCLUIR_MINHAS_FICHAS'),e=>e.status===413);
  assert.ok((await db.doc('bookings/large-0').get()).data().anamnesis);
});
test.after(async()=>{await db.terminate();await deleteApp(app);});
test('CLI de retenção simula por padrão e exige confirmação para remover',async()=>{
  const run=args=>new Promise(resolve=>{
    const child=spawn(process.execPath,['local/retention.mjs',...args],{env:{...process.env,FIREBASE_PROJECT_ID:'demo-iec-privacy',HEALTH_RETENTION_MONTHS:'1'}});
    let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('close',code=>resolve({code,output}));
  });
  const wrong=await run(['--project=wrong']);assert.notEqual(wrong.code,0);assert.match(wrong.output,/exatamente igual/);
  const denied=await run(['--project=demo-iec-privacy','--apply']);assert.notEqual(denied.code,0);assert.match(denied.output,/confirme/);
  const preview=await run(['--project=demo-iec-privacy']);assert.equal(preview.code,0,preview.output);assert.equal(JSON.parse(preview.output).dryRun,true);
});

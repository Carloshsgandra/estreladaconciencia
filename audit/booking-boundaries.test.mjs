import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from '../site-principal/node_modules/esbuild/lib/main.js';
import {initializeApp, deleteApp} from '../site-principal/node_modules/firebase-admin/lib/app/index.js';
import {getFirestore} from '../site-principal/node_modules/firebase-admin/lib/firestore/index.js';
import {rm} from 'node:fs/promises';
import {defaults, today, addDays} from '../site-principal/lib/domain.js';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085', 'Requer emulator isolado.');
// Separate demo project prevents concurrent suites from changing configuration underneath these cases.
const app = initializeApp({projectId: 'demo-iec-boundaries'}, 'booking-boundaries');
const db = getFirestore(app);
const artifact = new URL('../site-principal/node_modules/.iec-boundaries.mjs', import.meta.url);
await build({entryPoints: [new URL('../site-principal/netlify/functions/api.mts', import.meta.url).pathname], outfile: artifact.pathname, bundle: true, platform: 'node', format: 'esm', packages: 'external'});
const api = await import(artifact.href);
const user = {userId: 'boundary-owner', email: 'owner@example.invalid', confirmed: true};
let day = 40;
async function fixture() {
  const config = defaults();
  config.settings.week.forEach(w => w.on = true);
  config.settings.lead = 24;
  await db.doc('configuration/main').set({version: 0});
  return {config, body: {consent: true, appointment: {id: crypto.randomUUID(), service: 'avulsa', date: addDays(today(), day++), time: '10:00', mode: 'online', name: 'Pessoa Sintética', phone: '11999999999', topic: 'Teste'}}};
}
test('12 reservas simultâneas: exatamente uma vence; outras recebem conflito claro', async () => {
  const {config, body} = await fixture();
  const requests = Array.from({length: 12}, () => ({...body, appointment: {...body.appointment, id: crypto.randomUUID()}}));
  const results = await Promise.allSettled(requests.map(b => api.createNormal(db, b, user, false, config)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  for (const r of results.filter(r => r.status === 'rejected')) {
    assert.equal(r.reason.status, 409);
    assert.match(r.reason.message, /horário.*reservado/i);
  }
  assert.equal((await db.collection('bookings').where('date', '==', body.appointment.date).get()).size, 1);
});
for (const action of ['cancelar', 'remarcar']) {
  for (const minutes of [-1, 1]) test(`${action}: ${minutes === -1 ? '1 minuto antes' : '1 minuto depois'} do prazo`, async t => {
    const {config, body} = await fixture();
    await api.createNormal(db, body, user, false, config);
    const ref = db.doc('bookings/' + body.appointment.id);
    const old = (await ref.get()).data();
    t.mock.timers.enable({apis: ['Date'], now: old.startAt - 24 * 3600000 + minutes * 60000});
    try {
      const appointment = {...old, id: ref.id, status: action === 'cancelar' ? 'cancelado' : 'pendente', ...(action === 'remarcar' ? {time: '12:00'} : {})};
      const operation = api.updateBooking(db, {version: 0, appointment}, user, false, config);
      if (minutes === 1) {
        await assert.rejects(operation, /prazo de alteração terminou/);
        assert.deepEqual((await ref.get()).data(), old);
      } else {
        await operation;
        const next = (await ref.get()).data();
        assert.equal(next.version, 1);
        assert.equal(action === 'cancelar' ? next.status : next.time, action === 'cancelar' ? 'cancelado' : '12:00');
      }
    } finally { t.mock.timers.reset(); }
  });
}
test('repetir criação com mesmo ID não duplica reserva nem log', async () => {
  const {config, body} = await fixture();
  await api.createNormal(db, body, user, false, config);
  await assert.rejects(api.createNormal(db, body, user, false, config), e => e.status === 409);
  assert.equal((await db.collection('bookings').where('date', '==', body.appointment.date).get()).size, 1);
  assert.equal((await db.collection('audit').where('target', '==', body.appointment.id).get()).size, 1);
});
test.after(async () => { await db.terminate(); await deleteApp(app); await rm(artifact, {force: true}); });
for (const [basis, expected] of [['booking',97],['appointment',137]]) test(`preço persistido pela política ${basis}; remarcação preserva valor contratado`, async t => {
  const saved=process.env.TAROT_PRICE_BASIS;
  process.env.TAROT_PRICE_BASIS=basis;
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-12-31T23:59:59-03:00')});
  try {
    const {config,body}=await fixture();
    body.appointment.date=basis==='booking'?'2027-01-05':'2027-01-06';
    body.appointment.price=1;
    await api.createNormal(db,body,user,false,config);
    const ref=db.doc('bookings/'+body.appointment.id),old=(await ref.get()).data();
    assert.equal(old.price,expected);
    t.mock.timers.setTime(Date.parse('2027-01-01T00:00:00-03:00'));
    await api.updateBooking(db,{version:0,appointment:{...old,id:ref.id,time:'12:00',status:'pendente'}},user,false,config);
    assert.equal((await ref.get()).data().price,expected);
  } finally {t.mock.timers.reset();if(saved===undefined)delete process.env.TAROT_PRICE_BASIS;else process.env.TAROT_PRICE_BASIS=saved;}
});

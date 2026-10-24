// Real emulator requests: these are not regular-expression checks of rules text.
import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp, deleteApp} from '../site-principal/node_modules/firebase-admin/lib/app/index.js';
import {getFirestore} from '../site-principal/node_modules/firebase-admin/lib/firestore/index.js';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085', 'Execute npm run verify com o emulator isolado.');
const project = 'demo-estrela-validation';
const app = initializeApp({projectId: project}, 'rules-audit');
const db = getFirestore(app);
const id = 'rules-' + crypto.randomUUID();
await db.doc('bookings/' + id).set({userId: 'person-a', anamnesis: {synthetic: true}});
const base = `http://127.0.0.1:8085/v1/projects/${project}/databases/(default)/documents`;

// Unsigned Firebase tokens are accepted ONLY by the emulator. Never send them to production.
function token(uid, claims = {}) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({alg: 'none', typ: 'JWT'})}.${encode({iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, user_id: uid, iat: now, exp: now + 3600, firebase: {sign_in_provider: 'custom'}, ...claims})}.`;
}
for (const [role, bearer] of [
  ['anônimo', null], ['titular A', token('person-a')],
  ['outro usuário B', token('person-b')], ['claim admin no navegador', token('manager', {admin: true})]
]) {
  for (const method of ['GET', 'PATCH']) test(`regras: ${role} não pode ${method} ficha diretamente`, async () => {
    const response = await fetch(`${base}/bookings/${id}`, {
      method, headers: {...(bearer ? {Authorization: 'Bearer ' + bearer} : {}), 'Content-Type': 'application/json'},
      ...(method === 'PATCH' ? {body: JSON.stringify({fields: {userId: {stringValue: 'person-b'}}})} : {})
    });
    assert.equal(response.status, 403, await response.text());
  });
}
test('regras: coleção desconhecida também nega por padrão', async () => {
  const response = await fetch(`${base}/unknown/${id}`, {headers: {Authorization: 'Bearer ' + token('person-a')}});
  assert.equal(response.status, 403, await response.text());
});
test.after(async () => { await db.terminate(); await deleteApp(app); });

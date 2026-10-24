import test from 'node:test';
import assert from 'node:assert/strict';
import {adminEmails} from '../../shared/admin-config.mjs';
import {adminAllowed} from '../../shared/verified-identity.mjs';
test('allowlist normaliza lista; não aceita configuração vazia ou malformada',()=>{
  assert.deepEqual(adminEmails({ADMIN_EMAILS:' A@example.invalid, B@example.invalid,a@example.invalid '}),['a@example.invalid','b@example.invalid']);
  for(const env of [{},{ADMIN_EMAILS:''},{ADMIN_EMAILS:' ',ADMIN_EMAIL:'a@example.invalid'},{ADMIN_EMAILS:'a@example.invalid,'},{ADMIN_EMAILS:'not-an-email'}]) assert.throws(()=>adminEmails(env),e=>e.code==='ADMIN_CONFIGURATION'&&e.status===503);
});
test('conta válida fora da allowlist não é autorizada por role',()=>{
  assert.equal(adminAllowed({email:'outsider@example.invalid',app_metadata:{roles:['admin']}},{ADMIN_EMAILS:'manager@example.invalid'}),false);
});

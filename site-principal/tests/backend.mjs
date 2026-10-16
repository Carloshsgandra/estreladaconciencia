import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as domain from '../lib/domain.js';

const api = fs.readFileSync(new URL('../netlify/functions/api.mts',import.meta.url),'utf8');
const migration = fs.readFileSync(new URL('../netlify/database/migrations/202610140001_initial_schema.sql',import.meta.url),'utf8');

test('catálogo e regra promocional permanecem no servidor',() => {
  const store = domain.defaults();
  assert.equal(store.services.find(item => item.id === 'avulsa').price,97);
  assert.equal(store.services.find(item => item.id === 'mentoria').price,97);
  assert.equal(store.settings.whatsapp,'11945915395');
  assert.match(api,/today\(\) >= '2027-01-01' \? 137 : 97/);
});

test('datas, horários e links mantêm validação',() => {
  assert.equal(domain.validDate('2026-12-31'),true);
  assert.equal(domain.validDate('2026-02-30'),false);
  assert.equal(domain.validTime('23:59'),true);
  assert.equal(domain.validTime('24:00'),false);
  assert.equal(domain.safeVideo('https://meet.example/sala'),true);
  assert.equal(domain.safeVideo('javascript:alert(1)'),false);
});

test('banco impede reservas simultâneas sobrepostas',() => {
  assert.match(migration,/EXCLUDE USING gist/);
  assert.match(migration,/int8range\(start_at, end_at, '\[\)'\) WITH &&/);
  assert.match(api,/error\?\.code === '23P01'/);
});

test('migração PostgreSQL evita identificadores reservados',() => {
  assert.doesNotMatch(migration,/\bwindow\s+BIGINT\b/i);
  assert.doesNotMatch(migration,/\bkey\s+TEXT\s+PRIMARY KEY\b/i);
  assert.match(migration,/window_id BIGINT NOT NULL/);
  assert.match(api,/RETURNING request_count/);
});

test('API exige identidade, origem válida e segredo administrativo',() => {
  assert.match(api,/await getUser\(\)/);
  assert.match(api,/checkOrigin\(req\)/);
  assert.match(api,/ADMIN_BRIDGE_SECRET/);
  assert.match(api,/constantEqual/);
});

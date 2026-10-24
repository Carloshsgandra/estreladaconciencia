import test from 'node:test';
import assert from 'node:assert/strict';
import {tarotPrice, priceBasis, pricedService} from '../../shared/pricing.mjs';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {spawnSync} from 'node:child_process';
test('build rejeita política de preço desconhecida antes de gerar arquivos',()=>{
  const result=spawnSync(process.execPath,[new URL('../scripts/build-netlify.mjs',import.meta.url).pathname],{encoding:'utf8',env:{...process.env,ADMIN_SITE_URL:'https://admin.example.invalid',TAROT_PRICE_BASIS:'unknown'}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/TAROT_PRICE_BASIS deve ser booking ou appointment/);
});
for(const project of ['site-principal','painel-administrativo']) test(`${project}: resumo usa política do servidor e data selecionada`,()=>{
  const source=readFileSync(new URL(`../../${project}/public/app.js`,import.meta.url),'utf8').split('\n').find(line=>line.startsWith('function selectedService()'));
  const selected=runInNewContext(source+';selectedService()',{
    window:{iecPricedService:pricedService},booking:{service:'avulsa',date:'2027-01-05'},
    read:()=>({services:[{id:'avulsa',price:97}],pricing:{basis:'appointment'}})
  });
  assert.equal(selected.price,137);
});
for (const [date, price] of [['2027-01-01T02:59:59Z',97],['2027-01-01T03:00:00Z',137]]) {
  test(`preço com relógio simulado ${date}: R$${price}`, t => {
    t.mock.timers.enable({apis:['Date'], now:new Date(date)});
    assert.equal(tarotPrice(), price);
  });
}
test('reserva antes da virada para atendimento depois: duas políticas explícitas', () => {
  const options={now:Date.parse('2026-12-31T23:00:00-03:00'),appointmentDate:'2027-01-04'};
  assert.equal(tarotPrice({...options,basis:'booking'}),97);
  assert.equal(tarotPrice({...options,basis:'appointment'}),137);
  assert.equal(priceBasis({}),'booking');
  assert.throws(()=>priceBasis({TAROT_PRICE_BASIS:''}));
  assert.throws(()=>priceBasis({TAROT_PRICE_BASIS:'wrong'}));
});
test('preço rejeita data inválida e preserva outros serviços', () => {
  for(const appointmentDate of ['2027-02-30','invalid','2027-1-1']) assert.throws(()=>tarotPrice({basis:'appointment',appointmentDate}));
  const service={id:'extra-test',price:250};
  assert.equal(pricedService(service),service);
  assert.equal(pricedService({id:'avulsa',price:1},{now:Date.parse('2027-01-02T03:00:00Z')} ).price,137);
});

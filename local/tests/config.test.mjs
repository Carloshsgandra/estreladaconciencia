import test from 'node:test';
import assert from 'node:assert/strict';
import {startLocal} from '../server.mjs';
test('servidor local recusa lista administrativa vazia antes de abrir portas',async()=>{
  const previous=process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS='';
  try {await assert.rejects(startLocal({build:false}),e=>e.code==='ADMIN_CONFIGURATION');}
  finally {if(previous===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=previous;}
});

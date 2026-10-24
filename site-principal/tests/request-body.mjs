import test from 'node:test';
import assert from 'node:assert/strict';
import {limitedText} from '../../shared/request-body.mjs';
test('limite é aplicado em bytes, inclusive texto multibyte',async()=>{
 const req=text=>new Request('https://example.invalid',{method:'POST',body:text});
 assert.equal(await limitedText(req('áá'),4),'áá');
 await assert.rejects(limitedText(req('ááá'),4),e=>e.status===413);
});
test('stream acima do limite é cancelado antes de leitura completa',async()=>{
 let cancelled=false;
 const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(40000));},cancel(){cancelled=true;}});
 await assert.rejects(limitedText(new Request('https://example.invalid',{method:'POST',body,duplex:'half'})),e=>e.status===413);
 assert.equal(cancelled,true);
});
test('comprimento declarado excessivo e UTF-8 inválido são recusados',async()=>{
 await assert.rejects(limitedText(new Request('https://example.invalid',{method:'POST',headers:{'content-length':'70000'},body:'{}'})),e=>e.status===413);
 await assert.rejects(limitedText(new Request('https://example.invalid',{method:'POST',body:new Uint8Array([255])})),e=>e.status===400);
});

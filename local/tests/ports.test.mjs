import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {requireAvailablePorts} from '../ports.mjs';
test('porta ocupada falha com orientação sem encerrar outro processo',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await assert.rejects(requireAvailablePorts([server.address().port]),/Não abra duas instâncias/);assert.equal(server.listening,true);}finally{await new Promise(resolve=>server.close(resolve));}
});
test('porta livre é liberada após pré-verificação',async()=>{await requireAvailablePorts([0]);});

import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTargets} from '../../release/prepare.mjs';
const targets={publicUrl:'https://public.netlify.app',adminUrl:'https://admin.netlify.app',publicId:'12345678-1234-1234-1234-123456789abc',adminId:'22345678-1234-1234-1234-123456789abc'};
test('publicação exige dois projetos reais distintos e IDs explícitos',()=>{
 assert.equal(validateTargets(targets).publicUrl,targets.publicUrl);
 for(const change of [{adminId:targets.publicId},{adminUrl:targets.publicUrl},{publicId:''},{publicUrl:'https://example.invalid'},{publicUrl:'https://public.netlify.app/path'}])assert.throws(()=>validateTargets({...targets,...change}));
});

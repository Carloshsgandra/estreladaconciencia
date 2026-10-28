import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {formatPhone,installPhoneInputs} from '../../shared/phone-input.mjs';
const source=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
test('telefone formata DDD, colagem internacional, exclusão e entrada incompleta',()=>{
 for(const [input,expected] of [['',''],['1','1'],['11','11'],['11914630191','11 91463-0191'],['+55 (11) 91463-0191','11 91463-0191'],['1133334444','11 3333-4444'],['12345678901234','12345678901234']])assert.equal(formatPhone(input),expected);
 assert.equal(formatPhone(formatPhone('11914630191')),'11 91463-0191');
});
test('máscara preserva posição de edição e ignora outros campos',()=>{
 const events={};installPhoneInputs({addEventListener:(name,fn)=>events[name]=fn});
 const input={matches:()=>true,value:'11914630191',selectionStart:5,setSelectionRange(a,b){this.caret=[a,b];}};
 events.input({target:input});assert.equal(input.value,'11 91463-0191');assert.deepEqual(input.caret,[6,6]);
 const other={matches:()=>false,value:'ABC'};events.input({target:other});assert.equal(other.value,'ABC');
});
for(const project of ['site-principal','painel-administrativo']){
 const code=source(project+'/public/app.js').split('const activeStatus=')[0];
 const client=data=>runInNewContext(code+';({requestApi,read})',{fetch:async()=>Response.json(data),AbortController,setTimeout,clearTimeout,structuredClone});
 test(project+': exportação aceita resposta própria sem sobrescrever a agenda',async()=>{
  const data={records:[{name:'Pessoa sintética'}],exportedAt:'2026-10-27T00:00:00Z',scope:'agenda-sem-fichas'};
  const api=client(data),before=api.read();assert.deepEqual(await api.requestApi('/api/action',{body:JSON.stringify({type:'privacy:export'})},'privacy'),data);assert.equal(api.read(),before);
 });
 test(project+': privacidade e estado não aceitam formatos trocados ou incompletos',async()=>{
  for(const data of [{},null,{records:'incorrect'},{removed:-1}])await assert.rejects(client(data).requestApi('/api/action',{body:JSON.stringify({type:'privacy:export'})},'privacy'),/incompletos/);
  await assert.rejects(client({records:[],scope:'agenda',exportedAt:'date'}).requestApi('/api/state'),/incompletos/);
  assert.equal((await client({removed:0}).requestApi('/api/action',{body:JSON.stringify({type:'privacy:erase'})},'privacy')).removed,0);
 });
}
function adminContext(){const state={ceremonies:[],appointments:[]};const context={read:()=>state,esc,fmtDate:x=>x,statusLabel:x=>x,dateObj:d=>new Date(d+'T12:00:00Z'),ZONE:'America/Sao_Paulo',today:()=> '2026-10-27',appointmentCard:()=>'',adminPage:()=>'<section><div role="tablist"></div><div id="admin-content">old</div></section>',bindAdmin:()=>{},adminTab:'ceremonies'};runInNewContext(source('painel-administrativo/public/ceremonies.js'),context);return context;}
test('ficha protegida preserva nascimento, parentesco, detalhes e controles associados',()=>{
 const c=adminContext();const html=c.anamnesisCard({id:'synthetic',status:'pendente',date:'2026-11-20',time:'19:00',name:'<script>x</script>',anamnesis:{birthDate:'1990-01-01',relationship:'Irmã',medicationDetails:'Detalhe sintético'},internal:{}});
 assert.match(html,/1990-01-01/);assert.match(html,/Irmã/);assert.match(html,/Detalhe sintético/);assert.match(html,/for="internal-notes-synthetic"/);assert.doesNotMatch(html,/<script>|<details[^>]*\sopen/);
});
test('cerimônias agrupam clientes sem misturar datas e mantêm aba ativa visível',()=>{
 const c=adminContext(),rows=[{id:'a',ceremonyId:'one',date:'2026-11-20',time:'19:00',status:'pendente'},{id:'b',ceremonyId:'two',date:'2026-11-21',time:'19:00',status:'pendente'}];
 assert.equal((c.ceremonyGroups(rows).match(/class="ceremony-record-group"/g)||[]).length,2);
 assert.match(c.adminPage(),/aria-selected="true" data-admin-tab="ceremonies"/);assert.match(c.adminPage(),/Inscrições e fichas protegidas/);assert.doesNotMatch(c.adminPage(),/>old</);
});
test('calendário cobre fevereiro bissexto e relatório não soma outros meses',()=>{
 const code=source('painel-administrativo/public/app.js');const context={agendaMonth:'2028-02',agendaDay:'',today:()=> '2028-02-01',dateObj:d=>new Date(d+'T12:00:00Z'),ZONE:'America/Sao_Paulo',fmtDate:x=>x,activeStatus:x=>['pendente','confirmado'].includes(x)};
 runInNewContext(code.slice(code.indexOf('function monthSummary')),context);
 const rows=[{date:'2028-02-10',status:'pendente'},{date:'2028-02-12',status:'concluido'},{date:'2028-03-01',status:'confirmado'}];
 assert.equal(context.monthSummary(rows,'2028-02').total,2);assert.equal((context.adminCalendar({appointments:rows}).match(/data-agenda-day=/g)||[]).length,29);
 assert.match(context.adminCalendar({appointments:rows}),/Não representa receita recebida/);
});
test('escolha de intenção continua funcionando com movimento reduzido',()=>{
 const code=source('site-principal/public/app.js'),a=code.indexOf('let motionObserver;'),b=code.indexOf("let previousRoute=",a),handlers={};
 const buttons=['Relações','Pausa'].map(value=>({dataset:{intention:value},addEventListener:(event,fn)=>handlers[value]=fn,setAttribute(){}})),result={};
 const context={$:q=>q==='#main'?{}:q==='[data-intention-result]'?result:null,$$:q=>q==='[data-intention]'?buttons:[],matchMedia:()=>({matches:true})};
 runInNewContext(code.slice(a,b)+';enhanceMotion();',context);handlers.Pausa();assert.match(result.textContent,/Nem toda resposta/);
});

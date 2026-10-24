import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {defaults} from '../lib/domain.js';
import {deploymentOrigin,validateDeployment} from '../../shared/deploy-config.mjs';
const source=readFileSync(new URL('../public/identity.js',import.meta.url),'utf8');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(state){const context={home:null,read:()=>state,esc,svgArt:()=>'<svg></svg>',money:n=>`R$ ${n}`,ceremonyCards:()=>'<section id="cerimonias"></section>',document:{querySelector:()=>null}};runInNewContext(source,context);return context.home();}
test('landing renderiza catálogo real sem mensalidade indevida',()=>{const state=defaults();state.services[1].price=145;const html=render(state);assert.match(html,/R\$ 145/);assert.match(html,/Reiki/);assert.doesNotMatch(html,/\/ mês|primeiro encontro da mentoria/);assert.equal((html.match(/id="cerimonias"/g)||[]).length,1);});
test('catálogo inativo e vazio não cria oferta fictícia',()=>{const state=defaults();state.services.forEach(x=>x.active=false);const html=render(state);assert.match(html,/A agenda está sendo preparada/);assert.doesNotMatch(html,/href="#book\/avulsa"/);});
test('nome, descrição e biografia são escapados',()=>{const state=defaults();state.settings.bio='<img src=x onerror=alert(1)>';state.services[0].title='<script>alert(1)</script>';state.services[0].description='"<svg onload=alert(1)>';const html=render(state);assert.doesNotMatch(html,/<img src=x|<script>|<svg onload/);assert.match(html,/&lt;script&gt;/);});
test('modalidade e antecedência refletem configuração',()=>{const state=defaults();state.settings.online=false;state.settings.presential=true;state.settings.lead=48;const html=render(state);assert.match(html,/Presencial · Horário/);assert.match(html,/48 horas/);assert.doesNotMatch(html,/Online e Presencial/);});
test('link do serviço codifica identificador',()=>{const state=defaults();state.services[0].id='test/"x';assert.match(render(state),/#book\/test%2F%22x/);});
test('serviço extra ativo aparece com link próprio e some ao desativar',()=>{const state=defaults();const extra={id:'extra-12345678',title:'Serviço adicional',description:'Novo atendimento',duration:45,price:125,active:true,art:0};state.services.push(extra);assert.match(render(state),/href="#book\/extra-12345678"/);extra.active=false;assert.doesNotMatch(render(state),/href="#book\/extra-12345678"/);});
test('URL de build é explícita e normalizada',()=>{assert.throws(()=>deploymentOrigin('URL',{}));assert.equal(deploymentOrigin('URL',{URL:'https://example.netlify.app/'}),'https://example.netlify.app');});
test('URL de build rejeita protocolo, credencial, caminho e fragmento',()=>{for(const URL of ['http://example.com','javascript:alert(1)','https://a:b@example.com','https://example.com/path','https://example.com/#token'])assert.throws(()=>deploymentOrigin('URL',{URL}));});
test('preflight recusa configuração ausente e segredo mascarado',()=>{assert.equal(validateDeployment('public',{}).length,5);const issues=validateDeployment('admin',{MAIN_SITE_URL:'https://example.com',ADMIN_BRIDGE_SECRET:'*'.repeat(40),ADMIN_EMAILS:'manager@example.invalid'});assert.equal(issues.length,1);assert.match(issues[0],/segredo real/);});

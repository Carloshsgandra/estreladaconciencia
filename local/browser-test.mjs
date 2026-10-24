// Optional: npm install --no-save playwright && npx playwright install chromium
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startLocal } from './server.mjs';
const {chromium}=await import(process.env.IEC_PLAYWRIGHT_MODULE||'playwright');
const dir=await mkdtemp(join(tmpdir(),'iec-browser-'));
const app=await startLocal({dataDir:dir});
const browser=await chromium.launch({headless:true,...(process.env.IEC_CHROMIUM_PATH?{executablePath:process.env.IEC_CHROMIUM_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:8888',email=process.env.ADMIN_EMAILS?.split(',')[0]?.trim(),password='Teste-navegador-123!';
const messages=async()=>await (await context.request.get(base+'/local/messages')).json();
try{
  await page.goto(base+'/acesso.html');await page.locator('#auth-toggle').click();
  await page.locator('#auth-name').fill('Carlos Teste');await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill(password);await page.locator('#auth-confirm').fill(password);await page.locator('#auth-submit').click();
  await page.getByText('Cadastro recebido.',{exact:false}).waitFor();
  await page.goto((await messages()).find(m=>m.type==='confirm').url);await page.waitForURL('**/#client');
  await page.reload();await page.locator('#main').getByText('Entrar na minha conta',{exact:false}).waitFor({state:'hidden'});
  assert.equal((await (await context.request.get(base+'/api/session')).json()).user.email,email);
  console.log('PASS navegador móvel: cadastro, confirmação, sessão e recarregamento');
  await page.goto(base+'/acesso.html?action=logout');await page.waitForURL('**/acesso.html');
  await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill('senha-errada');await page.locator('#auth-submit').click();await page.getByText('E-mail ou senha incorretos.',{exact:false}).waitFor();
  await page.locator('#auth-password').fill(password);await page.locator('#auth-submit').click();await page.waitForURL('**/#client');
  console.log('PASS navegador móvel: logout, senha incorreta e novo login');
  await page.goto(base+'/acesso.html');await page.locator('#auth-recovery').click();await page.locator('#auth-email').fill(email);await page.locator('#auth-submit').click();await page.getByText('Se o e-mail estiver cadastrado',{exact:false}).waitFor();
  await page.goto((await messages()).find(m=>m.type==='reset').url);await page.getByRole('heading',{name:'Definir nova senha'}).waitFor();
  await page.locator('#auth-password').fill('Outra-senha-456!');await page.locator('#auth-confirm').fill('Outra-senha-456!');await page.locator('#auth-submit').click();await page.waitForURL('**/#client');
  console.log('PASS navegador móvel: link abre formulário e redefinição permite entrar');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:8889/acesso.html');await page.locator('#auth-email').fill(email);await page.locator('#auth-password').fill('Outra-senha-456!');await page.locator('#auth-submit').click();await page.waitForURL('**/#admin');
  assert.equal((await context.request.get('http://127.0.0.1:8889/api/state')).status(),200);
  await page.reload();assert.equal((await context.request.get('http://127.0.0.1:8889/api/session')).status(),200);
  assert.deepEqual(errors,[]);console.log('PASS navegador desktop: painel, persistência de sessão e ausência de erros JavaScript');
}finally{await browser.close();await app.close();await rm(dir,{recursive:true,force:true});}

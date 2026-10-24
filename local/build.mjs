import { build } from '../site-principal/node_modules/esbuild/lib/main.js';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function buildLocal(){
  const alias=resolve(root,'local/identity-client.mjs');
  for(const [folder,mode] of [['site-principal','public'],['painel-administrativo','admin']]){
    const src=resolve(root,folder),out=resolve(root,'.local-build',mode);await mkdir(out,{recursive:true});
    await cp(resolve(src,'public'),out,{recursive:true});
    await writePrivacyPage(pathToFileURL(out+'/'),{IEC_PRODUCTION_FINAL:'false'});
    await cp(resolve(root,'shared/auth-callback-redirect.js'),resolve(out,'auth-callback-redirect.js'));
    for(const [input,output] of [['page.html','index.html'],['acesso.html','acesso.html'],['404.html','404.html']]){
      let html=await readFile(resolve(src,'ui',input),'utf8');
      html=html.replaceAll('__IEC_PUBLIC_URL__','http://127.0.0.1:8888').replaceAll('/signout-with-chatgpt?return_to=%2F','/acesso.html?action=logout');
      html=html.replace(/<body([^>]*)>/,`<body$1><aside style="padding:12px;background:#18372c;color:white;text-align:center;font:15px sans-serif">AMBIENTE LOCAL — dados de teste · <a style="color:white" href="/local/inbox">Mensagens de confirmação e recuperação</a> · <a style="color:white" href="http://127.0.0.1:${mode==='public'?8889:8888}">${mode==='public'?'Painel':'Site'}</a></aside>`);
      await writeFile(resolve(out,output),html);
    }
    let app=await readFile(resolve(out,'app.js'),'utf8');
    app=app.replaceAll('__IEC_ADMIN_URL__','http://127.0.0.1:8889').replaceAll('/signin-with-chatgpt?','/acesso.html?').replaceAll('/signout-with-chatgpt?return_to=%2F','/acesso.html?action=logout').replaceAll('Entrar com ChatGPT →','Entrar na minha conta →');
    await writeFile(resolve(out,'app.js'),app);
    for(const entry of ['identity-client','session-client'])await build({entryPoints:[resolve(src,'src',entry+'.mjs')],outfile:resolve(out,entry+'.js'),bundle:true,format:entry==='session-client'?'iife':'esm',platform:'browser',alias:{'@netlify/identity':alias}});
  }
  // Keep dependencies resolvable in the original package. No production bundle is overwritten.
  for(const folder of ['site-principal','painel-administrativo'])await build({entryPoints:[resolve(root,folder,'netlify/functions/api.mts')],outfile:resolve(root,folder,'.local-build/api.mjs'),bundle:true,platform:'node',format:'esm',packages:'external'});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await buildLocal();
import {writePrivacyPage} from '../shared/privacy-build.mjs';

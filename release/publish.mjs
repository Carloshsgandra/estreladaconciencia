import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {prepare,root,cli,run,validateTargets} from './prepare.mjs';
import {validateDeployment,deploymentOrigin} from '../shared/deploy-config.mjs';

const preparing=process.argv.includes('--prepare-only');
const rl=createInterface({input:stdin,output:stdout});
try{
 console.log(preparing?'Preparar arquivos para Netlify.':'Publicar site e painel na Netlify, em produção, a partir dos arquivos locais.');
 console.log('É necessário configurar Identity e as variáveis de Functions nos dois projetos. Não informe segredos neste assistente.');
 const configFile=resolve(root,'.deploy-targets.json');let targets={};
 try{targets=JSON.parse(await readFile(configFile,'utf8'));}catch{}
 for(const [key,label] of [['publicId','Project ID do site público'],['publicUrl','URL HTTPS do site público'],['adminId','Project ID do painel'],['adminUrl','URL HTTPS do painel']]){
  const value=(await rl.question(`${label}${targets[key]?' ['+targets[key]+']':''}: `)).trim();targets[key]=value||targets[key];
 }
 targets=validateTargets(targets);await writeFile(configFile,JSON.stringify(targets,null,2));rl.close();
 const folder=await prepare(targets);
 console.log('Pacotes preparados em '+folder);
 if(!preparing){
  run([cli,'login']);
  // Read the selected projects before uploading: never silently target the wrong account/site.
  for(const role of ['public','admin']){
   const output=run([cli,'api','getSite','--data',JSON.stringify({site_id:targets[role+'Id']})],{stdio:'pipe',encoding:'utf8'});
   let site;try{site=JSON.parse(output.stdout);}catch{throw Error('Não foi possível conferir o projeto '+role+' na Netlify.');}
   const actual=new URL(site.ssl_url||site.url).origin;
   if(actual!==targets[role+'Url'])throw Error(`A URL do projeto ${role} não corresponde à informada. Confira o Project ID antes de publicar.`);
  }
  const environments={};
  for(const role of ['public','admin']){
   const result=run([cli,'env:list','--json','--context','production','--scope','functions','--site',targets[role+'Id']],{cwd:resolve(folder,role),stdio:'pipe',encoding:'utf8'});
   let env;try{env=JSON.parse(result.stdout);}catch{throw Error('Não foi possível validar as variáveis de Functions do '+role+'.');}
   const errors=validateDeployment(role,env);
   if(errors.length)throw Error(role+': '+errors.join(' '));
   // Secrets remain only in process memory; never print or persist this output.
   environments[role]=env;
  }
  if(environments.public.ADMIN_BRIDGE_SECRET!==environments.admin.ADMIN_BRIDGE_SECRET)throw Error('ADMIN_BRIDGE_SECRET é diferente nos dois projetos. Corrija na Netlify.');
  if(deploymentOrigin('ADMIN_SITE_URL',environments.public)!==targets.adminUrl||deploymentOrigin('MAIN_SITE_URL',environments.admin)!==targets.publicUrl)throw Error('As URLs das Functions não correspondem aos destinos escolhidos.');
  if(environments.public.ADMIN_SITE_URL!==targets.adminUrl)throw Error('ADMIN_SITE_URL nas Functions deve ser a URL exata do painel, sem barra final ou espaços.');
  for(const role of ['public','admin']){
   const response=await fetch(new URL('/.netlify/identity/settings',targets[role+'Url']),{redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Ative e configure Identity no projeto '+role+' antes de publicar.');
   const settings=await response.json();if(typeof settings.external!=='object'&&typeof settings.disable_signup!=='boolean')throw Error('Identity não retornou configuração reconhecida no '+role+'.');
   if(role==='admin'&&settings.disable_signup!==true)throw Error('Configure o Identity do painel como somente convite antes de publicar.');
  }
  for(const role of ['public','admin']){
   console.log('Publicando '+role+' em '+targets[role+'Url']);
   run([cli,'deploy','--no-build','--prod','--context','production','--site',targets[role+'Id'],'--dir',resolve(folder,role,'public'),'--functions',resolve(folder,role,'.netlify/functions')],{cwd:resolve(folder,role)});
  }
  console.log('Uploads concluídos. Teste login, e-mail, reserva e painel nas URLs de produção.');
 }
}catch(error){console.error(error.message);console.error('A execução parou. Se um site já foi publicado, ele permanece nessa versão; não houve exclusão de dados.');process.exitCode=1;}finally{rl.close();}

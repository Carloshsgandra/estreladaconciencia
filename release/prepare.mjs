import {cp,mkdir,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {deploymentOrigin} from '../shared/deploy-config.mjs';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const cli=resolve(root,'node_modules/netlify-cli/bin/run.js');
export function run(args,options={}){
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',...options});
 if(result.error)throw result.error;if(result.status!==0)throw Error('A etapa não concluiu. Corrija o erro acima antes de publicar.');
 return result;
}
export function validateTargets(input,{test=false}={}){
 const targets={...input};
 for(const role of ['public','admin']){
  targets[role+'Url']=deploymentOrigin(role+'Url',targets);
  if(!test&&(!/^[a-f0-9-]{36}$/i.test(targets[role+'Id']||'')||new URL(targets[role+'Url']).hostname.endsWith('.invalid')))throw Error('Informe o Project ID e a URL real de cada site na Netlify.');
 }
 if(targets.publicUrl===targets.adminUrl||(!test&&targets.publicId===targets.adminId))throw Error('Site e painel precisam de projetos distintos.');
 return targets;
}
export async function prepare(input,options={}){
 const targets=validateTargets(input,options);
 const req=createRequire(cli);
 const {zipFunctions}=await import(pathToFileURL(req.resolve('@netlify/zip-it-and-ship-it')));
 await mkdir(resolve(root,'.deploy'),{recursive:true});
 const folder=await mkdtemp(resolve(root,'.deploy/pacote-'));
 for(const [role,project] of [['public','site-principal'],['admin','painel-administrativo']]){
  const env={...process.env,ADMIN_SITE_URL:targets.adminUrl,MAIN_SITE_URL:targets.publicUrl,PUBLIC_SITE_URL:targets.publicUrl};
  run([resolve(root,project,'scripts/build-netlify.mjs')],{env});
  const target=resolve(folder,role),functions=resolve(target,'.netlify/functions');
  await mkdir(functions,{recursive:true});
  await cp(resolve(root,project,'dist-netlify'),resolve(target,'public'),{recursive:true});
  let config=await readFile(resolve(root,project,'netlify.toml'),'utf8');
  config=config.replace('command = "npm run build"','command = ""').replaceAll('publish = "dist-netlify"','publish = "public"').replace('functions = "netlify/functions"','functions = ".netlify/functions"').replace('  included_files = ["lib/domain.js"]','');
  await writeFile(resolve(target,'netlify.toml'),config);
  const result=await zipFunctions(resolve(root,project,'netlify/functions'),functions,{basePath:resolve(root,project),repositoryRoot:root,config:{'*':{nodeBundler:'esbuild',nodeVersion:'22.x'}},manifest:resolve(functions,'manifest.json')});
  if(result.length!==1||result[0].name!=='api')throw Error('Pacote de funções incompleto. Publicação interrompida.');
  console.log(`${role}: páginas e Function api empacotadas.`);
 }
 await writeFile(resolve(folder,'targets.json'),JSON.stringify(targets,null,2));
 return folder;
}

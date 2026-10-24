import {spawnSync} from 'node:child_process';
import {root} from './build.mjs';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8085')throw Error('Execute npm run verify para usar somente o banco emulado.');
function run(args,env={}){const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,...env}});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
for(const directory of ['site-principal/tests','painel-administrativo/tests','audit','local/tests']){
 const files=readdirSync(join(root,directory)).filter(file=>directory==='audit'?file.endsWith('.test.mjs'):file.endsWith('.mjs')).map(file=>join(directory,file));
 run(['--test',...files]);
}
run(['local/build.mjs']);
run(['site-principal/scripts/build-netlify.mjs'],{ADMIN_SITE_URL:'https://admin.example.invalid'});
run(['painel-administrativo/scripts/build-netlify.mjs'],{MAIN_SITE_URL:'https://site.example.invalid'});
console.log('VERIFICAÇÃO LOCAL CONCLUÍDA. Builds de teste usam example.invalid, não estão prontos para publicar. Faça o build de produção com as URLs reais.');

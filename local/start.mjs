import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { requireAvailablePorts } from './ports.mjs';
import { resolve } from 'node:path';
import { root } from './build.mjs';
process.chdir(root);
if(Number(process.versions.node.split('.')[0])<22)throw Error('Instale Node.js 22.13 ou superior. A versão atual é '+process.versions.node+'.');
const java=spawnSync('java',['-version'],{encoding:'utf8'});
const javaMajor=Number(((java.stderr||'')+(java.stdout||'')).match(/version "(\d+)/)?.[1]||0);
if(java.status!==0||javaMajor<21)throw Error('Instale Java JDK 21 ou superior e reabra o terminal. O emulador atualizado precisa dessa versão.');
const firebase=resolve(root,'node_modules/firebase-tools/lib/bin/firebase.js');
if(!existsSync(firebase))throw Error('Execute npm run setup primeiro.');
const config=JSON.parse(readFileSync('firebase.local.json','utf8'));
try {
  await requireAvailablePorts([8888,8889,...Object.values(config.emulators).filter(x=>x&&typeof x==='object'&&x.port).map(x=>x.port)]);
} catch(error) {
  console.error(error.message);
  process.exit(1);
}
mkdirSync('.local-data',{recursive:true});
const args=[firebase,'emulators:exec','--only','firestore','--project','demo-iec-local','--config','firebase.local.json','--export-on-exit=.local-data/firestore'];
if(existsSync('.local-data/firestore/firebase-export-metadata.json'))args.push('--import=.local-data/firestore');
args.push('node local/server.mjs');
console.log('Iniciando banco e sites locais. Para salvar e sair, pressione Ctrl+C uma vez e aguarde a exportação.');
const child=spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,FIREBASE_CLI_DISABLE_TELEMETRY:'1'}});
// The terminal delivers Ctrl+C to the entire process group, including Firebase CLI.
process.on('SIGINT',()=>{});
process.on('SIGTERM',()=>child.kill('SIGTERM'));
child.on('exit',code=>process.exit(code||0));

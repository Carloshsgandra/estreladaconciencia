// Suitable for an external scheduler. Default is read-only simulation.
import {initializeApp,cert,deleteApp} from '../site-principal/node_modules/firebase-admin/lib/app/index.js';
import {getFirestore} from '../site-principal/node_modules/firebase-admin/lib/firestore/index.js';
import {retainHealthBatch,retentionMonths} from '../shared/privacy-store.mjs';
const env=process.env,apply=process.argv.includes('--apply');
const explicit=process.argv.find(arg=>arg.startsWith('--project='))?.slice(10);
if(!explicit||explicit!==env.FIREBASE_PROJECT_ID)throw Error('Informe --project=ID exatamente igual a FIREBASE_PROJECT_ID.');
retentionMonths(env);
if(apply&&!process.argv.includes('--confirm=ELIMINAR_FICHAS_VENCIDAS'))throw Error('Para remover, confirme com --confirm=ELIMINAR_FICHAS_VENCIDAS. Sem --apply, apenas simula.');
const emulator=env.FIRESTORE_EMULATOR_HOST;
if(emulator&&(emulator!=='127.0.0.1:8085'||!explicit.startsWith('demo-')))throw Error('O teste local exige emulator 127.0.0.1:8085 e projeto demo-.');
const app=initializeApp(emulator?{projectId:explicit}:{projectId:explicit,credential:cert({projectId:explicit,clientEmail:env.FIREBASE_CLIENT_EMAIL,privateKey:env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n')})});
const db=getFirestore(app);
try{
  let cursor,total={scanned:0,eligible:0,removed:0,needsReview:0};
  for(let batch=0;batch<10000;batch++){
    const result=await retainHealthBatch(db,'retention-job',{dryRun:!apply,cursor,confirmation:apply?'ELIMINAR_FICHAS_VENCIDAS':undefined},env);
    for(const key of Object.keys(total))total[key]+=result[key];
    cursor=result.nextCursor;
    if(!cursor){console.log(JSON.stringify({operation:'health-retention',dryRun:!apply,...total}));break;}
    if(batch===9999)throw Error('Limite operacional atingido. Revisão manual necessária.');
  }
}finally{await db.terminate();await deleteApp(app);}

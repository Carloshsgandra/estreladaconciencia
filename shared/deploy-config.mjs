import {createPrivateKey} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {adminEmails} from './admin-config.mjs';
import {priceBasis} from './pricing.mjs';

export function deploymentOrigin(name,env=process.env) {
  const value=env[name]?.trim();
  if(!value)throw Error(`Configure ${name} com a URL HTTPS do outro site antes do build. O ambiente local usa npm start e não precisa desta variável.`);
  let url;
  try{url=new URL(value);}catch{throw Error(`${name}: URL inválida.`);}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!url.hostname.includes('.')||/^(localhost|127\.)/.test(url.hostname))throw Error(`${name}: use somente a origem HTTPS, sem caminho, senha, consulta ou fragmento.`);
  return url.origin;
}

export function validateDeployment(mode,env=process.env) {
  if(!['public','admin'].includes(mode))throw Error('Informe public ou admin.');
  const problems=[];
  const check=(fn)=>{try{fn();}catch(error){problems.push(error.message);}};
  check(()=>deploymentOrigin(mode==='public'?'ADMIN_SITE_URL':'MAIN_SITE_URL',env));
  if(!env.ADMIN_BRIDGE_SECRET||env.ADMIN_BRIDGE_SECRET.length<32||/^[*•●\s]+$/.test(env.ADMIN_BRIDGE_SECRET))problems.push('ADMIN_BRIDGE_SECRET: informe o segredo real, aleatório, com ao menos 32 caracteres; não copie o valor mascarado. Deve ser igual nos dois sites.');
  if(mode==='public'){
    check(()=>priceBasis(env));
    if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(env.FIREBASE_PROJECT_ID||''))problems.push('FIREBASE_PROJECT_ID ausente ou inválido.');
    if(!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(env.FIREBASE_CLIENT_EMAIL||''))problems.push('FIREBASE_CLIENT_EMAIL: use o e-mail da conta de serviço, não seu e-mail pessoal.');
    check(()=>{try{createPrivateKey((env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n'));}catch{throw Error('FIREBASE_PRIVATE_KEY ausente ou não reconhecida como chave privada PEM.');}});
  }else{
    check(()=>adminEmails(env));
  }
  return problems;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const problems=validateDeployment(process.argv[2]);if(problems.length){console.error(problems.map(x=>'PENDENTE: '+x).join('\n'));process.exitCode=1;}else console.log('Formato das variáveis validado. Isto não confirma credenciais, Identity, entrega de e-mail nem conectividade em produção.');}catch(error){console.error(error.message);process.exitCode=1;}
}

// Local development identity provider. Never imported by production builds.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const digest=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const publicUser=u=>u?{id:u.id,email:u.email,user_metadata:{full_name:u.name},confirmed_at:u.confirmed||null}:null;
export function createAuth(file, now=Date.now) {
  mkdirSync(dirname(file),{recursive:true});
  const data=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{users:[],sessions:[],links:[]};
  const attempts=new Map();
  function save(){writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});renameSync(file+'.tmp',file);}
  function password(value){if(typeof value!=='string'||value.length<8||value.length>128)fail('Use uma senha entre 8 e 128 caracteres.');return value;}
  function setPassword(u,value){u.salt=token();u.hash=scryptSync(password(value),u.salt,64).toString('hex');}
  function email(value){const e=String(value||'').trim().toLowerCase();if(e.length>180||!/^\S+@\S+\.\S+$/.test(e))fail('E-mail inválido.');return e;}
  function userFor(session){const s=data.sessions.find(s=>s.hash===digest(session||'')&&s.expires>now());return s&&data.users.find(u=>u.id===s.userId);}
  function issue(u){const value=token();data.sessions=data.sessions.filter(s=>s.expires>now());data.sessions.push({hash:digest(value),userId:u.id,expires:now()+7*86400000});save();return {user:publicUser(u),session:value};}
  function link(u,type,origin){data.links=data.links.filter(l=>!(l.userId===u.id&&l.type===type));data.links.push({value:token(),userId:u.id,type,origin,expires:now()+3600000});save();}
  function consume(value,type){const l=data.links.find(l=>l.value===value&&l.type===type&&l.expires>now());if(!l)fail('Este link expirou ou já foi utilizado.');return l;}
  return {
    user:session=>publicUser(userFor(session)),
    inbox:()=>data.links.filter(l=>l.expires>now()).map(l=>({email:data.users.find(u=>u.id===l.userId)?.email,type:l.type,url:l.origin+'/acesso.html#'+(l.type==='confirm'?'confirmation_token':'recovery_token')+'='+l.value})),
    execute(action,body,session,origin){
      const key=action+':'+String(body.email||'').toLowerCase();
      if(['login','signup','recovery'].includes(action)){
        const bucket=attempts.get(key)||{count:0,until:now()+60000};
        if(bucket.until<=now()){bucket.count=0;bucket.until=now()+60000;}
        if(++bucket.count>12)fail('Muitas tentativas. Aguarde um minuto.',429);attempts.set(key,bucket);
      }
      if(action==='signup'){
        const e=email(body.email);password(body.password);
        if(data.users.some(u=>u.email===e))fail('Esta conta já existe. Entre ou recupere a senha.');
        const name=String(body.name||'').trim();if(name.length<2||name.length>120)fail('Informe um nome entre 2 e 120 caracteres.');
        const u={id:randomUUID(),email:e,name};setPassword(u,body.password);data.users.push(u);link(u,'confirm',origin);return {user:publicUser(u)};
      }
      if(action==='login'){
        const u=data.users.find(u=>u.email===email(body.email));
        const p=typeof body.password==='string'&&body.password.length<=128?body.password:'';
        const result=scryptSync(p,u?.salt||'missing-account',64);
        if(!u||!timingSafeEqual(result,Buffer.from(u.hash,'hex')))fail('E-mail ou senha incorretos.',401);
        if(!u.confirmed)fail('Confirme seu e-mail na caixa de mensagens local antes de entrar.',403);
        return issue(u);
      }
      if(action==='confirm'){
        const l=consume(body.token,'confirm'),u=data.users.find(u=>u.id===l.userId);
        u.confirmed=new Date(now()).toISOString();data.links=data.links.filter(x=>x!==l);return issue(u);
      }
      if(action==='recovery'){
        const u=data.users.find(u=>u.email===email(body.email));if(u)link(u,'reset',origin);return {ok:true};
      }
      if(action==='reset'){
        password(body.password);const l=consume(body.token,'reset'),u=data.users.find(u=>u.id===l.userId);
        setPassword(u,body.password);data.sessions=data.sessions.filter(s=>s.userId!==u.id);data.links=data.links.filter(x=>x!==l);save();return {user:publicUser(u)};
      }
      if(action==='logout'){data.sessions=data.sessions.filter(s=>s.hash!==digest(session||''));save();return {ok:true,session:''};}
      if(action==='change'){
        const u=userFor(session);if(!u?.confirmed)fail('Entre novamente.',401);setPassword(u,body.password);data.sessions=data.sessions.filter(s=>s.userId!==u.id);save();return {user:publicUser(u),session:''};
      }
      fail('Operação inválida.',404);
    }
  };
}

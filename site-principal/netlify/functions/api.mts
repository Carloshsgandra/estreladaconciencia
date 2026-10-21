import { verifiedIdentity, publicIdentity, IdentityError } from '../../../shared/verified-identity.mjs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Context } from '@netlify/functions';
import { defaults, validDate, validTime, instant, today, addDays, dateObj, minutes, safeVideo } from '../../lib/domain.js';

const ACTIVE = new Set(['pendente', 'confirmado']);
const STATUSES = new Set(['pendente', 'confirmado', 'recusado', 'cancelado', 'concluido']);
const headers = { 'Cache-Control':'no-store, private', 'Content-Type':'application/json; charset=utf-8', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };
class ApiError extends Error { status:number; constructor(message:string,status=400){ super(message); this.status=status; } }
const fail=(message:string,status=400):never=>{ throw new ApiError(message,status); };
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const clean=(value:unknown,max:number,required=false)=>{ if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('Confira os campos preenchidos.'); return String(value).trim(); };
const email=(value:unknown)=>{ const result=clean(value,180,true).toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))fail('E-mail inválido.'); return result; };
const phone=(value:unknown)=>{ const result=clean(value,24,true).replace(/\D/g,''); if(!/^[1-9]{2}9\d{8}$/.test(result))fail('Informe um celular com DDD.'); return result; };
const bool=(value:unknown,message='Confira as confirmações obrigatórias.')=>{ if(value!==true)fail(message); return true; };

function privateKeyFromEnvironment(raw:string|undefined){
  let key=raw?.trim();
  // Netlify stores environment values as strings. Accept both the raw PEM value
  // and JSON copied from a service-account file or from its private_key line.
  try {
    const parsed=key&&JSON.parse(key);
    if(typeof parsed==='string') key=parsed;
    else if(parsed&&typeof parsed.private_key==='string') key=parsed.private_key;
  } catch {
    const value=key?.match(/(?:^|[,{]\s*)["']?private_key["']?\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/s)?.[1];
    if(value) try { key=JSON.parse(value.replace(/^'/,'"').replace(/'$/,'"')); } catch { /* validated below */ }
  }
  return key?.replace(/\\r\\n/g,'\n').replace(/\\n/g,'\n');
}

function database(){
  const projectId=process.env.FIREBASE_PROJECT_ID;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=privateKeyFromEnvironment(process.env.FIREBASE_PRIVATE_KEY);
  if(!projectId||!clientEmail||!privateKey) fail('A agenda ainda não está conectada ao banco de dados.',503);
  if(!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')||!privateKey.includes('-----END PRIVATE KEY-----')) fail('A credencial do banco de dados precisa ser revisada.',503);
  if(!getApps().length) initializeApp({credential:cert({projectId,clientEmail,privateKey})});
  return getFirestore();
}

async function constantEqual(a:string,b:string){
  const enc=new TextEncoder();
  const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);
  const xx=new Uint8Array(x),yy=new Uint8Array(y); let diff=0;
  for(let i=0;i<xx.length;i++)diff|=xx[i]^yy[i];
  return diff===0;
}

function allowedOrigin(req:Request,admin:boolean){
  const origin=req.headers.get('origin');
  const expected=admin?process.env.ADMIN_SITE_URL:new URL(req.url).origin;
  if(!origin||origin!==expected)fail('Origem da solicitação não permitida.',403);
}

function actor(raw:any){
  const id=raw?.id||raw?.sub;
  if(!id||!raw?.email)return null;
  // Netlify Functions exposes signed Identity JWT claims in clientContext.user. A valid
  // Identity session represents a confirmed account when confirmation is required.
  return { userId:String(id), email:String(raw.email).toLowerCase(), displayName:String(raw.name||raw.userMetadata?.full_name||raw.user_metadata?.full_name||raw.email), confirmed:Boolean(raw.confirmedAt||raw.confirmed_at||raw.email_confirmed_at||raw.sub) };
}

async function rateLimit(db:any,key:string){
  const bucket=Math.floor(Date.now()/600000); const ref=db.collection('rateLimits').doc(`${key}_${bucket}`);
  await db.runTransaction(async(tx:any)=>{ const snap=await tx.get(ref); const count=snap.exists?Number(snap.data().count)+1:1; if(count>40)fail('Muitas alterações em pouco tempo. Aguarde alguns minutos.',429); tx.set(ref,{count,bucket,expiresAt:Date.now()+86400000},{merge:true}); });
}

async function audit(tx:any,db:any,who:string,action:string,target:string){
  tx.set(db.collection('audit').doc(crypto.randomUUID()),{actor:who,action,target,occurredAt:Date.now()});
}

function visibleBooking(data:any,admin:boolean){
  const copy={...data}; if(!admin)delete copy.internal; return copy;
}

async function loadConfiguration(db:any){
  const ref=db.collection('configuration').doc('main'); let snap=await ref.get();
  if(!snap.exists){
    const d=defaults();
    await db.runTransaction(async (batch:any)=>{
    if((await batch.get(ref)).exists)return;
    batch.create(ref,{services:d.services,settings:d.settings,version:0,kind:'main',createdAt:Date.now()});
    // Firestore reserves document IDs matching `__.*__`; use a valid marker ID.
    for(const name of ['bookings','bookingSlots','ceremonySeats','activeBookings','audit','rateLimits'])batch.set(db.collection(name).doc('_schema'),{meta:true,schemaVersion:1});
    }); snap=await ref.get();
  }
  let data=snap.data();
  if(Number(data.settings?.catalogVersion||0)<3){
    const d=defaults(),copy=new Map(d.services.map((s:any)=>[s.id,s]));
    const services=data.services.map((s:any)=>copy.has(s.id)?{...s,title:(copy.get(s.id) as any).title,description:(copy.get(s.id) as any).description}:s);
    const settings={...data.settings,bio:d.settings.bio,catalogVersion:3};
    await ref.update({services,settings,version:Number(data.version||0)+1}); data={...data,services,settings,version:Number(data.version||0)+1};
  }
  const tarotPrice=today()>='2027-01-01'?137:97;
  return {services:data.services.map((s:any)=>s.id==='avulsa'?{...s,price:tarotPrice}:s),settings:data.settings,rev:Number(data.version||0)};
}

async function listCeremonies(db:any,admin:boolean){
  const query=await db.collection('configuration').where('kind','==','ceremony').orderBy('startAt','asc').get(); const rows=[];
  for(const doc of query.docs){ const c=doc.data(); if(!admin&&c.startAt<=Date.now())continue; const seats=await db.collection('ceremonySeats').where('ceremonyId','==',doc.id.slice(9)).get(); rows.push({id:doc.id.slice(9),date:c.date,time:c.time,capacity:c.capacity,open:Boolean(c.open),startAt:c.startAt,version:Number(c.version||0),hasRegistrations:admin?!(await db.collection('bookings').where('ceremonyId','==',doc.id.slice(9)).limit(1).get()).empty:undefined,remaining:Math.max(0,c.capacity-seats.size)}); }
  return rows;
}

async function state(db:any,admin:boolean,user:any){
  const config=await loadConfiguration(db); let query:any=db.collection('bookings');
  query=admin?query.orderBy('createdAt','desc').limit(3000):user?query.where('userId','==',user.userId).orderBy('createdAt','desc').limit(1000):null;
  const appointments=query?(await query.get()).docs.map((d:any)=>visibleBooking({...d.data(),id:d.id,_version:Number(d.data().version||0)},admin)):[];
  const busySnap=admin?null:await db.collection('bookingSlots').where('endAt','>',Date.now()).get();
  const busy=busySnap?busySnap.docs.map((d:any)=>({date:d.data().date,time:d.data().time,duration:(d.data().endAt-d.data().startAt)/60000,status:'confirmado'})):[];
  const settings={...config.settings}; if(!admin)settings.video='';
  return {version:1,rev:config.rev,services:config.services,settings,appointments,busy,ceremonies:await listCeremonies(db,admin),user:user?{name:user.displayName,email:user.email}:null,admin};
}

function validateSlot(config:any,appointment:any,duration:number){
  if(!validDate(appointment.date)||!validTime(appointment.time))fail('Data ou horário inválido.'); const start=instant(appointment.date,appointment.time);
  if(start<Date.now()+3600000||appointment.date>addDays(today(),180))fail('Escolha um horário entre uma hora a partir de agora e os próximos 180 dias.');
  const week=config.settings.week[dateObj(appointment.date).getUTCDay()];
  if(!week?.on||config.settings.blocked.includes(appointment.date)||minutes(appointment.time)<minutes(week.start)||minutes(appointment.time)+duration>minutes(week.end)||(minutes(appointment.time)-minutes(week.start))%config.settings.interval!==0)fail('Este horário não está disponível.',409);
  return start;
}

function validateMedicationClasses(value:any){
  const allowed=['Antidepressivos','Estabilizadores de humor','Estimulantes','Medicamentos para dormir','Substâncias que atuam no sistema nervoso'];
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>allowed.length||value.some(v=>!allowed.includes(v))||new Set(value).size!==value.length)fail('Classes de medicamentos inválidas.');
  return value;
}
function validateAnamnesis(value:any,identity:any){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Preencha a ficha de anamnese.');
  const yesNo=(v:unknown)=>{ if(typeof v!=='string'||!['sim','nao'].includes(v))fail('Responda todos os campos obrigatórios.'); return String(v); };
  const details=(answer:string,v:unknown,max=2000)=>clean(v,max,answer==='sim'); const fullName=clean(value.fullName,120,true);
  if(!validDate(value.birthDate)||value.birthDate>=today())fail('Informe uma data de nascimento válida.');
  const conditions=Array.isArray(value.conditions)?value.conditions.map((x:unknown)=>clean(x,60,true)):fail('Selecione as condições de saúde aplicáveis.');
  const allowed=new Set(['hipertensao','cardiaca','convulsoes','neurologica','hepatica_renal','diabetes','outra','nenhuma']);
  if(!conditions.length||conditions.some((x:string)=>!allowed.has(x))||(conditions.includes('nenhuma')&&conditions.length>1))fail('Revise as condições de saúde selecionadas.');
  const physicalDiagnosis=yesNo(value.physicalDiagnosis),mentalDiagnosis=yesNo(value.mentalDiagnosis),crisisHistory=yesNo(value.crisisHistory),professionalCare=yesNo(value.professionalCare),emotionalVulnerability=yesNo(value.emotionalVulnerability),currentMedication=yesNo(value.currentMedication),recentSubstances=yesNo(value.recentSubstances),priorExperience=yesNo(value.priorExperience);
  if(fullName.toLocaleLowerCase('pt-BR')!==clean(value.signature,120,true).toLocaleLowerCase('pt-BR'))fail('A assinatura digitada deve corresponder ao nome completo.');
  bool(value.truthConsent); bool(value.changeConsent); bool(value.evaluationConsent); bool(value.generalConsent); bool(value.healthDataConsent,'É necessário consentir explicitamente com o tratamento dos dados sensíveis de saúde.');
  return {fullName,birthDate:value.birthDate,phone:phone(value.phone),email:identity.email,emergencyContact:clean(value.emergencyContact,120,true),emergencyPhone:phone(value.emergencyPhone),relationship:clean(value.relationship,80,true),physicalDiagnosis,physicalDiagnosisDetails:details(physicalDiagnosis,value.physicalDiagnosisDetails),conditions,otherCondition:conditions.includes('outra')?clean(value.otherCondition,500,true):'',currentTreatments:clean(value.currentTreatments,2000),allergies:clean(value.allergies,1000),pregnancy:yesNo(value.pregnancy),pregnancyDetails:details(yesNo(value.pregnancy),value.pregnancyDetails),mentalDiagnosis,mentalDiagnosisDetails:details(mentalDiagnosis,value.mentalDiagnosisDetails),crisisHistory,crisisHistoryDetails:details(crisisHistory,value.crisisHistoryDetails),professionalCare,professionalCareDetails:details(professionalCare,value.professionalCareDetails),recentGrief:yesNo(value.recentGrief),recentGriefDetails:details(yesNo(value.recentGrief),value.recentGriefDetails),emotionalVulnerability,emotionalVulnerabilityDetails:details(emotionalVulnerability,value.emotionalVulnerabilityDetails),currentMedication,medicationDetails:details(currentMedication,value.currentMedicationDetails??value.medicationDetails),medicationClasses:validateMedicationClasses(value.medicationClasses),recentAlcohol:yesNo(value.recentAlcohol),recentAlcoholDetails:details(yesNo(value.recentAlcohol),value.recentAlcoholDetails),recentSubstances,substanceDetails:details(recentSubstances,value.recentSubstancesDetails??value.substanceDetails),compatibilityQuestions:clean(value.compatibilityQuestions,1500),priorExperience,priorExperienceDetails:details(priorExperience,value.priorExperienceDetails),motivation:clean(value.motivation,2000,true),concerns:clean(value.concerns,1500),needs:clean(value.needs,1500),importantInformation:clean(value.importantInformation,2000),signature:clean(value.signature,120,true),truthConsent:true,changeConsent:true,evaluationConsent:true,generalConsent:true,healthDataConsent:true,submittedAt:new Date().toISOString(),schemaVersion:1};
}

async function createNormal(db:any,body:any,user:any,admin:boolean,config:any){
  const v=body.appointment; if(!v||typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(v.id))fail('Reserva inválida.'); const service=config.services.find((s:any)=>s.id===v.service&&s.active&&s.id!=='mapa'); if(!service)fail('Este atendimento não está disponível.');
  if(!['online','presencial'].includes(v.mode)||!(v.mode==='online'?config.settings.online:config.settings.presential))fail('Modalidade indisponível.'); if(!admin)bool(body.consent,'É necessário aceitar o uso dos dados para agendar.');
  const start=validateSlot(config,v,service.duration),owner=admin?`manual:${crypto.randomUUID()}`:user.userId;
  const appointment={service:service.id,title:service.title,duration:service.duration,price:service.price,date:v.date,time:v.time,mode:v.mode,name:clean(v.name,100,true),email:admin?email(v.email):user.email,phone:phone(v.phone),topic:clean(v.topic,100,true),intention:clean(v.intention||'',1500),status:'pendente',created:new Date().toISOString(),createdAt:Date.now(),startAt:start,endAt:start+service.duration*60000,userId:owner,notes:'',cards:'',video:'',location:v.mode==='presencial'?config.settings.address:'',version:0,type:'appointment'};
  const bookingRef=db.collection('bookings').doc(v.id),slotIds=[];for(let at=start;at<appointment.endAt;at+=15*60000){const d=new Date(at),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace(':','');slotIds.push(`${v.date}_${parts}`);}appointment.slotIds=slotIds;
  await db.runTransaction(async(tx:any)=>{const configSnap=await tx.get(db.collection('configuration').doc('main'));if(Number(configSnap.data()?.version||0)!==config.rev)fail('A disponibilidade mudou. Atualize a página.',409);const booking=await tx.get(bookingRef),slotRefs=slotIds.map(id=>db.collection('bookingSlots').doc(id)),slots=await Promise.all(slotRefs.map((ref:any)=>tx.get(ref)));if(booking.exists)fail('Reserva já existente.',409);if(slots.some((slot:any)=>slot.exists))fail('Este horário acabou de ser reservado.',409);tx.create(bookingRef,appointment);slotRefs.forEach((ref:any,index:number)=>tx.create(ref,{bookingId:v.id,date:v.date,time:v.time,slot:slotIds[index],startAt:start,endAt:appointment.endAt}));tx.set(db.collection('activeBookings').doc(`slot_${v.id}`),{bookingId:v.id,userId:owner,type:'appointment'});await audit(tx,db,admin?'administrator':owner,'create',v.id);});
}

async function createCeremonyBooking(db:any,body:any,user:any){
  const ceremonyId=clean(body.ceremonyId,100,true);if(!/^[a-zA-Z0-9_-]+$/.test(ceremonyId))fail('Cerimônia inválida.');const anamnesis=validateAnamnesis(body.anamnesis,user),ceremonyRef=db.collection('configuration').doc(`ceremony_${ceremonyId}`),bookingId=crypto.randomUUID(),bookingRef=db.collection('bookings').doc(bookingId),activeRef=db.collection('activeBookings').doc(`${user.userId}_${ceremonyId}`);
  await db.runTransaction(async(tx:any)=>{const [ceremony,duplicate]=await Promise.all([tx.get(ceremonyRef),tx.get(activeRef)]);if(!ceremony.exists)fail('Cerimônia não encontrada.',404);if(duplicate.exists)fail('Você já possui uma inscrição ativa nesta cerimônia.',409);const c=ceremony.data();if(!c.open)fail('As inscrições desta cerimônia estão fechadas.',409);if(c.startAt<=Date.now())fail('Esta cerimônia já ocorreu ou está em andamento.',409);if(!Number.isInteger(c.capacity)||c.capacity<1||c.capacity>500)fail('Capacidade inválida.');let seatNumber=0;for(let i=1;i<=c.capacity;i++){const seat=await tx.get(db.collection('ceremonySeats').doc(`${ceremonyId}_${i}`));if(!seat.exists){seatNumber=i;break;}}if(!seatNumber)fail('Esta cerimônia está lotada.',409);const booking={type:'ceremony',ceremonyId,date:c.date,time:c.time,startAt:c.startAt,endAt:c.startAt+14400000,status:'pendente',title:'Cerimônia com a medicina do Ayahuasca',duration:240,price:0,mode:'presencial',topic:'Participação em cerimônia',intention:anamnesis.motivation,notes:'',cards:'',video:'',location:'',name:anamnesis.fullName,email:user.email,phone:anamnesis.phone,userId:user.userId,seatNumber,anamnesis,internal:{anamnesisReceived:true,needsClarification:false,professionalReview:false,safetyEvaluationPending:true,notes:'',evaluationDate:'',responsible:''},created:new Date().toISOString(),createdAt:Date.now(),version:0};tx.create(bookingRef,booking);tx.create(db.collection('ceremonySeats').doc(`${ceremonyId}_${seatNumber}`),{ceremonyId,seatNumber,bookingId,userId:user.userId,createdAt:Date.now()});tx.create(activeRef,{ceremonyId,bookingId,userId:user.userId,type:'ceremony'});await audit(tx,db,user.userId,'ceremony:create',bookingId);});
}

async function updateBooking(db:any,body:any,user:any,admin:boolean,config:any){
  const v=body.appointment;
  if(!v?.id)fail('Reserva inválida.');
  const ref=db.collection('bookings').doc(clean(v.id,100,true));
  await db.runTransaction(async(tx:any)=>{
    const snap=await tx.get(ref);
    if(!snap.exists)fail('Consulta não encontrada.',404);
    const old=snap.data();
    if(!admin&&old.userId!==user.userId)fail('Consulta não encontrada.',404);
    if(Number(body.version)!==Number(old.version||0))fail('Esta reserva mudou em outra sessão. Atualize a página.',409);
    const currentConfig=await tx.get(db.collection('configuration').doc('main'));
    if(Number(currentConfig.data()?.version||0)!==config.rev)fail('A disponibilidade mudou. Atualize a página.',409);
    const next={...old};
    if(!ACTIVE.has(old.status)&&v.status!==old.status)fail('Esta reserva já foi encerrada. Faça uma nova inscrição.',409);
    if(old.type==='ceremony'){
      if((v.ceremonyId&&v.ceremonyId!==old.ceremonyId)||(v.date&&v.date!==old.date)||(v.time&&v.time!==old.time))fail('Para trocar a cerimônia, cancele e faça uma nova inscrição.',409);
      if(v.status==='concluido'&&old.endAt>Date.now())fail('A cerimônia só pode ser concluída após o término.',409);
      if(v.status==='recusado'&&old.status!=='pendente')fail('Só inscrições pendentes podem ser recusadas.',409);
      if(!admin){
        if(v.status!=='cancelado'||!ACTIVE.has(old.status))fail('Alteração não permitida.',403);
        next.status='cancelado';
      }else{
        if(!STATUSES.has(v.status))fail('Situação inválida.');
        next.status=v.status;
        if(v.internal){
          const i=v.internal;
          next.internal={anamnesisReceived:Boolean(i.anamnesisReceived),needsClarification:Boolean(i.needsClarification),professionalReview:Boolean(i.professionalReview),safetyEvaluationPending:Boolean(i.safetyEvaluationPending),notes:clean(i.notes||'',5000),evaluationDate:i.evaluationDate?clean(i.evaluationDate,10):'',responsible:clean(i.responsible||'',120)};
          if(next.internal.evaluationDate&&!validDate(next.internal.evaluationDate))fail('Data de avaliação inválida.');
        }
      }
      if(ACTIVE.has(old.status)&&!ACTIVE.has(next.status)){
        tx.delete(db.collection('ceremonySeats').doc(`${old.ceremonyId}_${old.seatNumber}`));
        tx.delete(db.collection('activeBookings').doc(`${old.userId}_${old.ceremonyId}`));
      }
    }else{
      const moved=v.date!==old.date||v.time!==old.time;
      if(!admin&&moved&&v.status!=='pendente')fail('Alteração não permitida.',403);
      if(!admin&&old.startAt-Date.now()<config.settings.lead*3600000)fail('O prazo de alteração terminou. Fale com o instituto.');
      if(moved){
        if(!ACTIVE.has(old.status))fail('Esta consulta não pode ser remarcada.');
        const start=validateSlot(config,v,old.duration),endAt=start+old.duration*60000,newSlotIds=[];
        for(let at=start;at<endAt;at+=15*60000){const d=new Date(at),part=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace(':','');newSlotIds.push(`${v.date}_${part}`);}
        const newRefs=newSlotIds.map(id=>db.collection('bookingSlots').doc(id));
        const slots=await Promise.all(newRefs.map((slotRef:any)=>tx.get(slotRef)));
        if(slots.some((slot:any)=>slot.exists&&slot.data().bookingId!==v.id))fail('Este horário acabou de ser reservado.',409);
        (old.slotIds||[]).filter((id:string)=>!newSlotIds.includes(id)).forEach((id:string)=>tx.delete(db.collection('bookingSlots').doc(id)));
        newRefs.forEach((slotRef:any,index:number)=>{if(!slots[index].exists)tx.create(slotRef,{bookingId:v.id,date:v.date,time:v.time,slot:newSlotIds[index],startAt:start,endAt});});
        Object.assign(next,{date:v.date,time:v.time,startAt:start,endAt,slotIds:newSlotIds,status:'pendente',video:''});
      }else if(!admin){
        if(v.status!=='cancelado'||!ACTIVE.has(old.status))fail('Alteração não permitida.',403);
        next.status='cancelado';
      }else{
        if(!STATUSES.has(v.status))fail('Situação inválida.');
        if(v.status==='concluido'&&old.endAt>Date.now())fail('A consulta só pode ser concluída após o término.',409);
        if(v.status==='recusado'&&old.status!=='pendente')fail('Só solicitações pendentes podem ser recusadas.',409);
        next.status=v.status;next.notes=clean(v.notes||'',5000);next.cards=clean(v.cards||'',300);next.video=clean(v.video||'',2048);next.location=clean(v.location||'',400);next.reason=clean(v.reason||'',500);
        if(!safeVideo(next.video))fail('O link de vídeo deve começar com https://.');
        if(next.status==='confirmado'&&(next.mode==='online'?!next.video:!next.location))fail('Informe o link ou endereço antes de confirmar.');
        if(next.status==='recusado'&&!next.reason)fail('Informe o motivo da recusa.');
      }
      if(ACTIVE.has(old.status)&&!ACTIVE.has(next.status)){
        (old.slotIds||[`${old.date}_${old.time.replace(':','')}`]).forEach((id:string)=>tx.delete(db.collection('bookingSlots').doc(id)));
        tx.delete(db.collection('activeBookings').doc(`slot_${v.id}`));
      }
    }
    next.version=Number(old.version||0)+1;
    tx.update(ref,next);
    await audit(tx,db,admin?'administrator':user.userId,`update:${next.status}`,v.id);
  });
}

async function ceremonyAdmin(db:any,body:any){
  if(body.type==='ceremony:create'){if(!validDate(body.date)||!validTime(body.time)||instant(body.date,body.time)<=Date.now())fail('Data ou horário inválido.');const capacity=Number(body.capacity);if(!Number.isInteger(capacity)||capacity<1||capacity>500)fail('A capacidade deve ficar entre 1 e 500.');const id=crypto.randomUUID();await db.collection('configuration').doc(`ceremony_${id}`).create({kind:'ceremony',date:body.date,time:body.time,startAt:instant(body.date,body.time),capacity,open:true,version:0,createdAt:Date.now()});return;}
  const id=clean(body.ceremonyId,100,true);if(!/^[a-zA-Z0-9_-]+$/.test(id))fail('Cerimônia inválida.');const ref=db.collection('configuration').doc(`ceremony_${id}`);await db.runTransaction(async(tx:any)=>{const snap=await tx.get(ref);if(!snap.exists)fail('Cerimônia não encontrada.',404);const c=snap.data();if(Number(body.version)!==Number(c.version||0))fail('A cerimônia mudou em outra sessão.',409);if(body.type==='ceremony:toggle'){if(typeof body.open!=='boolean')fail('Situação inválida.');if(body.open&&c.startAt<=Date.now())fail('Esta cerimônia já ocorreu.',409);tx.update(ref,{open:body.open,version:Number(c.version||0)+1});return;}if(body.type==='ceremony:delete'){const seats=await tx.get(db.collection('bookings').where('ceremonyId','==',id).limit(1));if(!seats.empty)fail('Cerimônias com inscrições não podem ser excluídas.',409);tx.delete(ref);return;}fail('Operação não reconhecida.');});
}

async function configure(db:any,body:any,config:any){
  if(Number(body.version)!==config.rev)fail('Configuração alterada em outra sessão.',409);const candidate={...defaults(),services:body.services,settings:body.settings},ids=new Set(['avulsa','mentoria','mapa','retorno']);if(!Array.isArray(candidate.services)||candidate.services.length!==4||new Set(candidate.services.map((s:any)=>s?.id)).size!==4||candidate.services.some((s:any)=>!ids.has(s?.id)||clean(s.title,60,true).length<2||clean(s.description,600,true).length<2||!Number.isInteger(s.duration)||s.duration<15||s.duration>240||s.duration%15||!Number.isFinite(s.price)||s.price<0||s.price>100000||typeof s.active!=='boolean'))fail('Confira os serviços.');const st=candidate.settings;if(!st||!Array.isArray(st.week)||st.week.length!==7||st.week.some((w:any)=>typeof w.on!=='boolean'||!validTime(w.start)||!validTime(w.end)||minutes(w.start)>=minutes(w.end))||!Array.isArray(st.blocked)||st.blocked.some((d:any)=>!validDate(d))||![15,30,60].includes(st.interval)||!Number.isInteger(st.lead)||st.lead<0||st.lead>168||!safeVideo(st.video||'')||clean(st.name||'',100).length>100||clean(st.bio||'',2500,true).length>2500||clean(st.address||'',400).length>400||(clean(st.whatsapp||'',16)&&!/^[1-9]{2}9\d{8}$/.test(clean(st.whatsapp||'',16).replace(/\D/g,'')))||typeof st.online!=='boolean'||typeof st.presential!=='boolean'||(st.presential&&!clean(st.address||'',400,true)))fail('Confira a disponibilidade e os dados do instituto.');const ref=db.collection('configuration').doc('main');await db.runTransaction(async(tx:any)=>{const snap=await tx.get(ref);if(Number(snap.data()?.version||0)!==Number(body.version))fail('Configuração alterada em outra sessão.',409);tx.update(ref,{services:candidate.services,settings:st,version:Number(body.version)+1});await audit(tx,db,'administrator','settings','main');});
}

async function action(db:any,body:any,admin:boolean,user:any){
  const config=await loadConfiguration(db);await rateLimit(db,admin?'administrator':user.userId);if(body.type==='config'){if(!admin)fail('Acesso administrativo necessário.',403);return configure(db,body,config);}if(body.type==='create')return createNormal(db,body,user,admin,config);if(body.type==='ceremony:book'){if(admin)fail('Use uma conta de participante.',403);return createCeremonyBooking(db,body,user);}if(body.type==='update')return updateBooking(db,body,user,admin,config);if(String(body.type).startsWith('ceremony:')){if(!admin)fail('Acesso administrativo necessário.',403);return ceremonyAdmin(db,body);}fail('Operação não reconhecida.');
}

export default async function handler(req:Request,context:Context){
  try{const secret=process.env.ADMIN_BRIDGE_SECRET||'',provided=req.headers.get('X-Admin-Bridge')||'',admin=Boolean(secret&&provided&&await constantEqual(provided,secret));if(provided&&!admin)fail('Acesso administrativo não autorizado.',403);const raw=admin?null:await verifiedIdentity(req),user=actor(raw);if(req.method==='GET'&&new URL(req.url).pathname==='/api/session')return response({user:publicIdentity(raw),authVersion:'2026-10-20-session-v2'},raw?200:401);if(admin)allowedOrigin(req,true);if(req.method==='GET')return response(await state(database(),admin,user));if(req.method!=='POST')fail('Método não permitido.',405);allowedOrigin(req,admin);if(!admin&&!user)fail('Entre na sua conta para continuar.',401);if(!admin&&!user.confirmed)fail('Confirme seu e-mail antes de continuar.',403);if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))fail('Formato não permitido.',415);const rawBody=await req.text();if(new TextEncoder().encode(rawBody).byteLength>65536)fail('Conteúdo maior que o permitido.',413);let body:any;try{body=JSON.parse(rawBody);}catch{fail('Não foi possível ler a solicitação.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('Solicitação inválida.');const db=database();await action(db,body,admin,user);return response(await state(db,admin,user));}
  catch(error:any){if(error instanceof IdentityError)return response({error:error.message,code:error.code},error.status);if(error instanceof ApiError)return response({error:error.message},error.status);console.error('API operation failed',error?.name,error?.code);return response({error:'Não foi possível concluir. Tente novamente em instantes.'},500);}
}

// Named exports support isolated tests; only the default handler is routed by Netlify.
export { actor, validateAnamnesis, createCeremonyBooking, createNormal, updateBooking, ceremonyAdmin, visibleBooking, state };

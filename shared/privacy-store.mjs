import {createHash} from 'node:crypto';
import {PrivacyError} from './reauth.mjs';
const active=new Set(['pendente','confirmado']);
const fingerprint=id=>createHash('sha256').update('iec-privacy-v1:'+id).digest('hex');
function requireIdentity(actor){if(typeof actor!=='string'||!actor||actor.length>256)throw new PrivacyError('Identificação de acesso ausente.',403);}
async function log(db,actor,action,count,tx){
  const row={actorHash:fingerprint(actor),action,count,occurredAt:Date.now()};
  const ref=db.collection('privacyAudit').doc();
  if(tx)tx.create(ref,row);else await ref.create(row);
}
export function retentionMonths(env=process.env){
  const raw=env.HEALTH_RETENTION_MONTHS;
  if(!/^[1-9]\d{0,2}$/.test(raw||'')||Number(raw)>120)throw new PrivacyError('Configure HEALTH_RETENTION_MONTHS entre 1 e 120, conforme política aprovada.',503);
  return Number(raw);
}
export function retentionDeadline(submittedAt,months){
  const date=new Date(submittedAt);
  if(!Number.isFinite(date.getTime()))return null;
  const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+months);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,last));return date.getTime();
}
export async function exportPersonalData(db,actor,{admin=false}={}){
  requireIdentity(actor);
  const query=admin?db.collection('bookings'):db.collection('bookings').where('userId','==',actor);
  const snap=await query.limit(1001).get();
  if(snap.size>1000)throw new PrivacyError('Volume acima do limite seguro de exportação. Solicite uma exportação assistida ao controlador.',413);
  const records=snap.docs.filter(d=>!d.data().meta).map(doc=>{
    const data={...doc.data(),id:doc.id};
    delete data.internal;
    if(admin){ // Explicit allowlist avoids leaking future sensitive fields.
      const fields=['id','name','email','phone','type','service','title','date','time','duration','price','mode','status','createdAt'];
      return Object.fromEntries(fields.filter(key=>data[key]!==undefined).map(key=>[key,data[key]]));
    }
    return data;
  });
  await log(db,actor,admin?'agenda:export':'subject:export',records.length);
  return {exportedAt:new Date().toISOString(),scope:admin?'agenda-sem-fichas':'dados-do-titular-sem-avaliacoes-internas',records};
}
function stripHealth(tx,db,doc){
  const row=doc.data(),next={...row};
  for(const field of ['anamnesis','internal','intention','notes','cards','reason'])delete next[field];
  next.healthErasedAt=new Date().toISOString();
  next.version=Number(row.version||0)+1;
  if(active.has(row.status)){
    next.status='cancelado';
    if(row.ceremonyId&&row.seatNumber)tx.delete(db.doc(`ceremonySeats/${row.ceremonyId}_${row.seatNumber}`));
    if(row.ceremonyId&&row.userId)tx.delete(db.doc(`activeBookings/${row.userId}_${row.ceremonyId}`));
  }
  tx.set(doc.ref,next);
}
export async function eraseOwnHealth(db,actor,confirmation){
  requireIdentity(actor);
  if(confirmation!=='EXCLUIR_MINHAS_FICHAS')throw new PrivacyError('Confirme explicitamente a exclusão das fichas.');
  return db.runTransaction(async tx=>{
    const snap=await tx.get(db.collection('bookings').where('userId','==',actor).limit(101));
    if(snap.size>100)throw new PrivacyError('Solicite a exclusão assistida ao controlador: volume acima do limite seguro.',413);
    const targets=snap.docs.filter(doc=>doc.data().type==='ceremony'&&(doc.data().anamnesis||doc.data().internal));
    targets.forEach(doc=>stripHealth(tx,db,doc));
    if(targets.length)await log(db,actor,'health:erase-by-subject',targets.length,tx);
    return {removed:targets.length,scope:'fichas-e-avaliacoes',accountDeleted:false};
  });
}
export async function retainHealthBatch(db,actor,{dryRun=true,cursor,confirmation}={},env=process.env){
  requireIdentity(actor);const months=retentionMonths(env);
  if(typeof dryRun!=='boolean')throw new PrivacyError('dryRun deve ser booleano.');
  if(cursor!==undefined&&(typeof cursor!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(cursor)))throw new PrivacyError('Cursor inválido.');
  if(!dryRun&&confirmation!=='ELIMINAR_FICHAS_VENCIDAS')throw new PrivacyError('Confirme a eliminação das fichas vencidas.');
  let query=db.collection('bookings').orderBy('__name__').limit(100);
  if(cursor)query=query.startAfter(cursor);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(query);let eligible=0,needsReview=0;
    for(const doc of snap.docs){
      const row=doc.data();if(row.type!=='ceremony'||(!row.anamnesis&&!row.internal))continue;
      const at=row.anamnesis?.consentReceipt?.acceptedAt||row.anamnesis?.submittedAt;
      const deadline=at?retentionDeadline(at,months):null;
      if(deadline===null){needsReview++;continue;}
      if(deadline>Date.now())continue;
      eligible++;if(!dryRun)stripHealth(tx,db,doc);
    }
    if(!dryRun&&eligible)await log(db,actor,'health:retention',eligible,tx);
    return {dryRun,months,scanned:snap.size,eligible,removed:dryRun?0:eligible,needsReview,nextCursor:snap.size===100?snap.docs.at(-1).id:null};
  });
}

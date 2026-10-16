import { getConnectionString } from '@netlify/database';
import { getUser } from '@netlify/identity';
import type { Context } from '@netlify/functions';
import postgres from 'postgres';
import { defaults, validateStore, validDate, validTime, instant, today, addDays, dateObj, minutes, safeVideo } from '../../lib/domain.js';

let sql: ReturnType<typeof postgres>;
const secureHeaders = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const fail = (message: string, status = 400): never => { throw new ApiError(message, status); };
const respond = (data: unknown, status = 200) => Response.json(data, { status, headers: secureHeaders });
const json = (value: unknown) => sql.json(value as any);

function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('Confira os campos preenchidos.');
  return (value as string).trim();
}

function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) fail('Origem da solicitação não permitida.', 403);
}

async function constantEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const xx = new Uint8Array(x), yy = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xx.length; i++) diff |= xx[i] ^ yy[i];
  return diff === 0;
}

function identity(user: any) {
  if (!user?.id || !user?.email) return null;
  return { userId: user.id, email: String(user.email).toLowerCase(), displayName: user.user_metadata?.full_name || user.email };
}

async function loadConfig() {
  sql ??= postgres(getConnectionString(), { max: 2, idle_timeout: 20, connect_timeout: 10 });
  const d = defaults();
  await sql`INSERT INTO configuration (id,data,version) VALUES ('main',${json({ services: d.services, settings: d.settings })},0) ON CONFLICT (id) DO NOTHING`;
  const [row] = await sql`SELECT data,version FROM configuration WHERE id='main'`;
  let data: any = row.data;
  if (data.settings?.catalogVersion !== 2) {
    const byId = new Map(d.services.map((service: any) => [service.id, service]));
    data = { ...data, services: data.services.map((service: any) => byId.has(service.id) ? { ...service, ...byId.get(service.id) } : service), settings: { ...data.settings, whatsapp: '11945915395', configured: true, catalogVersion: 2 } };
    const updated = await sql`UPDATE configuration SET data=${json(data)},version=version+1 WHERE id='main' AND version=${row.version} RETURNING version`;
    if (!updated.length) return loadConfig();
    row.version = updated[0].version;
  }
  const tarotPrice = today() >= '2027-01-01' ? 137 : 97;
  data.services = data.services.map((service: any) => service.id === 'avulsa' ? { ...service, price: tarotPrice } : service);
  return { ...data, rev: Number(row.version) };
}

async function state(admin: boolean, user: any) {
  const c = await loadConfig();
  if (user && !admin) await sql`UPDATE bookings SET user_id=${user.userId},version=version+1 WHERE user_id LIKE 'manual:%' AND email=${user.email}`;
  const rows = admin
    ? await sql`SELECT data,version FROM bookings ORDER BY start_at DESC LIMIT 3000`
    : user
      ? await sql`SELECT data,version FROM bookings WHERE user_id=${user.userId} ORDER BY start_at DESC LIMIT 1000`
      : [];
  const appointments = rows.map((row: any) => ({ ...row.data, _version: Number(row.version) }));
  const busy = admin ? [] : (await sql`SELECT date,time,start_at,end_at FROM bookings WHERE status IN ('pendente','confirmado') AND end_at>${Date.now()} AND start_at<${instant(addDays(today(),181),'00:00')}`)
    .map((row: any) => ({ date: row.date, time: row.time, duration: (Number(row.end_at) - Number(row.start_at)) / 60000, status: 'confirmado' }));
  const settings = { ...c.settings };
  if (!admin) settings.video = '';
  return { version: 1, rev: c.rev, services: c.services, settings, appointments, busy, user: user ? { name: user.displayName, email: user.email } : null, admin };
}

function checkSlot(c: any, appointment: any, duration: number) {
  if (!validDate(appointment.date) || !validTime(appointment.time)) fail('Data ou horário inválido.');
  const start = instant(appointment.date, appointment.time);
  if (start < Date.now() + 3600000 || appointment.date > addDays(today(),180)) fail('Escolha um horário entre uma hora a partir de agora e os próximos 180 dias.');
  const week = c.settings.week[dateObj(appointment.date).getUTCDay()];
  if (!week.on || c.settings.blocked.includes(appointment.date) || minutes(appointment.time) < minutes(week.start) || minutes(appointment.time) + duration > minutes(week.end) || (minutes(appointment.time) - minutes(week.start)) % c.settings.interval !== 0) fail('Este horário não está disponível.', 409);
  return start;
}

async function rate(actor: string) {
  const window = Math.floor(Date.now() / 600000);
  const [row] = await sql`INSERT INTO rate_limits (rate_key,window_id,request_count) VALUES (${actor},${window},1)
    ON CONFLICT (rate_key) DO UPDATE SET request_count=CASE WHEN rate_limits.window_id=EXCLUDED.window_id THEN rate_limits.request_count+1 ELSE 1 END,window_id=EXCLUDED.window_id RETURNING request_count`;
  if (Number(row.request_count) > 40) fail('Muitas alterações em pouco tempo. Aguarde alguns minutos.', 429);
}

async function auditChange(actor: string, actionName: string, target: string, change: (tx: postgres.TransactionSql) => Promise<any>) {
  await sql.begin(async tx => {
    const result = await change(tx);
    if (!result?.length) fail('Os dados mudaram em outra sessão. Atualize a página antes de tentar novamente.', 409);
    await tx`INSERT INTO audit (id,actor,action,target,occurred_at) VALUES (${crypto.randomUUID()},${actor},${actionName},${target},${Date.now()})`;
  });
}

async function action(body: any, admin: boolean, user: any) {
  const c = await loadConfig();
  const actor = admin ? 'administrator' : user.userId;
  await rate(actor);

  if (body.type === 'config') {
    if (!admin) fail('Acesso administrativo necessário.', 403);
    if (body.version !== c.rev) fail('Configuração alterada em outra sessão. Atualize a página.', 409);
    const candidate = { ...defaults(), services: body.services, settings: body.settings };
    try { validateStore(candidate); } catch { fail('Configurações inválidas. Revise os campos.'); }
    const st = candidate.settings;
    if (st.bio.length > 2500 || st.name.length > 100 || st.address.length > 400 || st.video.length > 2048 || st.blocked.length > 1000 || (st.presential && !st.address.trim()) || (st.whatsapp && !/^[1-9]{2}9\d{8}$/.test(st.whatsapp)) || !Number.isInteger(st.lead)) fail('Confira contato, endereço e disponibilidade.');
    if (candidate.services.some((item: any) => !item.title.trim() || item.title.length > 60 || !item.description.trim() || item.description.length > 600 || item.price > 100000 || item.duration % 15)) fail('Confira os serviços e valores.');
    await auditChange(actor, 'settings', 'main', tx => tx`UPDATE configuration SET data=${json({ services: candidate.services, settings: st })},version=version+1 WHERE id='main' AND version=${body.version} RETURNING version`);
    return;
  }

  if (body.type === 'create') {
    if (!admin && body.consent !== true) fail('É necessário aceitar o uso dos dados para agendar.');
    const v = body.appointment;
    if (!v || typeof v.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(v.id)) fail('Reserva inválida.');
    const service = c.services.find((item: any) => item.id === v.service && item.active);
    if (!service) fail('Esta leitura não está disponível.');
    if (!['online','presencial'].includes(v.mode) || !(v.mode === 'online' ? c.settings.online : c.settings.presential)) fail('Modalidade indisponível.');
    const start = checkSlot(c, v, service.duration);
    const email = admin ? text(v.email,180,true).toLowerCase() : user.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail inválido.');
    const phone = text(v.phone,20,true).replace(/\D/g,'');
    if (!/^[1-9]{2}9\d{8}$/.test(phone)) fail('Informe um celular com DDD.');
    const appointment = { id:v.id, service:service.id, title:service.title, duration:service.duration, price:service.price, date:v.date, time:v.time, mode:v.mode, name:text(v.name,100,true), email, phone, topic:text(v.topic,100,true), intention:text(v.intention || '',1500), status:'pendente', created:new Date().toISOString(), notes:'', cards:'', video:'', location:v.mode === 'presencial' ? c.settings.address : '' };
    if (appointment.name.length < 2) fail('Informe seu nome.');
    const owner = admin ? 'manual:' + crypto.randomUUID() : user.userId;
    const [count] = await sql`SELECT count(*)::int AS n FROM bookings WHERE user_id=${owner} AND status IN ('pendente','confirmado') AND start_at>${Date.now()}`;
    if (!admin && Number(count.n) >= 12) fail('Você já tem 12 reservas futuras. Cancele uma antes de agendar outra.');
    await auditChange(actor, 'create', appointment.id, tx => tx`INSERT INTO bookings (id,user_id,email,date,time,start_at,end_at,status,data,version)
      SELECT ${appointment.id},${owner},${email},${appointment.date},${appointment.time},${start},${start + service.duration*60000},${appointment.status},${json(appointment)},0
      WHERE EXISTS (SELECT 1 FROM configuration WHERE id='main' AND version=${c.rev}) RETURNING id`);
    return;
  }

  if (body.type === 'update') {
    const v = body.appointment;
    if (!v || typeof v.id !== 'string') fail('Reserva inválida.');
    const [row] = await sql`SELECT * FROM bookings WHERE id=${v.id}`;
    if (!row || (!admin && row.user_id !== user.userId)) fail('Consulta não encontrada.', 404);
    if (body.version !== Number(row.version)) fail('Esta consulta mudou em outra sessão. Atualize a página.', 409);
    const old = row.data;
    const appointment = { ...old };
    const active = ['pendente','confirmado'].includes(old.status);
    let start = Number(row.start_at);
    if (!admin) {
      if (!active) fail('Esta consulta não pode mais ser alterada.');
      if (Number(row.start_at) - Date.now() < c.settings.lead*3600000) fail('O prazo de alteração terminou. Fale com a taróloga.');
      if (v.status === 'cancelado') appointment.status = 'cancelado';
      else if (v.status === 'pendente' && (v.date !== old.date || v.time !== old.time)) { start = checkSlot(c,v,old.duration); appointment.date=v.date; appointment.time=v.time; appointment.status='pendente'; appointment.video=''; }
      else fail('Alteração não permitida.',403);
    } else {
      if (!['pendente','confirmado','concluido'].includes(old.status)) fail('Esta consulta já foi encerrada.');
      if (!['pendente','confirmado','cancelado','recusado','concluido'].includes(v.status)) fail('Situação inválida.');
      if (v.status === 'recusado' && old.status !== 'pendente') fail('Só solicitações pendentes podem ser recusadas.');
      if (v.status === 'concluido' && Number(row.end_at) > Date.now()) fail('A consulta só pode ser concluída após o horário de término.');
      if (v.date !== old.date || v.time !== old.time) { if (!active) fail('A consulta não pode ser remarcada.'); start=checkSlot(c,v,old.duration); appointment.date=v.date; appointment.time=v.time; appointment.status='pendente'; appointment.video=''; }
      else appointment.status=v.status;
      appointment.notes=text(v.notes || '',5000); appointment.cards=text(v.cards || '',300); appointment.video=text(v.video || '',2048); appointment.location=text(v.location || '',400); appointment.reason=text(v.reason || '',500);
      if (!safeVideo(appointment.video)) fail('O link de vídeo deve começar com https://.');
      if (appointment.status === 'confirmado' && (appointment.mode === 'online' ? !appointment.video : !appointment.location)) fail('Informe o link ou endereço antes de confirmar.');
      if (appointment.status === 'recusado' && !appointment.reason) fail('Informe o motivo da recusa.');
    }
    await auditChange(actor, 'update:' + appointment.status, appointment.id, tx => tx`UPDATE bookings SET date=${appointment.date},time=${appointment.time},start_at=${start},end_at=${start + appointment.duration*60000},status=${appointment.status},data=${json(appointment)},version=version+1 WHERE id=${appointment.id} AND version=${row.version} AND EXISTS (SELECT 1 FROM configuration WHERE id='main' AND version=${c.rev}) RETURNING id`);
    return;
  }
  fail('Operação não reconhecida.');
}

export default async function handler(req: Request, _context: Context) {
  try {
    const bridgeSecret = process.env.ADMIN_BRIDGE_SECRET || '';
    const providedBridge = req.headers.get('X-Admin-Bridge') || '';
    const admin = Boolean(bridgeSecret && providedBridge && await constantEqual(providedBridge, bridgeSecret));
    const rawUser = admin ? null : await getUser();
    const user = identity(rawUser);
    if (providedBridge && !admin) fail('Acesso administrativo não autorizado.',403);
    if (req.method === 'GET') return respond(await state(admin,user));
    if (req.method !== 'POST') fail('Método não permitido.',405);
    if (!admin) { checkOrigin(req); if (!user) fail('Entre na sua conta para continuar.',401); }
    if (!req.headers.get('content-type')?.startsWith('application/json')) fail('Formato não permitido.',415);
    const raw = await req.text();
    if (raw.length > 40000) fail('Conteúdo maior que o permitido.',413);
    let body: any;
    try { body = JSON.parse(raw); } catch { fail('Não foi possível ler a solicitação.'); }
    await action(body,admin,user);
    return respond(await state(admin,user));
  } catch (error: any) {
    if (error instanceof ApiError) return respond({ error:error.message },error.status);
    if (error?.name === 'MissingDatabaseConnectionError') return respond({ error:'A agenda ainda não está conectada ao banco de dados. Entre em contato com o instituto.' },503);
    if (error?.code === '23P01' || error?.code === '23505') return respond({ error:'Este horário acabou de ser reservado. Atualize a agenda e escolha outro.' },409);
    console.error('API operation failed',error?.name,error?.code);
    return respond({ error:'Não foi possível concluir. Tente novamente em instantes.' },500);
  }
}


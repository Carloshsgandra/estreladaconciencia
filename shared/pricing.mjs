export const PRICE_CHANGE = Object.freeze({date: '2027-01-01', before: 97, after: 137, zone: 'America/Sao_Paulo'});
export function priceBasis(env = {}) {
  const basis = env.TAROT_PRICE_BASIS ?? 'booking';
  if (!['booking', 'appointment'].includes(basis)) throw Error('TAROT_PRICE_BASIS deve ser booking ou appointment.');
  return basis;
}
export function tarotPrice({now = Date.now(), appointmentDate, basis = 'booking'} = {}) {
  priceBasis({TAROT_PRICE_BASIS: basis});
  const clock = new Date(now);
  if (!Number.isFinite(clock.getTime())) throw Error('Relógio de preço inválido.');
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: PRICE_CHANGE.zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(clock);
  let date = ['year', 'month', 'day'].map(key => parts.find(p => p.type === key).value).join('-');
  if (basis === 'appointment' && appointmentDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || !Number.isFinite(Date.parse(appointmentDate)) || new Date(appointmentDate).toISOString().slice(0,10) !== appointmentDate) throw Error('Data de atendimento inválida para preço.');
    date = appointmentDate;
  }
  return date >= PRICE_CHANGE.date ? PRICE_CHANGE.after : PRICE_CHANGE.before;
}
export function pricedService(service, options) {
  return service?.id === 'avulsa' ? {...service, price: tarotPrice(options)} : service;
}

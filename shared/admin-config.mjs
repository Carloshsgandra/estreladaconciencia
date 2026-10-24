export class AdminConfigurationError extends Error {
  constructor() { super('Configure ADMIN_EMAILS com e-mails válidos separados por vírgula. Nenhum acesso administrativo foi autorizado.'); this.status = 503; this.code = 'ADMIN_CONFIGURATION'; }
}
export function adminEmails(env = process.env) {
  // Explicitly empty plural value must never fall back to a legacy variable.
  const raw = env.ADMIN_EMAILS ?? env.ADMIN_EMAIL;
  if (typeof raw !== 'string' || !raw.trim()) throw new AdminConfigurationError();
  const emails = raw.split(',').map(value => value.trim().toLowerCase());
  if (emails.some(value => value.length > 254 || !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value))) throw new AdminConfigurationError();
  return [...new Set(emails)];
}

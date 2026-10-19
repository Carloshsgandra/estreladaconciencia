import type { Context } from '@netlify/functions';

/** Public web configuration only; service-account credentials stay on the server. */
export default async function handler(_request: Request, _context: Context) {
  const config = { apiKey: process.env.FIREBASE_API_KEY, authDomain: process.env.FIREBASE_AUTH_DOMAIN, projectId: process.env.FIREBASE_PROJECT_ID, appId: process.env.FIREBASE_APP_ID };
  const ready = Object.values(config).every(value => typeof value === 'string' && value.length > 0);
  return new Response(`window.IEC_FIREBASE_CONFIG=${JSON.stringify(ready ? config : null)};`, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

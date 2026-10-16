import html from '../ui/page.html?raw';
import { htmlHeaders } from '../lib/html';
export const dynamic='force-dynamic';
export async function GET(){return new Response(html,{headers:htmlHeaders})}

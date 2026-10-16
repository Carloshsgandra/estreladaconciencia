import { proxy } from '../../../lib/proxy';
export const dynamic='force-dynamic';
export async function GET(request:Request){return proxy(request)}

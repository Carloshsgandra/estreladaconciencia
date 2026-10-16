import { proxy } from '../../../lib/proxy';
export const dynamic='force-dynamic';
export async function POST(request:Request){return proxy(request)}

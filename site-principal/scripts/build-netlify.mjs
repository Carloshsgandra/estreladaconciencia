import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';


const out = new URL('../dist-netlify/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('../src/session-client.mjs', import.meta.url))], outfile: fileURLToPath(new URL('session-client.js', out)), bundle: true, minify: true, format: 'iife', platform: 'browser', target: ['es2020'] });
await cp(new URL('../public/', import.meta.url), out, { recursive: true });
await cp(new URL('../../shared/auth-callback-redirect.js', import.meta.url), new URL('auth-callback-redirect.js',out));
await writeFile(new URL('index.html', out), await readFile(new URL('../ui/page.html', import.meta.url)));
await writeFile(new URL('acesso.html', out), await readFile(new URL('../ui/acesso.html', import.meta.url)));
const appPath = new URL('app.js', out);
const app = (await readFile(appPath, 'utf8')).replace(
  "const IS_ADMIN=false;const ADMIN_URL='https://estreladaconciencia-admin.carloshsgandracode.chatgpt.site';",
  `const IS_ADMIN=false;const ADMIN_URL=${JSON.stringify(process.env.ADMIN_SITE_URL || 'https://estrela-da-consciencia-admin.netlify.app')};`
).replaceAll('/signin-with-chatgpt?', '/acesso.html?')
  .replaceAll('/signout-with-chatgpt?return_to=%2F', '/acesso.html?action=logout')
  .replaceAll('Entrar com ChatGPT →', 'Entrar na minha conta →');
await writeFile(appPath, app);
await build({ entryPoints: [fileURLToPath(new URL('../src/identity-client.mjs', import.meta.url))], outfile: fileURLToPath(new URL('identity-client.js', out)), bundle: true, minify: true, format: 'esm', platform: 'browser', target: ['es2020'] });

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { deploymentOrigin } from '../../shared/deploy-config.mjs';
import {publicOrigin,publicMetadata,robots,sitemap} from '../../shared/seo-build.mjs';
import {priceBasis} from '../../shared/pricing.mjs';

const adminOrigin=deploymentOrigin('ADMIN_SITE_URL');
priceBasis(process.env);
const out = new URL('../dist-netlify/', import.meta.url);
validatePrivacyRelease();
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('../src/session-client.mjs', import.meta.url))], outfile: fileURLToPath(new URL('session-client.js', out)), bundle: true, minify: true, format: 'iife', platform: 'browser', target: ['es2020'] });
await cp(new URL('../public/', import.meta.url), out, { recursive: true });
await cp(new URL('../../shared/auth-callback-redirect.js', import.meta.url), new URL('auth-callback-redirect.js',out));
const origin=publicOrigin();
await writeFile(new URL('index.html', out),publicMetadata(await readFile(new URL('../ui/page.html', import.meta.url),'utf8'),origin));
await writeFile(new URL('acesso.html', out), await readFile(new URL('../ui/acesso.html', import.meta.url)));
await writeFile(new URL('404.html', out), await readFile(new URL('../ui/404.html', import.meta.url)));
if(origin){await writeFile(new URL('robots.txt',out),robots(origin));await writeFile(new URL('sitemap.xml',out),sitemap(origin));}
const appPath = new URL('app.js', out);
const app = (await readFile(appPath, 'utf8')).replace(
  "const IS_ADMIN=false;const ADMIN_URL='__IEC_ADMIN_URL__';",
  `const IS_ADMIN=false;const ADMIN_URL=${JSON.stringify(adminOrigin)};`
).replaceAll('/signin-with-chatgpt?', '/acesso.html?')
  .replaceAll('/signout-with-chatgpt?return_to=%2F', '/acesso.html?action=logout')
  .replaceAll('Entrar com ChatGPT →', 'Entrar na minha conta →');
if(app.includes('__IEC_ADMIN_URL__'))throw Error('URL do painel não foi inserida no build.');
await writeFile(appPath, app);
await build({ entryPoints: [fileURLToPath(new URL('../src/identity-client.mjs', import.meta.url))], outfile: fileURLToPath(new URL('identity-client.js', out)), bundle: true, minify: true, format: 'esm', platform: 'browser', target: ['es2020'] });
import {writePrivacyPage,validatePrivacyRelease} from '../../shared/privacy-build.mjs';
await writePrivacyPage(out);

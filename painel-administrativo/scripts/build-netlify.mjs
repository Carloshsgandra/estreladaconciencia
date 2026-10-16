import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const out = new URL('../dist-netlify/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL('../public/', import.meta.url), out, { recursive: true });
const page = (await readFile(new URL('../ui/page.html', import.meta.url), 'utf8')).replace(
  'https://estrela-da-consciencia-atelie.carloshsgandracode.chatgpt.site',
  process.env.MAIN_SITE_URL || 'https://example.netlify.app'
).replace('/signout-with-chatgpt?return_to=%2F','/acesso.html?action=logout');
await writeFile(new URL('index.html', out), page);
await writeFile(new URL('acesso.html', out), await readFile(new URL('../ui/acesso.html', import.meta.url)));
const appPath = new URL('app.js', out);
let app = await readFile(appPath, 'utf8');
app = app.replaceAll('/signin-with-chatgpt?', '/acesso.html?')
  .replaceAll('/signout-with-chatgpt?return_to=%2F', '/acesso.html?action=logout')
  .replaceAll('Entrar com ChatGPT →', 'Entrar na minha conta →');
app = app.replace(
  "async function initialize(){try{await fetchState();",
  "async function initialize(){try{await fetchState();"
).replace(
  "}catch(e){$('#main').innerHTML='<section class=\"wrap section\"><h1>Uma pausa na conexão.</h1>",
  "}catch(e){if(e.status===401){location.replace('/acesso.html?return_to=%2F%23admin');return}$('#main').innerHTML='<section class=\"wrap section\"><h1>Uma pausa na conexão.</h1>"
);
await writeFile(appPath, app);
await build({ entryPoints: [fileURLToPath(new URL('../src/identity-client.mjs', import.meta.url))], outfile: fileURLToPath(new URL('identity-client.js', out)), bundle: true, minify: true, format: 'esm', platform: 'browser', target: ['es2020'] });

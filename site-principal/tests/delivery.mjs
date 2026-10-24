import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicOrigin,publicMetadata,robots,sitemap} from '../../shared/seo-build.mjs';

test('metadados e sitemap acompanham a origem real do deploy',()=>{
  const origin=publicOrigin({PUBLIC_SITE_URL:'https://site-final.netlify.app/'});
  const html=publicMetadata('<html><head></head><body></body></html>',origin);
  assert.equal(origin,'https://site-final.netlify.app');
  assert.match(html,/rel="canonical" href="https:\/\/site-final.netlify.app\/"/);
  assert.match(html,/og:image" content="https:\/\/site-final.netlify.app\/compartilhar.png"/);
  assert.match(sitemap(origin),/https:\/\/site-final.netlify.app\//);
  assert.match(robots(origin),/Disallow: \/acesso.html/);
  assert.equal(publicOrigin({}),null);
});

test('rotas inexistentes alcançam a página 404 de cada site',()=>{
  for(const project of ['site-principal','painel-administrativo']){
    const toml=readFileSync(new URL(`../../${project}/netlify.toml`,import.meta.url),'utf8');
    const html=readFileSync(new URL(`../../${project}/ui/404.html`,import.meta.url),'utf8');
    assert.doesNotMatch(toml,/from = "\/\*"/);
    assert.match(html,/Página não encontrada/);
    assert.match(toml,/from = "\/api\/\*"/);
  }
});

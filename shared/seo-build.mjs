// Metadata is generated from the deployment's actual public origin. Never
// publish a canonical URL copied from a previous Netlify account.
import {deploymentOrigin} from './deploy-config.mjs';

export function publicOrigin(env=process.env){
  if(env.PUBLIC_SITE_URL)return deploymentOrigin('PUBLIC_SITE_URL',env);
  if(env.URL)return deploymentOrigin('URL',env);
  return null;
}

export function publicMetadata(html,origin){
  if(!origin)return html;
  const title='Instituto Estrela da Consciência — cada jornada é única';
  const description='Tarô, Reiki e encontros de autoconhecimento com acolhimento. Conheça os atendimentos e reserve um horário no Instituto Estrela da Consciência.';
  const tags=`<link rel="canonical" href="${origin}/">
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Instituto Estrela da Consciência">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${origin}/">
<meta property="og:image" content="${origin}/compartilhar.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Símbolo dourado do Instituto Estrela da Consciência sobre fundo azul-escuro">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${origin}/compartilhar.png">
`;
  return html.replace('</head>',tags+'</head>');
}

export function sitemap(origin){return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>\n`;}
export function robots(origin){return `User-agent: *\nAllow: /\nDisallow: /acesso.html\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;}

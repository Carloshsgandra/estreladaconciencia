# Site principal — Netlify

Aplicação pública do Instituto Estrela da Consciência. O design original está em `ui/page.html`, `public/app.css`, `public/app.js` e `public/identity.js`.

Infraestrutura de produção:

- Netlify Functions: `netlify/functions/api.mts`
- Netlify Database/Postgres: `netlify/database/migrations`
- Netlify Identity: conta e caderno do cliente
- Configuração de deploy: `netlify.toml`

Comandos locais:

```powershell
npm install
npm run build
npm test
npx netlify dev
```

Variáveis de produção:

- `ADMIN_BRIDGE_SECRET` — segredo compartilhado somente com o painel.
- `ADMIN_SITE_URL` — URL pública do projeto do painel.

Use o guia `../COMECE-AQUI-NETLIFY.md` para a publicação completa.

# Site principal — Netlify

Aplicação pública do Instituto Estrela da Consciência. O design original está em `ui/page.html`, `public/app.css`, `public/app.js` e `public/identity.js`.

Infraestrutura de produção:

- Netlify Functions: `netlify/functions/api.mts`
- Cloud Firestore: acessado exclusivamente pela Function com Firebase Admin SDK
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

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` — acesso do servidor ao Firestore.
- `ADMIN_BRIDGE_SECRET` — segredo compartilhado somente com o painel.
- `ADMIN_SITE_URL` — URL pública do projeto do painel.

Use `../DOCUMENTACAO-GERAL.md` como referência principal e `../COMECE-AQUI-NETLIFY.md` como guia rápido.

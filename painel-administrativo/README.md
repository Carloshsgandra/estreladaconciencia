# Painel administrativo — Netlify

Painel privado do Instituto Estrela da Consciência. Mantém a interface original e usa Netlify Identity para autorizar a profissional antes de acessar a API da agenda.

Comandos locais:

```powershell
npm install
npm run build
npx netlify dev
```

Variáveis de produção:

- `MAIN_SITE_URL` — URL do site principal.
- `ADMIN_BRIDGE_SECRET` — o mesmo segredo do site principal.
- `ADMIN_EMAIL` — e-mail da conta administrativa autorizada.

No Netlify Identity deste projeto, use cadastro somente por convite. Consulte `../COMECE-AQUI-NETLIFY.md`.

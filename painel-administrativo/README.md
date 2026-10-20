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
- `ADMIN_EMAILS` — lista separada por vírgulas das contas administrativas autorizadas. `ADMIN_EMAIL` ainda é aceito como alternativa legada para uma única conta.

No Netlify Identity deste projeto, use cadastro somente por convite. Consulte `../DOCUMENTACAO-GERAL.md` como referência principal e `../COMECE-AQUI-NETLIFY.md` como guia rápido.

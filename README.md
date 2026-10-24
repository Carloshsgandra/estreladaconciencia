# Instituto Estrela da Consciência

**Publicação por arquivos, sem GitHub:** [DEPLOY-POR-ARQUIVOS.md](DEPLOY-POR-ARQUIVOS.md). Use `PREPARAR-NETLIFY.cmd` para gerar os pacotes e `PUBLICAR-NETLIFY.cmd` para enviar páginas e Functions. Requisitos: Node 22.13+; JDK 21+ para testes locais. Consulte os alertas residuais em [SEGURANCA-RELEASE.md](SEGURANCA-RELEASE.md).

**Serviços extras:** no painel, abra Serviços → Adicionar serviço extra + → Salvar serviços. Guia: [SERVICOS-EXTRAS.md](SERVICOS-EXTRAS.md).

**Edição Ateliê Celestial:** leia [ENTREGA-ATELIE.md](ENTREGA-ATELIE.md). Guia vigente de publicação: [COMECE-AQUI-NETLIFY.md](COMECE-AQUI-NETLIFY.md). Execute `npm run verify` para as quatro suítes e builds de teste.

**Teste local completo sem Netlify:** leia [LEIA-PRIMEIRO-LOCAL.md](LEIA-PRIMEIRO-LOCAL.md).
Execute `npm run setup` uma vez e `npm start` para abrir o site, painel e banco de
teste na máquina. Veja os resultados e limites em [VALIDACAO-LOCAL.md](VALIDACAO-LOCAL.md).

Monorepositório com o site público (`site-principal/`) e o painel restrito (`painel-administrativo/`). Os dois projetos são publicados separadamente na Netlify. A persistência usa Cloud Firestore exclusivamente por meio da Netlify Function do site principal; as regras negam acesso direto de clientes.

## Documentação

Leia **[DOCUMENTACAO-GERAL.md](DOCUMENTACAO-GERAL.md)** antes de desenvolver, publicar ou alterar a infraestrutura. O documento reúne arquitetura, funcionalidades, banco, autenticação, variáveis, testes, deploy, segurança, manutenção e solução de problemas.

Os domínios de produção precisam ser confirmados na sua conta Netlify. Configure ADMIN_SITE_URL e MAIN_SITE_URL; não reutilize URLs históricas automaticamente.

## Desenvolvimento

Execute em cada projeto:

Para produção, configure primeiro a variável de URL correspondente conforme o guia Netlify. Para desenvolvimento sem credenciais, use `npm start` na raiz.

```bash
npm ci
npm run build
```

O site principal também possui testes com `npm test`. As variáveis necessárias estão documentadas nos arquivos `.env.example`, sem valores secretos.

## Firebase

As regras e os índices ficam na raiz. A publicação usa:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project estreladaconciencia
```

O painel usa `ADMIN_BRIDGE_SECRET` somente no servidor para encaminhar chamadas autenticadas à Function principal. Nunca versione chaves de conta de serviço ou valores reais de ambiente.

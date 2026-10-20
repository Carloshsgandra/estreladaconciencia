# Instituto Estrela da Consciência

Monorepositório com o site público (`site-principal/`) e o painel restrito (`painel-administrativo/`). Os dois projetos são publicados separadamente na Netlify. A persistência usa Cloud Firestore exclusivamente por meio da Netlify Function do site principal; as regras negam acesso direto de clientes.

## Documentação

Leia **[DOCUMENTACAO-GERAL.md](DOCUMENTACAO-GERAL.md)** antes de desenvolver, publicar ou alterar a infraestrutura. O documento reúne arquitetura, funcionalidades, banco, autenticação, variáveis, testes, deploy, segurança, manutenção e solução de problemas.

Produção:

- site público: <https://estreladaconciencia.netlify.app>;
- painel: <https://estrela-da-consciencia-admin.netlify.app>.

## Desenvolvimento

Execute em cada projeto:

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

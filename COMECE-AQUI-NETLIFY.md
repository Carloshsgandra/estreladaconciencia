# Publicação na Netlify com Firestore

O banco ativo é Cloud Firestore, acessado exclusivamente pela Function do site principal com Firebase Admin SDK. Arquivos antigos de D1/Postgres não são usados pelo build Netlify.

## Variáveis por projeto

| Projeto | Variável | Uso |
| --- | --- | --- |
| Site principal | FIREBASE_PROJECT_ID | estreladaconciencia |
| Site principal | FIREBASE_CLIENT_EMAIL | Conta de serviço netlify-firestore, papel roles/datastore.user |
| Site principal | FIREBASE_PRIVATE_KEY | Chave privada: somente Functions e contexto de produção |
| Ambos | ADMIN_BRIDGE_SECRET | Mesmo segredo criptograficamente aleatório; somente servidor |
| Site principal | ADMIN_SITE_URL | https://estrela-da-consciencia-admin.netlify.app; build e Functions |
| Painel | MAIN_SITE_URL | https://resonant-figolla-4a1c25.netlify.app; somente Functions |
| Painel | ADMIN_EMAIL | estrelaiec@gmail.com; somente Functions |

Não coloque a chave Firebase no painel. Não registre valores secretos em arquivos versionados, logs ou capturas de tela.

## Preparação e validação

Na raiz, publique regras e índices com uma sessão Firebase autenticada:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project estreladaconciencia
```

Em cada projeto execute npm ci, npm run build e npm audit --omit=dev --audit-level=high. No site principal execute npm test.

Os testes transacionais usam exclusivamente um emulador isolado, nunca o projeto real:

```bash
firebase emulators:start --only firestore --project demo-estrela-validation
# Em outro terminal, dentro de site-principal:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test
```

A suíte informa explicitamente quando o teste de emulador é ignorado. A versão atual do Firebase CLI exige Java 21 ou superior. Não confunda testes de código com validação real de produção.

## Builds e autenticação

O netlify.toml da raiz aponta para site-principal; o painel deve usar base painel-administrativo. Publique primeiro o site e valide /api/state como JSON sem erro 503. Depois publique o painel e valide autorização, agenda e cerimônias.

No Identity público, permita cadastros com confirmação de e-mail ativa. No Identity do painel, use convite para a conta administrativa e mantenha Invite only após validar seu acesso. Senhas e confirmações devem ser preenchidas pelo titular diretamente no navegador. Consulte também `DOCUMENTACAO-GERAL.md`.

Datas de cerimônia são cadastradas no painel com ano, horário e capacidade fornecidos pelo responsável. Não há datas reais ou dados clínicos de demonstração pré-cadastrados. A análise de saúde é humana e a política de privacidade requer revisão profissional.

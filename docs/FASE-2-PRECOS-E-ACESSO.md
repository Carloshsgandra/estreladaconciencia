# Fase 2 — preço e administradores

## Entregue

- `shared/pricing.mjs`: fonte única da virada de R$97 para R$137 em 01/01/2027, usando America/Sao_Paulo.
- Catálogo e criação de reserva na Function usam essa função. O preço enviado pelo navegador não determina o preço persistido.
- Site e painel usam a mesma função no resumo da reserva, considerando a data selecionada e a política recebida do servidor.
- Reservas já gravadas mantêm seu valor, inclusive ao remarcar. Não há migração de preços históricos.
- A referência duplicada à virada no servidor legado também foi substituída pela função central; esse servidor legado não é o runtime Netlify.
- `shared/admin-config.mjs`: normalização, deduplicação e validação da lista administrativa. Configuração vazia, elemento vazio ou e-mail inválido falha fechada.
- Function administrativa retorna 503/ADMIN_CONFIGURATION para lista inválida e 403 para identidade válida fora da lista. Roles no perfil não autorizam acesso.
- Removido e-mail pessoal fixo do servidor local e dos testes. Fixtures usam endereços sintéticos `.invalid`.
- O iniciador Windows pede a lista administrativa se a variável não estiver definida. O servidor local não inicia sem lista válida.

## Configuração clara

| Onde | Variável | Valor |
| --- | --- | --- |
| Site público, Functions (e Build para validar configuração) | TAROT_PRICE_BASIS | `booking` mantém o preço pela data da reserva; `appointment` usa a data do atendimento |
| Painel, Functions | ADMIN_EMAILS | E-mails reais autorizados, separados por vírgula, sem vírgula no final |
| Terminal local | ADMIN_EMAILS | E-mail que você cadastrará e confirmará no ambiente local |

Sem TAROT_PRICE_BASIS, permanece `booking` (regra atual). Valor inválido faz o build público falhar. O build não transfere variáveis automaticamente para Functions: configurar o escopo de Functions também.

Exemplo da diferença: reserva em 31/12/2026 às 23:59:59 de São Paulo para atendimento em janeiro: booking = R$97; appointment = R$137. A escolha definitiva é do cliente, registrada em PENDENCIAS-CLIENTE.md. Antes de escolher a data, o catálogo mostra o preço de referência atual; o resumo passa a considerar a data escolhida.

A lista ADMIN_EMAILS não cria contas nem envia convites. Netlify Identity deve estar configurado no painel como somente convite; o titular deve aceitar o convite e confirmar o e-mail. Não colocar chave Firebase no painel.

O alias antigo ADMIN_EMAIL continua aceito quando ADMIN_EMAILS não existe, por compatibilidade. Se ADMIN_EMAILS existir vazia, não há fallback. Usar ADMIN_EMAILS nas novas configurações.

### Local pelo PowerShell

```powershell
$env:ADMIN_EMAILS="SEU_EMAIL_REAL"
npm start
```

Substituir SEU_EMAIL_REAL; esse marcador falha na validação. Não usar a senha do Netlify como variável. Cadastre a conta no site local e confirme pela caixa de mensagens local. Pelo INICIAR-LOCAL.cmd, responder à pergunta quando solicitada.

## Testes e limites

Rodada final executada: `PATH="/tmp/iec-java21/bin:$PATH" npm run verify` — **187 testes passaram, zero falhas, zero pulados**: público 96, painel 49, armazenamento/regras 30, locais 12. Builds local, público e painel concluídos. Evidência integral: `audit/evidencias/2026-10-22/fase2-final.log`. `git diff --check` terminou com código 0 e sem saída. Os builds do verify usam URLs `.invalid` e não devem ser publicados.

A linha de base desta fase foi salva em `audit/evidencias/2026-10-22/fase2-baseline.log`. Testes incluem relógio simulado um segundo antes e exatamente na virada, ambas as políticas para atendimento posterior, persistência no Firestore, preço forjado ignorado, preservação do histórico após remarcação, resumo dos dois sites, build com política inválida, allowlist normalizada/vazia/malformada, 403 fora da lista e inicialização local sem configuração.

Não houve deploy. Não foram verificados Windows real, navegador real, entrega de convite/e-mail, configuração das variáveis na Netlify ou efeitos em produção. O comando Windows foi editado, mas não se declara teste em Windows. Validação do resumo usa execução de JavaScript isolada, não Playwright.

Mudanças preexistentes foram preservadas. O worktree contém grande quantidade de código anterior ainda não versionado; não foi feito commit abrangente para misturá-lo às novas correções. Novos módulos/testes desta fase podem ser commitados separadamente; as integrações permanecem visíveis no worktree.

Commits dos novos módulos/testes: `edcd39c` (preço) e `de98fcb` (allowlist). Não houve push. As integrações em arquivos previamente modificados/não versionados continuam no worktree; os commits isolados não representam sozinhos a versão completa testada.

### Arquivos alterados/criados nesta fase

- Preço: `shared/pricing.mjs`, `site-principal/netlify/functions/api.mts`, `site-principal/lib/server.ts`, `site-principal/scripts/build-netlify.mjs`, `site-principal/.env.example`.
- Resumo da reserva: `public/app.js` e `src/session-client.mjs` dos dois sites.
- Administradores: `shared/admin-config.mjs`, `shared/verified-identity.mjs`, `shared/deploy-config.mjs`, `painel-administrativo/netlify/functions/api.mts`, `painel-administrativo/.env.example`, `local/server.mjs`, `INICIAR-LOCAL.cmd`.
- Testes: `site-principal/tests/pricing.mjs`, `site-principal/tests/backend.mjs`, `site-principal/tests/atelier.mjs`, `painel-administrativo/tests/admin-config.mjs`, `painel-administrativo/tests/api-session.mjs`, `shared/auth-behavior.test.mjs`, `audit/booking-boundaries.test.mjs`, `local/tests/config.test.mjs`, `local/tests/integration.test.mjs`, `local/browser-test.mjs` (remoção de e-mail pessoal; não executado como teste de navegador).
- Documentação: este relatório, `docs/PENDENCIAS-CLIENTE.md`, `COMECE-AQUI-NETLIFY.md`; logs `fase2-*.log` em `audit/evidencias/2026-10-22/`.

## Próximos bloqueadores

P0.4 (dados de saúde/LGPD técnica), replay idempotente completo de P0.2, autorização de fichas nas Functions, triagem de dependências, navegadores/axe/Lighthouse, backup/restauração, monitoramento, Windows e aceite em produção ainda não estão aprovados.

Veredito parcial: **não pronto para venda; 7/10 provisório**. Esta fase fecha mudanças técnicas de preço e allowlist, não aprova os demais requisitos nem a decisão comercial do cliente.

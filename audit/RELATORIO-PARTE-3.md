# Entrega da parte 3 — 23/10/2026

## Veredito

**Não está liberado para venda/produção com dados reais. Nota de prontidão: 6/10.**
O código completo está disponível para teste local e os mecanismos desta fase passaram pela suíte executada com Firestore real emulado. A nota avalia prontidão de entrega, não uma medição de segurança. Ainda faltam revisão jurídica, configuração e aceite na infraestrutura real, testes de navegador/performance e os demais bloqueadores abaixo. Nenhum sistema pode ser declarado livre de falhas futuras por esta suíte.

## Escopo e correções

| Arquivos | Problema / mudança | Evidência |
| --- | --- | --- |
| shared/consent.mjs, shared/privacy-policy.json, site-principal/public/ceremonies.js, site-principal/netlify/functions/api.mts | Consentimento explícito versionado, sem pré-marcação; identificador, titular e data gerados no servidor; versão antiga recusada; dois campos narrativos tornados opcionais | tests/privacy.mjs, tests/behavior.mjs |
| shared/reauth.mjs, Functions dos dois sites, local/server.mjs | Senha atual exigida nas operações sensíveis; identidade novamente conferida; painel não encaminha senha à ponte; prova forjada recusada | tests/privacy.mjs, local/tests/integration.test.mjs |
| shared/privacy-store.mjs | Exportação própria isolada; agenda administrativa com lista explícita de campos; exclusão transacional de fichas/avaliações/textos; cancelamento de inscrição ativa, liberação da vaga e proteção contra reaprovação sem ficha | audit/privacy.test.mjs, local/tests/integration.test.mjs |
| shared/privacy-store.mjs, local/retention.mjs | Prazo obrigatório, simulação, lotes paginados, confirmação destrutiva, limite de volume e datas ausentes encaminhadas à revisão; comando rejeita projeto incorreto | audit/privacy.test.mjs |
| shared/privacy-browser.mjs, public/app.js e src/session-client.mjs dos dois projetos | Avisos e formulários de senha, exportação/exclusão do titular, retenção no painel | Compilação e integração HTTP; interação visual real ainda pendente |
| shared/privacy-build.mjs, scripts/build-netlify.mjs dos dois sites, local/build.mjs | Página de privacidade versionada; bloqueio de produção final antes de apagar a saída anterior | Dois testes executam os builds e comprovam recusa do rascunho |
| .env.example, COMECE-AQUI-NETLIFY.md, LEIA-PRIMEIRO-LOCAL.md, PARTE-3-LEIA-PRIMEIRO.md, docs/PENDENCIAS-CLIENTE.md, docs/lgpd/mapa-de-dados.md | Variáveis, instruções atualizadas, inventário de campos, responsáveis e limites explícitos | Revisão documental; Windows real não executado |

O log de privacidade guarda ação, instante, quantidade e hash estável do identificador. Não grava conteúdo das fichas, senha, nome ou e-mail. O hash é pseudonimização, não anonimização; deve ter acesso restrito e prazo aprovado. Para identificar o responsável por uma exportação, o operador autorizado correlaciona o hash com o ID Identity conhecido usando SHA-256 de `iec-privacy-v1:` seguido do ID.

## Comandos executados e resultados

Logs em `audit/evidencias/2026-10-22/` (a pasta foi preservada durante a retomada em 23/10).

| Comando / log | Resultado real |
| --- | --- |
| npm test — fase3-baseline.log | Linha de base anterior às correções; integração exige emulador |
| npm test — fase3-first.log | Falha intermediária por inserção fora do escopo da função; corrigida |
| npm test — fase3-unit.log | Testes unitários passaram após a correção; não substituem integração |
| npm run verify — fase3-verify.log | Tentativa interrompida por Java 17; runtime isolado Java 21 restaurado |
| PATH=/tmp/iec-java21/bin:$PATH npm run verify — fase3-entrega.log | Exit 0: 103 públicos + 49 painel + 37 auditoria/Firestore + 14 locais = **203 aprovados, zero falhas, zero pulados** |
| Builds executados pelo verify | Local e ambos os builds Netlify concluídos; URLs sintéticas example.invalid, impróprias para publicação |
| git diff --check | Sem erro de whitespace |

Os testes usam dados sintéticos, emulador na porta 8085 e projetos demo. Não houve acesso a banco real nem alteração de dados de clientes. Na sua máquina, basta Java 21 no PATH e `npm run verify`; o caminho temporário acima pertence somente ao ambiente de execução desta entrega.

## Limitações e riscos restantes

- O titular exporta seus registros disponíveis, exceto avaliações internas. Pedidos integrais, correção, exclusão de conta, registros básicos, backups e arquivos já baixados exigem atendimento assistido do controlador. Exclusão da ficha não equivale à exclusão de todos os dados pessoais.
- Exportação limitada a mil registros; exclusão própria a cem reservas por operação. Acima desses limites a operação falha claramente, sem exclusão parcial, e exige procedimento assistido. Retenção percorre lotes de cem.
- Fichas sem data confiável não são apagadas automaticamente. O prazo é calculado por meses de calendário UTC, limitado ao último dia do mês. O operador precisa monitorar registros pendentes.
- A ferramenta de retenção foi entregue, mas nenhum agendamento periódico foi instalado. O teste de aplicação da remoção roda diretamente no serviço com emulador; o CLI foi executado em simulação e teve suas proteções testadas.
- Reautenticação usa senha e endpoints Identity da própria origem. Provedor real, MFA/SSO, contas reais e entrega de mensagens não foram verificados nesta fase. Contas sem senha podem precisar de atendimento assistido.
- Não foram executados Playwright Chromium/Firefox/WebKit, axe, Lighthouse ou Windows nesta fase. Não há nota de performance ou atestado de contraste. Não havia executável de navegador instalado no ambiente conferido.
- Não houve nova auditoria completa de dependências, restauração de backup real, smoke pós-deploy nem teste de carga/penetração de produção. Os relatórios anteriores não comprovam automaticamente a versão atual.

## Bloqueadores exatos da venda

1. Aprovar controlador, encarregado/canal, política, finalidade/necessidade dos campos, base legal e retenção; preencher shared/privacy-policy.json. Manter o rascunho até revisão jurídica. Ativar IEC_PRODUCTION_FINAL=true nos dois builds finais.
2. Configurar e comprovar Identity dos dois projetos, allowlist, convite admin, bridge, Firebase, regras/índices, URLs, domínio/HTTPS e e-mails reais. Publicar ambos os sites somente depois do aceite.
3. Confirmar preço da reserva anterior à virada para atendimento posterior, dados e serviços reais, WhatsApp e Instagram.
4. Encerrar pendências de P0.2 (replay de idempotência e regras específicas de cerimônia) registradas nas fases anteriores.
5. Completar P1: dependências/segurança, browsers/axe/Lighthouse, backup e restauração, monitoramento, smoke de produção e execução Windows real.
6. Instituir atendimento de direitos, gestão das cópias/exportações, rotina de retenção e acesso/auditoria com responsáveis definidos.

## Pacote

Inclui fontes atuais, testes, guias e evidências, preservando as alterações que já existiam no worktree. Não inclui node_modules, .env, credenciais privadas, banco local ou builds gerados. É necessário instalar dependências e recompilar. Não é ZIP de Netlify Drop. Nenhum deploy foi feito nesta fase.

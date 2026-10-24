# Fase 1 — linha de base, regras e integridade

## Escopo e plano

Leitura inicial: auditoria de 22/10, COMECE-AQUI, três netlify.toml, builds público/admin/local, empacotador/publicador, testes dos dois sites, shared/auth-behavior, storage e local/tests.
As alterações anteriores no worktree foram preservadas. Não houve deploy, alteração de dados reais ou mudanças de design.

Ordem de execução das fases restantes:

1. Concluir P0.1/P0.2: autorização de fichas pelas Functions e protocolo de replay idempotente. Esforço médio; risco de regressão em reservas existentes.
2. P0.3/P0.5: preço central/configurável e administradores só por configuração. Esforço médio; decisões de preço e acesso não podem ser presumidas.
3. P0.4: dados sensíveis, retenção/direitos, consentimento versionado e exportação reautenticada. Esforço alto; exige preservação das reservas e revisão jurídica. Não executar exclusão em produção sem autorização específica.
4. P1.1: validação, cabeçalhos, rate limits e triagem de dependências. Esforço médio/alto; CSP pode quebrar estilos existentes e upgrades podem afetar o CLI.
5. P1.2/P1.3: navegadores, acessibilidade, performance, restauração, smoke e Windows. Esforço alto; produção, e-mails e DNS exigem evidência externa e cliente.

Estimativas são relativas, não promessa de prazo. P2 permanece posterior.

## Resultados executados

Logs completos: `audit/evidencias/2026-10-22/`.

| Comando / execução | Resultado real | Evidência |
| --- | --- | --- |
| `npm --prefix site-principal test` antes de alterações | 89 testes: 87 passaram, 2 pulados, 0 falhas | baseline-publico.log |
| `npm --prefix painel-administrativo test` antes de alterações | 46 passaram, 0 pulados | baseline-painel.log |
| `npm run verify` com Java 17 | Falhou antes de executar testes; CLI exige Java 21 | baseline-verify.log |
| `PATH="/tmp/iec-java21/bin:$PATH" npm run verify` antes de novos testes | 159 passaram, 0 pulados; builds local e dos dois sites passaram | verify-java21.log |
| Mesmo comando após novos testes de regras | 168 passaram, 0 pulados | verify-rules.log |
| Mesmo comando após testes de limites/concorrência | 174 passaram, 0 falhas, 0 pulados | verify-boundaries.log |
| `git diff --check` | Saída vazia e código 0 | Executado ao finalizar |

Runtime isolado desta sessão: Temurin Java 21.0.13 em `/tmp/iec-java21`, Node 24.19.0. Não foi substituído o Java do sistema. Para repetir em outra máquina, instalar Java 21, reabrir o terminal, conferir `java -version` e executar `npm run verify` na raiz. O runtime temporário não acompanha o código e pode desaparecer. Testes usam apenas projetos `demo-*` e emulator em 127.0.0.1:8085.

Os builds do verify usam domínios fictícios `.invalid`: NÃO PUBLICAR esses diretórios gerados.

## Por que 157 virou 135?

Não foi encontrada perda dos 24 testes de armazenamento/local. Os comandos comparados tinham escopos diferentes:

- Antes: 87 público + 46 painel + 13 armazenamento + 11 locais = 157.
- Auditoria anterior acrescentou 2 testes em `site-principal/tests/delivery.mjs`.
- `npm test` na raiz: 89 público + 46 painel = 135; sem emulator, 2 dos 135 são pulados.
- `npm run verify` antes desta fase: 89 + 46 + 13 + 11 = 159, comprovados com emulator.
- Após esta fase: 89 + 46 + 28 + 11 = 174.

Os 24 casos ausentes do comando reduzido (não apagados) são:

### audit/storage.test.mjs — 13

1. Persistência, preço/e-mail forjados e auditoria.
2. Consentimento/conflito sem reserva parcial.
3. Remarcação ocupada preserva reserva e locks antigos.
4. Remarcação válida libera origem e rejeita versão antiga.
5. Confirmação exige link e conclusão antecipada é bloqueada.
6. Estado público não revela reservas; isolamento entre clientes.
7. Configuração com versão antiga não sobrescreve nova.
8. 41ª alteração bloqueada pelo limite.
9. Abertura fora da grade não permite sobreposição.
10. Remarcação parcialmente sobreposta atualiza locks.
11. REST Firestore rejeita leitura direta.
12. Serviço extra persiste com preço do servidor e histórico preservado.
13. Catálogo inválido não é gravado.

### local/tests — 11

1. Telas, bundles e cabeçalhos.
2. Acesso anônimo/origem externa recusados.
3. Confirmação obrigatória e token de uso único.
4. Senha errada, logout e login.
5. Cliente comum recusado no painel; autorizado aceito.
6. Configuração/reserva/colisão por Functions e Firestore reais emulados.
7. Dono/admin veem reserva; outro cliente não.
8. Recuperação sem enumeração e revogação da sessão anterior.
9. Persistência sem senha em texto e expiração dos links.
10. Porta ocupada falha sem encerrar outro processo.
11. Porta livre liberada depois da pré-verificação.

## Alterações desta fase

| Arquivo | Alteração |
| --- | --- |
| audit/rules.test.mjs | 9 testes REST reais: leitura/escrita negadas para anônimo, titular A, usuário B e claim admin; coleção desconhecida negada |
| audit/booking-boundaries.test.mjs | 6 testes reais: 12 reservas concorrentes; cancelar/remarcar ±1 minuto; repetir mesmo ID sem duplicar reserva ou auditoria |
| local/verify.mjs | Descobre todos os `audit/*.test.mjs`, em vez de executar apenas storage.test.mjs |
| audit/evidencias/2026-10-22/*.log | Linhas de base e resultados completos |
| docs/PENDENCIAS-CLIENTE.md | Checklist com responsável/evidência e roteiro de aceite |
| docs/FASE-1-TESTES-2026-10-22.md | Este relatório |

O runner local já era um arquivo não versionado anterior ao pedido. Sua edição permanece no worktree; não foi misturado com alterações anteriores em commit abrangente. Os novos testes podem ser executados sob o emulator com `node --test audit/rules.test.mjs audit/booking-boundaries.test.mjs`.

## Limites e riscos restantes

- Regras negam acesso direto para todos; não autorizam admin de navegador. O Admin SDK das Functions ignora regras e requer testes de autorização próprios. Não confundir o teste de claim admin negada com prova de autorização de toda a aplicação.
- A aplicação atualmente permite que o titular veja sua própria ficha. A exigência literal “só admin lê fichas” não foi implementada nesta fase; reconciliar com a funcionalidade existente de consulta do titular e exportação de seus dados.
- Repetição com mesmo ID não duplica, mas retorna 409. Replay com resposta de sucesso e cobertura de todas as mutações continuam pendentes.
- Limites de prazo testados são de atendimentos comuns. Cerimônias têm lógica distinta, ainda sem política de prazo equivalente validada.
- Nenhum teste executado de navegador, axe, Lighthouse, Windows, DNS, entrega real de e-mail ou produção nesta fase. Nenhuma nota de Lighthouse ou conformidade AA é presumida.
- Não foram executados novos npm audits nesta fase; as 18 entradas anteriores ainda precisam de triagem atual.
- Retenção/exclusão, exportação protegida, preço central e gate de produção final ainda não foram implementados. Não usar a nova contagem de testes como aprovação desses requisitos.
- Testes de regras usam tokens sintéticos não assinados aceitos pelo emulator; nunca são enviados à produção.

## Veredito atualizado — parcial

**Não pronto para venda — 7/10, provisório.** A confiabilidade da evidência melhorou: todos os testes atuais rodaram sem pulos e foram acrescentados 15 casos. A nota não aumenta enquanto permanecem os bloqueadores de saúde/LGPD, exportação, preço, autorização/configuração, segurança operacional e validação em produção. A lista operacional está em PENDENCIAS-CLIENTE.md. Esta é uma entrega da primeira fase, não conclusão de todos os P0/P1.

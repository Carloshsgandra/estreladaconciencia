# Auditoria funcional e de armazenamento — Instituto Estrela da Consciência

## Conclusão

**Aprovado localmente com pendência de publicação e homologação real.** A revisão encontrou duas falhas adicionais, corrigiu-as e confirmou as regressões no emulador. A produção ainda não entrega a correção de autenticação anteriormente publicada no GitHub. Testes aprovados não significam ausência de falhas.

Esta rodada é uma auditoria: acrescenta testes e este relatório, sem alterar regras de negócio, publicar mudanças ou gravar dados reais. Os testes que falham foram mantidos como evidência, não ocultados nem transformados em testes ignorados.

## Ambientes e limites

- Código local: `/workspace/estreladaconciencia`, com alterações anteriores preservadas. A versão de autenticação de referência é o commit `c3d50c6`.
- Produção pública: `https://estreladaconciencia.netlify.app`.
- Produção administrativa: `https://estrela-da-consciencia-admin.netlify.app`.
- Escritas de teste: exclusivamente Firestore Emulator em `127.0.0.1:8085`, projeto `demo-estrela-validation`.
- As contas, credenciais, configurações reais de backup, permissões IAM e estado de deploy da Netlify não foram acessados nesta rodada.
- Não foi concluído login real, cadastro com confirmação por e-mail, recuperação de senha real, nem fluxo autenticado completo em produção. Não foram executados testes de carga, restauração real ou matriz de navegadores/dispositivos. A navegação visual foi conferida em Chrome, não Safari/iPhone.

## Resultados executados

| Verificação | Resultado | Limitação |
|---|---|---|
| Suíte do site com Firestore Emulator | 74 aprovados; 0 falhas; 0 ignorados | Mistura testes comportamentais e verificações de código |
| Suíte administrativa | 45 aprovados; 0 falhas | 37 casos são compartilhados com a suíte pública; não somar como casos exclusivos |
| Nova suíte `audit/storage.test.mjs`, após a correção | 11 aprovados; 0 falhas | Exercita as duas regressões encontradas e as proteções de armazenamento |
| Builds público e administrativo | Aprovados | Build não comprova deploy nem autenticação real |
| Auditoria npm de dependências de produção | Nenhuma vulnerabilidade conhecida apontada nos dois projetos | Não substitui revisão de segurança do código |
| `git diff --check` | Sem erros | Verificação de formatação, não funcional |
| API pública anônima `/api/state` | HTTP 200; nenhuma reserva pessoal retornada | Não comprova gravação autenticada |
| API administrativa anônima `/api/state` | HTTP 401 | Restrição de acesso observada |
| Arquivo `/session-client.js` em ambos os sites | Retorna HTML em vez do JavaScript novo | Evidência de versão anterior em produção |
| API pública `/api/session` | Retorna estado da agenda, sem a nova identificação de sessão | Endpoint novo ainda não está ativo |
| Navegação pública no navegador | Serviço → data → horário → exigência de login funcionaram | Nenhuma reserva enviada |

## Correções verificadas localmente

### A01 — Corrigida localmente: reservas sobrepostas após mudar o horário de abertura

Arquivo: `site-principal/netlify/functions/api.mts`, funções `configure`, `validateSlot` e `createNormal`.

Reprodução automatizada:

1. Abrir agenda a partir de 09:00 e criar uma reserva das 10:00 às 11:00.
2. Alterar a abertura para 09:10, mantendo intervalos de 30 minutos.
3. Solicitar outra reserva das 10:10 às 11:10.
4. Esperado: rejeição por conflito. Obtido: segunda reserva aceita.

Causa: os bloqueios são identificados por incrementos de 15 minutos contados a partir do início de cada reserva. Os conjuntos `10:00/10:15/10:30/10:45` e `10:10/10:25/10:40/10:55` não têm IDs iguais, apesar de os períodos se sobreporem. A configuração aceita abertura fora dessa grade.

Impacto: a validação transacional do servidor pode aceitar conflito. O calendário visual pode ocultar o horário em um estado atualizado, mas não substitui essa proteção; requisições diretas ou telas desatualizadas também devem ser recusadas.

Correção aplicada: bloqueios agora usam grade canônica fixa de 15 minutos, arredondada para baixo no início e que cobre todo o intervalo. Assim, intervalos sobrepostos compartilham ao menos um bloqueio, mesmo se o horário de abertura for alterado. O teste de regressão passou. Não foram alterados dados reais; antes de publicar, revisar os bloqueios futuros já existentes caso haja reservas criadas em uma grade não canônica.

### A02 — Corrigida localmente: remarcação parcialmente sobreposta preserva metadados antigos

Arquivo: `site-principal/netlify/functions/api.mts`, função `updateBooking`, criação de `newRefs`.

Reprodução automatizada:

1. Reservar 10:00–11:00.
2. Remarcar para 10:30–11:30.
3. A reserva principal passa a ter o novo período, mas os bloqueios reaproveitados de 10:30 e 10:45 continuam com `startAt`, `endAt` e `time` da reserva original.

Causa: o código cria os novos bloqueios inexistentes, mas não atualiza os já pertencentes à mesma reserva.

Impacto: dados inconsistentes de disponibilidade; períodos antigos podem continuar aparecendo ocupados. Não houve evidência neste teste de perda da reserva principal.

Correção aplicada: a transação atualiza tanto os novos bloqueios quanto os reaproveitados da mesma reserva, preservando a checagem de conflito com reservas de terceiros. O teste de regressão passou. Verificar possíveis registros antigos antes de qualquer reparo em produção.

### A03 — Bloqueante para homologação: produção ainda usa autenticação anterior

O GitHub contém a correção de sessão do trabalho anterior, mas ambos os sites não disponibilizam o novo script de sessão. No público, `/api/session` ainda se comporta como a consulta genérica de agenda.

Não atribuir isso a senha incorreta, cache do celular ou falta de confirmação sem evidência. Conferir na Netlify o deploy, o commit efetivamente publicado, a conexão com a branch e eventual falha de build. Depois validar login real, permanência após recarga e logout. A causa administrativa do deploy pendente não foi determinada sem acesso ao painel da Netlify.

## Outras pendências constatadas por inspeção

| Prioridade | Achado | Efeito / encaminhamento |
|---|---|---|
| Alta | Backup e restauração não implementados no repositório | Exportar a tela não é backup integral. Definir backup protegido e testar restauração em ambiente separado; conferir se há política externa configurada antes de afirmar que inexiste em produção |
| Média | API limita agenda administrativa a 3.000 registros e cliente a 1.000, sem paginação | Histórico/exportação podem ficar incompletos ao crescer. Não foram inseridos milhares de registros nesta rodada; conclusão pela consulta e exportador do código |
| Média | Exportação usa apenas `JSON.stringify(read())` | Inclui estado carregado no navegador, não todas as coleções, logs, locks ou dados além do limite. Não serve como procedimento de recuperação completo |
| Média | Ações administrativas são registradas como `administrator` | Com vários administradores, não identifica qual pessoa fez cada alteração. Encaminhar identidade autenticada pela ponte de forma verificável |
| Média | Registros de limitação têm `expiresAt` numérico e não há limpeza no código | Não presumir expiração automática; definir política de limpeza e verificar a configuração real do banco |
| Média | Gravação e consulta final de estado são etapas separadas | Risco identificado por inspeção: a gravação pode concluir e a resposta falhar ao carregar o estado. Repetição precisa de idempotência/reconciliação; não simulado ponta a ponta nesta rodada |
| Baixa | Reiki aparece como `R$ 97,00 / mês` no seletor de serviços | Texto observado no navegador; provável herança do antigo serviço de mentoria. Confirmar regra comercial antes de ajustar |

## Proteções e fluxos que passaram

A suíte adicional verificou gravação e releitura da reserva, preço/e-mail determinados pelo servidor, criação de auditoria, recusa sem consentimento, ausência de reserva parcial em conflito, rollback de remarcação para horário ocupado, liberação do horário antigo em remarcação sem sobreposição, controle de versão, confirmação com link obrigatório, bloqueio de conclusão antecipada, isolamento entre clientes, remoção de notas internas da resposta ao cliente, conflito de edição de configuração e bloqueio da 41ª alteração no mesmo período.

Uma requisição REST sem credencial administrativa ao emulador do Firestore foi recusada com HTTP 403. Isso comprova a aplicação das regras locais carregadas pelo emulador, não o estado atual das regras publicadas no projeto real.

As suítes anteriores também exercitam última vaga de cerimônia, duplicidade, cancelamento e liberação, histórico preservado, propriedade da reserva, anamnese e consentimentos, além dos fluxos de autenticação simulados. Não realizam avaliação clínica automática.

## Como reproduzir

Na raiz do repositório:

```sh
npm exec --yes --package=firebase-tools@14.22.0 -- firebase emulators:exec --only firestore --project demo-estrela-validation --config firebase.test.json "npm --prefix site-principal test"
npm --prefix painel-administrativo test
npm exec --yes --package=firebase-tools@14.22.0 -- firebase emulators:exec --only firestore --project demo-estrela-validation --config firebase.test.json "node --test audit/storage.test.mjs"
npm --prefix site-principal run build
npm --prefix painel-administrativo run build
```

A suíte adicional recusa execução fora do endereço local esperado. Após a correção, sua saída deve ter 11 testes aprovados. O CLI 14 foi usado por compatibilidade com Java 17 no ambiente; versões mais recentes exigem revisão da versão do Java.

## Critérios para encerrar a homologação

1. Publicar a versão testada nos dois projetos e conferir arquivos/API entregues.
3. Entrar com cliente e administrador reais, recarregar, sair e verificar acesso indevido.
4. Criar conta de teste e concluir confirmação/recuperação por e-mail com participação do titular; nunca pedir senha no chat.
5. Em ambiente separado, executar o ciclo visual completo de reserva, confirmação, remarcação, cancelamento e cerimônia com ficha fictícia.
6. Testar Safari/iPhone, Chrome e Firefox, teclado e telas pequenas.
7. Verificar configuração real de regras, índices e acessos do Firestore; configurar e ensaiar recuperação de backup.
8. Automatizar os testes em CI e exigir aprovação antes de novos deploys. Registrar limitações e alertas operacionais.

Não declarar o projeto livre de erros futuros. O objetivo é ter falhas conhecidas resolvidas, evidências de teste e mecanismos para detectar e recuperar problemas.

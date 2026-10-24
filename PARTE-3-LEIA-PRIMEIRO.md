# Parte 3 — pacote para teste local

Esta edição reúne o código atual dos dois sites, as melhorias das partes 1 e 2 e os mecanismos de privacidade da parte 3. Não é certificação de ausência de vulnerabilidades nem liberação comercial.

## Abrir no Windows

1. Instale Node 22.13 ou superior e Java 21. Confira `node -v` e `java -version` no terminal.
2. Extraia todo o ZIP em uma pasta nova. Não substitua sua pasta de dados anterior sem guardar uma cópia.
3. Execute `INSTALAR-LOCAL.cmd` e aguarde. A primeira instalação precisa de internet.
4. Execute `INICIAR-LOCAL.cmd` e informe o e-mail administrativo que deseja autorizar.
5. Aguarde a mensagem `IEC LOCAL`. Abra http://127.0.0.1:8888 e http://127.0.0.1:8889.
6. Crie a conta no site público usando o e-mail informado e uma senha de teste. Confirme pelo link em http://127.0.0.1:8888/local/inbox. Entre no painel com a mesma conta.
7. Para encerrar, pressione Ctrl+C uma vez e espere a exportação do banco. Não feche à força.

Não existem senha padrão nem conta administrativa pré-criada. Não use fichas de pessoas reais nos testes. A autenticação local simula o provedor: não envia e-mails nem altera contas da Netlify.

## Novidades para testar

- Na ficha: aceite específico de saúde, desmarcado, com versão. O servidor registra identificador e data; não aceita uma versão antiga ou aceite ausente.
- Em Meu caderno: exportar os próprios dados e excluir as próprias fichas, confirmando a senha. A exclusão cancela inscrições ativas e remove avaliações/textos associados; a conta e a reserva básica permanecem.
- No painel: Exportar agenda exige senha atual e registra auditoria. O arquivo inclui dados pessoais da agenda, mas não fichas nem avaliações internas.
- No painel: simulação e aplicação da retenção em lotes. Não funciona sem `HEALTH_RETENTION_MONTHS` configurado. Use um prazo fictício somente no ambiente local; em produção ele depende de aprovação.
- `/privacidade.html`: rascunho visível e versionado. Os dois builds recusam produção final enquanto faltarem a revisão e os dados reais.

Para testar retenção no PowerShell, antes de iniciar, use `$env:HEALTH_RETENTION_MONTHS="1"` (apenas exemplo sintético local). O programa não lê `.env` no modo local. `ADMIN_EMAILS` também pode ser informado no terminal.

## Testar novamente

Encerre o programa e execute `TESTAR-LOCAL.cmd`, ou `npm run verify`. A suíte usa banco emulado separado, executa os testes e compila os dois sites. `npm test` sozinho não comprova a integração com o banco.

## Retenção operacional

O painel processa até cem registros por lote e oferece o próximo lote. O comando `node local/retention.mjs --project=ID` percorre todos os lotes, apenas simulando. Exige `FIREBASE_PROJECT_ID` igual ao ID informado e `HEALTH_RETENTION_MONTHS` aprovado. Em nuvem, exige também credenciais Firebase privadas no ambiente.

Para remoção, exige ainda `--apply --confirm=ELIMINAR_FICHAS_VENCIDAS`. Só execute após conferir a simulação e a política. Não há tarefa periódica instalada por este pacote. O operador deve agendar a execução (sugestão operacional: diária), monitorar falhas e registros sem data, e guardar somente logs de contagem. Não publique essa ferramenta como endpoint público.

## Antes de vender ou publicar

Leia `audit/RELATORIO-PARTE-3.md`, `docs/PENDENCIAS-CLIENTE.md` e `docs/lgpd/mapa-de-dados.md`. Faltam validação de produção, revisão jurídica e etapas P1. O ZIP contém fontes, não uma pasta estática para Netlify Drop. Os builds de teste usam domínios `example.invalid`; refaça os builds com URLs reais conforme `COMECE-AQUI-NETLIFY.md`.

# Pendências para entrega comercial

Status em 22/10/2026: nenhum item abaixo está aprovado apenas por constar neste documento.
Preencher a evidência e a data ao marcar um item. Não anexar senhas, tokens, chaves ou fichas reais.

| Concluído | Pendência / decisão | Responsável | Evidência necessária |
| --- | --- | --- | --- |
| [ ] | Nome oficial e identificação do controlador | Cliente | Cadastro aprovado por escrito |
| [ ] | WhatsApp real e disponível; há registro anterior de indisponibilidade | Cliente | Teste de abertura e recebimento, com data |
| [ ] | Titularidade do Instagram | Cliente | Confirmação do titular e URL definitiva |
| [ ] | E-mail institucional e canal dos direitos do titular | Cliente | Recebimento de mensagem de teste |
| [ ] | Serviços, modalidades, duração e preços reais | Cliente | Catálogo assinado/aprovado |
| [ ] | Tarô: qual preço vale numa reserva feita antes de 01/01/2027 para atendimento depois? Data da reserva ou do atendimento? | Cliente | Resposta escrita; configuração correspondente e teste de regressão |
| [ ] | Prazo de cancelamento/remarcação, inclusive para cerimônias | Cliente | Regra aprovada com limites exatos |
| [ ] | Identity ativo nos dois projetos; painel somente por convite | Operador Netlify | Configuração conferida e teste de cadastro público/recusa de cadastro admin |
| [ ] | Lista administrativa por variável; convite aceito pelo e-mail correto informado pelo cliente | Operador + titular | Login autorizado e terceiro recusado com 403 |
| [ ] | Firebase da conta correta e bridge idêntica nos dois projetos | Operador | Preflight sem imprimir segredos; leitura/gravação ponta a ponta. Chave Firebase fica somente no site público, não se copia ao painel |
| [ ] | Regras e índices do Firestore no projeto certo | Operador Firebase | ID conferido, publicação e testes negativos em homologação |
| [ ] | Política e tratamento de saúde revisados juridicamente | Cliente + assessoria jurídica | Documento versionado aprovado; retirar marca de rascunho apenas após aprovação |
| [ ] | Necessidade de cada campo de saúde, responsáveis pelo acesso e retenção em meses | Cliente + responsável técnico/jurídico | Mapa de dados aprovado, com justificativas e prazo |
| [ ] | Encarregado (quando aplicável), controlador e canal de atendimento do titular | Cliente + assessoria jurídica | Identificação e contato aprovados |
| [ ] | Convite, confirmação, recuperação e troca de e-mail recebidos de verdade | Operador + titular | Testes nas duas origens, incluindo caixa de spam e expiração/uso único |
| [ ] | SPF/DKIM do domínio remetente e alinhamento do serviço de e-mail | Operador DNS/e-mail | Registros e cabeçalhos de mensagem recebida; não presumir controle sobre remetente de terceiros |
| [ ] | Domínios definitivos, titularidade, DNS e HTTPS | Cliente + operador DNS | URLs e certificado válidos nas duas origens |
| [ ] | Republicação de AMBOS os sites após alterar URLs/variáveis | Operador Netlify | IDs de deploy, URLs e smoke test aprovado |
| [ ] | Backup criptografado, periodicidade, responsável e restauração | Operador + cliente | Execução e restauração ensaiadas; acesso restrito ao armazenamento |
| [ ] | Aceite em produção | Cliente + QA | Roteiro abaixo concluído e assinado |

## Roteiro de aceite em produção

Usar contas e fichas sintéticas; nunca experimentar com dados de saúde reais.

- [ ] Abrir público e painel, acesso, recursos estáticos, rota inexistente (404), canonical e imagem OG.
- [ ] Criar conta; confirmar por e-mail; entrar, sair, renovar/expirar sessão e recuperar senha.
- [ ] Concluir convite admin; terceiro autenticado recebe 403; conta não confirmada não entra.
- [ ] Reservar, conferir no painel, recarregar e reabrir; outro cliente não vê a reserva/ficha.
- [ ] Testar colisão, cancelamento, remarcação e recuperação de erro sem reserva parcial.
- [ ] Enviar ficha sintética com consentimentos; testar acesso, direitos do titular e retenção.
- [ ] Exportar agenda somente após reautenticação; conferir aviso e auditoria sem conteúdo sensível.
- [ ] Conferir celular/desktop, teclado, ambos os temas, navegadores e relatórios de acessibilidade/performance.
- [ ] Executar smoke pós-deploy e anexar logs sanitizados; registrar responsável, data e IDs dos dois deploys.

## Bloqueadores técnicos ainda não encerrados nesta fase

P0.2: resposta idempotente de sucesso/replay e cobertura da política de cerimônias.
P0.3: função única configurável e testes implementados na fase 2; cliente ainda deve escolher entre data da reserva e do atendimento.
P0.4: mecanismos locais implementados na fase 3. Restam aprovação da política/prazo/campos, operação assistida dos direitos fora do escopo automático, agendamento da retenção e validação do Identity real. Consulte docs/lgpd/mapa-de-dados.md e audit/RELATORIO-PARTE-3.md.
P0.5: e-mail fixo local removido e falha de configuração vazia implementada na fase 2; falta configurar/testar Identity e allowlist reais em produção.
P1: triagem de dependências, validação/rate limits adicionais, navegadores/axe/Lighthouse, backup/restore, logs, smoke e Windows real.

Este documento é um controle de pendências, não parecer jurídico nem certificação de segurança.

# Mapa de dados — versão técnica 2026-10-23

PENDENTE DE REVISÃO JURÍDICA. As finalidades abaixo descrevem o software; a necessidade clínica de cada pergunta deve ser validada por profissional habilitado e pelo controlador. Não há diagnóstico ou aprovação automática.

## Onde, quem acessa e por quanto tempo

| Grupo | Armazenamento | Finalidade | Acesso | Retenção |
| --- | --- | --- | --- | --- |
| Conta, senha e sessão | Netlify Identity; localmente accounts.json com hash de senha | Autenticação | Titular e operador do provedor | Prazo da conta pendente do controlador; exclusão de ficha não exclui conta |
| Reservas e contato | Firestore bookings | Organização do atendimento | Dono e administradores autorizados via Functions | Prazo das reservas pendente; não anunciar retenção ilimitada |
| Ficha e recibo de consentimento | bookings.anamnesis | Avaliação humana prévia | Titular e administradores autorizados; nunca outro participante | HEALTH_RETENTION_MONTHS após envio/aceite, ou solicitação do titular |
| Avaliação interna | bookings.internal e textos associados | Avaliação humana da inscrição | Administradores autorizados | Removida junto da ficha |
| Disponibilidade e ocupação | bookingSlots, ceremonySeats, activeBookings | Evitar dupla reserva | Functions; público recebe apenas disponibilidade | Locks liberados ao cancelar; saneamento histórico a definir |
| Auditoria de privacidade | privacyAudit | Saber operação, executor e momento | Operador autorizado | Prazo pendente; sem ficha, e-mail, nome, senha ou conteúdo exportado |
| Auditoria anterior | audit | Histórico de mudanças | Operador autorizado | Prazo pendente; IDs pseudônimos existentes não são dados anônimos |
| Controle de frequência | rateLimits | Limitar alterações | Functions | Expiração lógica registrada; limpeza/TTL operacional ainda precisa de implantação |
| Arquivos exportados | Dispositivo de quem exportou | Exercício de direitos e operação da agenda | Quem baixou | Responsabilidade do destinatário; definir prazo e armazenamento criptografado |
| Backups | A definir pelo controlador | Recuperação de incidentes | Operadores explicitamente autorizados | Definir expiração e procedimento para reaplicar exclusões após restauração |

Não há acesso direto do navegador ao Firestore. O Admin SDK ignora regras e depende da autorização nas Functions. Identificadores e hashes de identificadores podem ser dados pseudonimizados; o log não deve ser anunciado como totalmente anônimo.

## Inventário da ficha e justificativa proposta

Todos os campos de saúde ficam em anamnesis; campos com `Details` são obrigatórios apenas quando a resposta é “sim”. Campos narrativos vazios não exigem informação adicional. Revisão humana pode concluir que uma pergunta não é necessária: nesse caso remover da interface e do validador e tratar os dados existentes.

| Campos | Uso proposto / minimização |
| --- | --- |
| fullName | Identificar o participante; obrigatório |
| birthDate | Verificar faixa etária e contexto de avaliação; justificar necessidade de data completa na revisão |
| phone | Contato operacional; obrigatório |
| email | Obtido da identidade autenticada; valor enviado pelo formulário é ignorado |
| emergencyContact | Pessoa de contato em eventual emergência; obrigatório; controlador deve definir informação ao terceiro |
| emergencyPhone | Contato de emergência; obrigatório |
| relationship | Contexto do contato; tornado opcional nesta fase |
| physicalDiagnosis, physicalDiagnosisDetails | Condições diagnosticadas para avaliação humana; justificar escopo clínico |
| conditions, otherCondition | Categorias de condições e descrição de “outra”; não repetir informações sem necessidade |
| currentTreatments | Tratamentos atuais; texto opcional |
| allergies | Alergias; texto opcional |
| pregnancy, pregnancyDetails | Contexto de gravidez/amamentação na avaliação; pergunta sensível sujeita a validação |
| mentalDiagnosis, mentalDiagnosisDetails | Diagnósticos informados; acesso estritamente restrito |
| crisisHistory, crisisHistoryDetails | Histórico relevante à avaliação humana; não diagnosticar pelo sistema |
| professionalCare, professionalCareDetails | Acompanhamento profissional; não coletar nome/contato do profissional sem necessidade definida |
| recentGrief, recentGriefDetails | Contexto de acolhimento; necessidade e obrigatoriedade a revisar |
| emotionalVulnerability, emotionalVulnerabilityDetails | Contexto de acolhimento e avaliação humana; necessidade a revisar |
| currentMedication, medicationDetails | Medicamentos, doses e frequência informados para avaliação profissional |
| medicationClasses | Categorias opcionais; revisar redundância com medicationDetails |
| recentAlcohol, recentAlcoholDetails | Informação de uso recente para avaliação humana |
| recentSubstances, substanceDetails | Informação de uso recente para avaliação humana |
| compatibilityQuestions | Dúvidas do titular; opcional; não há resposta médica automática |
| priorExperience, priorExperienceDetails | Experiência anterior; necessidade e obrigatoriedade a revisar |
| motivation | Contexto de acolhimento; tornado opcional nesta fase |
| concerns | Receios; opcional |
| needs | Necessidades de acolhimento/acessibilidade; opcional |
| importantInformation | Informação adicional; opcional; evitar dados excessivos e de terceiros |
| signature | Confirmação digitada igual ao nome; não equivale a assinatura eletrônica qualificada |
| truthConsent | Declaração de veracidade |
| changeConsent | Compromisso de comunicar alterações |
| evaluationConsent | Ciência da avaliação prévia |
| generalConsent | Ciência/aceite do tratamento para inscrição; base legal deve ser revisada |
| healthDataConsent | Consentimento destacado de saúde, separado e não pré-marcado |
| healthConsentVersion | Versão enviada pelo navegador; servidor recusa versão desatualizada |
| consentReceipt.id, subjectId, version, text, acceptedAt | Prova gerada no servidor; ignora timestamp/identidade forjados; removida com a ficha |
| submittedAt, schemaVersion | Data e versão técnica da ficha |

## Outros campos persistidos

Reservas: id, userId, type, service, ceremonyId, seatNumber, title, duration, price, date, time, mode, name, email, phone, topic, intention, status, created, createdAt, startAt, endAt, notes, cards, video, location, reason, version e slotIds. Campos técnicos sustentam agenda, concorrência e histórico. `intention`, `notes`, `cards`, `reason` podem conter saúde em texto livre e são removidos junto da ficha de cerimônia. `topic` da cerimônia é uma categoria fixa; o agendamento comum permite tema e intenção e requer revisão própria de minimização/retenção.

Avaliação interna: anamnesisReceived, needsClarification, professionalReview, safetyEvaluationPending, notes, evaluationDate, responsible. Finalidade proposta: documentar avaliação humana. Removida junto da ficha; requer definição dos profissionais autorizados.

Recibo de remoção na reserva: healthErasedAt; a versão da reserva aumenta. Inscrição ativa é cancelada e a vaga liberada para impedir participação aprovada sem ficha. A conta e os dados básicos da agenda continuam existentes, como informado antes da confirmação.

Configuração: nome, biografia, WhatsApp, endereço, link de vídeo, modalidades, disponibilidade, serviços, valores e versões. Dados do prestador precisam de confirmação do cliente. Não armazenar segredos nesses campos.

## Operação da retenção e direitos

1. Aprovar prazo e política antes de usar com dados reais. Configurar HEALTH_RETENTION_MONTHS em Functions do site público e no ambiente do executor da rotina.
2. Simular pelo painel (Configurações → Simular fichas vencidas). Cada lote tem até 100 registros; confirmar novamente para o lote seguinte até “Fim da varredura”.
3. Executar remoção com confirmação explícita. Datas ausentes/inválidas ficam para revisão manual; o sistema não inventa a idade da ficha.
4. Alternativa para agendador externo: `node local/retention.mjs --project=ID_REAL`. Por padrão só simula. Para aplicar, acrescentar `--apply --confirm=ELIMINAR_FICHAS_VENCIDAS`. FIREBASE_PROJECT_ID deve coincidir exatamente com o argumento; configurar credenciais de serviço por ambiente, nunca no repositório.
5. Recomenda-se execução diária após aprovação, em infraestrutura controlada, com logs de contagem e alertas de falha. O agendamento externo não foi implantado nesta entrega. Sem execução periódica, não há eliminação automática por tempo.
6. Meses são calculados pelo calendário UTC a partir do envio, ajustando o dia ao último dia do mês de destino. A comparação remove na data/hora exata de vencimento.
7. No Meu caderno, exportação e exclusão exigem senha atual. Exportação individual exclui avaliações internas, que devem ser analisadas em pedido assistido ao controlador. Exclusão automática limita-se às fichas/avaliações de cerimônia; dados da conta, reservas comuns, backups e arquivos já baixados precisam de procedimento complementar.
8. Exportação acima de 1.000 reservas ou exclusão automática com mais de 100 reservas do titular falha antes da operação e pede atendimento assistido. Não há truncamento silencioso.

Auditoria: actorHash = SHA-256 de `iec-privacy-v1:` seguido do ID Identity do executor; action, count e occurredAt. Para identificar quem executou, o operador autorizado compara o hash com o ID da conta investigada. Não se grava senha, e-mail ou ficha no log.

Fontes para revisão jurídica: [LGPD, texto legal](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), especialmente arts. 11, 16 e 18; [orientação do Ministério da Saúde](https://www.gov.br/saude/pt-br/acesso-a-informacao/lgpd). A implementação técnica não resolve sozinha base legal, exceções de conservação ou direitos de terceiros.

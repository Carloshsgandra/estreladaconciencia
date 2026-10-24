# Auditoria de entrega — Instituto Estrela da Consciência

Data: 22/10/2026. Escopo: código do site público, painel, Functions, build, arquivos estáticos e pacote manual de publicação. Os 331 arquivos versionados ou novos do projeto foram inventariados/lidos como bytes antes das mudanças; a revisão semântica concentrou-se no código e nos recursos efetivamente publicados. O repositório inclui componentes e exemplos de um framework anterior que não entram no build Netlify atual.

## 1. Veredito

**Não — 7/10 para entrega comercial hoje.** Os fluxos automatizados de login, reserva, autorização e build estão em bom estado, mas a publicação real ainda precisa comprovar Identity, Firebase, e-mails e persistência entre os dois projetos. O site coleta dados de saúde na ficha de cerimônia; a política e a operação de retenção/exclusão ainda carecem de revisão jurídica e do responsável pelo atendimento. Sem teste visual real e Lighthouse, a meta de 90 pontos e a conformidade WCAG AA não estão demonstradas. Não existe promessa responsável de zero falhas futuras.

## 2. Problemas objetivos corrigidos nesta auditoria

| Arquivo | Problema | Gravidade | Correção |
| --- | --- | --- | --- |
| `site-principal/public/app.js`, `ui/page.html`, `public/atelier.css` | O botão flutuante usava número fixo mesmo que o painel mudasse ou removesse o WhatsApp. | Médio | O link e número agora refletem a configuração carregada; sem número válido, fica oculto. |
| `site-principal/public/ceremonies.js`, `public/app.js` | `#cerimonias` tentava rolar antes de a seção ser inserida; abertura direta da ficha não religava o botão de privacidade. | Médio | Rolagem após inserção e ligação do botão na rota direta. |
| `site-principal/netlify.toml`, `painel-administrativo/netlify.toml`, `netlify.toml`, `ui/404.html` em ambos | Fallback `/*` convertia caminho inexistente em início com HTTP 200. | Médio | Rotas baseadas em hash continuam funcionando; caminho desconhecido pode receber 404 próprio. API continua reescrita primeiro. |
| `site-principal/scripts/build-netlify.mjs`, `shared/seo-build.mjs`, `ui/page.html`, `public/compartilhar.*` | Sem URL canônica, Open Graph, Twitter Card ou imagem de compartilhamento. | Médio | Metadados absolutos gerados com a origem real do deploy, imagem PNG 1200×630 e SVG fonte. |
| `site-principal/scripts/build-netlify.mjs`, `shared/seo-build.mjs` | Sem sitemap e robots da origem publicada. | Leve | Gerados para a URL real; login e API excluídos do rastreio. |
| `painel-administrativo/scripts/build-netlify.mjs`, `ui/page.html` | Painel não tinha `noindex` na tela principal nem robots; link “Ver site” dependia de substituir domínio antigo. | Médio | Painel fora de indexação; URL recebe marcador obrigatório substituído no build, com falha se permanecer. `rel="noopener noreferrer"`. |
| `site-principal/public/app.js`, `painel-administrativo/public/app.js`, `local/build.mjs`, scripts de build | Referências embutidas ao antigo domínio ChatGPT Sites podiam sobreviver numa distribuição. | Médio | Marcadores de build explícitos; URL correta no build Netlify e no ambiente local. |
| `public/favicon.svg` de ambos, `site-principal/public/apple-touch-icon.png`, HTML | Favicon genérico do scaffold e ícone Apple ausente. | Leve | Ícone da marca e referência explícita. |
| `release/prepare.mjs`, `site-principal/tests/delivery.mjs` | Pacote manual não passava URL pública para geração de canonical; faltava regressão de metadados/404. | Médio | URL passada ao build e testes de origem/404 adicionados. |

## 3. Botões, links e elementos interativos

Esta tabela cobre todos os tipos de elemento clicável presentes nas quatro páginas HTML e nos templates dinâmicos. Para listas de serviços, cerimônias, horários e reservas, cada linha corresponde a todas as instâncias geradas daquele tipo. “OK”/“Corrigido” comprova o destino ou handler no código e os testes pertinentes; **não equivale a clique confirmado na produção**. A ausência de navegador acessível nesta sessão impediu o ensaio visual real.

| Página/elemento | Destino ou efeito | Status |
| --- | --- | --- |
| Público: pular conteúdo; logos do cabeçalho/rodapé | `#main`; `#home` | OK |
| Público: Tema; Menu | Alterna claro/escuro; abre/fecha navegação, `aria-expanded`, Escape | OK |
| Público: As leituras; O instituto | `#services`; `#about` | OK |
| Público: Meu caderno; Agendar sessão | `#client`; `#book` | OK |
| Hero: Encontre seu atendimento; Como funciona | `#services`; `#how` | OK |
| Catálogo: Escolher meu horário, por serviço ativo | `#book/<id>` com seleção do serviço após carregar API | OK |
| Catálogo vazio: Consulte atendimentos | Modal de contato | OK |
| Sobre: Instagram; rodapé: Instagram | Perfil `@institutoestreladaconciencia` em nova aba segura | Pendente: validar titularidade/URL com cliente |
| Como funciona: Abrir agenda; Abrir caderno | `#book`; `#client` | OK |
| Cerimônias: Escolher esta cerimônia, por data aberta | `#ceremony/<id>` | OK |
| Ficha sem conta: Entrar ou criar conta | `/acesso.html?return_to=/#ceremony/<id>` codificado | OK |
| Ficha: Enviar ficha e solicitar inscrição | POST `/api/action`, validação/consentimento, resposta e erro | OK no código; pendente teste real |
| Ficha indisponível: Ver outras datas | `#cerimonias`, rolagem após render | Corrigido |
| FAQ: cada `summary` | Abre/fecha a respectiva resposta nativamente | OK |
| FAQ: Converse com Instituto; rodapé: Contato | Modal com WhatsApp configurado, mailto e Instagram | OK |
| CTA final: Encontrar meu horário | `#book` | OK |
| Rodapé: mailto; Meu caderno; Área da taróloga; Privacidade | E-mail do Instituto; `#client`; URL do painel; modal informativo | OK, política final pendente |
| Botão flutuante WhatsApp | `wa.me/55<DDD+número>?text=<mensagem codificada>`; some quando não configurado | Corrigido; confirmar número com cliente |
| Reserva: seleção de serviço, datas e horários | Estado da reserva baseado em opções reais da API | OK no código |
| Reserva: calendário anterior/próximo; cartões/lista | Navegação de datas; troca visual, desabilitação de limite | OK no código |
| Reserva: anterior/próximo; enviar reserva | Valida etapa/campos, POST API, resultado ou erro | OK no código; pendente produção |
| Reserva concluída: adicionar ao calendário; abrir caderno | Download ICS; `#client` ou `#admin` | OK no código |
| Caderno: login; alterar senha | `/acesso.html?return_to=/#client`; `/acesso.html?action=change-password` | OK no código; pendente e-mail real |
| Caderno: link de videochamada | HTTPS configurado na confirmação, nova aba segura | OK no código |
| Caderno: cancelar/remarcar, confirmar ação | Modal, validações de prazo e POST API | OK no código; pendente produção |
| Caderno: consultar ficha anterior; ICS | `details` nativo; download ICS | OK no código |
| Acesso público: logo, tema, voltar site | `/`; alterna tema; `/` | OK |
| Acesso público: entrar/criar conta/esqueci senha/voltar login | Identity da origem, preflight `/api/session`, estados e mensagens | OK em teste automatizado; pendente produção |
| Acesso público: convite/confirmação/redefinição/troca de senha | Token de e-mail preservado e formulário de nova senha | OK em teste automatizado; pendente e-mail real |
| Painel: logo, Painel, Agenda, Área da taróloga | `#admin` | OK |
| Painel: Ver site | Origem pública configurada no build, nova aba segura | Corrigido; conferir domínio real |
| Painel: Sair; Tema; Menu; Privacidade | Logout Identity; tema; navegação móvel; modal | OK no código |
| Painel: abas Agenda/Serviços/Disponibilidade/Configurações/Cerimônias | Troca conteúdo, teclado por setas nas abas | OK no código |
| Agenda: filtro, busca, Novo encontro | Filtra resultados; abre fluxo de reserva administrativo | OK no código |
| Reservas admin: confirmar, recusar, cancelar, remarcar, abrir/salvar caderno, ICS | Modal/formulário, validações e POST API, download | OK no código; pendente produção |
| Serviços: Adicionar serviço extra, Salvar serviços, disponibilidade | Editor até 30 serviços; POST configuração | OK em testes de regras; pendente produção |
| Disponibilidade: salvar semana, bloquear dia, liberar dia | POST configuração com prevenção de conflitos | OK no código; pendente produção |
| Configurações: salvar identidade/contato; exportar agenda | POST configuração; download de dados pessoais | OK no código; pendente processo seguro de backup |
| Cerimônias admin: adicionar, fechar/reabrir, excluir | POST API com versão e restrições de exclusão | OK no código; validar operação real |
| Fichas admin: abrir ficha, salvar avaliação, confirmar/recusar/cancelar | Área protegida, POST atualização, vaga atualizada | OK no código; pendente produção |
| Acesso admin: logo, tema, entrar/esqueci senha/voltar login | Identity separado, allowlist no servidor, preflight API | OK em testes automatizados; pendente convite real |
| Acesso admin: convite/redefinição/troca de senha | Formulário e tokens da própria origem administrativa | OK em testes automatizados; pendente e-mail real |
| Erro de conexão: Tentar novamente; trocar conta | Recarrega API; `/acesso.html?action=logout` | OK no código |
| 404 em cada site: Voltar | `/` do respectivo projeto | Corrigido |

Não há Netlify Forms: os formulários de cadastro, agendamento e ficha gravam pela Identity/Function/Firestore; adicionar `data-netlify="true"` duplicaria um fluxo com dados sensíveis. Os links `#home`, `#client`, `#book` e `#admin` são rotas hash; não são âncoras de elementos literais. O alvo `#cerimonias`, cuja seção é inserida após a renderização inicial, foi corrigido.

## 4. Verificação e limites

- Builds de produção com URLs fornecidas para ambos: passaram. Pacote manual: duas páginas 404, arquivos estáticos, sitemap, robots e duas `api.zip` presentes; nenhum marcador de build ou domínio anterior nos HTML/JS publicados. Os IDs do ensaio do empacotador são fictícios e não foram publicados.
- `npm test`: **133 passaram, 2 testes dependentes de Firestore foram pulados** por falta de emulator neste ambiente (site 87 pass/2 skip; painel 46 pass). A rodada anterior de 157 testes com emulator pertence à versão anterior; não serve como prova do código desta auditoria.
- Análise estática dos 6 HTML construídos: sem IDs duplicados, sem `<img>` sem `alt`, recursos locais apontados presentes e links de nova aba com `noopener`. `git diff --check` e checagem de sintaxe passaram.
- `npm audit` nesta data: site público **0**, painel **0**; ferramentas da raiz **18 entradas afetadas** (14 altas, 4 moderadas). Parte é propagação de dependências, não 18 falhas independentes; resolver requer acompanhamento de versões/advisories, não um `npm audit fix --force` cego.
- Não foi possível executar navegador/Lighthouse em 320, 375, 414, 768, 1280 e 1920 px aqui; tampouco verificar contraste computado, teclado real, console, rede 404/500, envio de e-mails, DNS, certificado, login e gravações na produção. A revisão de CSS inspecionou media queries e estados visíveis, sem afirmar WCAG AA ou pontuação >90.

## 5. Pendências do cliente e aprovação de venda

1. Conferir domínio público/painel atuais, número de WhatsApp (há registro anterior de indisponibilidade do canal), titularidade do Instagram, e-mail, nome, preços e regra do Tarô que altera R$97 para R$137 em **01/01/2027**. Confirmar serviços e modalidades realmente oferecidos, inclusive cerimônia.
2. Configurar Identity nos **dois** projetos e o painel somente por convite; convidar e confirmar `carloshsgandracode@gmail.com`; salvar as variáveis Firebase e bridge iguais nos dois lados, conforme `COMECE-AQUI-NETLIFY.md`.
3. Publicar regras e índices Firestore no projeto certo, conferir permissões mínimas da conta de serviço; realizar backup/restauração testados e política de retenção/exclusão.
4. Revisar juridicamente a política de privacidade, bases/consentimento para dados de saúde, operação da ficha, direitos do titular e responsável pelo atendimento. O modal atual declara expressamente que ainda necessita dessa revisão. Um banner de cookies não é indicado apenas por salvar preferência de tema, mas deve ser revisto se forem instalados analytics/publicidade.
5. Testar no domínio real cadastro, confirmação, login/logout, recuperação, convite admin, erro de senha, autorização de terceiro, reserva concorrente, cancelamento, persistência após reabrir navegador, cerimônia/ficha e responsividade. Rodar Lighthouse e teste de teclado/contraste em páginas pública, acesso e painel antes da venda.

## 6. Melhorias opcionais, por impacto

1. Contratar/revisar documentação LGPD e rotina operacional com especialista, seguida de página de privacidade versionada e canal de direitos.
2. Adotar monitoramento de erros, alertas de Function/Firestore e backup periódico com restauração ensaiada.
3. Após teste Lighthouse real, reduzir o CSS legado não usado e otimizar carregamento de fontes sem alterar a tipografia.
4. Preparar conta de homologação isolada e suíte visual em navegadores reais de celular e desktop.

## 7. Checklist final Netlify

- [ ] Definir dois projetos distintos e URLs HTTPS definitivas; Node 22; configurar variáveis Production e escopos Build/Functions documentados.
- [ ] Ativar Identity em ambos, confirmação de e-mail no público, convites somente no painel; configurar Firebase, regras/índices e bridge.
- [ ] Em Windows, extrair o pacote completo, executar `INSTALAR-LOCAL.cmd`, `TESTAR-LOCAL.cmd` em máquina com Node 22.13+ e Java 21; conferir localmente e depois `PUBLICAR-NETLIFY.cmd` com Project IDs e URLs reais. O ZIP de fonte não é um ZIP estático para arrastar no Netlify Drop; o assistente usa CLI para publicar Functions e arquivos juntos. Ver [documentação oficial do CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/) e [Functions](https://docs.netlify.com/build/functions/get-started/).
- [ ] Confirmar pós-publicação: `/`, `/acesso.html`, `/404.html`, `/api/session`, favicon, `robots.txt`, `sitemap.xml`, OG image; páginas inexistentes devem retornar 404, não início.
- [ ] Adicionar domínio personalizado em Domain management, configurar DNS conforme os registros indicados no próprio projeto e aguardar certificado HTTPS; atualizar `ADMIN_SITE_URL`, `MAIN_SITE_URL` e URL pública/canônica com os domínios finais e republicar **ambos**. Ver [DNS externo](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/) e [HTTPS](https://docs.netlify.com/manage/domains/troubleshooting-tips/).
- [ ] Executar aceite funcional e visual real; só então liberar venda/entrega.

Arquivos deste ciclo: `shared/seo-build.mjs`, `site-principal/tests/delivery.mjs`, HTML 404 de ambos, metadados e imagem de compartilhamento, favicons, scripts de build/publicação, `local/build.mjs`, CSS/JS/HTML de navegação e os três `netlify.toml`. Mudanças anteriores já existentes no worktree foram preservadas.

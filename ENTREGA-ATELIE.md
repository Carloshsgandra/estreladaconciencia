# IEC — edição Ateliê Celestial
Data: 22/10/2026

## O que mudou
A página principal recebeu uma composição editorial com cartas do Sol e da Lua desenhadas em SVG, azul profundo, marfim e dourado. Os serviços possuem hierarquia mais clara, duração e preço obtidos da configuração real. O percurso apresenta atendimento, Instituto, reserva, cerimônias e dúvidas.

A nova página não usa depoimentos inventados, contadores fictícios nem garantias de resultado. Foi removida a indicação indevida de mensalidade/primeiro encontro de mentoria no Reiki. O renderizador substitui a antiga manipulação contínua da página por MutationObserver.

A aparência está isolada em site-principal/public/atelier.css e a página inicial em site-principal/public/identity.js. Os fluxos de reserva e as funções de servidor foram preservados. A inicialização pública aguarda os scripts da página para evitar corrida no primeiro render.

Há pré-verificação de portas locais sem matar processos, validação de formato de configuração para produção e um comando único de testes: npm run verify.

## Comece aqui
- Testar na máquina: LEIA-PRIMEIRO-LOCAL.md.
- Publicar: COMECE-AQUI-NETLIFY.md.
- Evidências e limites: VALIDACAO-LOCAL.md.
- Arquitetura e manutenção: DOCUMENTACAO-GERAL.md, observando o aviso de atualização.

O ZIP não contém credenciais reais, contas, fichas, node_modules nem bancos de teste. Dados da sua versão antiga não são migrados automaticamente. Preserve uma cópia de .local-data antes de trocar de pasta e nunca exponha essa pasta em hospedagem pública.

## Situação da entrega
153 execuções de teste passaram após a inclusão de serviços extras. Builds de verificação concluídos. Consulte SERVICOS-EXTRAS.md para cadastrar novos atendimentos pelo painel.
Visual em navegador e funcionamento na conta Netlify ainda exigem homologação; esta entrega não foi publicada.

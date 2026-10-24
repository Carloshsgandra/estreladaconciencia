# Cadastrar serviços extras

1. Entre no painel administrativo com sua conta autorizada.
2. Abra a aba **Serviços** e clique em **Adicionar serviço extra +**.
3. Preencha nome, descrição, duração e valor. A duração aceita de 15 a 240 minutos, em intervalos de 15 minutos.
4. Marque **Disponível para novas reservas** para mostrar o serviço no site.
5. Clique em **Salvar serviços**. O botão Adicionar apenas abre os campos; a publicação ocorre ao salvar.

O catálogo admite 30 serviços no total, incluindo os quatro originais. Os novos serviços usam a disponibilidade e as modalidades configuradas no Instituto. Cerimônias com vagas e ficha de acolhimento continuam na área específica de cerimônias.

Para retirar um serviço, desmarque sua disponibilidade e salve. O cadastro permanece para preservar os vínculos com reservas anteriores. Alterar nome, preço ou duração não altera os dados já combinados nas reservas existentes. Um serviço inativo não aceita novas reservas ou remarcações; reative-o se precisar remarcar.

Após salvar, reabra ou recarregue a página pública para consultar o catálogo atualizado. Cada serviço possui um link de agendamento próprio.

## Verificação desta atualização

`npm run verify`: 153 testes aprovados, zero falhas e zero ignorados; builds local e dos dois sites concluídos. Os testes novos verificam persistência do serviço extra, reserva, preço e duração determinados pelo servidor, conflito com horários ocupados, desativação e preservação integral da reserva anterior. Também rejeitam IDs duplicados ou inválidos, exclusão de serviços existentes, duração inválida e catálogo acima do limite.

Os testes de renderização verificam a presença e retirada do serviço na página pública. A conferência por cliques em navegador e a homologação na conta Netlify continuam pendentes, conforme VALIDACAO-LOCAL.md. Nenhum deploy foi feito nesta atualização.

Atualize os dois subprojetos e mantenha a pasta shared. O servidor antigo aceita apenas quatro serviços e recusará os novos cadastros se apenas o painel for atualizado.

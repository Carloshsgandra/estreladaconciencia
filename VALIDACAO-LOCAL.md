# Validação desta entrega — 22/10/2026

## Resultado efetivamente executado
Comando: `npm run verify`, em Linux, Node 24.19 e Java 21.0.12.1, com Firebase CLI 15.34.1.
Requisitos desta edição: Node 22.13 ou superior e JDK 21 ou superior.

| Grupo | Aprovados | Falhas | Ignorados |
| --- | ---: | ---: | ---: |
| Site, autenticação compartilhada, catálogo e pré-publicação | 87 | 0 | 0 |
| Painel e autenticação compartilhada | 46 | 0 | 0 |
| Persistência e invariantes do Firestore Emulator | 13 | 0 | 0 |
| Integração HTTP local e portas | 11 | 0 | 0 |
| Total de execuções de teste | 157 | 0 | 0 |

Parte da autenticação compartilhada é executada em ambos os projetos: o total não significa 157 funcionalidades diferentes. A suíte combina testes unitários, verificações de código e integração real com o emulador; não é uma certificação de segurança.

Também concluídos: build local, compilação das duas funções por esbuild e builds estáticos dos dois sites. Os builds de verificação usam URLs example.invalid de propósito e NÃO são artefatos de produção. O ZIP contém código-fonte, não esses builds.

`npm audit --omit=dev --audit-level=high` executado nos dois subprojetos: zero vulnerabilidades reportadas nas dependências de produção. Isso não cobre dependências de desenvolvimento nem substitui auditoria manual ou pentest.

Nesta revisão, `npm audit --json` também incluiu desenvolvimento: os dois subprojetos continuam sem alertas; ferramentas da raiz têm 17 entradas afetadas. Consulte SEGURANCA-RELEASE.md. O empacotamento real das Functions pela ferramenta Netlify e a execução anônima das funções extraídas dos ZIPs foram verificados adicionalmente (HTTP 401).

## Cenários cobertos
- Cadastro, confirmação obrigatória, senha incorreta, login, logout, recuperação, senha nova, expiração e uso único de tokens.
- Acesso administrativo somente por lista explícita; conta comum e papel forjado não concedem acesso.
- Origem inválida, sessão ausente/expirada, JSON inválido, corpo excessivo, falha de rede, resposta HTML inesperada e limite de alterações.
- Gravação, conflito simultâneo, cancelamento, remarcação, versões concorrentes, isolamento de clientes e proteção de notas internas.
- Vagas de cerimônias, consentimentos, assinatura, vínculo ao usuário autenticado e bloqueio de leitura direta do Firestore.
- Catálogo editável, estado vazio, preço, modalidade, antecedência e escape de conteúdo.
- Verificação de portas que informa o conflito sem encerrar processos alheios.
- Formato das URLs, ausência de variáveis e rejeição de segredo mascarado.

## Limites desta validação
- O navegador de conferência visual foi bloqueado pela política deste ambiente. O layout e cliques reais em desktop, iPhone/Safari e Android NÃO foram validados nesta rodada.
- Os testes de login local usam um provedor de desenvolvimento; não confirmam o Identity da Netlify nem a entrega de mensagens reais.
- Não foi publicado deploy, alterada a conta Netlify ou verificado o segredo da ponte em produção.
- Não foram verificados IAM, quotas, cobrança, índices implantados e backup/restauração do Firestore real.
- Não foi executado teste de carga, pentest independente ou teste em Windows real.
- Nenhum resultado local garante ausência de erros futuros.

## Repetir
Feche o servidor local com Ctrl+C uma vez, aguardando a exportação.
Execute `TESTAR-LOCAL.cmd` no Windows ou `npm run verify` na raiz.
Os testes não importam os dados da pasta .local-data. Nunca use banco real para a suíte.
Se o emulador já estiver aberto, encerre-o normalmente antes de testar.

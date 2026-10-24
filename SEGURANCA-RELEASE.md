# Revisão de segurança da entrega — 22/10/2026

## Correções e verificações
- Limite de 64 KiB aplicado durante a leitura do corpo HTTP, incluindo requisições sem Content-Length. Leitura interrompida quando excede o limite.
- UTF-8 inválido e comprimentos excessivos recusados com respostas controladas.
- Identificador de reserva validado antes de acessar o Firestore.
- Verificações anteriores mantidas: Identity verificada no servidor, lista administrativa explícita, origem, segredo de ponte, dados isolados por usuário, consentimentos e transações de disponibilidade.
- Ferramentas atualizadas: Firebase CLI 15.34.1, Netlify CLI 27.14.1. Emulador exige Java 21; projeto exige Node 22.13 ou superior.
- Funções empacotadas pela ferramenta oficial da Netlify, com manifesto da API v2 e runtime Node 22. Extração e execução sem sessão resultaram em HTTP 401 tanto no público quanto no painel.

## Auditoria de dependências
`npm audit --json`, incluindo desenvolvimento:
- site-principal: zero alertas reportados;
- painel-administrativo: zero alertas reportados;
- ferramentas da raiz: 17 entradas afetadas, sendo 13 altas e 4 moderadas, nenhuma crítica após atualização.

As entradas da raiz incluem dependências transitivas e seus dependentes, não 17 causas independentes. Os avisos diretos observados envolvem braces, uuid e @opentelemetry/core. O registro consultado ainda apresenta braces 3.0.3 como versão mais recente, também sinalizada pelo advisory. Não foram forçadas versões maiores incompatíveis nem suprimidos alertas para produzir um resultado artificialmente limpo.

As ferramentas da raiz executam no computador para desenvolvimento e publicação; não fazem parte do diretório público. Isso não elimina seu risco local. As dependências empacotadas pelas ferramentas de Functions e sua instrumentação também precisam ser acompanhadas nas atualizações do fornecedor.

## O que não foi certificado
Não foi realizado pentest independente, teste de carga, revisão jurídica, validação visual real nesta rodada, homologação da conta Netlify ou teste do fluxo de e-mail real. Os arquivos CMD não foram executados em Windows real neste ambiente.

Não há garantia de zero vulnerabilidades ou falhas futuras. O pacote documenta os riscos remanescentes e as verificações executadas. Antes de uso com clientes reais, conclua o aceite descrito em DEPLOY-POR-ARQUIVOS.md e mantenha atualização de dependências, backups e controle de acesso.

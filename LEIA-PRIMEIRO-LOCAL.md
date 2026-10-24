# Estrela da Consciência — desenvolvimento local completo

Esta versão permite executar o site de clientes, o painel, a autenticação de teste
e o banco na sua máquina. Não exige conta Netlify, deploy ou credenciais Firebase.
Não publique a pasta `local/` como um servidor público.

## Por que o HPC funciona localmente?

O `SITE-HPC.zip` importa Firebase Auth e Firestore diretamente no navegador, em
`api.js`. A interface fica no computador, mas login e dados dependem do Firebase
pela internet. Portanto ele dispensa a Netlify, mas não é inteiramente offline.

O Estrela tem operações de servidor: validar permissões, impedir reservas
simultâneas, proteger informações internas e conectar os dois sites. Esta versão
executa essas operações localmente, reutilizando as funções de negócio originais.
As chaves privadas continuam fora do navegador.

## 1. Instalar uma vez

1. Instale **Node.js 22.13 ou superior** e **Java JDK 21 ou superior**.
   Esta edição atualizou Firebase CLI para 15.34.1 e Netlify CLI para 27.14.1.
   Java 17 não atende mais ao emulador. Reabra o terminal depois de instalar.
2. Extraia TODO o ZIP, por exemplo em `C:\Projetos\IEC`. Não execute dentro do ZIP
   nem em caminho de rede UNC. Abra essa pasta no VS Code se quiser editar.
3. Execute `INSTALAR-LOCAL.cmd`. Aguarde o término da instalação.
4. Execute `INICIAR-LOCAL.cmd`. A primeira execução baixa o emulador Firestore.
5. Quando aparecer `IEC LOCAL`, abra:
   - Site: http://127.0.0.1:8888
   - Painel: http://127.0.0.1:8889
   - Mensagens: http://127.0.0.1:8888/local/inbox

Use exatamente `127.0.0.1`, e não `localhost`. O servidor valida o endereço para
evitar acesso por domínios externos. O terminal precisa ficar aberto.

No terminal, os comandos equivalentes são:

```sh
npm run setup
npm start
```

A instalação inicial precisa de internet. Depois de instalar as dependências e
baixar o emulador, o fluxo local de contas e agenda não precisa da Netlify nem do
Firebase na nuvem. Links externos, fontes remotas e WhatsApp continuam precisando
de internet. A aparência usa fontes alternativas se as fontes remotas falharem.

## 2. Criar sua conta administrativa local

1. No SITE, entre em `/acesso.html` e clique em **Criar uma conta**.
2. Ao iniciar pelo arquivo CMD, informe o e-mail que deseja autorizar. Cadastre esse mesmo e-mail, seu nome e uma senha de TESTE.
3. Abra **Mensagens de confirmação e recuperação**, no aviso superior.
4. Clique no link de confirmação. Ele abre a conta no site.
5. No PAINEL, entre com o mesmo e-mail e senha.

Não existe senha padrão. A lista autorizada vem da variável `ADMIN_EMAILS`, nunca de um endereço fixo no código. No PowerShell, antes de `npm start`, use `$env:ADMIN_EMAILS="seu-email"`.
Outros e-mails podem criar contas de cliente, mas recebem acesso negado no painel.
O cadastro local não cria nem modifica contas reais de produção.

## 3. Redefinir senha e confirmar cadastro

O serviço de identidade local reproduz os fluxos de cadastro, confirmação, sessão,
logout, troca e recuperação de senha usados pelas telas. Ele NÃO é o Netlify
Identity real. Os links ficam em `/local/inbox`; nenhum e-mail é enviado.

Na recuperação, solicite o link, atualize a caixa local e abra o link mais novo.
Ele deve mostrar **Definir nova senha**. Digite e confirme a nova senha. Os links
expiram em uma hora e são de uso único. Pedidos novos substituem o link anterior.
A recuperação revoga sessões anteriores. Confirmar cadastro é obrigatório.

A caixa local é uma ferramenta de desenvolvimento: qualquer pessoa com acesso
à sua máquina pode abri-la. Use somente dados fictícios. Nunca exponha essas
portas por túnel, roteador, rede pública ou hospedagem.

## 4. Onde ficam os dados e como salvar

- `.local-data/accounts.json`: contas de teste, hashes de senhas, sessões e links.
- `.local-data/firestore/`: exportação dos agendamentos, configuração e auditoria.
- `.local-build/`: páginas e scripts gerados para execução local.
- `site-principal/.local-build/` e `painel-administrativo/.local-build/`: funções
  compiladas para o servidor local.

**Para parar, pressione Ctrl+C UMA VEZ e aguarde a mensagem de exportação concluída.**
O banco Firestore trabalha em memória e grava sua exportação ao encerrar normalmente.
Ao iniciar de novo, o programa importa essa exportação. Se você fechar a janela
à força, matar o Java ou desligar o PC, pode perder alterações desde a última
exportação. Contas são gravadas a cada alteração, por arquivo temporário e renomeação.

Para fazer backup, pare normalmente e copie a pasta `.local-data` inteira para
um local privado. Não envie essa pasta ao GitHub nem a terceiros. O ZIP entregue
não contém as contas nem as reservas que foram usadas nos testes.

## 5. Editar e testar antes de publicar

1. Pare com Ctrl+C e espere a exportação.
2. Edite `site-principal`, `painel-administrativo` ou `shared`.
3. Execute `npm start` novamente. As páginas e funções são recompiladas.
4. Atualize o navegador. Não há atualização automática enquanto você edita.
5. Pare os servidores antes de executar testes, pois usam as mesmas portas.

```sh
npm test
npm run test:local
```

`npm test` executa os testes existentes; os que exigem emulador podem ser pulados
quando o emulador não está ativo. `npm run test:local` inicia um banco isolado,
executa testes HTTP completos e encerra sem importar/sobrescrever seus dados locais.
Também pode executar `TESTAR-LOCAL.cmd`.

O teste opcional de navegador está em `local/browser-test.mjs`. Instale Playwright
se quiser executá-lo na sua máquina:

```sh
npm install --no-save playwright
npx playwright install chromium
npx firebase emulators:exec --only firestore --project demo-iec-local --config firebase.local.json "node local/browser-test.mjs"
```

## 6. Arquitetura e isolamento

| Componente | Local | Produção existente |
|---|---|---|
| Interface | Dois servidores Node em 127.0.0.1 | Dois sites Netlify |
| Login | Provedor de teste local, cookies HttpOnly | Netlify Identity |
| Banco | Emulador Firestore, projeto `demo-iec-local` | Firestore real |
| Regras de agenda | Mesmas funções de negócio | Mesmas funções de negócio |
| Integração admin | Ponte interna no processo | HTTPS e segredo compartilhado |
| Confirmação/recuperação | Caixa local, links de teste | Provedor e e-mail real |

`local/build.mjs` substitui a importação do cliente Identity SOMENTE no build
local. O build Netlify continua usando `@netlify/identity`.
As funções exportam `createHandler` para injetar o banco e transporte nos testes;
o export padrão de produção conserva o banco real e `fetch` normal.
O servidor local exige `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`, usa um projeto
demo fixo, não lê `.env`, vincula sockets somente a 127.0.0.1 e valida Host/Origin.

Os cookies de cliente e administrador têm nomes diferentes. As senhas de teste
são derivadas com scrypt e salt aleatório; as sessões são armazenadas por hash.
Isto não transforma o provedor de testes em um serviço público de autenticação.

## 7. Problemas comuns

| Sintoma | O que conferir |
|---|---|
| `npm` não reconhecido | Instale Node 22 e reabra o terminal |
| Java ausente | Instale JDK 21; teste `java -version` |
| Porta ocupada | Encerre outra execução do projeto ou emulador; não mate processos desconhecidos |
| Página informa “Use 127.0.0.1” | Abra os endereços exatos acima |
| E-mail não chegou | No modo local, abra `/local/inbox` |
| Login volta ao acesso | Confirme cadastro; use o mesmo endereço e confira a mensagem na tela |
| Admin negado | Use o e-mail cadastrado e informado em `ADMIN_EMAILS` ao iniciar |
| Agenda vazia depois de encerrar | Verifique se aguardou a exportação e se iniciou na mesma pasta |
| Mudança não aparece | Pare e inicie novamente para recompilar |
| Instalação falhou | Confira internet e espaço; execute novamente `INSTALAR-LOCAL.cmd` |

## 8. O que este pacote não comprova

Ele não valida entrega de e-mail real, contas de produção, limites da Netlify,
credenciais cloud, regras IAM nem comportamento específico do Safari/iPhone real.
Nenhuma alteração foi publicada por esta entrega.

A configuração online ainda deve ser revisada antes de publicar: Identity ativo,
e-mail administrativo autorizado, URLs de confirmação/recuperação e a ponte entre
os dois sites. Um valor mascarado de segredo não é uma credencial utilizável.
Nunca copie asteriscos do painel como `ADMIN_BRIDGE_SECRET`.

Para builds de produção, use os comandos dentro de cada subprojeto. Não publique
`.local-build`, `.local-data` ou `local/server.mjs`. No Netlify, mantenha o base
directory explícito: `site-principal` para clientes e `painel-administrativo`
para admin. O `netlify.toml` da raiz aponta para o site principal.

Este guia substitui as instruções da antiga prévia visual. Os documentos gerais
do repositório continuam úteis para arquitetura e produção, mas este arquivo é
a referência para o novo modo local.

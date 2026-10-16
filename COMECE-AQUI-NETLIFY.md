# Instituto Estrela da Consciência — pacote corrigido para Netlify

Esta versão preserva o visual e as funcionalidades do projeto e troca somente a infraestrutura: Cloudflare Workers/D1 e o login anterior foram substituídos por Netlify Functions, Netlify Database (Postgres) e Netlify Identity.

O repositório gera dois projetos Netlify independentes:

- `site-principal`: site público, contas de clientes, agenda e banco de dados.
- `painel-administrativo`: painel privado, conectado com segurança à agenda do site principal.

## 1. Publique o site principal (configuração automática)

1. Envie esta pasta inteira para o GitHub.
2. No Netlify, escolha **Add new project > Import an existing project** e selecione o repositório.
3. Não preencha **Base directory**, **Build command** nem **Publish directory**. O arquivo `netlify.toml` da raiz já aponta corretamente para `site-principal`.
4. Confirme apenas que o Netlify reconheceu Node.js 22 antes de iniciar o deploy.
5. Em **Environment variables**, crie:
   - `ADMIN_BRIDGE_SECRET`: um segredo longo e aleatório. No PowerShell, gere com `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.
   - `ADMIN_SITE_URL`: deixe provisoriamente vazio; será preenchido após publicar o painel.
6. Publique. A presença de `@netlify/database` e da migração em `netlify/database/migrations` permite ao Netlify provisionar o Postgres e aplicar o esquema.
7. No projeto publicado, abra **Identity > Enable Identity**. Em Registration, permita cadastro público para os clientes. Mantenha a confirmação por e-mail ativa.

## 2. Publique o painel administrativo como segundo projeto

1. No Netlify, adicione outro projeto usando o mesmo repositório.
2. Em **Base directory**, informe exatamente `painel-administrativo`. Não preencha os outros campos de build, pois o `netlify.toml` dessa pasta já contém tudo.
3. Crie estas variáveis de ambiente:
   - `MAIN_SITE_URL`: URL final do site principal, por exemplo `https://seu-site.netlify.app`.
   - `ADMIN_BRIDGE_SECRET`: exatamente o mesmo segredo configurado no site principal.
   - `ADMIN_EMAIL`: o e-mail que poderá administrar a agenda.
4. Publique o painel.
5. Abra **Identity > Enable Identity** e configure Registration como **Invite only**.
6. Em **Identity > Users**, convide o endereço definido em `ADMIN_EMAIL`.

## 3. Faça a ligação final

1. Volte ao projeto `site-principal`.
2. Defina `ADMIN_SITE_URL` com a URL final do painel administrativo.
3. Execute um novo deploy do site principal.

## Atualizações futuras

Depois de conectado ao GitHub, cada `git push` publica automaticamente os dois projetos. O banco não é apagado por um novo deploy. Mudanças de esquema devem ser adicionadas como novas migrações em `site-principal/netlify/database/migrations`.

## Teste local opcional

É necessário Node.js 20 ou superior. Em cada pasta (`site-principal` ou `painel-administrativo`), execute:

```powershell
npm.cmd install
npx.cmd netlify-cli login
npx.cmd netlify-cli link
npm.cmd run dev
```

O desenvolvimento local do banco requer que o Netlify CLI esteja autenticado e que o projeto principal esteja vinculado à sua conta. Execute os comandos dentro de `site-principal`; para o painel, repita dentro de `painel-administrativo` e vincule o segundo projeto. O site usa a porta 8888 e o painel, 8889.

`npm.cmd run dev` recompila os arquivos e inicia o Netlify Dev com as Functions. Não use `serve`, Live Server ou um servidor apenas de arquivos: `/api/state` e `/api/action` precisam executar código no servidor. Se a porta 8888 estiver ocupada pelo comando antigo, encerre-o com Ctrl+C antes de iniciar.

Para conferir: `curl.exe -i http://localhost:8888/api/state` deve retornar `Content-Type: application/json`. Um status 503 com mensagem de banco exige conferir a vinculação e a configuração do Netlify Database; nunca substitua os dados reais da agenda por dados fictícios.

As rotas `/api/*` são definidas apenas em `netlify.toml`. Não adicione `config.path` na função junto com o redirecionamento para `/.netlify/functions/api`: o caminho personalizado desativa esse endereço padrão (https://docs.netlify.com/build/functions/configuration/).

## Se o Netlify tiver guardado uma configuração antiga

Abra **Project configuration > Build & deploy > Continuous deployment > Build settings** e limpe os valores antigos de Base directory, Build command e Publish directory antes de disparar **Retry deploy**. A configuração do repositório deve prevalecer.

Não envie este ZIP pelo Netlify Drop. Extraia-o, envie os arquivos ao GitHub e escolha **Import an existing project** no Netlify; Functions e banco precisam do processo de build.

## Segurança preservada

- Agendamentos e dados do cliente ficam no Postgres, não no navegador.
- Cada cliente vê apenas reservas ligadas à própria conta do Netlify Identity.
- O painel valida o e-mail administrador no servidor.
- A comunicação entre painel e agenda usa um segredo que nunca é enviado ao navegador.
- O banco impede reservas simultâneas e sobrepostas.
- Alterações usam controle de versão, trilha de auditoria, limite de requisições e validação no servidor.

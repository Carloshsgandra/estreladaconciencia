# Publicação Netlify — edição de 22/10/2026

**Parte 3 (23/10): esta entrega é para testes locais/homologação.** Leia `PARTE-3-LEIA-PRIMEIRO.md`. A política de privacidade ainda exige aprovação. Nos dois projetos, configure `IEC_PRODUCTION_FINAL=true` para a entrega final: o build deve falhar enquanto `shared/privacy-policy.json` contiver pendências. Configure também `HEALTH_RETENTION_MONTHS` com o prazo aprovado; nunca invente esse prazo para liberar o build. Não publique fichas reais usando o modo de rascunho.

Para publicar arquivos locais sem GitHub, use [DEPLOY-POR-ARQUIVOS.md](DEPLOY-POR-ARQUIVOS.md) e o assistente `PUBLICAR-NETLIFY.cmd`.

Este é o guia de publicação vigente. Não reutilize URLs antigas citadas no histórico do projeto.
O pacote é código-fonte completo do projeto; não é um ZIP estático pronto para arrastar no Netlify Drop.
Há funções de servidor e dois sites distintos. Mantenha a pasta shared na raiz, junto dos dois subprojetos.

## 1. Antes de publicar
1. Extraia o ZIP e execute INSTALAR-LOCAL.cmd.
2. Teste localmente com INICIAR-LOCAL.cmd. Pare com Ctrl+C uma vez e aguarde salvar.
3. Execute TESTAR-LOCAL.cmd (equivale a npm run verify).
4. Faça a conferência visual em celular e computador, inclusive modo claro, teclado e formulários.
5. Defina quais são os dois domínios reais da sua nova conta; não presuma que os anteriores continuam válidos.

## 2. Dois projetos no mesmo repositório
| Ajuste | Site público | Painel |
| --- | --- | --- |
| Base directory | site-principal | painel-administrativo |
| Build command | npm run build | npm run build |
| Publish directory (relativa à base) | dist-netlify | dist-netlify |
| Functions directory (relativa à base) | netlify/functions | netlify/functions |
| Node | 22 | 22 |

A configuração da raiz aponta para o site público. No painel, confira explicitamente a base e o netlify.toml do painel no log de build, para não publicar o site público duas vezes.
Use integração Git ou um fluxo CLI que inclua Functions e as configurações TOML. Não publique somente HTML/CSS: o login e o banco dependem das funções.

## 3. Variáveis
Atualização da fase 2: consulte [preço e acesso administrativo](docs/FASE-2-PRECOS-E-ACESSO.md). `TAROT_PRICE_BASIS=booking` mantém a regra atual; `appointment` exige confirmação da regra comercial pelo cliente. Configure no site público, em Functions e Build. A lista `ADMIN_EMAILS` do painel não pode ficar vazia nem conter e-mails inválidos. No ambiente local, o iniciador pede o e-mail em vez de autorizar uma conta fixa.

| Site | Nome | Valor e escopo |
| --- | --- | --- |
| Público | ADMIN_SITE_URL | Origem HTTPS real do painel, sem barra final; Build e Functions |
| Público | PUBLIC_SITE_URL | Opcional para build Git com domínio próprio: origem HTTPS pública canônica, sem barra final; Build. O publicador por arquivos usa a URL pública informada nele. |
| Público | FIREBASE_PROJECT_ID | ID real do projeto Firebase; Functions |
| Público | FIREBASE_CLIENT_EMAIL | E-mail da conta de serviço Firebase; Functions |
| Público | FIREBASE_PRIVATE_KEY | Chave privada PEM da mesma conta; Functions, nunca navegador |
| Ambos | ADMIN_BRIDGE_SECRET | Mesmo segredo aleatório real, ao menos 32 caracteres; Functions |
| Painel | MAIN_SITE_URL | Origem HTTPS real do público; Build e Functions |
| Painel | ADMIN_EMAILS | carloshsgandracode@gmail.com e demais autorizados, separados por vírgula; Functions |

Defina o contexto de produção. Para homologação, prefira projetos e contas de teste separados.
A chave privada Firebase não deve ser copiada para o painel.
O valor ocultado com asteriscos no painel de hospedagem NÃO é o segredo: copiá-lo quebra a ponte.
As URLs não aceitam caminho, parâmetros, senha ou fragmento.
Os builds agora falham quando a URL necessária está ausente, em vez de apontarem silenciosamente para uma conta antiga.

Os arquivos .env.example são apenas modelos; não são carregados automaticamente.
Com as variáveis disponíveis no processo, valide o formato sem imprimir os segredos:
```sh
node shared/deploy-config.mjs public
node shared/deploy-config.mjs admin
```
Execute cada comando no ambiente que contém as variáveis daquele site. Isto NÃO testa a validade remota da credencial nem compara o segredo entre contas.
Depois execute o build correspondente com ADMIN_SITE_URL ou MAIN_SITE_URL real.
Não publique os diretórios dist-netlify gerados por npm run verify: contêm URLs fictícias de teste.

## 4. Identity e Firebase
- Habilite e configure Identity separadamente nos dois sites.
- No público, configure o cadastro e a confirmação de e-mail.
- No painel, mantenha cadastro restrito por convite; convide o e-mail correto e conclua a confirmação. A lista ADMIN_EMAILS sozinha não cria uma conta.
- Confira URLs dos e-mails de confirmação, convite e recuperação. Os tokens devem chegar intactos à aplicação; o redirecionador os encaminha a acesso.html.
- Não remova a confirmação de e-mail para contornar problemas de login.
- Configure permissões mínimas da conta de serviço e publique firestore.rules e firestore.indexes.json no projeto correto usando sua sessão Firebase.
- A regra nega acesso direto do navegador: a Function utiliza Firebase Admin SDK.
- Não exponha chaves, não comite .env real e não use dados de saúde reais em homologação.

## 5. Aceite obrigatório em homologação
Marque cada item somente após observá-lo no deploy real:
- [ ] Página, estilos, scripts e funções sem 404/500.
- [ ] Cadastro, recebimento de confirmação e primeiro login.
- [ ] Senha incorreta exibe erro sem redirecionamento circular.
- [ ] Recuperação abre formulário de senha, não apenas a tela de login.
- [ ] Logout, reentrada e sessão expirada.
- [ ] Conta não autorizada não abre o painel.
- [ ] carloshsgandracode@gmail.com confirmado abre o painel.
- [ ] Admin lê e altera configuração pela ponte.
- [ ] Reserva do cliente aparece ao dono e ao admin, não a outro cliente.
- [ ] Duas tentativas no mesmo horário não geram dupla reserva.
- [ ] Cancelamento/remarcação atualizam a disponibilidade.
- [ ] Cerimônia, ficha de teste, consentimentos e aprovação humana.
- [ ] Recarregar e reabrir o navegador preserva os dados gravados.
- [ ] Layout, foco, menu, contraste e formulários em celular e desktop.
- [ ] Regras/índices, logs, backup protegido e restauração definidos.

## 6. Venda e operação
O novo visual não substitui uma revisão operacional. Antes de vender:
defina suporte, custos/quota da hospedagem, titularidade dos domínios, política de privacidade, prazo de retenção e exclusão de dados, acesso de funcionários e rotina de backup/restauração.
Não anuncie certificação de segurança ou garantia de zero falhas.
Mantenha uma versão anterior de deploy e backup independente do banco. Reverter código não reverte dados.

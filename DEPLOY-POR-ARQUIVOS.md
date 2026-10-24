# Publicar a partir dos arquivos, sem GitHub

## O que este pacote entrega
Site, painel, serviços extras, código-fonte, testes e assistente de publicação.
O assistente compila as páginas e empacota as Functions usando a ferramenta oficial da Netlify. Envia os dois projetos com rotas e cabeçalhos, sem executar um build remoto. A publicação e o uso do serviço continuam sujeitos às quotas e cobranças da sua conta.

Arrastar apenas HTML/CSS para o Drop não inclui o backend necessário ao login e ao banco. O fluxo validado de empacotamento nesta entrega é o assistente abaixo. O ZIP completo é para extrair no computador; não é um ZIP estático para arrastar diretamente no Drop.

## Passo a passo no Windows
1. Instale Node.js 22.13 ou superior. Para testar com o banco local, instale também JDK 21.
2. Extraia todo o ZIP em uma pasta local, por exemplo C:\Projetos\IEC. Preserve sua pasta antiga e seus dados locais.
3. Execute INSTALAR-LOCAL.cmd e aguarde concluir.
4. Execute TESTAR-LOCAL.cmd para os testes completos, com os servidores anteriores fechados.
5. Na Netlify, tenha dois projetos separados e configure suas variáveis e Identity conforme COMECE-AQUI-NETLIFY.md. Não é necessário conectar GitHub.
6. Execute PREPARAR-NETLIFY.cmd se quiser somente gerar os pacotes. Informe o Project ID e a URL HTTPS de cada projeto. Eles aparecem nas configurações do projeto na Netlify; não são senhas.
7. Execute PUBLICAR-NETLIFY.cmd para enviar os arquivos para produção. O navegador abrirá o login oficial da Netlify se necessário. Use a conta que possui os dois projetos.
8. O assistente confere IDs e URLs, variáveis de Functions, segredo igual nos dois projetos e Identity. Se uma verificação falhar, ele para antes dos uploads. Valores secretos ficam apenas na memória do processo; não são exibidos nem salvos pelo assistente.
9. Quando os dois uploads concluírem, faça o aceite real: cadastro, confirmação por e-mail, login, recuperação, reserva e acesso administrativo.

Os comandos equivalentes são `node release/publish.mjs --prepare-only` e `node release/publish.mjs`.

## Configurações que não vêm dentro do ZIP
- URLs e Project IDs reais da sua conta.
- Credencial Firebase no site público, no escopo Functions.
- ADMIN_BRIDGE_SECRET igual em ambos, no escopo Functions.
- ADMIN_SITE_URL no público, disponível às Functions e ao build Git, caso utilizado.
- MAIN_SITE_URL no painel, disponível às Functions e ao build Git, caso utilizado.
- Para domínio personalizado, informe a URL HTTPS definitiva do site público ao publicador: ela gera canonical, Open Graph e sitemap. Se usar build Git separado, defina `PUBLIC_SITE_URL` no escopo Builds do público.
- ADMIN_EMAILS no painel, incluindo carloshsgandracode@gmail.com.
- Identity ativo nos dois projetos, painel somente por convite e conta administrativa confirmada.

Segredos marcados como não legíveis pela Netlify podem impedir a pré-verificação automática. Nesse caso, o assistente para; não desative proteções para contornar a restrição. A conclusão do deploy precisará de revisão autorizada da configuração.

## Como funciona o pacote preparado
Cada execução cria uma pasta nova em .deploy/pacote-... contendo public e admin.
Em cada projeto, public contém somente os arquivos destinados ao navegador; .netlify/functions contém api.zip e seu manifesto. netlify.toml contém as regras de rotas e cabeçalhos.
Essas pastas são geradas para sua máquina e URLs: use o assistente para publicar, sem mover apenas os ZIPs de funções. O manifesto contém caminhos locais absolutos.

Os testes automáticos usam example.invalid. Não publique suas saídas de teste; o assistente sempre recompila com suas URLs reais.

## Limites de aceite
O empacotamento e a execução anônima das funções extraídas foram verificados localmente. Nenhum upload para sua conta foi realizado nesta rodada. A verificação de configuração não confirma permissões remotas da chave Firebase, índices implantados, recebimento de e-mail ou usabilidade em navegador.
Há alertas residuais nas ferramentas locais oficiais: consulte SEGURANCA-RELEASE.md. Esta entrega não é certificada como livre de vulnerabilidades.
Os uploads dos dois projetos não são atômicos. Se o segundo falhar, o primeiro permanece publicado. O assistente informa a interrupção e não apaga dados ou projetos.

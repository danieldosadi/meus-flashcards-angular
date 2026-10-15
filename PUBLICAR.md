# Publicar no GitHub Pages pelo GitHub Desktop

Esta configuração publica a branch `developer`, que contém o aplicativo completo. A branch `producao` ainda não contém esse código. Os estudos pessoais e o servidor não entram no pacote publicado.

1. No GitHub Desktop, permaneça em `developer`, confira as alterações, escreva `Preparar Flashcards para GitHub Pages` e faça Commit e Push origin.
2. No GitHub, abra Settings → Pages. Se o plano permitir Pages para este repositório, selecione GitHub Actions como Source.
3. Este repositório está privado. No GitHub Free, use um repositório público para Pages. Antes de mudar a visibilidade, revise os arquivos e o histórico; essa mudança torna o código e o histórico públicos. GitHub Pro permite usar Pages a partir de repositórios privados.
4. Abra Actions → Publicar Flashcards no GitHub Pages. Se não houver execução após a configuração, use Run workflow e selecione `developer`. Se não aparecer, abra a aba Actions com a branch padrão adequada ou faça um novo push em `developer` para disparar a publicação.
5. Aguarde build e deploy ficarem verdes. O endereço esperado é https://danieldosadi.github.io/meus-flashcards-angular/ . O endereço confirmado aparece no resultado da publicação.

## Dados da versão web

Os cartões e o progresso ficam em localStorage, somente no navegador e no endereço usados. Não sincronizam entre computador e celular. Limpar os dados do site remove os estudos. Os dados do aplicativo local não são copiados automaticamente para o site, pois pertencem a outro endereço. O site começa vazio para novos visitantes.

`npm run build:pages` gera a versão estática em `dist/memora/browser`. O workflow publica somente essa pasta. `npm start` continua usando o servidor local e o arquivo de dados do computador.

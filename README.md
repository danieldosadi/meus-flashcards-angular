# Memora — Flashcards de estudo

Aplicação Angular standalone em português, com animação 3D para revelar respostas.

## Executar

Requer Node.js 24 (ou versão compatível com Angular 21) e npm.

```sh
npm install
npm start
```

Abra http://localhost:4200 no navegador.

`npm start` inicia a interface e o serviço de salvamento juntos. Se o aplicativo já estiver rodando, pare com Ctrl+C e execute novamente. Mantenha o terminal aberto enquanto estuda. Após reiniciar o computador, execute `npm start` novamente; não é necessário exportar ou importar os cartões.

## Salvamento automático no computador

Os cartões, respostas e progresso são gravados automaticamente em `data/flashcards.json`, dentro desta pasta do projeto. O arquivo é criado no primeiro acesso com o serviço ativo. O salvamento acontece silenciosamente; mensagens aparecem apenas durante o carregamento ou quando há erro. Aguarde as alterações serem concluídas antes de fechar; se houver gravação pendente, o aplicativo solicita confirmação ao sair.

Na primeira abertura, se ainda não existir arquivo, os cartões de arquitetura presentes no navegador são transferidos para ele. Use o mesmo navegador, perfil e endereço usados anteriormente para essa primeira migração. Depois disso, o arquivo do computador é a fonte principal dos dados, inclusive ao trocar de navegador. Nenhum dado é enviado para GitHub ou nuvem.

Cada gravação mantém a versão anterior em `data/flashcards.json.bak`. Para copiar o acervo para outro computador, leve também a pasta `data`. Não apague essa pasta ao atualizar o código. O ZIP do código não inclui seus dados pessoais.

Se o serviço falhar, a tela exibe o problema e permite tentar novamente. Alterações pendentes são guardadas no navegador quando permitido. Evite usar várias janelas para editar ao mesmo tempo: alterações concorrentes são rejeitadas para preservar o arquivo. Em caso de conflito, mantenha a página aberta e preserve os cartões pendentes antes de recarregar. Um arquivo danificado não é sobrescrito automaticamente; com o aplicativo parado, preserve-o e restaure a cópia `.bak`.

O serviço usa apenas `127.0.0.1:3001`; a interface usa a porta 4200. Não precisa de banco externo nem de dependências adicionais. O computador precisa ter permissão para gravar na pasta do projeto.

## Gerar versão de produção

```sh
npm run build
```

Os arquivos gerados ficam em `dist/memora/browser`.

A versão estática também depende do serviço local: não basta abrir o HTML diretamente. Para uso local, utilize `npm start`, que já configura a conexão. Uma instalação de produção precisará encaminhar `/api` para o serviço local.

## Verificar o projeto

```sh
npm run typecheck
npm test
npm run build
```

Os testes verificam migração, falha ao salvar, recuperação de alterações pendentes, conflitos entre janelas e navegação de foco com um DOM simulado. Os testes do serviço gravam arquivos reais em pastas temporárias e reiniciam o servidor para confirmar a recuperação. Eles não substituem uma verificação visual no navegador.

## Recursos da aplicação

- Clique no cartão para alternar entre pergunta e resposta.
- Use as setas da tela para navegar; com o foco fora de botões e campos, as setas do teclado navegam e espaço vira o cartão.
- Filtre os cartões por matéria, embaralhe a ordem e marque cartões aprendidos.
- Ative “Só os que faltam” para revisar os cartões ainda não aprendidos.
- Crie cartões com pergunta, resposta e matéria pelo formulário.
- Use “Nova matéria” no seletor superior para cadastrar outros assuntos. Nomes duplicados são recusados; matérias personalizadas são salvas no computador mesmo sem cartões.
- Use “Editar” para atualizar pergunta, resposta ou matéria. Alterar a pergunta ou resposta devolve o cartão à revisão; apenas mudar a matéria mantém o progresso.
- Use “Remover” e confirme para excluir o cartão e seu progresso. Cancelar mantém o cartão intacto. Edições e exclusões são salvas automaticamente.
- Interface compacta em azul, com seletor de matérias no topo e ações abaixo do cartão. O seletor se adapta ao celular.
- Cartões e progresso são salvos automaticamente em arquivo no computador; o navegador mantém uma cópia auxiliar. Não há conta nem sincronização entre dispositivos.
- Layout responsivo, controles acessíveis pelo teclado e respeito à preferência de redução de movimento.

As 13 matérias de arquitetura estão definidas em `src/app.ts`. O acervo começa vazio, pronto para cadastrar os seus cartões. Esta versão usa a chave `memora-arquitetura-v2` no localStorage; os dados antigos de outras matérias permanecem preservados na chave anterior, mas não aparecem na interface. O visual fica em `src/styles.css` e a interface em `src/app.html`. O cartão usa aparência de ficha pautada e letra de forma manuscrita (Segoe Print no Windows, com fontes alternativas locais). A interface usa fontes locais do sistema, sem depender de Google Fonts.

Referência de compatibilidade: https://angular.dev/reference/versions




As matérias iniciais e personalizadas podem ser renomeadas pelos botões do seletor superior. Renomear mantém os cartões e o progresso. Remover exige confirmação e exclui também os cartões e o progresso daquela matéria. O filtro Todos não pode ser editado ou removido. O cabeçalho fica fixo durante a rolagem e o resumo ocupa duas linhas em telas com espaço suficiente.



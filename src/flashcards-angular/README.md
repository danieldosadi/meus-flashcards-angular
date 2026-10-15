# Memora — Flashcards de estudo

Aplicação Angular standalone em português, com animação 3D para revelar respostas.

## Executar

Requer Node.js 24 (ou versão compatível com Angular 21) e npm.

```sh
npm install
npm start
```

Abra http://localhost:4200 no navegador.

## Gerar versão de produção

```sh
npm run build
```

Os arquivos gerados ficam em `dist/memora/browser`.

## Recursos

- Clique no cartão para alternar entre pergunta e resposta.
- Use as setas da tela para navegar; com o foco fora de botões e campos, as setas do teclado navegam e espaço vira o cartão.
- Filtre os cartões por matéria, embaralhe a ordem e marque cartões aprendidos.
- Ative “Só os que faltam” para revisar os cartões ainda não aprendidos.
- Crie cartões com pergunta, resposta e matéria pelo formulário.
- Cartões e progresso são salvos no localStorage deste navegador. Não há conta, servidor ou sincronização entre dispositivos. Limpar os dados do navegador remove esse progresso.
- Layout responsivo, controles acessíveis pelo teclado e respeito à preferência de redução de movimento.

Os oito cartões iniciais são exemplos editáveis em `src/main.ts`. O visual fica em `src/styles.css` e a interface em `src/app.html`. As fontes do Google Fonts são opcionais: se a rede estiver indisponível, o navegador usa fontes locais.

Referência de compatibilidade: https://angular.dev/reference/versions

# Instruções do Repositório

## Estrutura e execução

- Projeto Vite + React (JSX) + Tailwind v4. `npm run dev` sobe o app; `npm run build` gera `dist/`.
- `npm run dev` e `npm run build` copiam o wasm do MediaPipe de `node_modules` para `public/wasm` via `tools/copy-wasm.mjs`.
- O entrypoint é `index.html` → `src/main.jsx` → `src/App.jsx`; `src/style.css` é importado em `src/main.jsx`. GSAP vem do npm, sem CDN.
- As três telas (`#screen-home`, `#screen-ranking`, `#screen-game`) ficam sempre montadas e são alternadas por `tela` em `src/App.jsx` (classe `.active`), para a câmera não reiniciar; modais ficam fora delas.
- `src/App.jsx` liga câmera, MediaPipe, gestos, UI e ranking. `src/game.js` cuida de nível, movimentos, tempo e score. O motor e a câmera são criados uma vez em `useEffect` sobre refs, não em estado.
- Estado em zustand (`src/store.js`): `useUi` guarda tela/modais/resultado/câmera; `useCorrida` guarda a partida e é persistido no localStorage (`expo-golf-corrida`).
- Tailwind cuida de layout e telas; `src/style.css` guarda tokens do tema (`@theme`), labirinto, animações e as zonas da câmera.
- Confete com `canvas-confetti`, disparado em `aoPassarNivel` (uma vez por nível concluído, não no último).
- Sem suíte de testes. Verificação: `npm run build` e abrir o app.
- `src/levels.json` é gerado por `npm run levels`; não editar à mão.

## Labirinto

- Os 10 níveis são pré-gerados com `mulberry32(seed)` em `src/maze/model.js` e commitados em `src/levels.json`. O layout precisa ser idêntico para todos (ranking justo) — não trocar para geração aleatória em runtime.
- Dimensões pares (backtracking anda 2 células). Nível 1 é 6x6; 3x3 não é labirinto válido.
- A ordem de geração é `createGrid` → `generateMaze` → `ensureGoalAccess` → `orientBorderWalls` → `removeDoubleWalls` → `removeDoublePaths` → `removeDeadEnds`; preserve-a ao mexer na geometria.
- `src/maze/view.js` só renderiza; nenhuma lógica de jogo deve ir para lá.
- Cada gesto desliza até bater numa parede, como no jogo original. O gerador valida que todo nível tem solução por deslizamento; não troque o algoritmo de geração sem manter essa checagem.

## Gestos

- Direção: a **ponta do indicador** (landmark 8) escolhe o lado da câmera (`quadranteDoPonto`): direita, esquerda, cima ou baixo, com área morta de 12% no centro. Não existe gesto de mão.
- O movimento dispara após `PERMANENCIA_MS` (250 ms) na mesma zona; segurar não repete, sair e voltar rearma. Mão ausente por mais de 250 ms zera.
- `y` é dividido pelo aspecto do vídeo para os dois eixos pesarem igual em pixels; o eixo dominante vence.
- Os quadrados em `.camera-zonas` apenas indicam onde manter o dedo (não espelhados; o vídeo é); o quadrante detectado acende o quadrado correspondente. O anel na ponta do dedo mostra a permanência (`progressoGesto`).
- `?debug` mostra a zona e o progresso ao vivo, para calibrar em mão real.
- `npm run check:gesto` cobre esses casos; rode ao mexer nos limiares.
- Pausa: duas mãos acima do centro e com punhos próximos por 1 s. `numHands: 2`; a mão maior controla o movimento.

## Tempo e score

- Tempo com `performance.now()`; pausa congela; `setInterval` não é usado para medir.
- O relógio só liga no primeiro movimento (`iniciado` em `src/game.js`); antes disso `tempoMs()` retorna 0.
- O HUD é atualizado por um `setInterval` de 250 ms em `src/game.js` (independente de movimento).
- A partida é salva junto com o HUD e retomada no reload por `jogo.restaurar()`. O tempo fora da página conta no score (`Date.now() - salvoEm`), senão recarregar viraria pausa. Sair e terminar limpam a corrida salva.
- `finalizar()` lê `tempoMs()` **antes** de `ativo = false`; inverter a ordem faz o tempo virar 1 s.
- Score: `round(1_000_000 / (1 + movimentos × segundos / 20_000))`, enviado somente ao concluir o nível 10.
- `movimentos` conta **gestos** (um por deslizamento): o contador fica dentro do `while` de `mover()`, mas só incrementa na primeira casa (`deslizou`). Não mover o incremento para fora sem tratar o `avancarNivel()`.

## Supabase

- Cliente em `src/ranking.js` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env.local`, ignorado pelo git). O `.env.example` foi removido; crie o `.env.local` à mão.
- Nunca usar `service_role` no frontend.
- A tabela `Users` exige RLS com policies de `select` e `insert` para `anon`, e um índice único em `lower(nickname)` — sem ele o nome repetido só é barrado no cliente, que perde a corrida entre dois jogadores.
- `nicknameEmUso` (checagem antes de começar) usa `ilike`; o erro `23505` no envio abre o campo de renomear no modal final.

## Estilos

- `--maze-cell-size` é ajustado por JS em `src/game.js` conforme o tamanho do nível e da janela; a moldura `#maze-container::after` usa a mesma variável (evita parede dupla).
- As divisórias entre células do labirinto continuam removidas; a tabela do ranking sobrescreve esses estilos.
- `#player-token` é animado por GSAP apenas em `left`/`top` (nunca `x`/`y`/`scale`, para não sobrescrever o `translate(-50%, -50%)`).

## Commits

- Use mensagens convencionais em português, como `feat: ...`, `fix: ...` e `docs: ...`.
- Faça commits separados por arquivo quando solicitado e não inclua exclusões ou alterações não relacionadas no stage.

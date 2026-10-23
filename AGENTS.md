# Instruções do Repositório

## Estrutura e execução

- Projeto Vite + JavaScript puro (sem framework). `npm run dev` sobe o app; `npm run build` gera `dist/`.
- `npm run dev` e `npm run build` copiam o wasm do MediaPipe de `node_modules` para `public/wasm` via `tools/copy-wasm.mjs`.
- O entrypoint é `index.html`, que carrega o GSAP por CDN e `src/main.js` como módulo. O CSS é importado por `src/main.js`.
- As três telas (`#screen-home`, `#screen-ranking`, `#screen-game`) são seções fixas alternadas por `.active` em `src/main.js`; modais ficam fora delas.
- `src/main.js` liga câmera, MediaPipe, gestos, UI e ranking. `src/game.js` cuida de nível, movimentos, tempo e score.
- Confete com `canvas-confetti`, disparado em `aoPassarNivel` (uma vez por nível concluído, não no último).
- Sem suíte de testes. Verificação: `npm run build` e abrir o app.
- `src/levels.json` é gerado por `npm run levels`; não editar à mão.

## Labirinto

- Os 15 níveis são pré-gerados com `mulberry32(seed)` em `src/maze/model.js` e commitados em `src/levels.json`. O layout precisa ser idêntico para todos (ranking justo) — não trocar para geração aleatória em runtime.
- Dimensões pares (backtracking anda 2 células). Nível 1 é 6x6; 3x3 não é labirinto válido.
- A ordem de geração é `createGrid` → `generateMaze` → `ensureGoalAccess` → `orientBorderWalls` → `removeDoubleWalls` → `removeDoublePaths` → `removeDeadEnds`; preserve-a ao mexer na geometria.
- `src/maze/view.js` só renderiza; nenhuma lógica de jogo deve ir para lá.
- Cada gesto desliza até bater numa parede, como no jogo original. O gerador valida que todo nível tem solução por deslizamento; não troque o algoritmo de geração sem manter essa checagem.

## Gestos

- Gesto: **só o indicador levantado, resto da mão fechado**. Dedo esticado = `dist(ponta, pulso) > dist(articulação do meio, pulso)`; o índice precisa passar de 1.2 e os outros três ficarem abaixo de 0.85. Solta quando o índice cai abaixo de 1.05 ou outro dedo passa de 1.0 (histerese). Vale em qualquer rotação e distância da mão.
- A direção é o lado da câmera onde a mão está (`quadranteDaMao`, posição da palma — landmark 9 —, que não muda com os dedos): direita, esquerda, cima ou baixo. Área morta de 12% no centro; repetir só conta depois de abaixar o dedo.
- `y` é dividido pelo aspecto do vídeo para os dois eixos pesarem igual em pixels; o eixo dominante vence.
- Mão ausente por mais de 250 ms zera o gesto; escala da mão mudando mais de 25% (outra mão) também, sem disparar no frame da troca.
- As metades ativas são destacadas em `.camera-zonas`, que **não** são espelhadas (o vídeo é).
- `npm run check:gesto` cobre esses casos; rode ao mexer nos limiares.
- Pausa: duas mãos acima do centro e com punhos próximos por 1 s. `numHands: 2`; a mão maior controla o movimento.

## Tempo e score

- Tempo com `performance.now()`; pausa congela; `setInterval` não é usado para medir.
- O relógio só liga no primeiro movimento (`iniciado` em `src/game.js`); antes disso `tempoMs()` retorna 0.
- O HUD é atualizado por um `setInterval` de 250 ms em `src/game.js` (independente de movimento).
- `finalizar()` lê `tempoMs()` **antes** de `ativo = false`; inverter a ordem faz o tempo virar 1 s.
- Score: `round(1_000_000 / (1 + movimentos × segundos))`, enviado somente ao concluir o nível 15.

## Supabase

- Cliente em `src/ranking.js` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env.local`, ignorado pelo git).
- Nunca usar `service_role` no frontend.
- A tabela `Users` exige RLS com policies de `select` e `insert` para `anon`; veja o README.

## Estilos

- `--maze-cell-size` é ajustado por JS em `src/game.js` conforme o tamanho do nível e da janela; a moldura `#maze-container::after` usa a mesma variável (evita parede dupla).
- As divisórias entre células do labirinto continuam removidas; a tabela do ranking sobrescreve esses estilos.
- `#player-token` é animado por GSAP apenas em `left`/`top` (nunca `x`/`y`/`scale`, para não sobrescrever o `translate(-50%, -50%)`).

## Commits

- Use mensagens convencionais em português, como `feat: ...`, `fix: ...` e `docs: ...`.
- Faça commits separados por arquivo quando solicitado e não inclua exclusões ou alterações não relacionadas no stage.

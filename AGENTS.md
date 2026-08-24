# Instruções do Repositório

## Estrutura e execução

- Este é um projeto estático em HTML, CSS e JavaScript; não há `package.json` nem etapa de build. A única dependência é o GSAP 3 via CDN (`https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js`).
- O entrypoint é `index.html`, que carrega `style.css`, o CDN do GSAP e `script.js` (nesta ordem); abra o arquivo diretamente no navegador para testar a interface.
- O jogo é inicializado no callback `DOMContentLoaded` de `script.js`; a geração do labirinto e os controles ficam no mesmo arquivo.
- A verificação sintática disponível é `node --check script.js`; não há suíte de testes automatizados configurada.

## Labirinto

- `rows` e `cols` em `script.js` controlam a dimensão do grid; o algoritmo de backtracking usa passos de 2 células e funciona melhor com dimensões pares.
- O perímetro usa a classe `boundary` e é representado visualmente pela moldura de `#maze-container`; células `boundary` não podem ser jogadas.
- `startPosition` e `goalPosition` ficam uma célula para dentro do perímetro; alterações na dimensão devem manter essa margem e a rotina `ensureGoalAccess()`.
- A ordem de regeneração é `createMaze()` → `generateMaze()` → `ensureGoalAccess()` → `orientBorderWalls()` → `removeDoubleWalls()` → `removeDoublePaths()` → `styleWalls()`; preserve essa ordem ao alterar a geometria.
- `removeDoubleWalls()` evita blocos 2×2 de paredes; `orientBorderWalls()` garante que paredes ligadas à moldura comecem perpendicularmente a ela; `removeDoublePaths()` evita corredores 2×2 sem bloquear a solução.

### Regras de criação

- `createMaze()` recria a tabela inteira: a borda recebe `boundary` e o interior começa como `wall`.
- `generateMaze()` remove paredes usando backtracking recursivo; cada movimento de geração avança 2 células e abre a célula intermediária como `path`.
- `ensureGoalAccess()` abre as células à esquerda e acima do objetivo para garantir acesso ao final.
- `orientBorderWalls()` permite paredes na camada interna junto à moldura somente quando o segundo bloco continua para dentro; também separa entradas vizinhas para evitar linhas paralelas à borda.
- `removeDoubleWalls()` encontra trechos paralelos de paredes sobrepostos e abre uma camada inteira do trecho duplicado, repetindo até a espessura máxima ser de uma célula.
- `removeDoublePaths()` encontra blocos 2×2 de caminhos e tenta fechar uma célula; cada fechamento só é mantido se uma busca ainda encontrar o objetivo a partir do início.
- `styleWalls()` calcula os vizinhos ortogonais de cada parede e aplica os cantos arredondados apenas nos lados livres; `boundary` conta como parede conectada.
- O jogador visual é `#player-token`, separado da célula lógica; `updatePlayerToken()` calcula a posição, `setInitialPlayerTokenPosition()` posiciona no reset e `createMoveParticles()` gera partículas.
- `#player-token` é um SVG de círculo vermelho simples animado por GSAP; o GSAP anima apenas `left/top` (nunca `x/y/scale/rotation`, para não sobrescrever o `translate(-50%, -50%)` de centralização). `#player-trail` é a camada SVG onde as partículas são criadas; o único efeito ao mover são as partículas. O CDN do GSAP deve ser carregado antes de `script.js`.
- O movimento acontece em `movePlayer()`: emite partículas na célula de origem, atualiza `playerPosition` e anima o token até o centro da célula destino com um `gsap.to` curto (`power2.out`).

## Estilos

- `--maze-cell-size` em `style.css` deve permanecer igual ao tamanho da moldura pseudo-elemento `#maze-container::after`, evitando paredes duplas na borda.
- As divisórias entre células são intencionalmente removidas (`td { border: none; }`); a separação entre caminho e parede vem das cores e da forma.

## Commits

- Use mensagens convencionais em português, como `feat: ...`, `fix: ...` e `docs: ...`.
- Faça commits separados por arquivo quando solicitado e não inclua exclusões ou alterações não relacionadas no stage.

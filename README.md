# Putt Party — Controle por Gestos

Jogo de labirinto com 15 níveis controlado por gestos da mão. A câmera e o
MediaPipe rodam **no navegador**; o único serviço externo é o Supabase para o
ranking.

## Rodar

```bash
npm install
npm run dev
```

Abrir o endereço que o Vite mostrar. A câmera só funciona em `localhost` ou HTTPS.
`npm run dev` copia o wasm do MediaPipe para `public/wasm` antes de subir.

```bash
npm run build     # gera dist/ para a Vercel
npm run preview   # testa o build
npm run levels    # regenera src/levels.json
```

## Telas

1. **Inicial:** título grande e o botão "Iniciar"; link discreto para o ranking.
2. **Ranking:** lista do melhor para o pior com o pódio (1º, 2º e 3º em destaque).
3. **Jogo:** nome no canto superior esquerdo, câmera no superior direito, contador
   acima do labirinto e o labirinto com 70% da altura da tela em todos os níveis.

Ao entrar no jogo, abre a modal de nome. O cronômetro **só começa no primeiro
movimento** — daí em diante ele roda e congela nas pausas. Confete a cada nível
concluído.

## Como jogar

- **Mover:** aponte o polegar para a direita, para cima ou para baixo, ou o
  indicador para a esquerda, mantendo os outros três dedos fechados. Cada gesto
  vale um movimento, e o jogador desliza até bater numa parede.
- **Pausar/despausar:** levante as duas mãos, próximas e acima do centro, por 1 s.
- **Borda azul:** a mão está sendo rastreada.
- O cronômetro pausa junto e não conta no tempo total.

## Regras do jogo

- 15 níveis pré-gerados: 5 fáceis (6x6 a 14x14), 5 médios (16x16 a 24x24) e
  5 difíceis (26x26 a 34x34).
- Os layouts são idênticos para todos (gerados com semente), para o ranking ser
  justo.
- Ao concluir os 15 níveis, o resultado é enviado ao ranking.
- Score: `round(1_000_000 / (1 + movimentos × segundos))`. Menos movimentos e
  menos tempo = maior score.

## Ranking (Supabase)

Copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use apenas a **publishable key**. Nunca coloque a `service_role` no frontend.
O RLS da tabela `Users` precisa permitir leitura e inserção:

```sql
alter table public."Users" enable row level security;

create policy "leitura publica" on public."Users"
  for select to anon using (true);

create policy "insercao publica" on public."Users"
  for insert to anon with check (
    char_length(nickname) between 1 and 20
    and score between 0 and 1000000
    and time >= 0
  );
```

Sem as policies o jogo funciona, mas mostra "Ranking desativado" e não envia o
resultado. Não há autenticação: qualquer cliente pode inserir no ranking.

### Vercel

Importe o repositório na Vercel (framework: Vite), defina as duas variáveis
`VITE_*` no projeto e faça o deploy. O build sai de `dist/`.

## Estrutura

```
index.html                  shell da página
src/main.js                 câmera, loop de detecção, UI
src/game.js                 níveis, movimentos, tempo, score
src/gesture.js              polegar/indicador apontando, pausa
src/hands.js                MediaPipe + getUserMedia
src/overlay.js              desenho dos landmarks
src/ranking.js              Supabase
src/maze/model.js           geração pura do labirinto
src/maze/view.js            renderização da tabela e do jogador
src/levels.json             níveis pré-gerados
tools/gen-levels.mjs        gera os níveis
tools/copy-wasm.mjs         copia o wasm do MediaPipe
public/models/              modelo do MediaPipe
```

## Limitações conhecidas

- Só funciona com HTTPS ou `localhost` (exigência de `getUserMedia`).
- Sem autenticação no ranking; inserções podem ser forjadas.
- Os limiares do polegar (0.8 / 0.55), do indicador (1.2 / 1.05) e da pausa (1 s)
  precisam de calibração com a câmera e a iluminação do local.

# Putt Party — Controle por Gestos

Jogo de labirinto (HTML/CSS/JS) controlado pelo movimento da mão, com detecção
feita **inteiramente no navegador** com MediaPipe Tasks Web.

Este documento registra as decisões de arquitetura definidas para o projeto.

## Decisões

### 1. Processamento no frontend

- A webcam é capturada no navegador com `navigator.mediaDevices.getUserMedia`.
- O MediaPipe (`HandLandmarker`, modelo `models/hand_landmarker.task`) roda no
  próprio navegador.
- **Motivo:** o vídeo nunca trafega pela rede, então a imagem mantida na tela tem
  qualidade e fluidez totais, sem latência de ida e volta nem recompressão.
- MediaPipe no backend exigiria enviar cada frame (JPEG), decodificar, processar e
  devolver — pior qualidade e mais latência para o mesmo resultado.

### 2. Backend removido

- O projeto é **100% estático**: HTML, CSS e JavaScript.
- O `main.py` (Flask + `cv2.VideoCapture` + `cv2.imshow` + endpoint
  `GET /movimento`) é removido, junto com as dependências Python de
  MediaPipe/OpenCV.
- Não há build, nem dependências de runtime além de CDNs.

### 3. Servidor estático local

- O modelo `.task` precisa ser carregado por HTTP: abrir via `file://` faz o
  navegador bloquear `fetch` de arquivos locais.
- Execução:

  ```bash
  python -m http.server 8000
  ```

  Depois abrir <http://localhost:8000>.

- Alternativas aceitas: Live Server (VS Code) ou qualquer servidor estático
  apontando para a raiz do repositório.

### 4. Feedback visual na tela

Mostrado em um `<canvas>` sobreposto ao vídeo:

- **Quadrado central de referência** (verde): área onde a pessoa deve posicionar
  o dedo para iniciar o movimento.
- **Ponto vermelho no dedo indicador** (landmark de índice 8).
- **Landmarks da mão** (conexões em verde) para orientação.
- Vídeo **espelhado** (`translate` + `scale(-1, 1)` no canvas), como era feito com
  `cv2.flip(frame, 1)`, para o movimento parecer natural.

### 5. Lógica de movimento

Portada de `main.py` para o frontend, sem mudança de comportamento:

- Constantes: `QUADRADO_TAMANHO = 200`, `MARGEM = 20`, `CONFIDENCE_DETECCAO = 0.7`,
  `CONFIDENCE_RASTREAMENTO = 0.5`, `MAX_FRAMES_PERDIDOS = 5`.
- `apto()` — verifica se o dedo está dentro do quadrado central.
- `movimento()` — quando o dedo sai do quadrado, decide `LEFT`, `RIGHT`, `TOP`
  ou `BOTTOM` pelo lado por onde saiu.
- O comando é entregue ao `movePlayer()` existente, que anima o jogador com GSAP.
- É preciso entrar e sair do quadrado para gerar um movimento (não move com o
  dedo parado numa borda).

### 6. O que permanece

- Labirinto: geração, paredes, colisão, jogador SVG, partículas e celebração
  seguem como estão em `script.js` / `style.css`.
- Controle por teclado (setas) continua funcionando.
- GSAP 3 via CDN, carregado antes de `script.js`.

## Estrutura

```
index.html                 página do jogo + painel da câmera
script.js                  labirinto + pipeline do MediaPipe
style.css                  estilos do jogo e do painel da câmera
models/hand_landmarker.task modelo do MediaPipe (servido por HTTP)
```

## Verificação

```bash
node --check script.js
```

Depois servir a raiz por HTTP e testar no navegador com a webcam liberada.

## Limitações conhecidas

- Exige navegador com suporte a `getUserMedia` e WebGL/WASM, e acesso à webcam.
- Só há detecção com o servidor estático ativo; `file://` não funciona.
- Sem servidor, não há persistência de pontuação entre dispositivos ou sessões.

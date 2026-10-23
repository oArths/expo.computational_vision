import levels from './levels.json'
import {
  animarToken,
  centroCelula,
  criarParticulas,
  posicionarToken,
  renderizarLabirinto
} from './maze/view.js'

const PASSOS = {
  TOP: { row: -1, col: 0 },
  BOTTOM: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 }
}

const ALTURA_LABIRINTO = 0.7

export function criarJogo({
  table,
  container,
  token,
  trail,
  aoAtualizarHud,
  aoTerminar,
  aoPassarNivel
}) {
  let indice = 0
  let nivel = levels[0]
  let jogador = { ...nivel.start }
  let movimentos = 0
  let acumulado = 0
  let retomadoEm = performance.now()
  let pausado = false
  let ativo = false
  let iniciado = false

  const centro = () => centroCelula(table, container, jogador.row, jogador.col)

  function tempoMs() {
    if (!iniciado) return 0
    if (!ativo) return acumulado
    return pausado ? acumulado : acumulado + performance.now() - retomadoEm
  }

  function hud() {
    aoAtualizarHud({
      nivel: indice + 1,
      total: levels.length,
      dificuldade: nivel.difficulty,
      movimentos,
      segundos: Math.floor(tempoMs() / 1000)
    })
  }

  // O labirinto ocupa sempre 70% da altura da tela, independente do nível.
  function ajustarTamanho() {
    const altura = window.innerHeight * ALTURA_LABIRINTO
    const largura = window.innerWidth * 0.9
    const celula = Math.max(
      6,
      Math.floor(Math.min(altura / nivel.rows, largura / nivel.cols))
    )
    container.style.setProperty('--maze-cell-size', `${celula}px`)
  }

  function carregarNivel() {
    nivel = levels[indice]
    jogador = { ...nivel.start }
    ajustarTamanho()
    renderizarLabirinto(table, nivel)
    trail.replaceChildren()
    posicionarToken(token, centro())
    hud()
  }

  function finalizar() {
    // Precisa ler o tempo antes de desligar o relógio.
    const segundos = Math.max(1, Math.round(tempoMs() / 1000))
    ativo = false
    aoTerminar({ movimentos, segundos })
  }

  function avancarNivel() {
    if (indice === levels.length - 1) {
      finalizar()
      return
    }

    aoPassarNivel()
    indice += 1
    carregarNivel()
  }

  function mover(direcao) {
    const passo = PASSOS[direcao]
    if (!passo || !ativo || pausado) return

    let row = jogador.row
    let col = jogador.col
    let deslizou = false

    // Desliza até bater na parede, como no jogo original.
    while (true) {
      row += passo.row
      col += passo.col

      const celula = nivel.grid[row]?.[col]

      if (!celula || celula === 'wall' || celula === 'boundary') break

      // O relógio só começa no primeiro movimento.
      if (!iniciado) {
        iniciado = true
        retomadoEm = performance.now()
      }

      criarParticulas(trail, centro())
      jogador = { row, col }

      // Um gesto = um deslizamento inteiro, não cada casa percorrida.
      if (!deslizou) {
        movimentos += 1
        deslizou = true
      }

      animarToken(token, centro())
      hud()

      if (row === nivel.goal.row && col === nivel.goal.col) {
        avancarNivel()
        return
      }
    }
  }

  function reiniciar() {
    indice = 0
    movimentos = 0
    acumulado = 0
    iniciado = false
    pausado = false
    ativo = true
    carregarNivel()
  }

  function pausar() {
    if (!ativo || pausado) return
    if (iniciado) acumulado += performance.now() - retomadoEm
    pausado = true
    hud()
  }

  function retomar() {
    if (!ativo || !pausado) return
    if (iniciado) retomadoEm = performance.now()
    pausado = false
    hud()
  }

  function reposicionar() {
    ajustarTamanho()
    posicionarToken(token, centro())
  }

  // Mostra o nível 1 atrás do modal inicial; só começa a valer no reiniciar.
  carregarNivel()

  // Mantém o cronômetro andando na tela sem depender de um movimento.
  setInterval(() => {
    if (ativo && !pausado) hud()
  }, 250)

  return {
    mover,
    reiniciar,
    pausar,
    retomar,
    reposicionar,
    estaPausado: () => pausado,
    nivelAtual: () => nivel
  }
}

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

export function criarJogo({ table, container, token, trail, aoAtualizarHud, aoTerminar }) {
  let indice = 0
  let nivel = levels[0]
  let jogador = { ...nivel.start }
  let movimentos = 0
  let acumulado = 0
  let retomadoEm = performance.now()
  let pausado = false
  let ativo = false

  const centro = () => centroCelula(table, container, jogador.row, jogador.col)

  function tempoMs() {
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

  // Níveis de 34x34 não cabem na tela com célula de 30px.
  function ajustarTamanho() {
    const altura = window.innerHeight - 240
    const largura = window.innerWidth - 460
    const celula = Math.max(10, Math.min(30, Math.floor(Math.min(altura, largura) / nivel.rows)))
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
    ativo = false
    const segundos = Math.max(1, Math.round(tempoMs() / 1000))
    aoTerminar({ movimentos, segundos })
  }

  function avancarNivel() {
    if (indice === levels.length - 1) {
      finalizar()
      return
    }

    indice += 1
    carregarNivel()
  }

  function mover(direcao) {
    const passo = PASSOS[direcao]
    if (!passo || !ativo || pausado) return

    let row = jogador.row
    let col = jogador.col

    // Desliza até bater na parede, como no jogo original.
    while (true) {
      row += passo.row
      col += passo.col

      const celula = nivel.grid[row]?.[col]

      if (!celula || celula === 'wall' || celula === 'boundary') break

      criarParticulas(trail, centro())
      jogador = { row, col }
      movimentos += 1
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
    retomadoEm = performance.now()
    pausado = false
    ativo = true
    carregarNivel()
  }

  function pausar() {
    if (!ativo || pausado) return
    acumulado += performance.now() - retomadoEm
    pausado = true
    hud()
  }

  function retomar() {
    if (!ativo || !pausado) return
    retomadoEm = performance.now()
    pausado = false
    hud()
  }

  function reposicionar() {
    ajustarTamanho()
    posicionarToken(token, centro())
  }

  // Mostra o nível 1 atrás do modal inicial; só começa a valer no reiniciar.
  carregarNivel()

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

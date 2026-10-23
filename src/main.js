import './style.css'
import { criarJogo } from './game.js'
import {
  atualizarGesto,
  atualizarPausa,
  criarGesto,
  criarPausa,
  maoPrincipal
} from './gesture.js'
import { abrirCamera, criarDetector, iniciarLoop } from './hands.js'
import { desenharOverlay, redimensionarOverlay } from './overlay.js'
import { buscarRanking, calcularScore, enviarResultado, supabaseConfigurado } from './ranking.js'

const $ = id => document.getElementById(id)

const table = $('maze')
const container = $('maze-container')
const token = $('player-token')
const trail = $('player-trail')
const video = $('camera-feed')
const overlay = $('camera-overlay')
const cameraStatus = $('camera-status')
const trackerRing = $('tracker-ring')
const pauseOverlay = $('pause-overlay')
const pauseHint = $('pause-hint')
const pauseProgress = $('pause-progress')
const startModal = $('start-modal')
const resultModal = $('result-modal')

const gesto = criarGesto()
const pausa = criarPausa()

let ultimoRastreado = 0
let reinicioAutomatico = null
let rodando = false

const jogo = criarJogo({
  table,
  container,
  token,
  trail,
  aoAtualizarHud({ nivel, total, dificuldade, movimentos, segundos }) {
    $('level').textContent = `${nivel}/${total}`
    $('difficulty').textContent = dificuldade
    $('moves').textContent = movimentos
    $('time').textContent = segundos
  },
  aoTerminar: finalizarDesafio
})

function mostrarModal(modal) {
  modal.classList.add('active')
}

function esconderModal(modal) {
  modal.classList.remove('active')
}

function reiniciarDesafio() {
  clearTimeout(reinicioAutomatico)
  esconderModal(resultModal)
  esconderModal(pauseOverlay)
  pauseProgress.style.width = '0%'
  rodando = false
  $('nickname').value = ''
  mostrarModal(startModal)
  $('nickname').focus()
}

function alternarPausa() {
  if (jogo.estaPausado()) {
    jogo.retomar()
    pauseOverlay.classList.remove('active')
  } else {
    jogo.pausar()
    pauseOverlay.classList.add('active')
  }
}

async function finalizarDesafio({ movimentos, segundos }) {
  rodando = false
  const score = calcularScore(movimentos, segundos)

  $('result-moves').textContent = movimentos
  $('result-time').textContent = segundos
  $('result-score').textContent = score
  $('result-position').textContent = supabaseConfigurado ? '...' : '-'
  $('result-body').innerHTML = ''
  $('result-status').textContent = supabaseConfigurado ? 'Enviando resultado...' : 'Ranking desativado (sem configuração).'

  mostrarModal(resultModal)
  reinicioAutomatico = setTimeout(reiniciarDesafio, 30000)

  if (!supabaseConfigurado) return

  try {
    await enviarResultado({ nickname: $('nickname').value.trim() || 'Anônimo', segundos, score })
    const { top, posicao } = await buscarRanking({ score, segundos })

    $('result-position').textContent = `${posicao}º`
    $('result-status').textContent = ''
    $('result-body').innerHTML = top
      .map(
        (linha, index) =>
          `<tr><td>${index + 1}</td><td>${escapar(linha.nickname ?? '')}</td><td>${linha.score}</td><td>${linha.time}s</td></tr>`
      )
      .join('')
  } catch (erro) {
    console.error(erro)
    $('result-position').textContent = '-'
    $('result-status').textContent = 'Não foi possível enviar para o ranking. O resultado local acima é válido.'
  }
}

function escapar(texto) {
  const div = document.createElement('div')
  div.textContent = texto
  return div.innerHTML
}

function iniciarDesafio() {
  const nickname = $('nickname').value.trim()

  if (!nickname) {
    $('nickname').focus()
    return
  }

  $('nickname').value = nickname.slice(0, 20)
  esconderModal(startModal)
  esconderModal(resultModal)
  esconderModal(pauseOverlay)
  reinicioAutomatico = null
  rodando = true
  gesto.pinching = false
  gesto.inicio = null
  gesto.cooldownAte = 0
  pausa.desde = null
  pausa.armada = true

  jogo.reiniciar()
}

async function iniciarRastreamento() {
  try {
    await abrirCamera(video)

    const detector = await criarDetector()

    cameraStatus.textContent = 'Câmera ativa'

    iniciarLoop({
      video,
      detector,
      onResultado(resultado, agora) {
        const hands = resultado.landmarks ?? []
        const primaria = maoPrincipal(hands)

        redimensionarOverlay(overlay, video)

        if (primaria >= 0) ultimoRastreado = agora
        trackerRing.classList.toggle('tracked', agora - ultimoRastreado < 400)

        desenharOverlay(overlay, {
          hands,
          primaria,
          pinching: gesto.pinching,
          inicio: gesto.inicio
        })

        if (rodando && primaria >= 0) {
          const direcao = atualizarGesto(gesto, hands[primaria], agora)
          if (direcao) jogo.mover(direcao)
        }

        if (rodando && atualizarPausa(pausa, hands, agora)) alternarPausa()

        const segurando = rodando && pausa.desde !== null
        pauseHint.classList.toggle('visible', segurando)
        pauseProgress.style.width = segurando
          ? `${Math.min(1, (agora - pausa.desde) / 1000) * 100}%`
          : '0%'

        const texto = hands.length >= 2 ? 'Câmera ativa · 2 mãos' : 'Câmera ativa'
        if (cameraStatus.textContent !== texto) cameraStatus.textContent = texto
      }
    })
  } catch (erro) {
    console.error(erro)
    cameraStatus.textContent = 'Câmera indisponível: use HTTPS ou localhost e libere o acesso.'
  }
}

document.addEventListener('keydown', event => {
  const teclas = {
    ArrowUp: 'TOP',
    ArrowDown: 'BOTTOM',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT'
  }

  const direcao = teclas[event.key]
  if (!direcao) return

  event.preventDefault()
  if (rodando) jogo.mover(direcao)
})

window.addEventListener('resize', () => jogo.reposicionar())

$('start-button').addEventListener('click', iniciarDesafio)
$('nickname').addEventListener('keydown', event => {
  if (event.key === 'Enter') iniciarDesafio()
})
$('restart').addEventListener('click', reiniciarDesafio)
$('result-restart').addEventListener('click', reiniciarDesafio)

iniciarRastreamento()
reiniciarDesafio()

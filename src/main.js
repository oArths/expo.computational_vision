import confetti from 'canvas-confetti'
import './style.css'

import { criarJogo } from './game.js'
import {
  atualizarGesto,
  atualizarPausa,
  criarGesto,
  criarPausa,
  maoPrincipal,
  progressoGesto,
  quadranteDoPonto
} from './gesture.js'
import { abrirCamera, criarDetector, iniciarLoop } from './hands.js'
import { desenharOverlay, redimensionarOverlay } from './overlay.js'
import {
  buscarRanking,
  calcularScore,
  enviarResultado,
  listarRanking,
  nicknameEmUso,
  supabaseConfigurado
} from './ranking.js'

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


const telas = {
  home: $('screen-home'),
  ranking: $('screen-ranking'),
  jogo: $('screen-game')
}

const gesto = criarGesto()
const zonasCamera = [...document.querySelectorAll('.camera-zonas span')]
const pausa = criarPausa()
const debugGesto = new URLSearchParams(location.search).has('debug')

if (debugGesto) document.body.classList.add('debug')

let ultimoRastreado = 0
let ultimoFrameEm = 0
let fps = 0
let reinicioAutomatico = null
let rodando = false
let resultadoAtual = null

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
  aoPassarNivel() {
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } })
  },
  aoTerminar: finalizarDesafio
})

function mostrarTela(nome) {
  Object.entries(telas).forEach(([chave, elemento]) => {
    elemento.classList.toggle('active', chave === nome)
  })
}

function mostrarModal(modal) {
  modal.classList.add('active')
}

function esconderModal(modal) {
  modal.classList.remove('active')
}

function escapar(texto) {
  const div = document.createElement('div')
  div.textContent = texto
  return div.innerHTML
}

function formatarPontos(valor) {
  return valor.toLocaleString('pt-BR')
}

function irParaHome() {
  clearTimeout(reinicioAutomatico)
  rodando = false
  esconderModal(resultModal)
  esconderModal(startModal)
  esconderModal(pauseOverlay)
  pauseProgress.style.width = '0%'
  mostrarTela('home')
}

function abrirJogo() {
  clearTimeout(reinicioAutomatico)
  esconderModal(resultModal)
  esconderModal(pauseOverlay)
  $('nickname').value = ''
  rodando = false
  jogo.reiniciar()
  mostrarTela('jogo')
  mostrarModal(startModal)
  $('nickname').focus()
}

async function iniciarDesafio() {
  const nickname = $('nickname').value.trim()

  if (!nickname) {
    $('nickname').focus()
    return
  }

  $('start-error').textContent = ''

  if (supabaseConfigurado) {
    const botao = $('start-button')
    botao.disabled = true

    try {
      if (await nicknameEmUso(nickname)) {
        $('start-error').textContent = 'Esse nome já está no ranking. Escolha outro.'
        $('nickname').focus()
        return
      }
    } catch (erro) {
      // Sem rede a checagem falha; o banco ainda barra o nome repetido no final.
      console.warn('Não foi possível checar o nome.', erro)
    } finally {
      botao.disabled = false
    }
  }

  $('nickname').value = nickname.slice(0, 20)
  esconderModal(startModal)
  reinicioAutomatico = null
  rodando = true
  Object.assign(gesto, criarGesto())
  pausa.desde = null
  pausa.armada = true

  jogo.reiniciar()
}

async function abrirRanking() {
  mostrarTela('ranking')
  $('ranking-list').innerHTML = ''
  $('ranking-status').textContent = supabaseConfigurado
    ? 'Carregando...'
    : 'Ranking desativado (sem configuração).'

  if (!supabaseConfigurado) return

  try {
    const lista = await listarRanking()

    $('ranking-status').textContent = lista.length ? '' : 'Nenhum resultado ainda.'
    $('ranking-list').innerHTML = lista
      .map(
        (linha, index) => `
          <li class="rank-row    ${index < 3 ? `top${index + 1}` : ''}">
            <span class="rank-pos">${index + 1}º</span>
            <span class="rank-name">${escapar(linha.nickname ?? '')}</span>
            <span class="rank-value max-xl:text-right">${formatarPontos(linha.score)} pts</span>
            <span class="rank-value max-xl:text-center">${linha.time}s</span>
            <span class="rank-value max-xl:text-right  -col-end-1 ">${linha.created_at.slice(0,10).split("-").reverse().join("/")}</span>
          </li>`
      )
      .join('')
  } catch (erro) {
    console.error(erro)
    $('ranking-status').textContent = 'Não foi possível carregar o ranking.'
  }
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
  resultadoAtual = { score, segundos }

  $('result-moves').textContent = movimentos
  $('result-time').textContent = segundos
  $('result-score').textContent = formatarPontos(score)
  $('result-position').textContent = supabaseConfigurado ? '...' : '-'
  $('result-body').innerHTML = ''
  $('result-status').textContent = supabaseConfigurado
    ? 'Enviando resultado...'
    : 'Ranking desativado (sem configuração).'
  $('result-rename').classList.remove('active')
  $('result-nickname').value = ''

  mostrarModal(resultModal)
  reinicioAutomatico = setTimeout(irParaHome, 30000)

  if (!supabaseConfigurado) return

  await enviarScore($('nickname').value.trim() || 'Anônimo')
}

async function enviarScore(nickname) {
  const { score, segundos } = resultadoAtual

  try {
    await enviarResultado({ nickname, segundos, score })
    const { top, posicao } = await buscarRanking({ score, segundos })

    $('nickname').value = nickname
    $('result-position').textContent = `${posicao}º`
    $('result-status').textContent = ''
    $('result-rename').classList.remove('active')

    // Rearma o retorno automático caso o envio tenha sido refeito.
    clearTimeout(reinicioAutomatico)
    reinicioAutomatico = setTimeout(irParaHome, 30000)
    $('result-body').innerHTML = top
      .map(
        (linha, index) =>
          `<tr><td>${index + 1}</td><td>${escapar(linha.nickname ?? '')}</td><td>${formatarPontos(linha.score)}</td><td>${linha.time}s</td></tr>`
      )
      .join('')
  } catch (erro) {
    console.error(erro)

    // 23505 = nome repetido (índice único no banco). Alguém pode ter usado
    // durante a partida, depois da checagem inicial.
    if (erro?.code === '23505') {
      clearTimeout(reinicioAutomatico)
      $('result-position').textContent = '-'
      $('result-status').textContent =
        'Esse nome já foi usado. Escolha outro para salvar o score.'
      $('result-rename').classList.add('active')
      $('result-nickname').focus()
      return
    }

    $('result-position').textContent = '-'
    $('result-status').textContent =
      'Não foi possível enviar para o ranking. O resultado local acima é válido.'
  }
}

async function iniciarRastreamento() {
  try {
    await abrirCamera(video)

    const { detector, delegado } = await criarDetector()

    cameraStatus.textContent = `Câmera ativa · ${delegado}`

    iniciarLoop({
      video,
      detector,
      onResultado(resultado, agora) {
        if (ultimoFrameEm) {
          const instantaneo = 1000 / (agora - ultimoFrameEm)
          fps = fps ? fps * 0.9 + instantaneo * 0.1 : instantaneo
        }
        ultimoFrameEm = agora

        const hands = resultado.landmarks ?? []
        const primaria = maoPrincipal(hands)

        redimensionarOverlay(overlay, video)

        if (primaria >= 0) ultimoRastreado = agora
        trackerRing.classList.toggle('tracked', agora - ultimoRastreado < 400)

        const aspecto = video.videoWidth / video.videoHeight || 1
        const zonaAtiva =
          primaria >= 0 ? quadranteDoPonto(hands[primaria][8], aspecto) : null

        for (const zona of zonasCamera) {
          zona.classList.toggle('ativa', zona.dataset.dir === zonaAtiva)
        }

        if (rodando) {
          const direcao = atualizarGesto(
            gesto,
            primaria >= 0 ? hands[primaria] : null,
            agora,
            aspecto
          )
          if (direcao) jogo.mover(direcao)
        }

        desenharOverlay(overlay, {
          hands,
          primaria,
          progresso: rodando ? progressoGesto(gesto, agora) : 0
        })

        if (rodando && atualizarPausa(pausa, hands, agora)) alternarPausa()

        const segurando = rodando && pausa.desde !== null
        pauseHint.classList.toggle('visible', segurando)
        pauseProgress.style.width = segurando
          ? `${Math.min(1, (agora - pausa.desde) / 1000) * 100}%`
          : '0%'

        const maos = hands.length >= 2 ? ' · 2 mãos' : ''
        const texto = `Câmera ativa · ${Math.round(fps)} fps${maos} · ${delegado}`
        if (cameraStatus.textContent !== texto) cameraStatus.textContent = texto

        if (debugGesto) {
          $('debug-gesto').textContent = `Z ${zonaAtiva ?? '-'} · ${Math.round(
            progressoGesto(gesto, agora) * 100
          )}%`
        }
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

$('home-start').addEventListener('click', abrirJogo)
$('home-ranking').addEventListener('click', abrirRanking)
$('ranking-back').addEventListener('click', irParaHome)
$('exit-button').addEventListener('click', irParaHome)
$('start-button').addEventListener('click', iniciarDesafio)
$('nickname').addEventListener('input', () => {
  $('start-error').textContent = ''
})
$('nickname').addEventListener('keydown', event => {
  if (event.key === 'Enter') iniciarDesafio()
})
$('result-save').addEventListener('click', async () => {
  const nickname = $('result-nickname').value.trim()

  if (!nickname) {
    $('result-nickname').focus()
    return
  }

  $('result-save').disabled = true
  $('result-status').textContent = 'Enviando...'
  await enviarScore(nickname)
  $('result-save').disabled = false
})
$('result-nickname').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('result-save').click()
})
$('result-restart').addEventListener('click', abrirJogo)

iniciarRastreamento()
mostrarTela('home')

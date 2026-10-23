// Direção por quadrante: a ponta do indicador escolhe o lado da câmera e a
// permanência nele confirma o movimento.

const PULSO = 0
const BASE_INDICADOR = 9
const PONTA_INDICADOR = 8

const ZONA_MORTA = 0.12
const PERMANENCIA_MS = 250
const PERDA_MAO_MS = 250

const PAUSA_PUNHOS = 0.8
const PAUSA_ESPERA_MS = 1000
const PAUSA_TOLERANCIA_MS = 300

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Tamanho da mão em coordenadas normalizadas: normaliza as medidas e compara mãos.
export function escalaMao(hand) {
  return distancia(hand[PULSO], hand[BASE_INDICADOR])
}

export function maoPrincipal(hands) {
  if (hands.length === 0) return -1

  let melhor = 0
  for (let index = 1; index < hands.length; index++) {
    if (escalaMao(hands[index]) > escalaMao(hands[melhor])) melhor = index
  }

  return melhor
}

export function criarGesto() {
  return { zona: null, desde: 0, disparada: false, vistoEm: 0 }
}

function direcaoDoLado(dx, dy) {
  // A tela é espelhada, então o lado direito da imagem (x < 0.5) é a direita do jogador.
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'RIGHT' : 'LEFT'
  return dy < 0 ? 'TOP' : 'BOTTOM'
}

// `aspecto` (largura/altura) iguala o peso dos dois eixos em pixels.
export function quadranteDoPonto(ponto, aspecto = 1) {
  const dx = ponto.x - 0.5
  const dy = (ponto.y - 0.5) / aspecto

  if (Math.abs(dx) < ZONA_MORTA && Math.abs(dy) < ZONA_MORTA) return null

  return direcaoDoLado(dx, dy)
}

// 0 a 1 enquanto o dedo se mantém na zona; 0 depois de disparar.
export function progressoGesto(estado, agora) {
  if (!estado.zona || estado.disparada) return 0

  return Math.min(1, (agora - estado.desde) / PERMANENCIA_MS)
}

// Dispara uma direção quando a ponta do indicador passa PERMANENCIA_MS na mesma zona.
export function atualizarGesto(estado, hand, agora, aspecto = 1) {
  if (!hand) {
    // O detector perde a mão de vez em quando; um frame perdido não zera a espera.
    if (estado.zona && agora - estado.vistoEm > PERDA_MAO_MS) {
      estado.zona = null
      estado.disparada = false
    }
    return null
  }

  estado.vistoEm = agora

  const zona = quadranteDoPonto(hand[PONTA_INDICADOR], aspecto)

  if (!zona) {
    estado.zona = null
    estado.disparada = false
    return null
  }

  if (zona !== estado.zona) {
    estado.zona = zona
    estado.desde = agora
    estado.disparada = false
    return null
  }

  if (estado.disparada) return null
  if (agora - estado.desde < PERMANENCIA_MS) return null

  estado.disparada = true
  return zona
}

export function criarPausa() {
  return { desde: null, armada: true, ultimaPose: 0 }
}

// Duas mãos próximas por 1s. A distância entre punhos evita pausar por causa da
// mão de alguém que está passando atrás.
export function atualizarPausa(estado, hands, agora) {
  const pose =
    hands.length >= 2 &&
    distancia(hands[0][PULSO], hands[1][PULSO]) < PAUSA_PUNHOS

  if (pose) estado.ultimaPose = agora

  // O detector perde uma mão de vez em quando; sem tolerância o contador zera
  // e a pausa nunca completa.
  const tolerado = agora - estado.ultimaPose < PAUSA_TOLERANCIA_MS

  if (!pose && !tolerado) {
    estado.desde = null
    estado.armada = true
    return false
  }

  if (!pose) return false
  if (!estado.armada) return false
  if (estado.desde === null) estado.desde = agora

  if (agora - estado.desde < PAUSA_ESPERA_MS) return false

  estado.armada = false
  estado.desde = null
  return true
}

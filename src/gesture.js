// Gesto de mão fechada, direção por quadrante e pose de pausa.

const PULSO = 0
const BASE_INDICADOR = 9

// Ponta e articulação de cada dedo (sem o polegar).
const DEDOS = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18]
]

const CURL = 0.9
const FECHADA_ATIVA = 4
const FECHADA_SOLTA = 2
const ZONA_MORTA = 0.12
const PERDA_MAO_MS = 250
const TROCA_MAO = 0.25

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
  return { fechada: false, escala: 0, vistoEm: 0 }
}

// Dedo curvado = ponta mais perto do pulso que a articulação do meio.
// Funciona com a mão em qualquer rotação e não depende do tamanho da mão.
function dedosCurvados(hand) {
  let total = 0

  for (const [ponta, articulacao] of DEDOS) {
    if (distancia(hand[ponta], hand[PULSO]) < distancia(hand[articulacao], hand[PULSO]) * CURL) {
      total += 1
    }
  }

  return total
}

function direcaoDoLado(dx, dy) {
  // A tela é espelhada, então o lado direito da imagem (x < 0.5) é a direita do jogador.
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'RIGHT' : 'LEFT'
  return dy < 0 ? 'TOP' : 'BOTTOM'
}

// A direção é o lado da câmera onde a mão fechou.
export function quadranteDoPonto(ponto, aspecto = 1) {
  const dx = ponto.x - 0.5
  const dy = (ponto.y - 0.5) / aspecto

  if (Math.abs(dx) < ZONA_MORTA && Math.abs(dy) < ZONA_MORTA) return null

  return direcaoDoLado(dx, dy)
}

// Posição da palma, não da ponta do dedo: não muda ao fechar a mão.
export function quadranteDaMao(hand, aspecto = 1) {
  return quadranteDoPonto(hand[BASE_INDICADOR], aspecto)
}

// Dispara uma direção por fechada de mão, no momento em que os dedos se curvam.
// `aspecto` (largura/altura) iguala o peso dos dois eixos em pixels.
export function atualizarGesto(estado, hand, agora, aspecto = 1) {
  if (!hand) {
    // O detector perde a mão de vez em quando; só zera se ela sumir de verdade.
    if (estado.fechada && agora - estado.vistoEm > PERDA_MAO_MS) {
      estado.fechada = false
    }
    return null
  }

  estado.vistoEm = agora

  const escala = escalaMao(hand)
  if (escala === 0) return null

  // Outra mão (ou outra pessoa): não conta como fechada nova até abrir.
  if (estado.escala && Math.abs(escala - estado.escala) / estado.escala > TROCA_MAO) {
    estado.fechada = true
  }
  estado.escala = escala

  const curvados = dedosCurvados(hand)

  if (!estado.fechada) {
    if (curvados < FECHADA_ATIVA) return null
    estado.fechada = true
    return quadranteDaMao(hand, aspecto)
  }

  if (curvados <= FECHADA_SOLTA) {
    estado.fechada = false
  }

  return null
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

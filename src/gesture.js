// Gesto de pontas dos dedos juntas, direção por quadrante e pose de pausa.

const PULSO = 0
const BASE_INDICADOR = 9

// Pontas dos quatro dedos (sem o polegar).
const PONTAS = [8, 12, 16, 20]

const PONTAS_JUNTAS = 0.35
const PONTAS_SOLTAS = 0.55
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
  return { juntas: false, escala: 0, vistoEm: 0 }
}

// O quanto as pontas estão espalhadas em volta do próprio centro, relativo ao
// tamanho da mão. Vale para a mão em qualquer rotação e em qualquer distância.
function espalhamentoDasPontas(hand, escala) {
  let cx = 0
  let cy = 0

  for (const ponta of PONTAS) {
    cx += hand[ponta].x
    cy += hand[ponta].y
  }

  cx /= PONTAS.length
  cy /= PONTAS.length

  let maior = 0
  for (const ponta of PONTAS) {
    maior = Math.max(maior, Math.hypot(hand[ponta].x - cx, hand[ponta].y - cy))
  }

  return maior / escala
}

function direcaoDoLado(dx, dy) {
  // A tela é espelhada, então o lado direito da imagem (x < 0.5) é a direita do jogador.
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'RIGHT' : 'LEFT'
  return dy < 0 ? 'TOP' : 'BOTTOM'
}

// A direção é o lado da câmera onde as pontas se juntaram.
export function quadranteDoPonto(ponto, aspecto = 1) {
  const dx = ponto.x - 0.5
  const dy = (ponto.y - 0.5) / aspecto

  if (Math.abs(dx) < ZONA_MORTA && Math.abs(dy) < ZONA_MORTA) return null

  return direcaoDoLado(dx, dy)
}

// Posição da palma, não das pontas: não muda ao juntar os dedos.
export function quadranteDaMao(hand, aspecto = 1) {
  return quadranteDoPonto(hand[BASE_INDICADOR], aspecto)
}

// Dispara uma direção por gesto, no momento em que as pontas se encontram.
// `aspecto` (largura/altura) iguala o peso dos dois eixos em pixels.
export function atualizarGesto(estado, hand, agora, aspecto = 1) {
  if (!hand) {
    // O detector perde a mão de vez em quando; só zera se ela sumir de verdade.
    if (estado.juntas && agora - estado.vistoEm > PERDA_MAO_MS) {
      estado.juntas = false
    }
    return null
  }

  estado.vistoEm = agora

  const escala = escalaMao(hand)
  if (escala === 0) return null

  // Outra mão (ou outra pessoa): não conta como gesto novo até soltar.
  if (estado.escala && Math.abs(escala - estado.escala) / estado.escala > TROCA_MAO) {
    estado.juntas = true
  }
  estado.escala = escala

  const espalhamento = espalhamentoDasPontas(hand, escala)

  if (!estado.juntas) {
    if (espalhamento > PONTAS_JUNTAS) return null
    estado.juntas = true
    return quadranteDaMao(hand, aspecto)
  }

  if (espalhamento > PONTAS_SOLTAS) {
    estado.juntas = false
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

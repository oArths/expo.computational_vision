// Detecção do gesto de pinça (indicador + polegar) e da pose de pausa.

const POLEGAR = 4
const INDICADOR = 8
const PULSO = 0
const BASE_INDICADOR = 9

const PINCA_ATIVA = 0.25
const PINCA_SOLTA = 0.35
const MARGEM_GESTO = 0.06
const DOMINANCIA = 1.3
const COOLDOWN_MS = 300

const PAUSA_ALTURA = 0.65
const PAUSA_PUNHOS = 0.5
const PAUSA_ESPERA_MS = 1000

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Tamanho da mão em coordenadas normalizadas: normaliza a pinça e compara mãos.
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
  return { pinching: false, inicio: null, cooldownAte: 0 }
}

// Retorna a direção quando a pinça é solta depois de um deslocamento válido.
// A tela é espelhada, então mover a mão para a direita diminui o x da imagem.
export function atualizarGesto(estado, hand, agora) {
  const escala = escalaMao(hand)
  if (escala === 0) return null

  const razao = distancia(hand[POLEGAR], hand[INDICADOR]) / escala

  if (!estado.pinching && razao < PINCA_ATIVA) {
    estado.pinching = true
    estado.inicio = { x: hand[INDICADOR].x, y: hand[INDICADOR].y }
    return null
  }

  if (estado.pinching && razao > PINCA_SOLTA) {
    estado.pinching = false
    const inicio = estado.inicio
    estado.inicio = null
    if (!inicio || agora < estado.cooldownAte) return null

    const dx = hand[INDICADOR].x - inicio.x
    const dy = hand[INDICADOR].y - inicio.y

    if (Math.abs(dx) < MARGEM_GESTO && Math.abs(dy) < MARGEM_GESTO) return null

    let direcao = null

    if (Math.abs(dx) > Math.abs(dy) * DOMINANCIA) direcao = dx < 0 ? 'RIGHT' : 'LEFT'
    else if (Math.abs(dy) > Math.abs(dx) * DOMINANCIA) direcao = dy < 0 ? 'TOP' : 'BOTTOM'

    if (direcao) estado.cooldownAte = agora + COOLDOWN_MS

    return direcao
  }

  return null
}

export function criarPausa() {
  return { desde: null, armada: true }
}

// Duas mãos próximas e acima do centro por 1s. Evita pausa com mão de terceiro.
export function atualizarPausa(estado, hands, agora) {
  const pose =
    hands.length >= 2 &&
    hands[0][PULSO].y < PAUSA_ALTURA &&
    hands[1][PULSO].y < PAUSA_ALTURA &&
    distancia(hands[0][PULSO], hands[1][PULSO]) < PAUSA_PUNHOS

  if (!pose) {
    estado.desde = null
    estado.armada = true
    return false
  }

  if (!estado.armada) return false
  if (estado.desde === null) estado.desde = agora

  if (agora - estado.desde < PAUSA_ESPERA_MS) return false

  estado.armada = false
  estado.desde = null
  return true
}

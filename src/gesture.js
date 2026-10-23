// Gesto por dedo apontado: polegar (direita/cima/baixo) e indicador (esquerda).
// Os outros três dedos precisam estar fechados.

const PULSO = 0
const BASE_INDICADOR = 9

// Ponta e articulação do meio dos outros três dedos.
const OUTROS = [
  [12, 10],
  [16, 14],
  [20, 18]
]

const OUTROS_ATIVA = 0.85
const INDICADOR_ATIVA = 1.2
const INDICADOR_SOLTA = 1.05
const POLEGAR_ATIVA = 0.8
const POLEGAR_SOLTA = 0.55
const DIRECAO_MIN = 0.6

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
  return { apontando: false, escala: 0, vistoEm: 0 }
}

// Razão entre a distância ponta→pulso e articulação→pulso. Dedo esticado fica
// acima de 1, dedo dobrado fica abaixo — vale em qualquer rotação e distância.
function razaoDedo(hand, ponta, articulacao) {
  return distancia(hand[ponta], hand[PULSO]) / distancia(hand[articulacao], hand[PULSO])
}

// Polegar afastado do indicador = esticado. Dobrado, a ponta encosta nele.
function tamanhoPolegar(hand, escala) {
  return distancia(hand[4], hand[5]) / escala
}

// A tela é espelhada: apontar para a direita do jogador diminui o x da imagem.
function direcaoDoPolegar(hand, escala, aspecto) {
  const dx = hand[4].x - hand[2].x
  const dy = (hand[4].y - hand[2].y) / aspecto

  if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECAO_MIN * escala) return null

  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'RIGHT' : null

  return dy < 0 ? 'TOP' : 'BOTTOM'
}

function direcaoDoIndicador(hand, escala, aspecto) {
  const dx = hand[8].x - hand[5].x
  const dy = (hand[8].y - hand[5].y) / aspecto

  if (Math.abs(dx) <= Math.abs(dy)) return null
  if (dx < DIRECAO_MIN * escala) return null

  return 'LEFT'
}

// Dispara uma direção por gesto, no momento em que o polegar ou o indicador aponta.
// `aspecto` (largura/altura) iguala o peso dos dois eixos em pixels.
export function atualizarGesto(estado, hand, agora, aspecto = 1) {
  if (!hand) {
    // O detector perde a mão de vez em quando; só zera se ela sumir de verdade.
    if (estado.apontando && agora - estado.vistoEm > PERDA_MAO_MS) {
      estado.apontando = false
    }
    return null
  }

  estado.vistoEm = agora

  const escala = escalaMao(hand)
  if (escala === 0) return null

  // Outra mão (ou outra pessoa): não conta como gesto novo até fechar.
  if (estado.escala && Math.abs(escala - estado.escala) / estado.escala > TROCA_MAO) {
    estado.apontando = true
  }
  estado.escala = escala

  const polegar = tamanhoPolegar(hand, escala)
  const indicador = razaoDedo(hand, 8, 6)

  if (estado.apontando) {
    if (polegar < POLEGAR_SOLTA && indicador < INDICADOR_SOLTA) estado.apontando = false
    return null
  }

  const fechados = OUTROS.every(
    ([ponta, articulacao]) => razaoDedo(hand, ponta, articulacao) < OUTROS_ATIVA
  )

  if (!fechados) return null

  const polegarFora = polegar > POLEGAR_ATIVA
  const indicadorFora = indicador > INDICADOR_ATIVA

  if (polegarFora === indicadorFora) return null

  const direcao = polegarFora
    ? direcaoDoPolegar(hand, escala, aspecto)
    : direcaoDoIndicador(hand, escala, aspecto)

  if (!direcao) return null

  estado.apontando = true
  return direcao
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

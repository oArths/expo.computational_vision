import assert from 'node:assert/strict'
import { atualizarGesto, criarGesto } from '../src/gesture.js'

const DT = 33

const OUTROS = [
  [12, 10],
  [16, 14],
  [20, 18]
]

// `polegar`/`indicador` aceitam 'fechado', 'direita', 'esquerda', 'cima', 'baixo'.
// `outros` = quantos dos outros três dedos ficam esticados.
function mao({
  x = 0.5,
  y = 0.5,
  escala = 0.1,
  polegar = 'fechado',
  indicador = 'fechado',
  outros = 0
}) {
  const hand = Array.from({ length: 21 }, () => ({ x, y }))
  hand[0] = { x: x - escala, y }
  hand[9] = { x, y }
  hand[5] = { x: x + escala * 0.8, y: y - escala * 0.3 }
  hand[2] = { x: x + escala * 0.15, y: y + escala * 0.1 }

  const pontasPolegar = {
    fechado: { x: x + escala * 0.85, y: y + escala * 0.05 },
    direita: { x: x - escala * 0.9, y: y + escala * 0.1 },
    esquerda: { x: x + escala * 1.6, y: y + escala * 0.1 },
    cima: { x: x + escala * 0.35, y: y - escala * 1.2 },
    baixo: { x: x + escala * 0.35, y: y + escala * 1.3 }
  }

  hand[4] = pontasPolegar[polegar]
  hand[6] = { x: x + escala * 0.9, y: y - escala * 0.9 }
  hand[8] =
    indicador === 'esquerda'
      ? { x: x + escala * 2, y: y - escala * 0.5 }
      : { x: x + escala * 0.8, y: y - escala * 0.1 }

  OUTROS.forEach(([ponta, articulacao], indice) => {
    hand[articulacao] = {
      x: x + escala,
      y: y + escala * (0.1 + indice * 0.15)
    }

    hand[ponta] =
      indice < outros
        ? { x: x + escala * 2.1, y: y + escala * (0.1 + indice * 0.15) }
        : { x: x + escala * 0.35, y: y + escala * (0.05 + indice * 0.08) }
  })

  return hand
}

function sessao() {
  const estado = criarGesto()
  let relogio = 0
  return {
    estado,
    frame(polegar = 'fechado', indicador = 'fechado', outros = 0, escala = 0.1) {
      relogio += DT
      return atualizarGesto(
        estado,
        mao({ polegar, indicador, outros, escala }),
        relogio
      )
    },
    semMao() {
      relogio += DT
      return atualizarGesto(estado, null, relogio)
    },
    pular(ms) {
      relogio += ms
    }
  }
}

// 1. Polegar: direita, cima e baixo.
{
  const s = sessao()
  assert.equal(s.frame('direita'), 'RIGHT')
  s.frame()
  assert.equal(s.frame('cima'), 'TOP')
  s.frame()
  assert.equal(s.frame('baixo'), 'BOTTOM')
}

// 2. Indicador para a esquerda.
{
  const s = sessao()
  assert.equal(s.frame('fechado', 'esquerda'), 'LEFT')
}

// 3. Polegar apontando para a esquerda não tem ação.
{
  const s = sessao()
  assert.equal(s.frame('esquerda'), null)
}

// 4. Os dois dedos esticados não contam; fechar o indicador libera o polegar.
{
  const s = sessao()
  assert.equal(s.frame('direita', 'esquerda'), null)
  assert.equal(s.frame('direita'), 'RIGHT')
}

// 5. Com outro dedo aberto não conta.
{
  const s = sessao()
  assert.equal(s.frame('direita', 'fechado', 1), null)
}

// 6. Gesto segurado não repete; fechar a mão libera.
{
  const s = sessao()
  assert.equal(s.frame('direita'), 'RIGHT')
  assert.equal(s.frame('direita'), null, 'polegar segurado não repete')
  s.frame()
  assert.equal(s.frame('direita'), 'RIGHT')
}

// 7. Gesto de um frame só conta do mesmo jeito.
{
  const s = sessao()
  assert.equal(s.frame('cima'), 'TOP')
  assert.equal(s.frame(), null)
}

// 8. Mão perdida por mais de 250ms reseta o gesto.
{
  const s = sessao()
  assert.equal(s.frame('direita'), 'RIGHT')
  s.semMao()
  s.pular(300)
  s.semMao()
  assert.equal(s.estado.apontando, false)
}

// 9. Troca de mão (escala muda muito) não dispara no frame da troca.
{
  const s = sessao()
  assert.equal(s.frame('direita', 'fechado', 0, 0.1), 'RIGHT')
  assert.equal(s.frame('direita', 'fechado', 0, 0.05), null)
  s.frame('fechado', 'fechado', 0, 0.05)
  assert.equal(s.frame('direita', 'fechado', 0, 0.05), 'RIGHT')
}

console.log('gesto: ok')

import assert from 'node:assert/strict'
import { atualizarGesto, criarGesto } from '../src/gesture.js'

const DT = 33
const ASPECTO = 4 / 3

const OUTROS = [
  [12, 10],
  [16, 14],
  [20, 18]
]

// `indicador` = dedo levantado; `outros` = quantos dos outros três ficam esticados.
function mao({ x = 0.5, y = 0.5, escala = 0.1, indicador = false, outros = 0 }) {
  const hand = Array.from({ length: 21 }, () => ({ x, y }))
  hand[0] = { x: x - escala, y }
  hand[9] = { x, y }

  hand[6] = { x: x + escala * 1.2, y }
  hand[8] = indicador
    ? { x: x + escala * 2.2, y }
    : { x: x + escala * 0.4, y }

  OUTROS.forEach(([ponta, articulacao], indice) => {
    hand[articulacao] = { x: x + escala * 1.0, y: y + escala * (0.1 + indice * 0.15) }

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
    frame(posicao, indicador = false, outros = 0) {
      relogio += DT
      return atualizarGesto(
        estado,
        mao({ ...posicao, indicador, outros }),
        relogio,
        ASPECTO
      )
    },
    semMao() {
      relogio += DT
      return atualizarGesto(estado, null, relogio, ASPECTO)
    },
    pular(ms) {
      relogio += ms
    }
  }
}

// 1. Um lado por quadrante, no instante em que o indicador sobe.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
  s.frame({ x: 0.8, y: 0.5 })
  assert.equal(s.frame({ x: 0.8, y: 0.5 }, true), 'LEFT')
  s.frame({ x: 0.5, y: 0.1 })
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, true), 'TOP')
  s.frame({ x: 0.5, y: 0.9 })
  assert.equal(s.frame({ x: 0.5, y: 0.9 }, true), 'BOTTOM')
}

// 2. Centro é área morta.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, true), null)
}

// 3. Indicador + outro dedo (sinal de paz) não conta; com a mão fechada conta.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true, 1), null)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true, 3), null, 'mão aberta também não conta')
}

// 4. Gesto segurado não repete; abaixar e subir conta de novo.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), null, 'indicador segurado não repete')
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
}

// 5. Indicador levantado por um frame só conta do mesmo jeito.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, true), 'TOP')
  assert.equal(s.frame({ x: 0.5, y: 0.1 }), null)
}

// 6. Mão perdida por mais de 250ms reseta o gesto.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
  s.semMao()
  s.pular(300)
  s.semMao()
  assert.equal(s.estado.apontando, false)
}

// 7. Troca de mão (escala muda muito) não dispara no frame da troca.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5, escala: 0.1 })
  assert.equal(s.frame({ x: 0.2, y: 0.5, escala: 0.1 }, true), 'RIGHT')
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, true), null)
  s.frame({ x: 0.8, y: 0.5, escala: 0.05 })
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, true), 'LEFT')
}

console.log('gesto: ok')

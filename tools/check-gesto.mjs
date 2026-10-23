import assert from 'node:assert/strict'
import { atualizarGesto, criarGesto } from '../src/gesture.js'

const DT = 33
const ASPECTO = 4 / 3

const DEDOS = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18]
]

// `dedos` = quantos dedos estão curvados (4 = mão fechada, 0 = aberta).
function mao({ x = 0.5, y = 0.5, escala = 0.1, dedos = 0 }) {
  const hand = Array.from({ length: 21 }, () => ({ x, y }))
  hand[0] = { x: x - escala, y }
  hand[9] = { x, y }

  DEDOS.forEach(([ponta, articulacao], indice) => {
    hand[articulacao] = { x: x + escala * 0.9, y: y - 0.06 + indice * 0.04 }
    hand[ponta] =
      indice < dedos
        ? { x: x + escala * 0.4, y: y - 0.03 + indice * 0.02 }
        : { x: x + escala * 1.6, y: y - 0.07 + indice * 0.045 }
  })

  return hand
}

function sessao() {
  const estado = criarGesto()
  let relogio = 0
  return {
    estado,
    frame(posicao, dedos) {
      relogio += DT
      return atualizarGesto(estado, mao({ ...posicao, dedos }), relogio, ASPECTO)
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

// 1. Um lado por quadrante, no instante em que a mão fecha.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 }, 0)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 4), 'RIGHT')
  s.frame({ x: 0.8, y: 0.5 }, 0)
  assert.equal(s.frame({ x: 0.8, y: 0.5 }, 4), 'LEFT')
  s.frame({ x: 0.5, y: 0.1 }, 0)
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, 4), 'TOP')
  s.frame({ x: 0.5, y: 0.9 }, 0)
  assert.equal(s.frame({ x: 0.5, y: 0.9 }, 4), 'BOTTOM')
}

// 2. Centro é área morta; abrir e fechar no mesmo lugar não repete.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, 4), null)
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, 4), null)
  s.frame({ x: 0.5, y: 0.5 }, 0)
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, 4), null)
}

// 3. Três dedos não bastam; quatro fecham; manter fechada não repete.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 }, 0)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 3), null)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 4), 'RIGHT')
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 3), null, 'histerese segura a mão fechada')
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 4), null, 'fechada segurada não repete')
  s.frame({ x: 0.2, y: 0.5 }, 0)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 4), 'RIGHT')
}

// 4. Fechada de um frame só conta do mesmo jeito.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, 4), 'TOP')
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, 0), null)
}

// 5. Mão perdida por mais de 250ms reseta a fechada.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 4), 'RIGHT')
  s.semMao()
  s.pular(300)
  s.semMao()
  assert.equal(s.estado.fechada, false)
}

// 6. Troca de mão (escala muda muito) não dispara no frame da troca.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5, escala: 0.1 }, 0)
  assert.equal(s.frame({ x: 0.2, y: 0.5, escala: 0.1 }, 4), 'RIGHT')
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, 4), null)
  s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, 0)
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, 4), 'LEFT')
}

console.log('gesto: ok')

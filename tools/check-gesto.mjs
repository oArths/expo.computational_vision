import assert from 'node:assert/strict'
import { atualizarGesto, criarGesto } from '../src/gesture.js'

const DT = 33
const ASPECTO = 4 / 3

// Só os landmarks 0, 4, 8 e 9 importam; os outros ficam empilhados no mesmo ponto.
function mao({ x = 0.5, y = 0.5, pinca = 0.6, escala = 0.1 }) {
  const hand = Array.from({ length: 21 }, () => ({ x, y }))
  hand[0] = { x, y }
  hand[9] = { x: x + escala, y }
  hand[4] = { x: x + pinca * escala, y }
  hand[8] = { x, y }
  return hand
}

function sessao() {
  const estado = criarGesto()
  let relogio = 0
  return {
    estado,
    frame(posicao, pinca) {
      relogio += DT
      return atualizarGesto(estado, mao({ ...posicao, pinca }), relogio, ASPECTO)
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

// 1. Um lado por quadrante, no instante da pinça.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 }, 0.6)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 0.2), 'RIGHT')
  s.frame({ x: 0.8, y: 0.5 }, 0.6)
  assert.equal(s.frame({ x: 0.8, y: 0.5 }, 0.2), 'LEFT')
  s.frame({ x: 0.5, y: 0.1 }, 0.6)
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, 0.2), 'TOP')
  s.frame({ x: 0.5, y: 0.9 }, 0.6)
  assert.equal(s.frame({ x: 0.5, y: 0.9 }, 0.2), 'BOTTOM')
}

// 2. Centro é área morta.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, 0.2), null)
  assert.equal(s.frame({ x: 0.54, y: 0.52 }, 0.2), null)
}

// 3. Pinça segurada não repete, e soltar libera outra.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 0.2), 'RIGHT')
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 0.2), null)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 0.6), null)
  assert.equal(s.frame({ x: 0.8, y: 0.5 }, 0.2), 'LEFT')
}

// 4. Pinça rápida (um frame fechada) conta do mesmo jeito.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, 0.2), 'TOP')
  assert.equal(s.frame({ x: 0.5, y: 0.1 }, 0.6), null)
}

// 5. Mão perdida por mais de 250ms reseta.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, 0.2), 'RIGHT')
  s.semMao()
  s.pular(300)
  s.semMao()
  assert.equal(s.estado.pinching, false)
}

// 6. Troca de mão (escala muda muito) não dispara no frame da troca.
{
  const s = sessao()
  assert.equal(s.frame({ x: 0.2, y: 0.5, escala: 0.1 }, 0.2), 'RIGHT')
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, 0.2), null)
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, 0.6), null)
  assert.equal(s.frame({ x: 0.8, y: 0.5, escala: 0.05 }, 0.2), 'LEFT')
}

console.log('gesto: ok')

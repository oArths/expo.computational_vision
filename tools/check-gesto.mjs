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

// 1. Fecha a pinça e arrasta: dispara no meio do arrasto, uma vez só.
{
  const s = sessao()
  s.frame({ x: 0.5, y: 0.5 })
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, 0.2), null)
  assert.equal(s.estado.pinching, true)
  assert.equal(s.frame({ x: 0.47, y: 0.5 }, 0.2), null, 'abaixo da margem')
  assert.equal(s.frame({ x: 0.45, y: 0.5 }, 0.2), 'RIGHT')
  assert.equal(s.frame({ x: 0.4, y: 0.5 }, 0.2), null, 'já consumiu a pinça')
}

// 2. Pinça formada já em movimento (o caso da pinça rápida): ainda conta.
{
  const s = sessao()
  s.frame({ x: 0.5, y: 0.5 })
  s.frame({ x: 0.5, y: 0.5 })
  assert.equal(s.frame({ x: 0.48, y: 0.5 }, 0.2), null)
  assert.equal(s.frame({ x: 0.42, y: 0.5 }, 0.2), 'RIGHT')
}

// 3. Diagonal: escolhe o eixo dominante em pixels, sem zona morta.
{
  const s = sessao()
  s.frame({ x: 0.5, y: 0.5 })
  s.frame({ x: 0.5, y: 0.5 }, 0.2)
  assert.equal(s.frame({ x: 0.44, y: 0.54 }, 0.2), 'RIGHT')
}

// 4. Soltar sem mover não conta; depois do disparo, o cooldown segura a repetição.
{
  const s = sessao()
  s.frame({ x: 0.5, y: 0.5 })
  s.frame({ x: 0.5, y: 0.5 }, 0.2)
  assert.equal(s.frame({ x: 0.5, y: 0.5 }, 0.6), null)
  s.frame({ x: 0.5, y: 0.5 }, 0.2)
  assert.equal(s.frame({ x: 0.5, y: 0.56 }, 0.2), 'BOTTOM')

  const c = sessao()
  c.frame({ x: 0.5, y: 0.5 })
  c.frame({ x: 0.5, y: 0.5 }, 0.2)
  assert.equal(c.frame({ x: 0.4, y: 0.5 }, 0.2), 'RIGHT')
  c.frame({ x: 0.4, y: 0.5 }, 0.6)
  c.frame({ x: 0.4, y: 0.5 }, 0.2)
  assert.equal(c.frame({ x: 0.3, y: 0.5 }, 0.2), null, 'cooldown de 300ms')
  c.pular(400)
  c.frame({ x: 0.3, y: 0.5 }, 0.6)
  c.frame({ x: 0.3, y: 0.5 }, 0.2)
  assert.equal(c.frame({ x: 0.2, y: 0.5 }, 0.2), 'RIGHT')
}

// 5. Mão perdida por mais de 250ms reseta e não dispara movimento fantasma.
{
  const s = sessao()
  s.frame({ x: 0.5, y: 0.5 })
  s.frame({ x: 0.5, y: 0.5 }, 0.2)
  s.semMao()
  s.pular(300)
  s.semMao()
  assert.equal(s.estado.pinching, false)
  assert.equal(s.frame({ x: 0.9, y: 0.9 }, 0.2), null)
}

console.log('gesto: ok')

import assert from 'node:assert/strict'
import { atualizarGesto, criarGesto } from '../src/gesture.js'

const DT = 33
const ASPECTO = 4 / 3

const PONTAS = [8, 12, 16, 20]

// `juntas` = pontas no mesmo ponto; `soltas` = quantas pontas ficam abertas
// (para testar o gesto incompleto).
function mao({ x = 0.5, y = 0.5, escala = 0.1, juntas = false, soltas = 0 }) {
  const hand = Array.from({ length: 21 }, () => ({ x, y }))
  hand[0] = { x: x - escala, y }
  hand[9] = { x, y }

  PONTAS.forEach((ponta, indice) => {
    const aberta = !juntas || indice < soltas

    hand[ponta] = aberta
      ? { x: x + escala * 1.3, y: y + escala * (-0.7 + indice * 0.47) }
      : { x: x + escala * 0.25, y: y + escala * (indice - 1.5) * 0.01 }

    hand[ponta - 2] = { x: x + escala * 0.9, y: y + escala * (indice - 1.5) * 0.2 }
  })

  return hand
}

function sessao() {
  const estado = criarGesto()
  let relogio = 0
  return {
    estado,
    frame(posicao, juntas = false, soltas = 0) {
      relogio += DT
      return atualizarGesto(
        estado,
        mao({ ...posicao, juntas, soltas }),
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

// 1. Um lado por quadrante, no instante em que as pontas se juntam.
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

// 3. Três pontas juntas não bastam; a quarta fecha o gesto.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true, 1), null)
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
}

// 4. Gestos seguidos: manter junto não repete, abrir libera.
{
  const s = sessao()
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), null, 'junto segurado não repete')
  s.frame({ x: 0.2, y: 0.5 })
  assert.equal(s.frame({ x: 0.2, y: 0.5 }, true), 'RIGHT')
}

// 5. Juntar por um frame só conta do mesmo jeito.
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
  assert.equal(s.estado.juntas, false)
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

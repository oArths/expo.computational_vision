import assert from 'node:assert/strict'
import { atualizarGesto, criarGesto, progressoGesto } from '../src/gesture.js'

const DT = 33
const ASPECTO = 4 / 3

// Só a ponta do indicador (landmark 8) importa para a direção.
function mao(x = 0.5, y = 0.5) {
  const hand = Array.from({ length: 21 }, () => ({ x, y }))

  hand[8] = { x, y }

  return hand
}

function sessao() {
  const estado = criarGesto()
  let relogio = 0

  return {
    estado,
    frame(x, y) {
      relogio += DT
      return atualizarGesto(estado, mao(x, y), relogio, ASPECTO)
    },
    semMao() {
      relogio += DT
      return atualizarGesto(estado, null, relogio, ASPECTO)
    },
    progresso() {
      return progressoGesto(estado, relogio)
    },
    pular(ms) {
      relogio += ms
    }
  }
}

// 1. Fica na zona até completar a permanência e dispara uma vez.
{
  const s = sessao()
  assert.equal(s.frame(0.2, 0.5), null)
  assert.equal(s.frame(0.2, 0.5), null)
  s.pular(300)
  assert.equal(s.frame(0.2, 0.5), 'RIGHT')
  assert.equal(s.frame(0.2, 0.5), null, 'não repete segurando')
}

// 2. Sair da zona rearma: voltar e esperar dispara de novo.
{
  const s = sessao()
  s.frame(0.2, 0.5)
  s.pular(300)
  assert.equal(s.frame(0.2, 0.5), 'RIGHT')
  assert.equal(s.frame(0.5, 0.5), null, 'área morta')
  assert.equal(s.frame(0.2, 0.5), null, 'entrou de novo')
  s.pular(300)
  assert.equal(s.frame(0.2, 0.5), 'RIGHT')
}

// 3. Trocar de lado reinicia a contagem.
{
  const s = sessao()
  s.frame(0.2, 0.5)
  s.pular(200)
  assert.equal(s.frame(0.8, 0.5), null, 'lado novo não herda a espera')
  s.pular(300)
  assert.equal(s.frame(0.8, 0.5), 'LEFT')
}

// 4. Centro é área morta, mesmo parado.
{
  const s = sessao()
  assert.equal(s.frame(0.5, 0.5), null)
  s.pular(500)
  assert.equal(s.frame(0.5, 0.5), null)
}

// 5. Perder a mão por mais de 250ms zera a contagem.
{
  const s = sessao()
  s.frame(0.2, 0.5)
  s.pular(200)
  s.semMao()
  s.pular(300)
  s.semMao()
  assert.equal(s.frame(0.2, 0.5), null, 'recomeçou do zero')
  s.pular(300)
  assert.equal(s.frame(0.2, 0.5), 'RIGHT')
}

// 6. Os quatro lados.
{
  const s = sessao()
  s.frame(0.2, 0.5)
  s.pular(300)
  assert.equal(s.frame(0.2, 0.5), 'RIGHT')

  s.frame(0.8, 0.5)
  s.pular(300)
  assert.equal(s.frame(0.8, 0.5), 'LEFT')

  s.frame(0.5, 0.1)
  s.pular(300)
  assert.equal(s.frame(0.5, 0.1), 'TOP')

  s.frame(0.5, 0.9)
  s.pular(300)
  assert.equal(s.frame(0.5, 0.9), 'BOTTOM')
}

// 7. O progresso acompanha a permanência.
{
  const s = sessao()
  s.frame(0.2, 0.5)
  s.pular(125)
  assert.ok(Math.abs(s.progresso() - 0.5) < 0.08, `progresso ${s.progresso()}`)
  s.pular(200)
  assert.equal(s.progresso(), 1)
}

console.log('gesto: ok')

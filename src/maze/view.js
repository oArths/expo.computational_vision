import gsap from 'gsap'

const CANTOS = ['corner-tl', 'corner-tr', 'corner-bl', 'corner-br']

export function renderizarLabirinto(table, nivel) {
  table.innerHTML = ''

  nivel.grid.forEach((linha, row) => {
    const tr = table.insertRow()

    linha.forEach((tipo, col) => {
      const cell = tr.insertCell()
      cell.className = tipo
      cell.dataset.row = row
      cell.dataset.col = col
    })
  })

  table.rows[nivel.goal.row].cells[nivel.goal.col].classList.add('goal')

  aplicarCantos(table, nivel.grid)
}

// Cantos arredondados só nos lados livres da parede; a moldura conta como parede.
function aplicarCantos(table, grid) {
  const rows = grid.length
  const cols = grid[0].length
  const parede = (row, col) => {
    const tipo = grid[row]?.[col]
    return tipo === 'wall' || tipo === 'boundary'
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = table.rows[row].cells[col]
      if (cell.className !== 'wall') continue

      CANTOS.forEach(canto => cell.classList.remove(canto))

      const acima = !parede(row - 1, col)
      const abaixo = !parede(row + 1, col)
      const esquerda = !parede(row, col - 1)
      const direita = !parede(row, col + 1)

      if (acima && esquerda) cell.classList.add('corner-tl')
      if (acima && direita) cell.classList.add('corner-tr')
      if (abaixo && esquerda) cell.classList.add('corner-bl')
      if (abaixo && direita) cell.classList.add('corner-br')
    }
  }
}

export function centroCelula(table, container, row, col) {
  const cellRect = table.rows[row].cells[col].getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  return {
    x: cellRect.left - containerRect.left + cellRect.width / 2,
    y: cellRect.top - containerRect.top + cellRect.height / 2
  }
}

export function posicionarToken(token, point) {
  // Sem isso, uma animação do nível anterior continua e reposiciona o token.
  gsap.killTweensOf(token)
  gsap.set(token, { left: point.x, top: point.y })
}

export function animarToken(token, point) {
  gsap.to(token, { left: point.x, top: point.y, duration: 0.15, ease: 'power2.out' })
}

export function criarParticulas(trail, point) {
  const quantidade = 4 + Math.floor(Math.random() * 5)

  for (let index = 0; index < quantidade; index++) {
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    particle.setAttribute('cx', point.x)
    particle.setAttribute('cy', point.y)
    particle.setAttribute('r', 1.5 + Math.random() * 3)
    particle.setAttribute('fill', 'var(--color-accent-red, #e53e3e)')
    trail.appendChild(particle)

    const angle = Math.random() * Math.PI * 2
    const distance = 8 + Math.random() * 18

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.35 + Math.random() * 0.25,
      ease: 'power2.out',
      onComplete: () => particle.remove()
    })
  }
}

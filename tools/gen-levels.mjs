import { writeFile } from 'node:fs/promises'
import { buildLevel, LEVELS } from '../src/maze/model.js'

const sizes = LEVELS.map((level, index) => ({
  ...level,
  seed: index + 1,
  rows: level.size,
  cols: level.size
}))

// O movimento desliza até a parede, então um labirinto conectado pode não ter
// solução. Procura a primeira semente que resolva nos dois sentidos.
function slideReachable(level) {
  const livre = (row, col) => {
    const cell = level.grid[row]?.[col]
    return cell && cell !== 'wall' && cell !== 'boundary'
  }

  const queue = [[level.start.row, level.start.col]]
  const seen = new Set([`${level.start.row},${level.start.col}`])

  while (queue.length > 0) {
    const [row, col] = queue.shift()

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      let nr = row
      let nc = col

      while (livre(nr + dr, nc + dc)) {
        nr += dr
        nc += dc
        if (nr === level.goal.row && nc === level.goal.col) return true
      }

      const key = `${nr},${nc}`
      if ((nr !== row || nc !== col) && !seen.has(key)) {
        seen.add(key)
        queue.push([nr, nc])
      }
    }
  }

  return false
}

const levels = sizes.map((level, index) => {
  let seed = index + 1
  let built = buildLevel({ ...level, seed })

  for (let tentativa = 0; tentativa < 100 && !slideReachable(built); tentativa++) {
    seed += 1
    built = buildLevel({ ...level, seed })
  }

  if (!slideReachable(built)) {
    throw new Error(`Nível ${index + 1} sem solução deslizando`)
  }

  return {
    seed,
    difficulty: level.difficulty,
    rows: built.rows,
    cols: built.cols,
    start: built.start,
    goal: built.goal,
    grid: built.grid
  }
})

function reachable(level) {
  const queue = [level.start]
  const seen = new Set([`${level.start.row},${level.start.col}`])

  while (queue.length > 0) {
    const { row, col } = queue.shift()
    if (row === level.goal.row && col === level.goal.col) return true

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const key = `${row + dr},${col + dc}`
      const cell = level.grid[row + dr]?.[col + dc]
      if (cell && cell !== 'wall' && cell !== 'boundary' && !seen.has(key)) {
        seen.add(key)
        queue.push({ row: row + dr, col: col + dc })
      }
    }
  }

  return false
}

for (const level of levels) {
  if (!reachable(level)) throw new Error(`Nível ${level.seed} sem caminho até o objetivo`)
}

await writeFile('src/levels.json', JSON.stringify(levels))
console.log(`Gerados ${levels.length} níveis, todos com caminho até o objetivo.`)

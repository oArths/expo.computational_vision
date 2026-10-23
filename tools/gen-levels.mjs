import { writeFile } from 'node:fs/promises'
import { buildLevel, LEVELS } from '../src/maze/model.js'

const sizes = LEVELS.map((level, index) => ({
  ...level,
  seed: index + 1,
  rows: level.size,
  cols: level.size
}))

const levels = sizes.map(level => {
  const built = buildLevel(level)

  return {
    seed: level.seed,
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

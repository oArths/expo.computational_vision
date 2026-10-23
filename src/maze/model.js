// Geração do labirinto em grid puro (sem DOM), compartilhada pelo jogo e pelo
// script que pré-gera os níveis.

const DIRECTIONS = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 }
]

export const LEVELS = [
  { size: 6, difficulty: 'facil' },
  { size: 8, difficulty: 'facil' },
  { size: 10, difficulty: 'facil' },
  { size: 12, difficulty: 'facil' },
  { size: 14, difficulty: 'facil' },
  { size: 16, difficulty: 'medio' },
  { size: 18, difficulty: 'medio' },
  { size: 20, difficulty: 'medio' },
  { size: 22, difficulty: 'medio' },
  { size: 24, difficulty: 'medio' },
  { size: 26, difficulty: 'dificil' },
  { size: 28, difficulty: 'dificil' },
  { size: 30, difficulty: 'dificil' },
  { size: 32, difficulty: 'dificil' },
  { size: 34, difficulty: 'dificil' }
]

export function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildLevel({ rows, cols, seed }) {
  const rng = mulberry32(seed)
  const grid = createGrid(rows, cols)
  const start = { row: 1, col: 1 }
  const goal = { row: rows - 2, col: cols - 2 }

  generateMaze(grid, rows, cols, start.row, start.col, rng)
  ensureGoalAccess(grid, goal)
  orientBorderWalls(grid, rows, cols)
  removeDoubleWalls(grid, rows, cols)
  removeDoublePaths(grid, rows, cols, start, goal)
  removeDeadEnds(grid, rows, cols, start, goal, rng)

  return { rows, cols, grid, start, goal, seed }
}

function createGrid(rows, cols) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) =>
      row === 0 || row === rows - 1 || col === 0 || col === cols - 1 ? 'boundary' : 'wall'
    )
  )
}

function isWall(grid, row, col) {
  return grid[row][col] === 'wall'
}

function isWalkable(grid, row, col) {
  return grid[row][col] !== 'wall' && grid[row][col] !== 'boundary'
}

function open(grid, row, col) {
  grid[row][col] = 'path'
}

function isValidCell(grid, rows, cols, row, col) {
  return (
    row > 0 &&
    row < rows - 1 &&
    col > 0 &&
    col < cols - 1 &&
    grid[row][col] === 'wall'
  )
}

function generateMaze(grid, rows, cols, row, col, rng) {
  open(grid, row, col)

  const shuffled = [...DIRECTIONS]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1))
    ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
  }

  for (const direction of shuffled) {
    const newRow = row + direction.row * 2
    const newCol = col + direction.col * 2

    if (!isValidCell(grid, rows, cols, newRow, newCol)) continue

    open(grid, row + direction.row, col + direction.col)
    generateMaze(grid, rows, cols, newRow, newCol, rng)
  }
}

function ensureGoalAccess(grid, goal) {
  open(grid, goal.row, goal.col - 1)
  open(grid, goal.row - 1, goal.col)
}

// Garante que paredes ligadas à moldura comecem perpendicularmente a ela.
function orientBorderWalls(grid, rows, cols) {
  function openIfInvalid(row, col, nextRow, nextCol) {
    if (isWall(grid, row, col) && !isWall(grid, nextRow, nextCol)) open(grid, row, col)
  }

  function separateBorderEntries(entries, inwardOffset) {
    for (let index = 0; index < entries.length - 1; index++) {
      const current = entries[index]
      const next = entries[index + 1]

      if (!isWall(grid, current.row, current.col) || !isWall(grid, next.row, next.col)) continue

      const currentContinues = isWall(
        grid,
        current.row + inwardOffset.row,
        current.col + inwardOffset.col
      )
      const nextContinues = isWall(grid, next.row + inwardOffset.row, next.col + inwardOffset.col)

      if (currentContinues && !nextContinues) {
        open(grid, next.row, next.col)
      } else {
        open(grid, current.row, current.col)
      }
    }
  }

  const topEntries = []
  const bottomEntries = []
  const leftEntries = []
  const rightEntries = []

  for (let col = 1; col < cols - 1; col++) {
    openIfInvalid(1, col, 2, col)
    openIfInvalid(rows - 2, col, rows - 3, col)
    topEntries.push({ row: 1, col })
    bottomEntries.push({ row: rows - 2, col })
  }

  for (let row = 1; row < rows - 1; row++) {
    openIfInvalid(row, 1, row, 2)
    openIfInvalid(row, cols - 2, row, cols - 3)
    leftEntries.push({ row, col: 1 })
    rightEntries.push({ row, col: cols - 2 })
  }

  separateBorderEntries(topEntries, { row: 1, col: 0 })
  separateBorderEntries(bottomEntries, { row: -1, col: 0 })
  separateBorderEntries(leftEntries, { row: 0, col: 1 })
  separateBorderEntries(rightEntries, { row: 0, col: -1 })
}

// Remove camadas paralelas sobrepostas, mantendo uma única espessura.
function removeDoubleWalls(grid, rows, cols) {
  let changed = true

  while (changed) {
    changed = false

    for (let row = 0; row < rows - 1 && !changed; row++) {
      let start = -1

      for (let col = 0; col <= cols; col++) {
        const overlap = col < cols && isWall(grid, row, col) && isWall(grid, row + 1, col)

        if (overlap && start === -1) start = col

        if ((!overlap || col === cols) && start !== -1) {
          if (col - start >= 2) {
            for (let openCol = start; openCol < col; openCol++) {
              open(grid, row + 1, openCol)
            }
            changed = true
            break
          }
          start = -1
        }
      }
    }

    if (changed) continue

    for (let col = 0; col < cols - 1 && !changed; col++) {
      let start = -1

      for (let row = 0; row <= rows; row++) {
        const overlap = row < rows && isWall(grid, row, col) && isWall(grid, row, col + 1)

        if (overlap && start === -1) start = row

        if ((!overlap || row === rows) && start !== -1) {
          if (row - start >= 2) {
            for (let openRow = start; openRow < row; openRow++) {
              open(grid, openRow, col + 1)
            }
            changed = true
            break
          }
          start = -1
        }
      }
    }
  }
}

// Evita áreas caminháveis com largura dupla sem bloquear o caminho principal.
function removeDoublePaths(grid, rows, cols, startPosition, goalPosition) {
  function canReachGoal() {
    const queue = [{ ...startPosition }]
    const visited = new Set([`${startPosition.row},${startPosition.col}`])

    while (queue.length > 0) {
      const current = queue.shift()
      if (current.row === goalPosition.row && current.col === goalPosition.col) return true

      for (const direction of DIRECTIONS) {
        const row = current.row + direction.row
        const col = current.col + direction.col

        if (
          row >= 0 &&
          row < rows &&
          col >= 0 &&
          col < cols &&
          !visited.has(`${row},${col}`) &&
          isWalkable(grid, row, col)
        ) {
          visited.add(`${row},${col}`)
          queue.push({ row, col })
        }
      }
    }

    return false
  }

  let changed = true

  while (changed) {
    changed = false

    for (let row = 0; row < rows - 1 && !changed; row++) {
      for (let col = 0; col < cols - 1 && !changed; col++) {
        const isDoublePath =
          isWalkable(grid, row, col) &&
          isWalkable(grid, row, col + 1) &&
          isWalkable(grid, row + 1, col) &&
          isWalkable(grid, row + 1, col + 1)

        if (!isDoublePath) continue

        const options = [
          [row, col],
          [row, col + 1],
          [row + 1, col],
          [row + 1, col + 1]
        ]

        for (const [closeRow, closeCol] of options) {
          const isStart = closeRow === startPosition.row && closeCol === startPosition.col
          const isGoal = closeRow === goalPosition.row && closeCol === goalPosition.col
          if (isStart || isGoal) continue

          grid[closeRow][closeCol] = 'wall'

          if (canReachGoal()) {
            changed = true
            break
          }

          grid[closeRow][closeCol] = 'path'
        }
      }
    }
  }
}

function removeDeadEnds(grid, rows, cols, startPosition, goalPosition, rng) {
  const getNeighbors = (row, col) =>
    DIRECTIONS.map(direction => ({ row: row + direction.row, col: col + direction.col })).filter(
      position => isWalkable(grid, position.row, position.col)
    )

  let changed = true

  while (changed) {
    changed = false

    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const isStart = row === startPosition.row && col === startPosition.col
        const isGoal = row === goalPosition.row && col === goalPosition.col
        if (isStart || isGoal) continue
        if (!isWalkable(grid, row, col)) continue
        if (getNeighbors(row, col).length > 1) continue

        const possibleWalls = DIRECTIONS.map(direction => ({
          row: row + direction.row,
          col: col + direction.col
        })).filter(
          position =>
            position.row > 0 &&
            position.row < rows - 1 &&
            position.col > 0 &&
            position.col < cols - 1 &&
            !isWalkable(grid, position.row, position.col)
        )

        if (possibleWalls.length === 0) continue

        const wall = possibleWalls[Math.floor(rng() * possibleWalls.length)]
        open(grid, wall.row, wall.col)
        changed = true
      }
    }
  }
}

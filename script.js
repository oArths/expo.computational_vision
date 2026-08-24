document.addEventListener('DOMContentLoaded', function () {
    const maze = document.getElementById('maze');
    const rows = 30;
    const cols = 30;
    const startPosition = { row: 1, col: 1 };
    const goalPosition = { row: rows - 2, col: cols - 2 };
    let playerPosition = { row: 0, col: 0 };
    let moves = 0;
    let time = 0;
    let timerInterval;

    // Celebration state
    let celebrationActive = false;

    // Directions possibles pour mover (cima, baixo, esquerda, direita)
    const directions = [
        { row: -1, col: 0 },  // Cima
        { row: 1, col: 0 },   // Baixo
        { row: 0, col: -1 },  // Esquerda
        { row: 0, col: 1 }    // Direita
    ];

    // Função para criar o labirinto
    function createMaze() {
        maze.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            let row = maze.insertRow();
            for (let c = 0; c < cols; c++) {
                let cell = row.insertCell();
                cell.classList.add(r === 0 || r === rows - 1 || c === 0 || c === cols - 1 ? 'boundary' : 'wall');
                cell.dataset.row = r;
                cell.dataset.col = c;
            }
        }
    }

    // Algoritmo backtracking para criar o labirinto com caminho garantido
    function generateMaze(row, col) {
        maze.rows[row].cells[col].classList.remove('wall');
        maze.rows[row].cells[col].classList.add('path');
        const shuffledDirections = directions.sort(() => Math.random() - 0.5);

        for (let direction of shuffledDirections) {
            const newRow = row + direction.row * 2;
            const newCol = col + direction.col * 2;

            if (isValidCell(newRow, newCol)) {
                maze.rows[row + direction.row].cells[col + direction.col].classList.remove('wall');
                maze.rows[row + direction.row].cells[col + direction.col].classList.add('path');
                generateMaze(newRow, newCol);
            }
        }
    }

    // Verificar se a célula está dentro dos limites
    function isValidCell(row, col) {
        return row > 0 && row < rows - 1 && col > 0 && col < cols - 1 && maze.rows[row].cells[col].classList.contains('wall');
    }

    // Função para garantir que a célula de chegada (objetivo) seja acessível
    function ensureGoalAccess() {
        // Remover as paredes próximas ao objetivo
        if (cols > 1) {
            maze.rows[goalPosition.row].cells[goalPosition.col - 1].classList.remove('wall'); // Célula à esquerda da chegada
            maze.rows[goalPosition.row].cells[goalPosition.col - 1].classList.add('path');
        }
        if (rows > 1) {
            maze.rows[goalPosition.row - 1].cells[goalPosition.col].classList.remove('wall'); // Célula acima da chegada
            maze.rows[goalPosition.row - 1].cells[goalPosition.col].classList.add('path');
        }
    }

    // Garante que paredes ligadas à moldura comecem perpendicularmente a ela.
    function orientBorderWalls() {
        function openIfInvalid(row, col, nextRow, nextCol) {
            const cell = maze.rows[row].cells[col];
            const nextCell = maze.rows[nextRow].cells[nextCol];

            if (cell.classList.contains('wall') && !nextCell.classList.contains('wall')) {
                cell.classList.remove('wall');
                cell.classList.add('path');
            }
        }

        for (let col = 1; col < cols - 1; col++) {
            // Parede superior: o segundo bloco deve estar abaixo dela.
            openIfInvalid(1, col, 2, col);
            // Parede inferior: o segundo bloco deve estar acima dela.
            openIfInvalid(rows - 2, col, rows - 3, col);
        }

        for (let row = 1; row < rows - 1; row++) {
            // Parede esquerda: o segundo bloco deve estar à direita dela.
            openIfInvalid(row, 1, row, 2);
            // Parede direita: o segundo bloco deve estar à esquerda dela.
            openIfInvalid(row, cols - 2, row, cols - 3);
        }
    }

    // Função para aplicar estilo nas paredes (cantos arredondados e sem divisórias)
    function styleWalls() {
        const isWallOrBoundary = (row, col) => {
            const cell = maze.rows[row].cells[col];
            return cell.classList.contains('wall') || cell.classList.contains('boundary');
        };

        // Limpar classes de canto anteriores (importante ao regenerar)
        const allCells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                allCells.push(maze.rows[r].cells[c]);
            }
        }
        allCells.forEach(cell => {
            cell.classList.remove('corner-tl', 'corner-tr', 'corner-bl', 'corner-br');
        });

        // Aplicar cantos arredondados baseados na conectividade
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = maze.rows[r].cells[c];
                if (!cell.classList.contains('wall')) continue;

                // Vizinhos: cima, baixo, esquerda, direita
                const hasWallAbove = r > 0 && isWallOrBoundary(r - 1, c);
                const hasWallBelow = r < rows - 1 && isWallOrBoundary(r + 1, c);
                const hasWallLeft = c > 0 && isWallOrBoundary(r, c - 1);
                const hasWallRight = c < cols - 1 && isWallOrBoundary(r, c + 1);

                // A moldura conta como parede conectada, mantendo retos os cantos externos.
                const aboveOpen = r > 0 && !hasWallAbove;
                const belowOpen = r < rows - 1 && !hasWallBelow;
                const leftOpen = c > 0 && !hasWallLeft;
                const rightOpen = c < cols - 1 && !hasWallRight;

                // Aplicar cantos: um canto é arredondado se os dois lados adjacentes estão "livres"
                if (aboveOpen && leftOpen) cell.classList.add('corner-tl');
                if (aboveOpen && rightOpen) cell.classList.add('corner-tr');
                if (belowOpen && leftOpen) cell.classList.add('corner-bl');
                if (belowOpen && rightOpen) cell.classList.add('corner-br');
            }
        }
    }

    // Evita que duas linhas paralelas formem uma parede dupla.
    function removeDoubleWalls() {
        const isWall = (row, col) => maze.rows[row].cells[col].classList.contains('wall');

        for (let row = 0; row < rows - 1; row++) {
            for (let col = 0; col < cols - 1; col++) {
                const isDoubleWall =
                    isWall(row, col) &&
                    isWall(row, col + 1) &&
                    isWall(row + 1, col) &&
                    isWall(row + 1, col + 1);

                if (!isDoubleWall) continue;

                const options = [
                    [row, col],
                    [row, col + 1],
                    [row + 1, col],
                    [row + 1, col + 1]
                ];
                const [openRow, openCol] = options[Math.floor(Math.random() * options.length)];
                const cell = maze.rows[openRow].cells[openCol];

                cell.classList.remove('wall');
                cell.classList.add('path');
            }
        }
    }

    // Função para mover o jogador com feedback visual
    function movePlayer(newRow, newCol) {
        const newCell = maze.rows[newRow]?.cells[newCol];
        if (newCell && !newCell.classList.contains('wall') && !newCell.classList.contains('boundary')) {
            // Remove player da célula anterior
            maze.rows[playerPosition.row].cells[playerPosition.col].classList.remove('player');

            // Adiciona classe temporária para animation
            newCell.classList.add('player', 'move-in');

            // Remove a classe de animação após o próximo frame
            setTimeout(() => {
                newCell.classList.remove('move-in');
            }, 300);

            playerPosition = { row: newRow, col: newCol };
            moves++;
            document.getElementById('moves').textContent = moves;

            // Verificar se atingiu o objetivo
            if (newCell.classList.contains('goal')) {
                clearInterval(timerInterval);
                showCelebration();
            }
        }
    }

    // Show celebration screen
    function showCelebration() {
        if (celebrationActive) return;
        celebrationActive = true;

        // Create particles
        createParticles();

        const celebration = document.getElementById('celebration') || createCelebration();
        celebration.classList.add('active');
        document.body.appendChild(celebration);

        // Remove after animation
        setTimeout(() => {
            celebrationActive = false;
            celebration.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(celebration);
                resetGame();
            }, 500);
        }, 3000);
    }

    // Create celebration particles
    function createParticles() {
        const colors = ['#68d391', '#f6e05e', '#4facfe', '#ed8936', '#e53e3e'];
        const particleCount = 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: var(--radius-full);
                left: ${playerPosition.col * 30 + 15}px;
                top: ${playerPosition.row * 30 + 15}px;
                z-index: 9999;
                pointer-events: none;
                animation: particle-explode 1s ease-out forwards;
            `;
            document.body.appendChild(particle);

            setTimeout(() => particle.remove(), 1000);
        }
    }

    // Create celebration HTML
    function createCelebration() {
        const celebration = document.createElement('div');
        celebration.id = 'celebration';
        celebration.innerHTML = `
            <h2>NICE!</h2>
            <p>You completed the hole in ${moves} moves and ${time}s!</p>
            <div class="restart-container">
                <button id="celebration-restart">Play Again</button>
            </div>
        `;

        // Add restart listener
        celebration.querySelector('#celebration-restart').addEventListener('click', () => {
            document.body.removeChild(celebration);
            celebrationActive = false;
            resetGame();
        });

        return celebration;
    }

    // Controle pelo teclado
    document.addEventListener('keydown', function (event) {
        const key = event.key;

        // Impede que as setas também rolem a página.
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            case 'ArrowUp':
                movePlayer(playerPosition.row - 1, playerPosition.col);
                break;
            case 'ArrowDown':
                movePlayer(playerPosition.row + 1, playerPosition.col);
                break;
            case 'ArrowLeft':
                movePlayer(playerPosition.row, playerPosition.col - 1);
                break;
            case 'ArrowRight':
                movePlayer(playerPosition.row, playerPosition.col + 1);
                break;
        }
    });

    // Controle por toque
    document.getElementById('up').addEventListener('click', () => movePlayer(playerPosition.row - 1, playerPosition.col));
    document.getElementById('down').addEventListener('click', () => movePlayer(playerPosition.row + 1, playerPosition.col));
    document.getElementById('left').addEventListener('click', () => movePlayer(playerPosition.row, playerPosition.col - 1));
    document.getElementById('right').addEventListener('click', () => movePlayer(playerPosition.row, playerPosition.col + 1));

    // Função para iniciar o cronômetro
    function startTimer() {
        time = 0;
        document.getElementById('time').textContent = time;
        timerInterval = setInterval(() => {
            time++;
            document.getElementById('time').textContent = time;
        }, 1000);
    }

    // Função para reiniciar o jogo
    function resetGame() {
        clearInterval(timerInterval); // Parar o cronômetro anterior
        moves = 0;
        document.getElementById('moves').textContent = moves;
        celebrationActive = false;

        // Remover tela de celebração se estiver visível
        const existingCelebration = document.getElementById('celebration');
        if (existingCelebration) {
            existingCelebration.remove();
        }

        // Criar um novo labirinto
        createMaze();
        generateMaze(startPosition.row, startPosition.col);

        // Remover as paredes ao redor da célula de chegada
        ensureGoalAccess();

        // Remover paredes duplas antes de calcular os cantos.
        removeDoubleWalls();

        // Fazer as paredes conectadas à moldura começarem para dentro.
        orientBorderWalls();

        // Aplicar estilo nas paredes (cantos arredondados e sem divisórias)
        styleWalls();

        // Definir o jogador na posição inicial e o objetivo
        maze.rows[startPosition.row].cells[startPosition.col].classList.add('player');
        maze.rows[goalPosition.row].cells[goalPosition.col].classList.remove('wall');
        maze.rows[goalPosition.row].cells[goalPosition.col].classList.add('path', 'goal');

        playerPosition = { ...startPosition };
        startTimer();
    }

    // Iniciar o jogo
    resetGame();

    // Ação para o botão de reinício
    document.getElementById('restart').addEventListener('click', resetGame);
});

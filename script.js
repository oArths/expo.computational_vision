document.addEventListener('DOMContentLoaded', function () {

    const maze = document.getElementById('maze');
    const mazeContainer = document.getElementById('maze-container');
    const playerTrail = document.getElementById('player-trail');
    const playerToken = document.getElementById('player-token');
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
        const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);

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
    function removeDeadEnds() {
        const isWalkable = (row, col) => {
            if (row < 0 || row >= rows || col < 0 || col >= cols) {
                return false;
            }

            const cell = maze.rows[row].cells[col];

            return (
                !cell.classList.contains('wall') &&
                !cell.classList.contains('boundary')
            );
        };

        const getNeighbors = (row, col) => {
            return directions
                .map(direction => ({
                    row: row + direction.row,
                    col: col + direction.col
                }))
                .filter(position => isWalkable(position.row, position.col));
        };

        let changed = true;

        while (changed) {
            changed = false;

            for (let row = 1; row < rows - 1; row++) {
                for (let col = 1; col < cols - 1; col++) {

                    const isStart =
                        row === startPosition.row &&
                        col === startPosition.col;

                    const isGoal =
                        row === goalPosition.row &&
                        col === goalPosition.col;

                    if (isStart || isGoal) {
                        continue;
                    }

                    if (!isWalkable(row, col)) {
                        continue;
                    }

                    const neighbors = getNeighbors(row, col);

                    // Célula com apenas uma saída = beco
                    if (neighbors.length > 1) {
                        continue;
                    }

                    // Procura paredes vizinhas que possam ser abertas
                    const possibleWalls = directions
                        .map(direction => ({
                            row: row + direction.row,
                            col: col + direction.col
                        }))
                        .filter(position => {
                            if (
                                position.row <= 0 ||
                                position.row >= rows - 1 ||
                                position.col <= 0 ||
                                position.col >= cols - 1
                            ) {
                                return false;
                            }

                            return !isWalkable(
                                position.row,
                                position.col
                            );
                        });

                    if (possibleWalls.length === 0) {
                        continue;
                    }

                    // Escolhe uma parede aleatória para abrir
                    const wall =
                        possibleWalls[
                        Math.floor(Math.random() * possibleWalls.length)
                        ];

                    const cell = maze.rows[wall.row].cells[wall.col];

                    cell.classList.remove('wall');
                    cell.classList.add('path');

                    changed = true;
                }
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
        function isWall(row, col) {
            return maze.rows[row].cells[col].classList.contains('wall');
        }

        function openCell(row, col) {
            const cell = maze.rows[row].cells[col];
            cell.classList.remove('wall');
            cell.classList.add('path');
        }

        function openIfInvalid(row, col, nextRow, nextCol) {
            const cell = maze.rows[row].cells[col];
            const nextCell = maze.rows[nextRow].cells[nextCol];

            if (cell.classList.contains('wall') && !nextCell.classList.contains('wall')) openCell(row, col);
        }

        function separateBorderEntries(entries, inwardOffset) {
            for (let index = 0; index < entries.length - 1; index++) {
                const current = entries[index];
                const next = entries[index + 1];
                if (!isWall(current.row, current.col) || !isWall(next.row, next.col)) continue;

                const currentContinues = isWall(current.row + inwardOffset.row, current.col + inwardOffset.col);
                const nextContinues = isWall(next.row + inwardOffset.row, next.col + inwardOffset.col);

                // Mantém a entrada que realmente segue para dentro do campo.
                if (currentContinues && !nextContinues) {
                    openCell(next.row, next.col);
                } else {
                    openCell(current.row, current.col);
                }
            }
        }

        const topEntries = [];
        const bottomEntries = [];
        const leftEntries = [];
        const rightEntries = [];

        for (let col = 1; col < cols - 1; col++) {
            // Parede superior: o segundo bloco deve estar abaixo dela.
            openIfInvalid(1, col, 2, col);
            // Parede inferior: o segundo bloco deve estar acima dela.
            openIfInvalid(rows - 2, col, rows - 3, col);

            topEntries.push({ row: 1, col });
            bottomEntries.push({ row: rows - 2, col });
        }

        for (let row = 1; row < rows - 1; row++) {
            // Parede esquerda: o segundo bloco deve estar à direita dela.
            openIfInvalid(row, 1, row, 2);
            // Parede direita: o segundo bloco deve estar à esquerda dela.
            openIfInvalid(row, cols - 2, row, cols - 3);

            leftEntries.push({ row, col: 1 });
            rightEntries.push({ row, col: cols - 2 });
        }

        // Impede entradas vizinhas formando uma linha paralela à moldura.
        separateBorderEntries(topEntries, { row: 1, col: 0 });
        separateBorderEntries(bottomEntries, { row: -1, col: 0 });
        separateBorderEntries(leftEntries, { row: 0, col: 1 });
        separateBorderEntries(rightEntries, { row: 0, col: -1 });
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

    // Remove camadas paralelas sobrepostas, mantendo uma única espessura.
    function removeDoubleWalls() {
        const isWall = (row, col) => maze.rows[row].cells[col].classList.contains('wall');
        const openCell = (row, col) => {
            const cell = maze.rows[row].cells[col];
            cell.classList.remove('wall');
            cell.classList.add('path');
        };

        let changed = true;
        while (changed) {
            changed = false;

            // Procura duas linhas horizontais com um trecho de parede sobreposto.
            for (let row = 0; row < rows - 1 && !changed; row++) {
                let start = -1;

                for (let col = 0; col <= cols; col++) {
                    const overlap =
                        col < cols &&
                        isWall(row, col) &&
                        isWall(row + 1, col);

                    if (overlap && start === -1) start = col;

                    if ((!overlap || col === cols) && start !== -1) {
                        if (col - start >= 2) {
                            // Mantém a linha superior e abre a camada inferior inteira.
                            for (let openCol = start; openCol < col; openCol++) {
                                openCell(row + 1, openCol);
                            }
                            changed = true;
                            break;
                        }
                        start = -1;
                    }
                }
            }

            if (changed) continue;

            // Procura duas colunas verticais com um trecho de parede sobreposto.
            for (let col = 0; col < cols - 1 && !changed; col++) {
                let start = -1;

                for (let row = 0; row <= rows; row++) {
                    const overlap =
                        row < rows &&
                        isWall(row, col) &&
                        isWall(row, col + 1);

                    if (overlap && start === -1) start = row;

                    if ((!overlap || row === rows) && start !== -1) {
                        if (row - start >= 2) {
                            // Mantém a coluna esquerda e abre a camada direita inteira.
                            for (let openRow = start; openRow < row; openRow++) {
                                openCell(openRow, col + 1);
                            }
                            changed = true;
                            break;
                        }
                        start = -1;
                    }
                }
            }
        }
    }

    // Evita áreas caminháveis com largura dupla sem bloquear o caminho principal.
    function removeDoublePaths() {
        const isWalkable = (row, col) => {
            const cell = maze.rows[row].cells[col];
            return !cell.classList.contains('wall') && !cell.classList.contains('boundary');
        };

        function canReachGoal() {
            const queue = [{ ...startPosition }];
            const visited = new Set([`${startPosition.row},${startPosition.col}`]);

            while (queue.length > 0) {
                const current = queue.shift();
                if (current.row === goalPosition.row && current.col === goalPosition.col) return true;

                for (const direction of directions) {
                    const row = current.row + direction.row;
                    const col = current.col + direction.col;
                    const key = `${row},${col}`;

                    if (
                        row >= 0 && row < rows &&
                        col >= 0 && col < cols &&
                        !visited.has(key) &&
                        isWalkable(row, col)
                    ) {
                        visited.add(key);
                        queue.push({ row, col });
                    }
                }
            }

            return false;
        }

        let changed = true;
        while (changed) {
            changed = false;

            for (let row = 0; row < rows - 1 && !changed; row++) {
                for (let col = 0; col < cols - 1 && !changed; col++) {
                    const isDoublePath =
                        isWalkable(row, col) &&
                        isWalkable(row, col + 1) &&
                        isWalkable(row + 1, col) &&
                        isWalkable(row + 1, col + 1);

                    if (!isDoublePath) continue;

                    const options = [
                        [row, col],
                        [row, col + 1],
                        [row + 1, col],
                        [row + 1, col + 1]
                    ];

                    for (const [closeRow, closeCol] of options) {
                        const isStart = closeRow === startPosition.row && closeCol === startPosition.col;
                        const isGoal = closeRow === goalPosition.row && closeCol === goalPosition.col;
                        if (isStart || isGoal) continue;

                        const cell = maze.rows[closeRow].cells[closeCol];
                        cell.classList.remove('path');
                        cell.classList.add('wall');

                        if (canReachGoal()) {
                            changed = true;
                            break;
                        }

                        cell.classList.remove('wall');
                        cell.classList.add('path');
                    }
                }
            }
        }
    }

    function updatePlayerToken() {
        const cell = maze.rows[playerPosition.row].cells[playerPosition.col];
        const cellRect = cell.getBoundingClientRect();
        const containerRect = mazeContainer.getBoundingClientRect();

        return {
            x: cellRect.left - containerRect.left + cellRect.width / 2,
            y: cellRect.top - containerRect.top + cellRect.height / 2
        };
    }

    function createMoveParticles(point) {
        const particleCount = 4 + Math.floor(Math.random() * 5);

        for (let index = 0; index < particleCount; index++) {
            const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            particle.setAttribute('cx', point.x);
            particle.setAttribute('cy', point.y);
            particle.setAttribute('r', 1.5 + Math.random() * 3);
            particle.setAttribute('fill', 'var(--color-accent-red, #e53e3e)');
            playerTrail.appendChild(particle);

            const angle = Math.random() * Math.PI * 2;
            const distance = 8 + Math.random() * 18;
            gsap.to(particle, {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: 0,
                duration: 0.35 + Math.random() * 0.25,
                ease: 'power2.out',
                onComplete: () => particle.remove()
            });
        }
    }

    function setInitialPlayerTokenPosition() {
        const point = updatePlayerToken();

        playerTrail.replaceChildren();
        gsap.set(playerToken, { left: point.x, top: point.y });
    }

    // Função para mover o jogador com feedback visual
    function movePlayer(direction) {
        let newRow = playerPosition.row;
        let newCol = playerPosition.col;

        let rowStep = 0;
        let colStep = 0;

        switch (direction) {
            case 'TOP':
                rowStep = -1;
                break;

            case 'BOTTOM':
                rowStep = 1;
                break;

            case 'LEFT':
                colStep = -1;
                break;

            case 'RIGHT':
                colStep = 1;
                break;

            default:
                return;
        }

        while (true) {
            newRow += rowStep;
            newCol += colStep;

            const newCell = maze.rows[newRow]?.cells[newCol];

            if (
                !newCell ||
                newCell.classList.contains('wall') ||
                newCell.classList.contains('boundary')
            ) {
                break;
            }

            createMoveParticles(updatePlayerToken());

            playerPosition = {
                row: newRow,
                col: newCol
            };

            const newPosition = updatePlayerToken();

            moves++;
            document.getElementById('moves').textContent = moves;

            gsap.to(playerToken, {
                left: newPosition.x,
                top: newPosition.y,
                duration: 0.15,
                ease: 'power2.out'
            });

            if (newCell.classList.contains('goal')) {
                clearInterval(timerInterval);
                showCelebration();
                break;
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

        // Fazer as paredes conectadas à moldura começarem para dentro.
        orientBorderWalls();

        // Remover paredes duplas antes de calcular os cantos.
        removeDoubleWalls();

        // Remover corredores com largura dupla sem perder a solução.
        removeDoublePaths();

        removeDeadEnds();

        // Aplicar estilo nas paredes (cantos arredondados e sem divisórias)
        styleWalls();

        // Definir o jogador na posição inicial e o objetivo
        maze.rows[goalPosition.row].cells[goalPosition.col].classList.remove('wall');
        maze.rows[goalPosition.row].cells[goalPosition.col].classList.add('path', 'goal');

        playerPosition = { ...startPosition };
        setInitialPlayerTokenPosition();
        startTimer();
    }

    // Iniciar o jogo
    resetGame();

    // Ação para o botão de reinício
    document.getElementById('restart').addEventListener('click', resetGame);
    setInterval(async () => {
        const resposta = await fetch("http://localhost:5000/movimento")
        const dados = await resposta.json()


        switch (dados.movimento) {
            case 'TOP':
                movePlayer('TOP');
                break;

            case 'BOTTOM':
                movePlayer('BOTTOM');
                break;

            case 'LEFT':
                movePlayer('LEFT');
                break;

            case 'RIGHT':
                movePlayer('RIGHT');
                break;
        }

        console.log(dados)
    }, 50)
});

/**
 * PixelPoint.tv Snake Game Hybrid Reinforcement Learning Bot (Hierarchical Q-Learning)
 * -------------------------------------------------------------------------------------------------
 * Como usar:
 * 1. Acede a: https://pixelpoint.tv/game.php?slug=Snake
 * 2. Abre a Consola do Programador (F12 -> "Console").
 * 3. Copia todo o código abaixo, cola na consola e pressiona Enter.
 * 4. A cobra NUNCA vai andar à toa contra as paredes, pois ela usa BFS para caminhar.
 *    O agente de Machine Learning vai aprender a tomar a decisão tática:
 *    "Devo ir direto à comida, seguir a cauda de forma larga, ou forçar a quebra do loop?"
 * 5. A memória é persistida no localStorage e a cobra aprende em apenas 20 a 50 partidas.
 * 6. Para parar: stopSnakeML()
 * 7. Para recomeçar o cérebro do zero: resetSnakeML()
 */

(function() {
    // PREVENÇÃO DE CONGELAMENTO: Limpar qualquer loop anterior se o código for colado novamente
    if (window.snakeMLIntervalId) {
        clearInterval(window.snakeMLIntervalId);
        console.log("[ML Híbrido] Limpando loop do Bot ML anterior para evitar congelamento...");
    }
    if (window.snakeNormalIntervalId) {
        clearInterval(window.snakeNormalIntervalId);
        console.log("[ML Híbrido] Limpando loop do Bot Normal anterior para evitar congelamento...");
    }

    // 1. Encontrar o iframe do jogo
    const iframe = document.querySelector('iframe[src*="games/Snake"]');
    if (!iframe) {
        console.error("[-] Iframe do jogo Snake não encontrado. Certifica-te de que estás na página correta.");
        return;
    }

    const iframeWindow = iframe.contentWindow;
    const iframeDoc = iframe.contentDocument || iframeWindow.document;

    // Grelha
    const WIDTH = 20;
    const HEIGHT = 20;

    // --- PARÂMETROS DE MACHINE LEARNING ---
    const ALPHA = 0.2;     // Learning Rate
    const GAMMA = 0.85;    // Discount Factor
    let epsilon = 0.4;     // Começamos com 40% de exploração de decisões táticas
    const EPSILON_DECAY = 0.98;
    const MIN_EPSILON = 0.01;

    // Carregar memória
    let qTable = {};
    const savedQTable = localStorage.getItem('snake_hierarchical_q_table');
    if (savedQTable) {
        try {
            qTable = JSON.parse(savedQTable);
            console.log(`[ML] Cérebro carregado (${Object.keys(qTable).length} decisões táticas aprendidas).`);
        } catch (e) {
            qTable = {};
        }
    }

    let episodeCount = parseInt(localStorage.getItem('snake_ml_episodes') || '0', 10);

    // Ações táticas de alto nível (a cobra nunca se move à toa, ela escolhe estratégias)
    const ACTIONS = [
        'GO_TO_FOOD',          // Ir para a comida pelo caminho BFS seguro
        'FOLLOW_TAIL_WIDE',    // Seguir a cauda em círculos largos
        'FOLLOW_TAIL_SHORT',   // Seguir a cauda pelo caminho mais curto
        'FORCE_FOOD'           // Forçar ir à comida mesmo que a cauda pareça inacessível (quebra de loop)
    ];

    // Estado do Bot
    let state = {
        restarting: false,
        lastHeadX: null,
        lastHeadY: null,
        lastStateStr: null,
        lastAction: null,
        lastScore: 0,
        tailChasingCount: 0
    };

    // BFS auxiliar
    function getBFSPath(start, goal, snakeBody, width, height, isEatingGoal) {
        const queue = [[start]];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);

        const obstacles = new Set();
        const bodyLength = isEatingGoal ? snakeBody.length : snakeBody.length - 1;
        for (let i = 0; i < bodyLength; i++) {
            obstacles.add(`${snakeBody[i].x},${snakeBody[i].y}`);
        }

        while (queue.length > 0) {
            const path = queue.shift();
            const curr = path[path.length - 1];

            if (curr.x === goal.x && curr.y === goal.y) {
                return path;
            }

            const neighbors = [
                { x: curr.x, y: curr.y - 1 },
                { x: curr.x, y: curr.y + 1 },
                { x: curr.x - 1, y: curr.y },
                { x: curr.x + 1, y: curr.y }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                    const key = `${n.x},${n.y}`;
                    if (!visited.has(key) && !obstacles.has(key)) {
                        visited.add(key);
                        queue.push([...path, n]);
                    }
                }
            }
        }
        return null;
    }

    function getVirtualBodyAfterPath(path, currentBody) {
        let virtualBody = [...currentBody];
        for (let i = 1; i < path.length; i++) {
            virtualBody.unshift(path[i]);
            if (i === path.length - 1) {
                // Cresce
            } else {
                virtualBody.pop();
            }
        }
        return virtualBody;
    }

    // Gerar estado tático compacto (apenas 144 estados possíveis para aprender instantaneamente!)
    function getTacticalState(body, head, foodState, tail, pathToFood) {
        // 1. Categoria de tamanho da cobra (0 a 3)
        let sizeCat = '0';
        if (body.length >= 150) sizeCat = '3';
        else if (body.length >= 100) sizeCat = '2';
        else if (body.length >= 50) sizeCat = '1';

        // 2. O caminho direto para a comida é seguro?
        let isFoodSafe = '0';
        if (pathToFood && pathToFood.length > 1) {
            const virtualBody = getVirtualBodyAfterPath(pathToFood, body);
            const virtualHead = virtualBody[0];
            const virtualTail = virtualBody[virtualBody.length - 1];
            const pathToTailAfterEating = getBFSPath(virtualHead, virtualTail, virtualBody, WIDTH, HEIGHT, false);
            if (pathToTailAfterEating) {
                isFoodSafe = '1';
            }
        }

        // 3. Há caminho até à cauda?
        const pathToTailShort = getBFSPath(head, tail, body, WIDTH, HEIGHT, false);
        const hasTailPath = pathToTailShort ? '1' : '0';

        // 4. Há quanto tempo estamos em loop / a seguir a cauda?
        let loopCat = '0'; // 0 passos
        if (state.tailChasingCount > 12) loopCat = '2'; // Loop longo
        else if (state.tailChasingCount > 0) loopCat = '1'; // Loop curto

        // 5. Distância até à comida
        let distCat = '2'; // Longe ou sem caminho
        if (pathToFood) {
            if (pathToFood.length < 5) distCat = '0'; // Perto
            else if (pathToFood.length <= 15) distCat = '1'; // Média
        }

        return `${sizeCat}_${isFoodSafe}_${hasTailPath}_${loopCat}_${distCat}`;
    }

    function getQValues(stateStr) {
        if (!qTable[stateStr]) {
            qTable[stateStr] = [0, 0, 0, 0]; // Ações: GO_TO_FOOD, FOLLOW_TAIL_WIDE, FOLLOW_TAIL_SHORT, FORCE_FOOD
        }
        return qTable[stateStr];
    }

    function getMaxQ(stateStr) {
        const qVals = getQValues(stateStr);
        return Math.max(...qVals);
    }

    function chooseTacticalAction(stateStr) {
        if (Math.random() < epsilon) {
            return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        } else {
            const qVals = getQValues(stateStr);
            let bestIdx = 0;
            let maxVal = -Infinity;
            for (let i = 0; i < qVals.length; i++) {
                if (qVals[i] > maxVal) {
                    maxVal = qVals[i];
                    bestIdx = i;
                }
            }
            return ACTIONS[bestIdx];
        }
    }

    function pressKey(direction) {
        const keyMap = {
            'UP': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
            'DOWN': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
            'LEFT': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
            'RIGHT': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 }
        };

        const target = keyMap[direction];
        if (!target) return;

        const downEvent = new KeyboardEvent('keydown', {
            key: target.key,
            code: target.code,
            keyCode: target.keyCode,
            which: target.keyCode,
            bubbles: true,
            cancelable: true
        });
        iframeDoc.dispatchEvent(downEvent);

        const upEvent = new KeyboardEvent('keyup', {
            key: target.key,
            code: target.code,
            keyCode: target.keyCode,
            which: target.keyCode,
            bubbles: true,
            cancelable: true
        });
        iframeDoc.dispatchEvent(upEvent);
    }

    function trainStep() {
        try {
            // Se o browser ou iframe estiverem em segundo plano (background), não executa
            // para evitar o roubo constante de foco e prevenir que teclas fiquem presas no SO/PC
            if (document.hidden || (iframeDoc && iframeDoc.hidden)) {
                return;
            }

            const snakeState = iframeWindow.eval('snake');
            const foodState = iframeWindow.eval('food');
            const gameState = iframeWindow.eval('gameState');

            if (!snakeState || !foodState) return;

            // --- TRATAMENTO DE MORTE ---
            if (gameState && gameState.gameOver) {
                if (state.lastStateStr && state.lastAction) {
                    const lastActionIdx = ACTIONS.indexOf(state.lastAction);
                    const qVals = getQValues(state.lastStateStr);
                    qVals[lastActionIdx] += ALPHA * (-200 - qVals[lastActionIdx]); // Grande penalidade por morrer
                    localStorage.setItem('snake_hierarchical_q_table', JSON.stringify(qTable));
                }

                if (!state.restarting) {
                    state.restarting = true;
                    episodeCount++;
                    localStorage.setItem('snake_ml_episodes', episodeCount.toString());
                    epsilon = Math.max(MIN_EPSILON, 0.4 * Math.pow(EPSILON_DECAY, episodeCount));

                    console.log(`[ML Híbrido] Jogo #${episodeCount} Terminado. Score: ${state.lastScore} | Cérebro: ${Object.keys(qTable).length} estados | Epsilon: ${(epsilon * 100).toFixed(1)}%`);

                    setTimeout(() => {
                        const playAgainBtn = iframeDoc.getElementById('play-again-btn') || iframeDoc.querySelector('#play-again-btn');
                        if (playAgainBtn) playAgainBtn.click();
                        else {
                            const canvas = iframeDoc.getElementById('gameCanvas');
                            if (canvas) canvas.click();
                            iframeDoc.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
                            iframeDoc.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
                        }

                        state.lastHeadX = null;
                        state.lastHeadY = null;
                        state.lastStateStr = null;
                        state.lastAction = null;
                        state.lastScore = 0;
                        state.tailChasingCount = 0;
                        state.restarting = false;
                    }, 1500);
                }
                return;
            }

            const body = snakeState.body;
            const head = body[0];

            if (head.x === state.lastHeadX && head.y === state.lastHeadY) {
                return;
            }

            const tail = body[body.length - 1];
            const pathToFood = getBFSPath(head, foodState, body, WIDTH, HEIGHT, true);
            const pathToTailShort = getBFSPath(head, tail, body, WIDTH, HEIGHT, false);

            let nextStepTailWide = null;
            const neighbors = [
                { x: head.x, y: head.y - 1 },
                { x: head.x, y: head.y + 1 },
                { x: head.x - 1, y: head.y },
                { x: head.x + 1, y: head.y }
            ];
            const obstacles = new Set(body.map(s => `${s.x},${s.y}`));
            let validTailMoves = [];
            for (const n of neighbors) {
                if (n.x >= 0 && n.x < WIDTH && n.y >= 0 && n.y < HEIGHT) {
                    const isObstacle = obstacles.has(`${n.x},${n.y}`) && !(n.x === tail.x && n.y === tail.y);
                    if (!isObstacle) {
                        const pathFromNeighborToTail = getBFSPath(n, tail, body, WIDTH, HEIGHT, false);
                        if (pathFromNeighborToTail) {
                            const dist = Math.abs(n.x - tail.x) + Math.abs(n.y - tail.y);
                            validTailMoves.push({ step: n, dist: dist });
                        }
                    }
                }
            }
            if (validTailMoves.length > 0) {
                validTailMoves.sort((a, b) => b.dist - a.dist);
                nextStepTailWide = validTailMoves[0].step;
            }

            // --- APRENDIZAGEM ---
            const score = gameState.score || 0;
            const currentTacticalStateStr = getTacticalState(body, head, foodState, tail, pathToFood);

            if (state.lastStateStr && state.lastAction) {
                let reward = -0.2;

                if (score > state.lastScore) {
                    reward = 100;
                    if (state.tailChasingCount > 5) {
                        reward = 150; // Bónus por quebrar loop
                    }
                } else if (state.lastAction === 'FOLLOW_TAIL_WIDE' || state.lastAction === 'FOLLOW_TAIL_SHORT') {
                    reward = -0.5; // Penalização por passividade
                }

                const lastActionIdx = ACTIONS.indexOf(state.lastAction);
                const qVals = getQValues(state.lastStateStr);
                const maxNextQ = getMaxQ(currentTacticalStateStr);

                qVals[lastActionIdx] += ALPHA * (reward + GAMMA * maxNextQ - qVals[lastActionIdx]);
            }

            // --- TOMADA DE DECISÃO ---
            const chosenAction = chooseTacticalAction(currentTacticalStateStr);
            let nextStep = null;
            let actualAction = chosenAction;

            if (chosenAction === 'GO_TO_FOOD') {
                if (pathToFood && pathToFood.length > 1) {
                    nextStep = pathToFood[1];
                } else {
                    actualAction = 'FOLLOW_TAIL_WIDE';
                    nextStep = nextStepTailWide || (pathToTailShort && pathToTailShort[1]);
                }
            } else if (chosenAction === 'FOLLOW_TAIL_WIDE') {
                if (nextStepTailWide) {
                    nextStep = nextStepTailWide;
                } else {
                    actualAction = 'FOLLOW_TAIL_SHORT';
                    nextStep = pathToTailShort && pathToTailShort[1];
                }
            } else if (chosenAction === 'FOLLOW_TAIL_SHORT') {
                if (pathToTailShort && pathToTailShort.length > 1) {
                    nextStep = pathToTailShort[1];
                } else {
                    actualAction = 'FOLLOW_TAIL_WIDE';
                    nextStep = nextStepTailWide;
                }
            } else if (chosenAction === 'FORCE_FOOD') {
                if (pathToFood && pathToFood.length > 1) {
                    nextStep = pathToFood[1];
                } else {
                    actualAction = 'FOLLOW_TAIL_WIDE';
                    nextStep = nextStepTailWide || (pathToTailShort && pathToTailShort[1]);
                }
            }

            // Evitar morte em último recurso
            if (!nextStep) {
                let safeMoves = [];
                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < WIDTH && n.y >= 0 && n.y < HEIGHT) {
                        if (!obstacles.has(`${n.x},${n.y}`)) {
                            safeMoves.push(n);
                        }
                    }
                }
                if (safeMoves.length > 0) {
                    nextStep = safeMoves[0];
                }
            }

            if (nextStep) {
                const dx = nextStep.x - head.x;
                const dy = nextStep.y - head.y;

                if (dx === 1) pressKey('RIGHT');
                else if (dx === -1) pressKey('LEFT');
                else if (dy === 1) pressKey('DOWN');
                else if (dy === -1) pressKey('UP');
            }

            if (actualAction.startsWith('FOLLOW_TAIL')) {
                state.tailChasingCount++;
            } else {
                state.tailChasingCount = 0;
            }

            state.lastHeadX = head.x;
            state.lastHeadY = head.y;
            state.lastStateStr = currentTacticalStateStr;
            state.lastAction = actualAction;
            state.lastScore = score;

        } catch (e) {
            // Ignorar erros temporários
        }
    }

    // Guardar id do loop globalmente para poder limpar no próximo paste
    window.snakeMLIntervalId = setInterval(trainStep, 20);

    window.stopSnakeML = function() {
        if (window.snakeMLIntervalId) {
            clearInterval(window.snakeMLIntervalId);
            window.snakeMLIntervalId = null;
        }
        console.log("[ML Híbrido] Treino Parado.");
    };

    window.resetSnakeML = function() {
        localStorage.removeItem('snake_hierarchical_q_table');
        localStorage.removeItem('snake_ml_episodes');
        qTable = {};
        episodeCount = 0;
        epsilon = 0.4;
        console.log("[ML Híbrido] Cérebro resetado com sucesso!");
    };

    console.log("[ML Híbrido] Bot iniciado com sucesso!");
    console.log("[ML Híbrido] Para parar: stopSnakeML() | Para resetar: resetSnakeML()");
})();

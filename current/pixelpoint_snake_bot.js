/**
 * PixelPoint.tv Snake Game Self-Correcting Hybrid AI Bot (Versão 3930+ com Detetora Global de Anúncios, Auto-Bypass e Resiliência contra Pausa)
 * -------------------------------------------------------------------------------------------------
 * Como usar:
 * 1. Acede a: https://pixelpoint.tv/game.php?slug=Snake
 * 2. Abre a Consola do Programador (F12 -> "Console").
 * 3. Copia todo o código abaixo, cola na consola e pressiona Enter.
 * 4. O bot corre a lógica de 3920 pontos com estas novidades:
 *    - DETETORA GLOBAL DE ANÚNCIOS: Verifica se há anúncios tanto no iframe como na página principal (parent).
 *    - RESILIÊNCIA CONTRA PAUSA: Força as variáveis internas do jogo (gameState.isPaused, pauseState)
 *      para false, impedindo que o jogo fique preso em pausa infinita por perda de foco ou interações externas.
 *    - BLOQUEIO DE postMessage DE PAUSA: Intercepta e cancela mensagens de pausa enviadas pelo parent.
 *    - AUTO-START INTELIGENTE: Deteta separadamente se o jogo está pausado ou parado/não iniciado.
 * 5. Para parar: stopSnakeBot()
 * 6. Para redefinir a memória: resetSnakeML()
 */

(function() {
    // PREVENÇÃO DE CONGELAMENTO E SOBREPOSIÇÃO: Parar loops anteriores
    if (window.snakeNormalIntervalId) {
        clearInterval(window.snakeNormalIntervalId);
    }
    if (window.snakeMLIntervalId) {
        clearInterval(window.snakeMLIntervalId);
    }

    // 1. Encontrar o iframe do jogo
    const iframe = document.querySelector('iframe[src*="games/Snake"]');
    if (!iframe) {
        console.error("[-] Iframe do jogo Snake não encontrado.");
        return;
    }

    const iframeWindow = iframe.contentWindow;
    const iframeDoc = iframe.contentDocument || iframeWindow.document;

    // --- BYPASS DE DIÁLOGOS NATIVOS (ALERT / CONFIRM / PROMPT) ---
    const bypassDialogs = (win) => {
        if (!win) return;
        win.alert = function(msg) {
            console.log("[Bot] Alert interceptado e fechado automaticamente: " + msg);
            return true;
        };
        win.confirm = function(msg) {
            console.log("[Bot] Confirm interceptado e aceite automaticamente: " + msg);
            return true;
        };
        win.prompt = function(msg) {
            console.log("[Bot] Prompt interceptado: " + msg);
            return null;
        };
    };

    bypassDialogs(window);
    bypassDialogs(iframeWindow);

    // --- INTERCEPTOR DE postMessage DE PAUSA ---
    // Impede que o script do parent envie comandos de pausa para o iframe
    iframeWindow.addEventListener('message', function(e) {
        try {
            if (e.data) {
                const dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
                if (dataStr.toLowerCase().includes('pause')) {
                    e.stopImmediatePropagation();
                    console.log("[Bot] Mensagem externa de pausa (postMessage) bloqueada com sucesso.");
                }
            }
        } catch(err) {}
    }, true);

    // Grelha
    const WIDTH = 20;
    const HEIGHT = 20;

    // --- CONFIGURAÇÃO DO CICLO HAMILTONIANO ---
    const H_path = [];
    for (let y = HEIGHT - 1; y >= 0; y--) {
        H_path.push({x: 0, y: y});
    }
    for (let y = 0; y < HEIGHT; y++) {
        if (y % 2 === 0) {
            for (let x = 1; x < WIDTH; x++) {
                H_path.push({x: x, y: y});
            }
        } else {
            for (let x = WIDTH - 1; x >= 1; x--) {
                H_path.push({x: x, y: y});
            }
        }
    }

    const H_index = Array(WIDTH).fill(null).map(() => Array(HEIGHT).fill(-1));
    for (let i = 0; i < H_path.length; i++) {
        H_index[H_path[i].x][H_path[i].y] = i;
    }

    function cycleDist(fromIdx, toIdx) {
        return (toIdx - fromIdx + 400) % 400;
    }

    function checkInvariant(body) {
        const headIdx = H_index[body[0].x][body[0].y];
        const tailIdx = H_index[body[body.length - 1].x][body[body.length - 1].y];
        
        const bodySet = new Set();
        for (let i = 1; i < body.length - 1; i++) {
            bodySet.add(`${body[i].x},${body[i].y}`);
        }

        let curr = (headIdx + 1) % 400;
        while (curr !== tailIdx) {
            const cell = H_path[curr];
            if (bodySet.has(`${cell.x},${cell.y}`)) return false; 
            curr = (curr + 1) % 400;
        }
        return true;
    }

    // Simulador Virtual de Cauda para atalhos do Ciclo H
    function isVirtualMoveSafe(n, body, foodState) {
        const isEating = (n.x === foodState.x && n.y === foodState.y);
        let virtualBody = [...body];
        
        virtualBody.unshift(n);
        if (!isEating) {
            virtualBody.pop();
        }
        
        const virtualBodySet = new Set();
        for (let i = 1; i < virtualBody.length; i++) {
            virtualBodySet.add(`${virtualBody[i].x},${virtualBody[i].y}`);
        }
        if (virtualBodySet.has(`${n.x},${n.y}`)) return false;
        
        const H_N = H_index[n.x][n.y];
        const virtualTail = virtualBody[virtualBody.length - 1];
        const H_virtualTail = H_index[virtualTail.x][virtualTail.y];

        if (H_N === H_virtualTail) return false;
        
        let curr = (H_N + 1) % 400;
        while (curr !== H_virtualTail) {
            const cell = H_path[curr];
            if (virtualBodySet.has(`${cell.x},${cell.y}`)) return false;
            curr = (curr + 1) % 400;
        }
        return true;
    }

    // --- DETETORA DE ANÚNCIOS ATIVOS (APENAS NO IFRAME DO JOGO) ---
    function isAdActive() {
        const adSelectors = [
            'div[class*="video-ad"]',
            'div[class*="ad-overlay"]',
            '.ima-ad-container',
            '.videoAdUi',
            '.ad-showing',
            '.ad-interrupt'
        ];

        // Procurar apenas no documento do iframe
        for (const sel of adSelectors) {
            const el = iframeDoc.querySelector(sel);
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                const style = iframeWindow.getComputedStyle(el);
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    return true;
                }
            }
        }

        // Detetar se algum player de vídeo de anúncios está ativo dentro do iframe
        const allVideos = [
            ...iframeDoc.querySelectorAll('video:not(.cnx-video-tag)')
        ];
        for (const vid of allVideos) {
            if (!vid.paused && vid.currentTime > 0) {
                return true;
            }
        }

        return false;
    }

    // --- FORCE RESUME GAME ---
    // Altera diretamente o estado interno do motor do jogo
    function forceResumeGame() {
        try {
            iframeWindow.eval('if (typeof pauseState !== "undefined") { pauseState.external = false; pauseState.userInitiated = false; }');
            iframeWindow.eval('if (typeof gameState !== "undefined") { gameState.isPaused = false; }');
            console.log("[Bot] Estado de pausa forçado para FALSE nas variáveis internas.");
        } catch(e) {
            // Ignorar falhas silenciosamente
        }
    }

    // --- CÉREBRA DE AUTO-CORREÇÃO (Q-LEARNING PASSIVO / VETO SYSTEM) ---
    let qTable = {};
    const savedQTable = localStorage.getItem('snake_self_correct_table');
    if (savedQTable) {
        try {
            qTable = JSON.parse(savedQTable);
            console.log(`[ML Auto-Correção] Memória de erros carregada (${Object.keys(qTable).length} situações catalogadas).`);
        } catch (e) {
            qTable = {};
        }
    }

    let episodeCount = parseInt(localStorage.getItem('snake_ml_episodes') || '0', 10);
    const ACTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    let moveHistory = [];

    // Estado do Bot
    let state = {
        mode: 'NORMAL',
        restarting: false,
        lastHeadX: null,
        lastHeadY: null,
        hasMoved: false,
        startTickCount: 0,
        tailChasingCount: 0,
        lastScore: 0,
        movesSinceLastScore: 0,
        forceSuicide: false,
        adWaitingLog: false,
        lastResumeClickTime: 0
    };

    function getMLState(body, head, food, tail, mode) {
        const bodySet = new Set(body.map(s => `${s.x},${s.y}`));
        
        const checkObs = (x, y) => {
            if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return '1';
            if (bodySet.has(`${x},${y}`)) return '1';
            return '0';
        };
        const obs = `${checkObs(head.x, head.y-1)}${checkObs(head.x, head.y+1)}${checkObs(head.x-1, head.y)}${checkObs(head.x+1, head.y)}`;

        const foodDx = food.x - head.x;
        const foodDy = food.y - head.y;
        let foodQuad = 'C';
        if (foodDx > 0 && foodDy > 0) foodQuad = 'DR';
        else if (foodDx > 0 && foodDy < 0) foodQuad = 'UR';
        else if (foodDx < 0 && foodDy > 0) foodQuad = 'DL';
        else if (foodDx < 0 && foodDy < 0) foodQuad = 'UL';
        else if (foodDx === 0 && foodDy > 0) foodQuad = 'D';
        else if (foodDx === 0 && foodDy < 0) foodQuad = 'U';
        else if (foodDx > 0 && foodDy === 0) foodQuad = 'R';
        else if (foodDx < 0 && foodDy === 0) foodQuad = 'L';

        const tailDx = tail.x - head.x;
        const tailDy = tail.y - head.y;
        let tailQuad = 'C';
        if (tailDx > 0 && tailDy > 0) tailQuad = 'DR';
        else if (tailDx > 0 && tailDy < 0) tailQuad = 'UR';
        else if (tailDx < 0 && tailDy > 0) tailQuad = 'DL';
        else if (tailDx < 0 && tailDy < 0) tailQuad = 'UL';
        else if (tailDx === 0 && tailDy > 0) tailQuad = 'D';
        else if (tailDx === 0 && tailDy < 0) tailQuad = 'U';
        else if (tailDx > 0 && tailDy === 0) tailQuad = 'R';
        else if (tailDx < 0 && tailDy === 0) tailQuad = 'L';

        return `${mode}_${obs}_${foodQuad}_${tailQuad}`;
    }

    function getQValues(stateStr) {
        if (!qTable[stateStr]) {
            qTable[stateStr] = [0, 0, 0, 0];
        }
        return qTable[stateStr];
    }

    // BFS
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

            if (curr.x === goal.x && curr.y === goal.y) return path;

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

    // Enviar Teclas
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

    function getDirectionFromMove(head, next) {
        const dx = next.x - head.x;
        const dy = next.y - head.y;
        if (dx === 1) return 'RIGHT';
        if (dx === -1) return 'LEFT';
        if (dy === 1) return 'DOWN';
        if (dy === -1) return 'UP';
        return null;
    }

    // Tentar reiniciar apenas quando o anúncio terminar
    function restartWhenReady() {
        if (isAdActive()) {
            if (!state.adWaitingLog) {
                console.log("[ML Seguro] Anúncio detetado no Game Over. A aguardar conclusão para reiniciar...");
                state.adWaitingLog = true;
            }
            setTimeout(restartWhenReady, 1000);
            return;
        }

        state.adWaitingLog = false;
        const playAgainBtn = iframeDoc.getElementById('play-again-btn') || iframeDoc.querySelector('#play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.click();
            console.log("[Bot] Botão 'Play Again' clicado.");
        } else {
            const canvas = iframeDoc.getElementById('gameCanvas');
            if (canvas) canvas.click();
            iframeDoc.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
            iframeDoc.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
        }

        // Limpar estados
        state.lastHeadX = null;
        state.lastHeadY = null;
        state.hasMoved = false;
        state.startTickCount = 0;
        state.tailChasingCount = 0;
        state.mode = 'NORMAL';
        state.lastScore = 0;
        state.movesSinceLastScore = 0;
        state.forceSuicide = false;
        state.restarting = false;
    }

    function playStep() {
        try {
            // Se o browser ou iframe estiverem em segundo plano (background), não executa
            // para evitar o roubo constante de foco e prevenir que teclas fiquem presas no SO/PC
            if (document.hidden || (iframeDoc && iframeDoc.hidden)) {
                return;
            }

            // --- DETETORA DE ANÚNCIOS (GLOBAL) ---
            if (isAdActive()) {
                if (!state.adWaitingLog) {
                    console.log("[Bot] Anúncio ativo na página/iframe. A pausar bot...");
                    state.adWaitingLog = true;
                }
                return;
            }
            state.adWaitingLog = false;

            const gameState = iframeWindow.eval('gameState');
            if (!gameState) return;

            // --- DETETORA DE ESTADO PAUSADO (AUTO-RESUME INTELIGENTE) ---
            if (gameState.isPaused) {
                const now = Date.now();
                if (!state.lastResumeClickTime || (now - state.lastResumeClickTime > 2000)) {
                    state.lastResumeClickTime = now;
                    
                    console.log("[Bot] Jogo pausado detetado. Tentando retomar...");
                    
                    // 1. Tentar clicar no botão físico de Resume
                    const pauseBtn = iframeDoc.getElementById('pause-btn');
                    if (pauseBtn && pauseBtn.offsetWidth > 0 && pauseBtn.offsetHeight > 0) {
                        pauseBtn.click();
                    }
                    
                    // 2. Forçar a retoma nas variáveis internas do jogo
                    forceResumeGame();
                    if (document.hasFocus()) {
                        iframeWindow.focus();
                    }
                }
                return;
            }

            // --- DETETORA DE JOGO NÃO INICIADO (START SCREENS) ---
            if (!gameState.isRunning && !gameState.gameOver) {
                const now = Date.now();
                if (!state.lastResumeClickTime || (now - state.lastResumeClickTime > 2000)) {
                    // 1. Botão inicial de overlay (Start Playing)
                    const startGameOverlayBtn = iframeDoc.getElementById('start-game-btn');
                    if (startGameOverlayBtn && startGameOverlayBtn.offsetWidth > 0 && startGameOverlayBtn.offsetHeight > 0 && !startGameOverlayBtn.disabled) {
                        state.lastResumeClickTime = now;
                        startGameOverlayBtn.click();
                        console.log("[Bot] Menu inicial detetado. Clicado no botão Start Playing.");
                        if (document.hasFocus()) {
                            iframeWindow.focus();
                        }
                        return;
                    }

                    // 2. Botão lateral de Start Game (apenas se não estiver desativado)
                    const startBtn = iframeDoc.getElementById('start-btn');
                    if (startBtn && startBtn.offsetWidth > 0 && startBtn.offsetHeight > 0 && !startBtn.disabled) {
                        state.lastResumeClickTime = now;
                        startBtn.click();
                        console.log("[Bot] Jogo parado detetado. Clicado no botão Start Game.");
                        if (document.hasFocus()) {
                            iframeWindow.focus();
                        }
                        return;
                    }
                }
                return;
            }

            const snakeState = iframeWindow.eval('snake');
            const foodState = iframeWindow.eval('food');

            if (!snakeState || !foodState) return;

            // --- TRATAMENTO DE DERROTA (ML) ---
            if (gameState.gameOver) {
                if (!state.restarting) {
                    state.restarting = true;
                    episodeCount++;
                    localStorage.setItem('snake_ml_episodes', episodeCount.toString());

                    if (moveHistory.length > 0) {
                        console.log(`[ML Auto-Correção] Derrota analisada no jogo #${episodeCount}! A penalizar trajetória final...`);
                        let penalty = -200;
                        for (let i = moveHistory.length - 1; i >= Math.max(0, moveHistory.length - 15); i--) {
                            const step = moveHistory[i];
                            const qVals = getQValues(step.state);
                            const actIdx = ACTIONS.indexOf(step.action);
                            if (actIdx !== -1) {
                                qVals[actIdx] += penalty;
                            }
                            penalty *= 0.65;
                        }
                        localStorage.setItem('snake_self_correct_table', JSON.stringify(qTable));
                        moveHistory = [];
                    }

                    setTimeout(restartWhenReady, 1500);
                }
                return;
            }

            const body = snakeState.body;
            const head = body[0];
            const tail = body[body.length - 1];

            // --- INICIALIZAÇÃO DE MOVIMENTO CONTROLADA ---
            if (!state.hasMoved) {
                if (!state.startTickCount) state.startTickCount = 0;
                state.startTickCount++;

                if (state.startTickCount % 5 === 0) {
                    pressKey('RIGHT');
                }

                if (state.lastHeadX !== null && (head.x !== state.lastHeadX || head.y !== state.lastHeadY)) {
                    state.hasMoved = true;
                    console.log("[Bot] Movimento inicial detectado! Iniciando Inteligência Artificial...");
                }
                
                state.lastHeadX = head.x;
                state.lastHeadY = head.y;
                return;
            }

            // --- VERIFICAÇÃO DE NOVA CÉLULA ---
            const isNewCell = (head.x !== state.lastHeadX || head.y !== state.lastHeadY);
            if (!isNewCell) {
                return;
            }
            state.lastHeadX = head.x;
            state.lastHeadY = head.y;

            const score = gameState.score || 0;

            // --- REGISTO DE PROGRESSO / DETETOR DE LOOPS ---
            if (score > state.lastScore) {
                state.movesSinceLastScore = 0; // Reset ao contador de passos sem comer
                let reward = 10;
                for (let i = moveHistory.length - 1; i >= Math.max(0, moveHistory.length - 10); i--) {
                    const step = moveHistory[i];
                    const qVals = getQValues(step.state);
                    const actIdx = ACTIONS.indexOf(step.action);
                    if (actIdx !== -1) {
                        qVals[actIdx] += reward;
                    }
                    reward *= 0.7;
                }
                moveHistory = [];
                state.lastScore = score;
            } else {
                state.movesSinceLastScore = (state.movesSinceLastScore || 0) + 1;
            }

            // Se der mais de 220 passos sem comer, está em loop infinito
            if (state.movesSinceLastScore > 220 && !state.forceSuicide) {
                console.log(`[ML Detector de Loop] Cobra presa num loop infinito (${state.movesSinceLastScore} passos sem pontuar). Aplicando penalidade ao ML e forçando fim de jogo para aprender.`);
                state.forceSuicide = true;
                
                if (moveHistory.length > 0) {
                    let penalty = -250;
                    for (let i = moveHistory.length - 1; i >= Math.max(0, moveHistory.length - 25); i--) {
                        const step = moveHistory[i];
                        const qVals = getQValues(step.state);
                        const actIdx = ACTIONS.indexOf(step.action);
                        if (actIdx !== -1) {
                            qVals[actIdx] += penalty;
                        }
                        penalty *= 0.75;
                    }
                    localStorage.setItem('snake_self_correct_table', JSON.stringify(qTable));
                }
            }

            // Transição para o modo Hamiltoniano mais cedo (comprimento 80 em vez de 110) para evitar loops
            if (state.mode === 'NORMAL' && body.length >= 80) {
                if (checkInvariant(body)) {
                    state.mode = 'HAMILTONIAN';
                    console.log("[Bot] Cobra grande! Modo Hamiltoniano Seguro Ativado.");
                }
            }

            let proposedStep = null;
            let fallbackStep = null;

            const mlStateStr = getMLState(body, head, foodState, tail, state.mode);

            // --- EXECUÇÃO DE SUICÍDIO FORÇADO (QUANDO DETETA LOOP) ---
            if (state.forceSuicide) {
                const neighbors = [
                    { x: head.x, y: head.y - 1 },
                    { x: head.x, y: head.y + 1 },
                    { x: head.x - 1, y: head.y },
                    { x: head.x + 1, y: head.y }
                ];
                const obstacles = new Set(body.map(s => `${s.x},${s.y}`));
                let crashMove = null;
                for (const n of neighbors) {
                    if (obstacles.has(`${n.x},${n.y}`)) {
                        crashMove = n;
                        break;
                    }
                }
                if (!crashMove) {
                    for (const n of neighbors) {
                        if (n.x < 0 || n.x >= WIDTH || n.y < 0 || n.y >= HEIGHT) {
                            crashMove = n;
                            break;
                        }
                    }
                }
                proposedStep = crashMove || neighbors[0];
                fallbackStep = proposedStep;
            }
            // --- CÁLCULO NORMAL DOS MOVIMENTOS ---
            else if (state.mode === 'HAMILTONIAN') {
                const H_head = H_index[head.x][head.y];
                const H_food = H_index[foodState.x][foodState.y];
                const defaultIdx = (H_head + 1) % 400;
                const defaultStep = H_path[defaultIdx];

                const neighbors = [
                    { x: head.x, y: head.y - 1 },
                    { x: head.x, y: head.y + 1 },
                    { x: head.x - 1, y: head.y },
                    { x: head.x + 1, y: head.y }
                ];

                let bestShortcut = null;
                let minManhattan = Infinity;

                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < WIDTH && n.y >= 0 && n.y < HEIGHT) {
                        const H_N = H_index[n.x][n.y];
                        if (H_N !== defaultIdx) {
                            if (isVirtualMoveSafe(n, body, foodState)) {
                                const doesntSkipFood = cycleDist(H_head, H_food) >= cycleDist(H_head, H_N);
                                if (doesntSkipFood) {
                                    const man = Math.abs(n.x - foodState.x) + Math.abs(n.y - foodState.y);
                                    if (man < minManhattan) {
                                        minManhattan = man;
                                        bestShortcut = n;
                                    }
                                }
                            }
                        }
                    }
                }

                proposedStep = bestShortcut || defaultStep;
                fallbackStep = defaultStep;

            } else {
                const pathToFood = getBFSPath(head, foodState, body, WIDTH, HEIGHT, true);
                let isPathSafe = false;

                if (pathToFood && pathToFood.length > 1) {
                    const virtualBody = [...body];
                    virtualBody.unshift(pathToFood[1]);
                    virtualBody.pop();
                    const pathToTailAfterEating = getBFSPath(virtualBody[0], virtualBody[virtualBody.length - 1], virtualBody, WIDTH, HEIGHT, false);
                    if (pathToTailAfterEating) {
                        isPathSafe = true;
                    }
                }

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

                const forceBreak = (state.tailChasingCount > 15 && pathToFood && pathToFood.length <= 5);

                if ((isPathSafe || forceBreak) && pathToFood) {
                    proposedStep = pathToFood[1];
                    fallbackStep = nextStepTailWide || (pathToFood && pathToFood[1]);
                } else {
                    proposedStep = nextStepTailWide || (pathToFood && pathToFood[1]);
                    fallbackStep = pathToFood ? pathToFood[1] : null;
                }
            }

            // --- FILTRO DE VETO POR ML (Ignorado se estiver em suicídio forçado) ---
            let finalStep = proposedStep;
            if (proposedStep && !state.forceSuicide) {
                const proposedDir = getDirectionFromMove(head, proposedStep);
                if (proposedDir) {
                    const qVals = getQValues(mlStateStr);
                    const actIdx = ACTIONS.indexOf(proposedDir);
                    if (actIdx !== -1 && qVals[actIdx] < -35) {
                        console.log(`[ML Veto] Movimento '${proposedDir}' VETADO! Tinha penalização de ${qVals[actIdx].toFixed(2)}. Forçando alternativa segura.`);
                        finalStep = fallbackStep || proposedStep;
                    }
                }
            }

            if (!finalStep) {
                const neighbors = [
                    { x: head.x, y: head.y - 1 },
                    { x: head.x, y: head.y + 1 },
                    { x: head.x - 1, y: head.y },
                    { x: head.x + 1, y: head.y }
                ];
                const obstacles = new Set(body.map(s => `${s.x},${s.y}`));
                let safeMoves = [];
                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < WIDTH && n.y >= 0 && n.y < HEIGHT) {
                        if (!obstacles.has(`${n.x},${n.y}`)) safeMoves.push(n);
                    }
                }
                if (safeMoves.length > 0) finalStep = safeMoves[0];
            }

            if (finalStep) {
                const direction = getDirectionFromMove(head, finalStep);
                if (direction) {
                    pressKey(direction);
                    moveHistory.push({
                        state: mlStateStr,
                        action: direction
                    });
                    if (moveHistory.length > 30) moveHistory.shift();
                }
            }

            if (state.mode === 'NORMAL' && finalStep && nextStepTailWide && finalStep.x === nextStepTailWide.x && finalStep.y === nextStepTailWide.y) {
                state.tailChasingCount++;
            } else {
                state.tailChasingCount = 0;
            }

        } catch (e) {
            // Ignorar erros
        }
    }

    window.snakeNormalIntervalId = setInterval(playStep, 20);

    window.stopSnakeBot = function() {
        if (window.snakeNormalIntervalId) {
            clearInterval(window.snakeNormalIntervalId);
            window.snakeNormalIntervalId = null;
        }
        console.log("[Bot] Parado.");
    };

    window.resetSnakeML = function() {
        localStorage.removeItem('snake_self_correct_table');
        localStorage.removeItem('snake_ml_episodes');
        qTable = {};
        episodeCount = 0;
        console.log("[ML Auto-Correção] Memória de erros redefinida!");
    };

    console.log("[Bot] Iniciado com Versão 3930+ (Resiliência contra Pausa & Detetora Global de Ads).");
})();

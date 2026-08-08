/**
 * Video Playback Monitor & Auto-Resume Extension Content Script
 */

(function () {
    // Evitar instâncias duplicadas do widget
    const existingWidget = document.getElementById('video-monitor-widget');
    if (existingWidget) {
        existingWidget.remove();
    }

    // Configurações do monitor
    const CONFIG = {
        checkIntervalMs: 1500,     
        stuckThresholdSeconds: 2,   
        autoMuteOnBlock: true       
    };

    // Estado do monitor
    let state = {
        monitoring: true,
        resumeCount: 0,
        lastTime: -1,
        stuckCounter: 0,
        activeVideo: null,
        statusText: 'A inicializar...',
        statusColor: '#ffc107'
    };

    // Criar interface visual flutuante (Glassmorphism & Sleek Dark Design)
    const widget = document.createElement('div');
    widget.id = 'video-monitor-widget';
    widget.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        background: rgba(20, 20, 25, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        color: #f8f9fa;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        z-index: 999999;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        #video-monitor-widget header {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: pointer;
        }
        #video-monitor-widget .widget-title {
            font-weight: 600;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #video-monitor-widget .pulse-dot {
            width: 8px;
            height: 8px;
            background-color: #28a745;
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 8px #28a745;
            animation: pulse-glow 1.5s infinite ease-in-out;
        }
        #video-monitor-widget .widget-content {
            padding: 16px;
            transition: max-height 0.3s ease;
            max-height: 300px;
        }
        #video-monitor-widget.collapsed .widget-content {
            max-height: 0;
            padding: 0;
            pointer-events: none;
        }
        #video-monitor-widget .stat-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        #video-monitor-widget .stat-label {
            color: #adb5bd;
        }
        #video-monitor-widget .stat-value {
            font-weight: 500;
        }
        #video-monitor-widget .log-container {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 8px 12px;
            height: 80px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
            color: #a5d6a7;
            margin-top: 12px;
            border: 1px solid rgba(255, 255, 255, 0.03);
        }
        #video-monitor-widget button {
            background: linear-gradient(135deg, #4f46e5, #3b82f6);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            width: 100%;
            margin-top: 10px;
            transition: filter 0.2s;
        }
        #video-monitor-widget button:hover {
            filter: brightness(1.1);
        }
        #video-monitor-widget button.active {
            background: linear-gradient(135deg, #dc3545, #bd2130);
        }
        #video-monitor-widget .close-btn {
            background: none;
            border: none;
            color: #adb5bd;
            font-size: 18px;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
            width: auto;
            margin: 0;
        }
        #video-monitor-widget .close-btn:hover {
            color: #f8f9fa;
        }
        @keyframes pulse-glow {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(40, 167, 69, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
        }
    `;
    document.head.appendChild(style);

    widget.innerHTML = `
        <header id="vm-header">
            <span class="widget-title">
                <span class="pulse-dot" id="vm-pulse"></span>
                Autoplay Monitor
            </span>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="close-btn" id="vm-minimize" title="Minimizar" style="font-size: 14px;">−</button>
                <button class="close-btn" id="vm-close" title="Fechar">×</button>
            </div>
        </header>
        <div class="widget-content">
            <div class="stat-row">
                <span class="stat-label">Estado:</span>
                <span class="stat-value" id="vm-status" style="color: ${state.statusColor}">${state.statusText}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Vídeos Encontrados:</span>
                <span class="stat-value" id="vm-count">0</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Retomas Automáticas:</span>
                <span class="stat-value" id="vm-resumes" style="color: #60a5fa; font-weight: bold;">0</span>
            </div>
            <div class="log-container" id="vm-logs"></div>
            <button id="vm-toggle-btn">Pausar Monitorização</button>
        </div>
    `;

    document.body.appendChild(widget);

    const elStatus = document.getElementById('vm-status');
    const elCount = document.getElementById('vm-count');
    const elResumes = document.getElementById('vm-resumes');
    const elLogs = document.getElementById('vm-logs');
    const btnToggle = document.getElementById('vm-toggle-btn');
    const elPulse = document.getElementById('vm-pulse');
    const header = document.getElementById('vm-header');

    document.getElementById('vm-close').addEventListener('click', (e) => {
        e.stopPropagation();
        state.monitoring = false;
        widget.remove();
        style.remove();
    });

    const toggleCollapse = () => {
        widget.classList.toggle('collapsed');
        const minBtn = document.getElementById('vm-minimize');
        minBtn.textContent = widget.classList.contains('collapsed') ? '+' : '−';
    };
    header.addEventListener('click', toggleCollapse);
    document.getElementById('vm-minimize').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
    });

    // Permitir arrastar
    let isDragging = false;
    let dragStartX, dragStartY;
    let widgetStartX, widgetStartY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = widget.getBoundingClientRect();
        widgetStartX = rect.left;
        widgetStartY = rect.top;
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
        widget.style.left = `${widgetStartX}px`;
        widget.style.top = `${widgetStartY}px`;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        widget.style.left = `${widgetStartX + dx}px`;
        widget.style.top = `${widgetStartY + dy}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function addLog(message) {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${time}] ${message}`;
        elLogs.appendChild(logEntry);
        elLogs.scrollTop = elLogs.scrollHeight;
    }

    function updateUI() {
        elStatus.textContent = state.statusText;
        elStatus.style.color = state.statusColor;
        elResumes.textContent = state.resumeCount;
        
        if (state.monitoring) {
            elPulse.style.backgroundColor = '#28a745';
            elPulse.style.boxShadow = '0 0 8px #28a745';
            elPulse.style.animation = 'pulse-glow 1.5s infinite ease-in-out';
            btnToggle.textContent = 'Pausar Monitorização';
            btnToggle.classList.remove('active');
        } else {
            elPulse.style.backgroundColor = '#dc3545';
            elPulse.style.boxShadow = '0 0 8px #dc3545';
            elPulse.style.animation = 'none';
            btnToggle.textContent = 'Retomar Monitorização';
            btnToggle.classList.add('active');
        }
    }

    btnToggle.addEventListener('click', () => {
        state.monitoring = !state.monitoring;
        if (state.monitoring) {
            state.statusText = 'A procurar vídeo...';
            state.statusColor = '#ffc107';
            addLog("Monitorização retomada.");
        } else {
            state.statusText = 'Pausado';
            state.statusColor = '#adb5bd';
            addLog("Monitorização pausada pelo utilizador.");
        }
        updateUI();
    });

    async function forcePlay(video) {
        addLog("A tentar retomar reprodução...");

        // Nível 1: Play nativo
        try {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                await playPromise;
                state.resumeCount++;
                state.statusText = 'A Reproduzir (Play)';
                state.statusColor = '#28a745';
                addLog("Vídeo retomado via play().");
                updateUI();
                return true;
            }
        } catch (error) {
            if (error.name === 'NotAllowedError' && CONFIG.autoMuteOnBlock) {
                addLog("Autoplay bloqueado. A tentar mutar para contornar...");
                video.muted = true;
                try {
                    await video.play();
                    state.resumeCount++;
                    state.statusText = 'Reproduzir (Muted)';
                    state.statusColor = '#28a745';
                    addLog("Vídeo retomado com som desativado (Muted).");
                    updateUI();
                    return true;
                } catch (err2) {
                    console.error("Erro mesmo após mutar:", err2);
                }
            }
        }

        // Nível 2: Simular cliques no elemento do vídeo
        try {
            addLog("A tentar simular clique no vídeo...");
            const clickEvents = ['mousedown', 'click', 'mouseup'];
            clickEvents.forEach(eventType => {
                const event = new MouseEvent(eventType, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    buttons: 1
                });
                video.dispatchEvent(event);
            });

            if (video.parentElement) {
                video.parentElement.click();
            }

            state.resumeCount++;
            addLog("Clique simulado enviado.");
            updateUI();
            return true;
        } catch (clickErr) {
            console.error("Falha ao simular clique:", clickErr);
        }

        // Nível 3: Clicar em seletores comuns de botões de Play
        try {
            const commonPlaySelectors = [
                '.play-btn', '.play-button', '[aria-label="Play"]', '[title="Play"]',
                '.vjs-play-control', '.ytp-play-button', '.jw-icon-play'
            ];
            
            for (const selector of commonPlaySelectors) {
                const btn = document.querySelector(selector);
                if (btn && typeof btn.click === 'function') {
                    btn.click();
                    addLog(`Botão de Play detetado (${selector}) e clicado.`);
                    state.resumeCount++;
                    updateUI();
                    return true;
                }
            }
        } catch (selectorErr) {
            console.error("Erro ao procurar botões de play:", selectorErr);
        }

        addLog("⚠️ Não foi possível reproduzir. Requer interação manual.");
        state.statusText = 'Requer Interação';
        state.statusColor = '#dc3545';
        updateUI();
        return false;
    }

    function monitorLoop() {
        if (!state.monitoring) return;

        const videos = Array.from(document.querySelectorAll('video'));
        elCount.textContent = videos.length;

        if (videos.length === 0) {
            state.statusText = 'Sem vídeos na página';
            state.statusColor = '#adb5bd';
            state.activeVideo = null;
            updateUI();
            return;
        }

        let video = videos.find(v => v.offsetWidth > 0 && v.offsetHeight > 0) || videos[0];
        state.activeVideo = video;

        const isPaused = video.paused;
        const isEnded = video.ended;
        const currentTime = video.currentTime;
        const isReady = video.readyState >= 2;

        const isTimeStuck = (currentTime === state.lastTime && !isPaused && currentTime > 0);

        if (isTimeStuck) {
            state.stuckCounter++;
        } else {
            state.stuckCounter = 0;
        }

        state.lastTime = currentTime;

        const hasSource = !!(video.src || video.querySelector('source'));

        if (hasSource && ((isPaused && !isEnded) || (isReady && state.stuckCounter >= CONFIG.stuckThresholdSeconds))) {
            let reason = "";
            if (isPaused) reason = "Pausado";
            else reason = "Vídeo Travado (Buffering/Freeze)";

            addLog(`Detetado: ${reason}.`);
            forcePlay(video);
        } else {
            if (!isPaused) {
                state.statusText = 'A Reproduzir';
                state.statusColor = '#28a745';
            } else if (currentTime === 0) {
                state.statusText = 'Aguardando Início';
                state.statusColor = '#ffc107';
            }
            updateUI();
        }
    }

    addLog("Extension Monitor iniciado.");
    setInterval(monitorLoop, CONFIG.checkIntervalMs);
})();

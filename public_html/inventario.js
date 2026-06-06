/**
 * INVENTÁRIO BUILDER ENGINE - FINAL STABLE VERSION
 */
import { auth, db, onAuthStateChanged, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';

// Helper script for YIQ contrast
function getContrastYIQ(hexcolor) {
    if (!hexcolor) return '#ffffff';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
    if (hexcolor.length !== 6) return '#ffffff';
    var r = parseInt(hexcolor.substr(0, 2), 16), g = parseInt(hexcolor.substr(2, 2), 16), b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#0f172a' : '#ffffff';
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// --- COLOR MANAGEMENT ---
// Using 6 manual slots for saved colors
let savedColors = JSON.parse(localStorage.getItem('cvpSavedColors')) || Array(6).fill(null);
if (!Array.isArray(savedColors) || savedColors.length !== 6) {
    savedColors = Array.isArray(savedColors) ? [...savedColors, ...Array(6).fill(null)].slice(0, 6) : Array(6).fill(null);
}

let openPaletteOption = null; // Sticky reference to the option object
let openPaletteTitleIdx = null; // Sticky reference for titles
let currentHoveredBlockForTools = null; // Sticky reference for toolbar
let lastInternalRender = 0;
let ignoreNextClick = false;

window.applyColorToDOM = function (type, b, r, c, color) {
    const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
    if (!blockEl) return;
    const textColor = getContrastYIQ(color);
    if (type === 'title') {
        const h1 = blockEl.querySelector('h1, h2, .section-title, .block-title, .block-section-heading, .block-title-large, .block-question, .block-desc');
        if (h1) {
            if (window.editorSchema[b].blockStyle === 'border') {
                h1.style.setProperty('--marker-color', color);
                h1.style.backgroundColor = '';
                h1.style.color = '#f8fafc';
            } else {
                h1.style.removeProperty('--marker-color');
                const bStyle = window.editorSchema[b].blockStyle || 'full';
                const displayStyle = bStyle === 'inline' ? 'inline-block' : 'block';
                h1.style.display = displayStyle;
                h1.style.width = bStyle === 'inline' ? 'fit-content' : '100%';
                h1.style.backgroundColor = color || '';
                h1.style.color = color ? textColor : '#f8fafc';
            }
        }
    } else if (type === 'pill') {
        const pillWrapper = blockEl.querySelector(`.pill-cell-wrapper[data-rowidx="${r}"][data-colidx="${c}"] .pill-edit-wrapper`);
        if (pillWrapper) {
            if (color) {
                pillWrapper.style.backgroundColor = color;
                pillWrapper.style.color = textColor;
            } else {
                pillWrapper.style.background = 'rgba(255, 255, 255, 0.05)';
                pillWrapper.style.color = 'inherit';
            }
        }
    }
};

window.updateSavedColorsUI = function () {
    document.querySelectorAll('.pill-palette').forEach(palette => {
        const type = palette.dataset.type;
        const blockIdx = parseInt(palette.dataset.blockidx);
        const r = parseInt(palette.dataset.rowidx);
        const c = parseInt(palette.dataset.colidx);
        const savedSection = palette.querySelector('.pill-palette-saved');
        if (!savedSection) return;
        const grid = savedSection.querySelector('.pill-palette-grid');
        if (!grid) return;

        grid.innerHTML = savedColors.map((cVal, sIdx) => {
            if (type === 'pill') {
                return `
                    <div class="pill-color-dot ${!cVal ? 'empty-slot' : ''}" 
                         style="${cVal ? `background:${cVal}` : ''}" 
                         onmousedown="window.handleSlotMouseDown(event, ${sIdx}, ${blockIdx}, 'pill', ${r}, ${c})"
                         onmouseup="window.handleSlotMouseUp()"
                         onclick="window.handleSlotClick(event, ${sIdx}, ${blockIdx}, 'pill', ${r}, ${c})"
                         title="${cVal ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}">
                    </div>`;
            } else {
                return `
                    <div class="pill-color-dot ${!cVal ? 'empty-slot' : ''}" 
                         style="${cVal ? `background:${cVal}` : ''}" 
                         onmousedown="window.handleSlotMouseDown(event, ${sIdx}, ${blockIdx}, 'title')"
                         onmouseup="window.handleSlotMouseUp()"
                         onclick="window.handleSlotClick(event, ${sIdx}, ${blockIdx}, 'title')"
                         title="${cVal ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}">
                    </div>`;
            }
        }).join('');
    });
};

window.handleSlotClick = function (e, slotIdx, blockIdx, type, r, c) {
    e.stopPropagation();
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    // Keep palette open by reference
    if (type === 'pill') {
        let opt = window.editorSchema[blockIdx].options[r][c];
        if (typeof opt !== 'object' || opt === null) {
            opt = { text: String(opt) };
            window.editorSchema[blockIdx].options[r][c] = opt;
        }
        openPaletteOption = opt;
        openPaletteTitleIdx = null;
    } else {
        openPaletteTitleIdx = blockIdx;
        openPaletteOption = null;
    }

    const color = savedColors[slotIdx];
    if (color) {
        // Apply color - window STAYS OPEN
        if (type === 'pill') window.setPillColor(blockIdx, r, c, color);
        else window.setTitleColor(blockIdx, color);
    } else {
        const currentColor = type === 'pill' ?
            (window.editorSchema[blockIdx].options[r][c].color || '#ffffff') :
            (window.editorSchema[blockIdx].blockColor || '#ffffff');

        savedColors[slotIdx] = currentColor;
        localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));
        window.updateSavedColorsUI();
    }
};

let longPressTimer;
window.handleSlotMouseDown = function (e, slotIdx, blockIdx, type, r, c) {
    e.stopPropagation();

    // Store which palette is open by reference
    if (type === 'pill') {
        let opt = window.editorSchema[blockIdx].options[r][c];
        if (typeof opt !== 'object' || opt === null) {
            opt = { text: String(opt) };
            window.editorSchema[blockIdx].options[r][c] = opt;
        }
        openPaletteOption = opt;
        openPaletteTitleIdx = null;
    } else {
        openPaletteTitleIdx = blockIdx;
        openPaletteOption = null;
    }

    longPressTimer = setTimeout(() => {
        if (savedColors[slotIdx]) {
            savedColors[slotIdx] = null;
            localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));
            window.updateSavedColorsUI();
            ignoreNextClick = true; // Block the subsequent release click
        }
    }, 800); // 800ms for long press
};

window.handleSlotMouseUp = function () {
    clearTimeout(longPressTimer);
};



const globalColorPicker = document.createElement('input');
globalColorPicker.type = 'color';
globalColorPicker.style.position = 'fixed';
globalColorPicker.style.opacity = '0';
globalColorPicker.style.pointerEvents = 'none';
document.body.appendChild(globalColorPicker);

let activePickerTarget = null; // { type: 'pill'|'title', b, r, c }

globalColorPicker.addEventListener('input', (e) => {
    if (!activePickerTarget) return;
    const { type, b, r, c } = activePickerTarget;
    const color = e.target.value;
    if (type === 'pill') {
        window.editorSchema[b].options[r][c].color = color;
    } else {
        window.editorSchema[b].blockColor = color;
    }
    window.renderCanvas();
});

globalColorPicker.addEventListener('change', (e) => {
    if (e.target.value) { /* no auto-save */ }
    window.saveDebounce();
    activePickerTarget = null;
});




const urlParams = new URLSearchParams(window.location.search);
let currentFormId = urlParams.get('id') || localStorage.getItem('cvpCurrentFormId');

if (!currentFormId) {
    window.location.href = 'dashboard.html';
} else {
    localStorage.setItem('cvpCurrentFormId', currentFormId);
}

window.editorSchema = [];
let currentForm = null;
let hasUnsavedChanges = false;
let saveTimer = null;

// Global exports for HTML event handlers
window.renderCanvas = function () {
    const blocksContainer = document.getElementById('blocks-container');
    if (!blocksContainer) return;
    blocksContainer.innerHTML = '';
    lastInternalRender = Date.now();

    window.editorSchema.forEach((block, index) => {
        const blockEl = document.createElement('div');
        blockEl.className = `tally-block block-${block.type}`;
        blockEl.dataset.index = index;

        const bColor = block.blockColor || '';
        const bStyle = block.blockStyle || 'full';
        const bSize = block.blockSize || 'medium';
        const sizeMap = { 'small': '14px', 'medium': '18px', 'large': '24px' };
        const qFontSize = sizeMap[bSize] || '18px';
        let qStyle = '';
        let qClass = '';
        if (bColor) {
            const textColor = getContrastYIQ(bColor);
            if (bStyle === 'border') {
                qStyle = `--marker-color: ${bColor}; font-size: ${qFontSize}; color: #f8fafc;`;
                qClass = 'style-marker';
            } else {
                const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                qStyle = `background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${qFontSize}; ${displayStyle}`;
            }
        }

        let html = '';
        if (block.type === 'title') {
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full'; // 'full', 'inline', 'border'
            const bSize = block.blockSize || 'large'; // 'small', 'medium', 'large'

            const sizeMap = { 'small': '18px', 'medium': '26px', 'large': '36px' };
            const fontSize = sizeMap[bSize] || '36px';

            let styleAttr = `style="font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2;"`;
            let classAttr = `class="block-title"`;

            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    styleAttr = `style="--marker-color: ${bColor}; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; color: #f8fafc;"`;
                    classAttr = `class="block-title style-marker"`;
                } else {
                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                    styleAttr = `style="background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; ${displayStyle}"`;
                }
            }

            const isSticky = block.isSticky !== false;
            const pinHtml = `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 24px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
            const cleanStyle = styleAttr.replace('style="', '').slice(0, -1);
            const wrapperStyle = bStyle === 'inline' && bColor
                ? 'display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px; max-width: 100%;'
                : 'display: flex; align-items: center; gap: 4px; width: 100%; margin-bottom: 8px;';
            const innerFlex = bStyle === 'inline' && bColor ? '' : 'flex: 1;';

            html = `
                <div style="${wrapperStyle}">
                    ${pinHtml}
                    <h1 ${classAttr} contenteditable="true" data-field="content" style="${cleanStyle}; ${innerFlex} margin: 0;">${block.content || ''}</h1>
                </div>
            `;
        } else if (block.type === 'section') {
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full'; // 'full', 'inline', 'border'
            const bSize = block.blockSize || 'medium'; // 'small', 'medium', 'large'

            const sizeMap = { 'small': '14px', 'medium': '18px', 'large': '24px' };
            const fontSize = sizeMap[bSize] || '18px';

            let styleAttr = `style="font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2;"`;
            let classAttr = `class="section-title"`;

            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    styleAttr = `style="--marker-color: ${bColor}; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; color: #f8fafc;"`;
                    classAttr = `class="section-title style-marker"`;
                } else {
                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                    styleAttr = `style="background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; ${displayStyle}"`;
                }
            }

            const isSticky = block.isSticky !== false;
            const pinHtml = `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 18px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
            const cleanStyle = styleAttr.replace('style="', '').slice(0, -1);
            const wrapperStyle = bStyle === 'inline' && bColor
                ? 'display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px; max-width: 100%;'
                : 'display: flex; align-items: center; gap: 4px; width: 100%; margin-bottom: 8px;';
            const innerFlex = bStyle === 'inline' && bColor ? '' : 'flex: 1;';

            html = `
                <div style="${wrapperStyle}">
                    ${pinHtml}
                    <div ${classAttr} contenteditable="true" data-field="question" style="${cleanStyle}; ${innerFlex} margin: 0;">${block.question || ''}</div>
                </div>
            `;
        } else if (block.type === 'counter' || block.type === 'choice-single' || block.type === 'choice-multi') {
            const options = block.options || [[]];
            const blockColor = block.pillColor || '';
            const isCounter = block.type === 'counter';

            let pinHtml = '';
            if (isCounter) {
                const isSticky = block.isSticky !== false;
                pinHtml = `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 18px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
            }

            html = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    ${pinHtml}
                    <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="${qStyle}">${block.question || (isCounter ? 'Novo Item' : 'Nova Pergunta')}</div>
                    ${isCounter ? `<button class="required-star-btn" onclick="window.toggleBlockRequired(event, ${index})" title="${block.required ? 'Clique para remover obrigatoriedade' : 'Clique para tornar obrigatório'}" style="cursor: pointer; background: transparent; border: none; font-size: 24px; font-weight: 700; color: ${block.required ? '#ef4444' : '#cbd5e1'}; transition: color 0.2s; padding: 0; line-height: 1;">*</button>` : ''}
                </div>
            `;

            // Auto-clean any empty arrays that might have been saved incorrectly
            for (let i = options.length - 1; i >= 0; i--) {
                if (!options[i] || options[i].length === 0) {
                    options.splice(i, 1);
                }
            }

            options.forEach((row, rowIdx) => {
                html += `<div class="pill-row" data-blockidx="${index}" data-rowidx="${rowIdx}" ondragover="window.handlePillRowDragOver(event)" ondrop="window.handlePillRowDrop(event, ${index}, ${rowIdx})">`;
                row.forEach((opt, colIdx) => {
                    const optText = typeof opt === 'object' ? opt.text : opt;
                    const optColor = (typeof opt === 'object' && opt.color) ? opt.color : blockColor;
                    const optTarget = (typeof opt === 'object' && opt.target !== undefined) ? opt.target : 0;

                    const styleAttr = optColor ? `background-color: ${optColor}; color: ${getContrastYIQ(optColor)};` : `background: rgba(255, 255, 255, 0.05); color: inherit;`;

                    html += `
                        <div class="pill-cell-wrapper" draggable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" ondragstart="window.handlePillDragStart(event)" ondragover="window.handlePillDragOver(event)" ondragleave="window.handlePillDragLeave(event)" ondrop="window.handlePillDrop(event)" ondragend="window.handlePillDragEnd(event)">
                            <div class="pill-edit-wrapper" style="${styleAttr}">
                                <div class="pill-drag-handle">
                                    <i class="ph ph-dots-six-vertical"></i>
                                </div>
                                <input type="text" class="pill-input" value="${optText}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="color: inherit;">
                                ${isCounter ? `<div class="pill-inventory-target"><span>QT</span><input type="number" class="pill-target-input" value="${optTarget}" onchange="window.setPillTarget(${index}, ${rowIdx}, ${colIdx}, this.value)"></div>` : ''}
                                <button class="pill-color-trigger" onclick="window.togglePillPalette(event, ${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-palette"></i></button>
                                <button class="pill-dup-btn" onclick="window.duplicateOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-copy"></i></button>
                                <button class="pill-delete-btn" onclick="window.removeOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-x"></i></button>
                                <div class="pill-palette ${openPaletteOption === opt ? '' : 'hidden'}" id="palette-${index}-${rowIdx}-${colIdx}" style="top: 100%; left: 0; margin-top: 6px;" data-type="pill" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}">
                                    <div class="pill-palette-saved" style="margin-top: 0; padding-top: 0; border-top: none;">
                                        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">Minhas Cores</div>
                                        <div class="pill-palette-grid">
                                            ${savedColors.map((c, sIdx) => `
                                                <div class="pill-color-dot ${!c ? 'empty-slot' : ''}" 
                                                     style="${c ? `background:${c}` : ''}" 
                                                     onmousedown="window.handleSlotMouseDown(event, ${sIdx}, ${index}, 'pill', ${rowIdx}, ${colIdx})"
                                                     onmouseup="window.handleSlotMouseUp()"
                                                     onclick="window.handleSlotClick(event, ${sIdx}, ${index}, 'pill', ${rowIdx}, ${colIdx})"
                                                     title="${c ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}">
                                                </div>`).join('')}
                                        </div>
                                    </div>
                                    
                                    <div style="font-size: 10px; color: #64748b; margin: 10px 0 5px 0; text-transform: uppercase; letter-spacing: 0.05em;">Cores Base</div>
                                    <div class="pill-palette-grid">
                                        <div class="pill-color-dot" style="background:transparent; border:1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;" onclick="window.setPillColor(${index}, ${rowIdx}, ${colIdx}, '')" title="Remover Cor">
                                            <i class="ph ph-prohibit" style="font-size: 14px; color: #94a3b8;"></i>
                                        </div>
                                        ${['#ffffff', '#0f172a', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'].map(c => `<div class="pill-color-dot" style="background:${c}" onclick="window.setPillColor(${index}, ${rowIdx}, ${colIdx}, '${c}')"></div>`).join('')}
                                    </div>

                                    <div class="spectrum-bar" 
                                         onmousedown="window.startSpectrum(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"
                                         title="Arraste para escolher uma cor"></div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += `<button class="add-pill-btn" onclick="window.addOptionToRow(${index}, ${rowIdx})"><i class="ph ph-plus"></i></button></div>`;
            });

            // Gap zone com botão de + para adicionar linha abaixo
            html += `
                <div class="pill-row-gap pill-row-gap--end" data-blockidx="${index}" data-insertidx="${options.length}" ondragover="window.handleRowDragOver(event)" ondragleave="window.handleRowDragLeave(event)" ondrop="window.handleRowDrop(event, ${index}, ${options.length})">
                    <button class="tally-dashed-add" title="Adicionar nova linha" onclick="window.addOption(${index})"><i class="ph ph-plus"></i></button>
                </div>
            `;
        } else if (block.type === 'text-short' || block.type === 'text-long') {
            const placeholder = block.placeholder || 'Resposta...';
            const height = block.type === 'text-long' ? 'min-height: 100px;' : '';
            html = `
                <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="margin-bottom: 8px; ${qStyle}">${block.question || 'Nova Pergunta'}</div>
                <div class="fake-input" style="${height}">${placeholder}</div>
            `;
        } else if (block.type === 'date') {
            const today = new Date().toISOString().split('T')[0];
            html = `
                <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="margin-bottom: 8px; ${qStyle}">${block.question || 'Data'}</div>
                <input type="date" class="fake-input" style="padding: 10px; margin-top: 4px; font-family: inherit; font-size: 15px; width: fit-content; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f8fafc; color-scheme: dark;" value="${today}" disabled>
            `;
        } else {
            // Outros tipos de blocos simplificados...
            html = `<div class="block-text" contenteditable="true" data-field="content">${block.content || ''}</div>`;
        }


        const isSticky = block.isSticky !== false;
        const isTitleOrSection = block.type === 'title' || block.type === 'section';
        const isCounter = block.type === 'counter';

        let toolsHtml = `<div class="block-tools-inline">`;
        toolsHtml += `
            <div class="tool-btn color-trigger" onclick="window.toggleTitlePalette(event, ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>
            <div class="tool-btn style-trigger" onclick="window.toggleTitleStyle(event, ${index})" title="Mudar Estilo (Full / Inline / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>
            ${isTitleOrSection ? `<div class="tool-btn size-trigger" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho de Letra"><i class="ph ph-text-aa"></i></div>` : ''}
            ${isTitleOrSection || isCounter ? `<div class="tool-btn sticky-trigger" onclick="window.toggleBlockSticky(event, ${index})" title="Fixar Cabeçalho (Sticky)" style="cursor: pointer; transition: color 0.2s; ${isSticky ? 'color: #3b82f6;' : 'color: #cbd5e1;'}">
                <i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i>
            </div>` : ''}
        `;

        const paletteHtml = `
            <div class="pill-palette ${openPaletteTitleIdx === index ? '' : 'hidden'}" id="title-palette-${index}" style="top: 40px; left: 0;" data-type="title" data-blockidx="${index}">
                <div class="pill-palette-saved" style="margin-top: 0; padding-top: 0; border-top: none;">
                    <div style="font-size: 10px; color: #94a3b8; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">Minhas Cores</div>
                    <div class="pill-palette-grid">
                        ${savedColors.map((c, sIdx) => `
                            <div class="pill-color-dot ${!c ? 'empty-slot' : ''}" 
                                 style="${c ? `background:${c}` : ''}" 
                                 onmousedown="window.handleSlotMouseDown(event, ${sIdx}, ${index}, 'title')"
                                 onmouseup="window.handleSlotMouseUp()"
                                 onclick="window.handleSlotClick(event, ${sIdx}, ${index}, 'title')"
                                 title="${c ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}">
                            </div>`).join('')}
                    </div>
                </div>
                <div class="pill-palette-grid">
                    <div class="pill-color-dot" style="background:transparent; border:1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;" onclick="window.setTitleColor(${index}, '')" title="Remover Cor">
                        <i class="ph ph-prohibit" style="font-size: 14px; color: #94a3b8;"></i>
                    </div>
                    ${['#ffffff', '#0f172a', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'].map(c => `<div class="pill-color-dot" style="background:${c}" onclick="window.setTitleColor(${index}, '${c}')"></div>`).join('')}
                </div>
                <div class="spectrum-bar" onmousedown="window.startSpectrum(event, 'title', ${index})" title="Arraste para escolher uma cor"></div>
            </div>
        `;
        html += paletteHtml;


        // Render the image absolute wrapper if this block contains an image
        if (block.image) {
            html += `
                <div class="block-image-wrapper" 
                     id="image-wrapper-${index}"
                     style="left: ${block.imageX}px; top: ${block.imageY}px; width: ${block.imageWidth}px; height: ${block.imageHeight}px;"
                     onmousedown="window.startImageDrag(event, ${index})">
                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain;">
                    <div class="image-resize-handle" onmousedown="window.startImageResize(event, ${index})"></div>
                    <div class="image-delete-btn" onclick="window.removeBlockImage(event, ${index})" title="Eliminar imagem"><i class="ph ph-trash"></i></div>
                </div>
            `;
        }
        

        toolsHtml += `
            <div class="tool-btn image-trigger" onclick="window.triggerBlockImage(event, ${index})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
            <div class="tool-btn drag-handle"><i class="ph ph-dots-six-vertical"></i></div>
            <div class="tool-btn duplicate-btn" onclick="window.duplicateBlockDirect(event, ${index})" title="Duplicar Bloco"><i class="ph ph-copy"></i></div>
            <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
            <div class="tool-btn delete-btn"><i class="ph ph-trash"></i></div>
        </div>`;

        blockEl.innerHTML = toolsHtml + html;

        // Force relative coordinates and adjust dynamic height to fit image bounding box
        blockEl.style.position = 'relative';
        window.adjustBlockHeightForImage(blockEl, block);

        // Toolbar stays fixed at top-right of block, does NOT follow mouse

        // Toolbar: JS-driven show/hide so clicking a tool doesn't dismiss the bar
        let toolbarHideTimer = null;
        const showTools = () => {
            currentHoveredBlockForTools = index;
            if (toolbarHideTimer) { clearTimeout(toolbarHideTimer); toolbarHideTimer = null; }
            const tools = blockEl.querySelector('.block-tools-inline');
            
            document.querySelectorAll('.block-tools-inline').forEach(t => {
                if (t !== tools) {
                    t.style.opacity = '0';
                    t.style.visibility = 'hidden';
                    t.style.pointerEvents = 'none';
                    t.style.transitionDelay = '0s';
                }
            });

            if (tools) {
                tools.style.opacity = '1';
                tools.style.visibility = 'visible';
                tools.style.pointerEvents = 'auto';
                tools.style.transitionDelay = '0s';
            }
        };
        const hideTools = () => {
            if (!document.contains(blockEl)) return;
            if (currentHoveredBlockForTools === index) currentHoveredBlockForTools = null;
            toolbarHideTimer = setTimeout(() => {
                const tools = blockEl.querySelector('.block-tools-inline');
                if (tools && currentHoveredBlockForTools !== index) {
                    tools.style.opacity = '0';
                    tools.style.visibility = 'hidden';
                    tools.style.pointerEvents = 'none';
                    tools.style.transitionDelay = '0.2s';
                }
            }, 100);
        };
        blockEl.addEventListener('mouseenter', showTools);
        blockEl.addEventListener('mouseleave', hideTools);
        const toolsEl = blockEl.querySelector('.block-tools-inline');
        if (toolsEl) {
            toolsEl.addEventListener('mouseenter', showTools);
            toolsEl.addEventListener('mouseleave', hideTools);
        }
        
        if (currentHoveredBlockForTools === index) {
            showTools();
        }

        blockEl.querySelector('.delete-btn').addEventListener('click', () => {
            window.editorSchema.splice(index, 1);
            window.renderCanvas();
            window.saveDebounce();
        });

        blockEl.querySelector('.add-below').addEventListener('click', (e) => {
            console.log("Add below clicked for block index:", index);
            e.stopPropagation();
            const rect = blockEl.querySelector('.add-below').getBoundingClientRect();
            const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
            window.hoverBlockIndex = index;
            slashMenu.classList.remove('hidden');
            slashMenu.style.top = `${rect.top - editorPageRect.top + 30}px`;
            slashMenu.style.left = `${rect.left - editorPageRect.left + 30}px`;
        });

        // Block Drag and Drop events
        blockEl.draggable = true;
        blockEl.addEventListener('dragstart', (e) => window.handleBlockDragStart(e, index));
        blockEl.addEventListener('dragover', window.handleBlockDragOver);
        blockEl.addEventListener('dragleave', window.handleBlockDragLeave);
        blockEl.addEventListener('drop', (e) => window.handleBlockDrop(e, index));
        blockEl.addEventListener('dragend', window.handleBlockDragEnd);

        // Attach listeners for contenteditable elements
        const editables = blockEl.querySelectorAll('[contenteditable="true"]');
        editables.forEach(ed => {
            ed.addEventListener('blur', (e) => {
                const field = ed.dataset.field;
                window.editorSchema[index][field] = e.target.textContent;
                window.saveDebounce();
            });
        });

        // Attach listeners for pill inputs
        const pillInputs = blockEl.querySelectorAll('.pill-input');
        pillInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                const r = parseInt(input.dataset.rowidx);
                const c = parseInt(input.dataset.colidx);
                if (typeof window.editorSchema[index].options[r][c] === 'object') {
                    window.editorSchema[index].options[r][c].text = e.target.value;
                } else {
                    window.editorSchema[index].options[r][c] = e.target.value;
                }
                window.saveDebounce();
            });
            input.addEventListener('input', (e) => {
                const r = parseInt(input.dataset.rowidx);
                const c = parseInt(input.dataset.colidx);
                if (typeof window.editorSchema[index].options[r][c] === 'object') {
                    window.editorSchema[index].options[r][c].text = e.target.value;
                } else {
                    window.editorSchema[index].options[r][c] = e.target.value;
                }
                window.checkAndSplitRows();
            });
        });

        blocksContainer.appendChild(blockEl);
    });

    // Trigger auto-split
    setTimeout(window.checkAndSplitRows, 300);
};

window.saveDebounce = function () {
    hasUnsavedChanges = true;
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) saveStatus.textContent = "A guardar...";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const formRef = doc(db, "forms", currentFormId);
            const safeSchema = JSON.parse(JSON.stringify(window.editorSchema));
            safeSchema.forEach(block => { if (block.options) block.options = JSON.stringify(block.options); });
            await setDoc(formRef, { schema: safeSchema, updatedAt: serverTimestamp() }, { merge: true });
            if (saveStatus) saveStatus.textContent = "Guardado";
            hasUnsavedChanges = false;
        } catch (e) { console.error(e); }
    }, 1500);
};

window.checkAndSplitRows = function () {
    let needsReRender = false;
    let focusedPill = null;
    
    // Guardar foco e seleção de texto antes de re-renderizar
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList.contains('pill-input')) {
        focusedPill = {
            blockIdx: parseInt(activeEl.dataset.blockidx),
            rowIdx: parseInt(activeEl.dataset.rowidx),
            colIdx: parseInt(activeEl.dataset.colidx),
            selectionStart: activeEl.selectionStart,
            selectionEnd: activeEl.selectionEnd
        };
    }

    document.querySelectorAll('.pill-row').forEach(rowEl => {
        const blockIdx = parseInt(rowEl.dataset.blockidx);
        const rowIdx = parseInt(rowEl.dataset.rowidx);
        const pills = Array.from(rowEl.querySelectorAll('.pill-cell-wrapper'));
        if (pills.length <= 1) return;
        
        let currentWidth = 0;
        let splitIndex = -1;
        
        const editorPage = document.querySelector('.editor-page');
        const availableWidth = editorPage ? (editorPage.clientWidth - 80) : 720;
        
        pills.forEach((p, i) => {
            let w = p.getBoundingClientRect().width;
            const editWrapper = p.querySelector('.pill-edit-wrapper');
            if (editWrapper && editWrapper.matches(':hover')) {
                w -= 84; // Ignora o tamanho extra dos botões de hover
            }
            
            currentWidth += w;
            if (i > 0) {
                currentWidth += 8; // gap
            }
            
            if (currentWidth > availableWidth && splitIndex === -1 && i > 0) {
                splitIndex = i;
            }
        });
        
        if (splitIndex !== -1) {
            const block = window.editorSchema[blockIdx];
            const newRow = block.options[rowIdx].splice(splitIndex);
            block.options.splice(rowIdx + 1, 0, newRow);
            
            // Ajustar coordenadas do input focado se tiver sido movido para a nova linha
            if (focusedPill && focusedPill.blockIdx === blockIdx && focusedPill.rowIdx === rowIdx && focusedPill.colIdx >= splitIndex) {
                focusedPill.rowIdx = rowIdx + 1;
                focusedPill.colIdx -= splitIndex;
            }
            
            needsReRender = true;
        }
    });
    
    if (needsReRender) {
        window.renderCanvas();
        
        // Restaurar foco e cursor
        if (focusedPill) {
            setTimeout(() => {
                const targetInput = document.querySelector(
                    `.pill-input[data-blockidx="${focusedPill.blockIdx}"][data-rowidx="${focusedPill.rowIdx}"][data-colidx="${focusedPill.colIdx}"]`
                );
                if (targetInput) {
                    targetInput.focus();
                    targetInput.setSelectionRange(focusedPill.selectionStart, focusedPill.selectionEnd);
                }
            }, 50);
        }
    }
};

window.toggleBlockRequired = function (e, index) {
    e.stopPropagation();
    window.editorSchema[index].required = !window.editorSchema[index].required;
    window.renderCanvas();
    window.saveDebounce();
};

window.addOptionToRow = function (b, r) {
    const block = window.editorSchema[b];
    if (!block.options[r]) block.options[r] = [];
    block.options[r].push(block.type === 'counter' ? { text: 'Novo Item', target: 0 } : { text: 'Opção' });
    window.renderCanvas(); window.saveDebounce();
};

window.addOption = function (b) {
    const block = window.editorSchema[b];
    if (!block.options) block.options = [];
    block.options.push([block.type === 'counter' ? { text: 'Novo Item', target: 0 } : { text: 'Opção' }]);
    window.renderCanvas(); window.saveDebounce();
};

window.removeOption = function (b, r, c) {
    window.editorSchema[b].options[r].splice(c, 1);
    if (window.editorSchema[b].options[r].length === 0) {
        window.editorSchema[b].options.splice(r, 1);
    }
    window.renderCanvas();
    window.saveDebounce();
};
window.duplicateOption = function (b, r, c) { const copy = JSON.parse(JSON.stringify(window.editorSchema[b].options[r][c])); window.editorSchema[b].options.splice(r + 1, 0, [copy]); window.renderCanvas(); window.saveDebounce(); };
window.setPillTarget = function (b, r, c, v) { window.editorSchema[b].options[r][c].target = parseInt(v) || 0; window.saveDebounce(); };
window.setPillColor = function (b, r, c, color) {
    let opt = window.editorSchema[b].options[r][c];
    if (typeof opt !== 'object' || opt === null) {
        opt = { text: String(opt) };
        window.editorSchema[b].options[r][c] = opt;
    }
    opt.color = color;
    openPaletteOption = opt;
    openPaletteTitleIdx = null;
    window.applyColorToDOM('pill', b, r, c, color);
    window.saveDebounce();
};
window.togglePillPalette = function (e, b, r, c) {
    e.stopPropagation();
    let opt = window.editorSchema[b].options[r][c];
    if (typeof opt !== 'object' || opt === null) {
        opt = { text: String(opt) };
        window.editorSchema[b].options[r][c] = opt;
    }
    openPaletteOption = opt;
    openPaletteTitleIdx = null;

    document.querySelectorAll('.pill-palette').forEach(el => el.classList.add('hidden'));
    const p = document.getElementById(`palette-${b}-${r}-${c}`);
    if (p) p.classList.remove('hidden');
};
window.toggleTitlePalette = function (e, b) {
    e.stopPropagation();
    if (openPaletteTitleIdx === b) {
        openPaletteTitleIdx = null;
    } else {
        openPaletteTitleIdx = b;
    }
    openPaletteOption = null;
    window.renderCanvas();
};
window.setTitleColor = function (b, color) {
    window.editorSchema[b].blockColor = color;
    openPaletteTitleIdx = b;
    openPaletteOption = null;
    window.applyColorToDOM('title', b, undefined, undefined, color);
    window.saveDebounce();
};
window.toggleTitleStyle = function (e, b) {
    e.stopPropagation();
    const styles = ['full', 'inline', 'border'];
    const current = window.editorSchema[b].blockStyle || 'full';
    const nextIdx = (styles.indexOf(current) + 1) % styles.length;
    window.editorSchema[b].blockStyle = styles[nextIdx];
    window.renderCanvas();
    window.saveDebounce();
};
window.toggleTitleSize = function (e, b) {
    e.stopPropagation();
    const sizes = ['small', 'medium', 'large'];
    const current = window.editorSchema[b].blockSize || 'large';
    const nextIdx = (sizes.indexOf(current) + 1) % sizes.length;
    window.editorSchema[b].blockSize = sizes[nextIdx];
    window.renderCanvas();
    window.saveDebounce();
};
window.toggleBlockSticky = function (e, b) {
    e.stopPropagation();
    const block = window.editorSchema[b];
    block.isSticky = !(block.isSticky !== false);
    window.renderCanvas();
    window.saveDebounce();
};
window.duplicateBlockDirect = function (e, index) {
    if (e) e.stopPropagation();
    const blockToDuplicate = JSON.parse(JSON.stringify(window.editorSchema[index]));
    window.editorSchema.splice(index + 1, 0, blockToDuplicate);
    window.renderCanvas();
    window.saveDebounce();
};

let spectrumActive = null; // { type, b, r, c, element }
window.startSpectrum = function (e, type, b, r, c) {
    e.preventDefault();
    e.stopPropagation();
    spectrumActive = { type, b, r, c, element: e.currentTarget };
    updateSpectrum(e);

    const moveHandler = (me) => { if (spectrumActive) updateSpectrum(me); };
    const upHandler = (ue) => {
        if (spectrumActive) {
            updateSpectrum(ue);
            window.saveDebounce();
            spectrumActive = null;
        }
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
};

function updateSpectrum(e) {
    if (!spectrumActive) return;
    const { b, element } = spectrumActive;
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const hue = (x / rect.width) * 360;
    const hex = hslToHex(hue, 100, 50);

    const blockType = window.editorSchema[b].type;
    const isPillBulk = spectrumActive.type === 'pill-bulk';

    if (isPillBulk) {
        window.editorSchema[b].pillColor = hex;
    } else {
        window.editorSchema[b].blockColor = hex;
    }

    const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
    if (blockEl) {
        const textColor = getContrastYIQ(hex);
        if (isPillBulk) {
            blockEl.querySelectorAll('.choice-pill, .counter-btn').forEach(pill => {
                pill.style.backgroundColor = hex;
                pill.style.color = textColor;
                pill.style.borderColor = 'transparent';
            });
        } else {
            const target = blockEl.querySelector(
                '.block-title-large, .block-section-heading, .block-title, .section-title, .block-desc'
            );
            if (target) {
                if (window.editorSchema[b].blockStyle === 'border') {
                    target.style.setProperty('--marker-color', hex);
                    target.style.backgroundColor = '';
                } else {
                    target.style.removeProperty('--marker-color');
                    target.style.backgroundColor = hex;
                    target.style.color = textColor;
                    const isDesc = target.classList.contains('block-desc');
                    target.style.padding = isDesc ? '8px 12px' : '4px 12px';
                    target.style.borderRadius = '6px';
                }
            }
        }
    }
}



onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    const formSnap = await getDoc(doc(db, "forms", currentFormId));
    if (formSnap.exists()) {
        const data = formSnap.data();
        window.editorSchema = data.schema || [];
        window.editorSchema.forEach(block => { if (typeof block.options === 'string') block.options = JSON.parse(block.options); });
        window.renderCanvas();
    }
});

// ==========================================
// ADDING BLOCKS (Slash Menu / Plus Button)
// ==========================================
const addBlockEndBtn = document.getElementById('add-block-end');
const slashMenu = document.getElementById('slash-menu');
window.hoverBlockIndex = null;

if (addBlockEndBtn && slashMenu) {
    addBlockEndBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.hoverBlockIndex = null;
        const rect = addBlockEndBtn.getBoundingClientRect();
        const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
        slashMenu.classList.remove('hidden');
        slashMenu.style.top = `${rect.bottom - editorPageRect.top + 10}px`;
        slashMenu.style.left = `${rect.left - editorPageRect.left}px`;
    });

    document.addEventListener('click', (e) => {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
        }

        if (Date.now() - lastInternalRender < 300) return;

        if (!e.target.closest('.pill-palette') && !e.target.closest('.color-trigger') && !e.target.closest('.pill-edit-wrapper') && !e.target.closest('.tool-btn')) {
            document.querySelectorAll('.pill-palette').forEach(p => p.classList.add('hidden'));
            openPaletteOption = null;
            openPaletteTitleIdx = null;
        }

        if (!slashMenu.classList.contains('hidden') && !e.target.closest('#slash-menu') && !e.target.closest('#add-block-end')) {
            slashMenu.classList.add('hidden');
            const hoverLine = document.getElementById('hover-insert-line');
            if (hoverLine) hoverLine.classList.remove('visible');
        }
    });

    const slashItems = document.querySelectorAll('.slash-item');
    slashItems.forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            window.appendNewBlock(type);
            slashMenu.classList.add('hidden');
            const hoverLine = document.getElementById('hover-insert-line');
            if (hoverLine) hoverLine.classList.remove('visible');
        });
    });
}

window.appendNewBlock = function (type) {
    let actualType = type;
    let blockSize = 'large';
    let initialContent = '';

    if (type === 'title-h1') {
        actualType = 'title';
        blockSize = 'large';
        initialContent = 'Título Principal';
    } else if (type === 'title-h2') {
        actualType = 'title';
        blockSize = 'medium';
        initialContent = 'Título Médio';
    } else if (type === 'title-h3') {
        actualType = 'title';
        blockSize = 'small';
        initialContent = 'Título Pequeno';
    }

    const newBlock = { type: actualType, question: '', content: initialContent, blockSize: blockSize };
    if (actualType === 'choice-single' || actualType === 'choice-multi') {
        newBlock.options = [[{ text: 'Opção 1' }]];
    }
    if (actualType === 'counter') {
        newBlock.target = 0;
        newBlock.question = 'Novo Item de Inventário';
        newBlock.options = [[{ text: 'Novo Item', target: 0 }]];
    }

    if (window.hoverBlockIndex !== null && window.hoverBlockIndex !== undefined) {
        window.editorSchema.splice(window.hoverBlockIndex + 1, 0, newBlock);
    } else {
        window.editorSchema.push(newBlock);
    }
    window.hoverBlockIndex = null;

    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================
// PILL DRAG AND DROP LOGIC (2D GRID)
// ==========================================
let draggedPill = null; // { blockIdx, rowIdx, colIdx, width, height }
let currentDropTarget = null; // The element being hovered
let currentDropZone = null; // 'left', 'right', 'top', 'bottom'

window.handlePillDragStart = function (e) {
    e.stopPropagation();
    const el = e.currentTarget;
    draggedPill = {
        blockIdx: parseInt(el.dataset.blockidx),
        rowIdx: parseInt(el.dataset.rowidx),
        colIdx: parseInt(el.dataset.colidx),
        width: el.offsetWidth,
        height: el.offsetHeight
    };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'pill');
    setTimeout(() => { el.style.opacity = '0.3'; }, 0);
};

window.handlePillDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget; // pill-cell-wrapper
    const pillEditWrapper = target.querySelector('.pill-edit-wrapper');
    const row = target.closest('.pill-row');
    if (!row || !pillEditWrapper) return;

    const rect = pillEditWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let zone;
    if (y < 5) zone = 'drop-top';
    else if (y > rect.height - 5) zone = 'drop-bottom';
    else if (x < rect.width / 2) zone = 'drop-left';
    else zone = 'drop-right';

    if (currentDropTarget === pillEditWrapper && currentDropZone === zone) return;

    if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-left', 'drop-right', 'drop-top', 'drop-bottom');
    }

    currentDropTarget = pillEditWrapper;
    currentDropZone = zone;
    pillEditWrapper.classList.add(zone);

    document.getElementById('pill-drag-ghost')?.remove();

    if (zone === 'drop-left' || zone === 'drop-right') {
        const ghost = document.createElement('div');
        ghost.id = 'pill-drag-ghost';
        ghost.style.pointerEvents = 'none';
        ghost.style.width = (draggedPill?.width || 100) + 'px';
        ghost.style.height = (draggedPill?.height || 38) + 'px';
        ghost.style.borderRadius = '999px';
        ghost.style.background = 'rgba(59,130,246,0.15)';
        ghost.style.border = '2px dashed #3b82f6';
        ghost.style.flexShrink = '0';
        ghost.style.display = 'inline-flex';
        ghost.style.alignItems = 'center';
        ghost.style.justifyContent = 'center';
        ghost.style.fontSize = '13px';
        ghost.style.color = 'rgba(59,130,246,0.6)';
        if (zone === 'drop-left') {
            row.insertBefore(ghost, target);
        } else {
            target.after(ghost);
        }
    }
};

window.handlePillDragLeave = function (e) { };

window.handlePillDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const action = currentDropZone?.replace('drop-', '');
    const targetEl = currentDropTarget ? currentDropTarget.closest('.pill-cell-wrapper') : null;

    document.getElementById('pill-drag-ghost')?.remove();
    if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
    }

    if (!draggedPill || !targetEl || !action) {
        console.warn("handlePillDrop aborted: missing draggedPill, targetEl, or action");
        draggedPill = null;
        currentDropTarget = null;
        currentDropZone = null;
        return;
    }

    const tBlockIdx = parseInt(targetEl.dataset.blockidx);
    const tRowIdx = parseInt(targetEl.dataset.rowidx);
    const tColIdx = parseInt(targetEl.dataset.colidx);

    if (draggedPill.blockIdx === tBlockIdx) {
        const options = window.editorSchema[tBlockIdx].options;
        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedRowIdx = tRowIdx;
        let adjustedColIdx = tColIdx;

        if (options[draggedPill.rowIdx].length === 0) {
            options.splice(draggedPill.rowIdx, 1);
            if (draggedPill.rowIdx < adjustedRowIdx) adjustedRowIdx--;
        } else if (draggedPill.rowIdx === adjustedRowIdx && draggedPill.colIdx < adjustedColIdx) {
            adjustedColIdx--;
        }

        if (action === 'left') {
            options[adjustedRowIdx].splice(adjustedColIdx, 0, draggedItem);
        } else if (action === 'right') {
            options[adjustedRowIdx].splice(adjustedColIdx + 1, 0, draggedItem);
        } else if (action === 'top') {
            options.splice(adjustedRowIdx, 0, [draggedItem]);
        } else if (action === 'bottom') {
            options.splice(adjustedRowIdx + 1, 0, [draggedItem]);
        }

        window.renderCanvas();
        window.saveDebounce();
    }

    draggedPill = null;
    currentDropTarget = null;
    currentDropZone = null;
};

window.handlePillDragEnd = function (e) {
    e.currentTarget.style.opacity = '1';
    document.getElementById('pill-drag-ghost')?.remove();
    setTimeout(() => {
        if (currentDropTarget) {
            currentDropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
        }
        currentDropTarget = null;
        currentDropZone = null;
        draggedPill = null;
    }, 50);
};

window.handlePillRowDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPill) e.dataTransfer.dropEffect = 'move';
};

window.handlePillRowDrop = function (e, blockIdx, rowIdx) {
    e.preventDefault();
    e.stopPropagation();

    // If we have a tracked drop target from the last pill dragover, do the pill-level insertion
    if (draggedPill && currentDropTarget && currentDropZone) {
        window.handlePillDrop(e);
    }
};

window.handleRowDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPill) return;
    e.currentTarget.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
};

window.handleRowDragLeave = function (e) {
    e.currentTarget.classList.remove('drag-over');
};

window.handleRowDrop = function (e, blockIdx, targetRowIdx) {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget;
    target.style.borderColor = 'transparent';
    target.style.background = 'transparent';
    target.classList.remove('drag-over');
    document.getElementById('pill-drag-ghost')?.remove();

    if (!draggedPill) return;

    const tBlockIdx = blockIdx !== undefined ? blockIdx : parseInt(target.dataset.blockidx);

    if (draggedPill.blockIdx === tBlockIdx) {
        const options = window.editorSchema[draggedPill.blockIdx].options;
        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedTargetRow = targetRowIdx !== undefined ? targetRowIdx : options.length;

        if (options[draggedPill.rowIdx].length === 0) {
            options.splice(draggedPill.rowIdx, 1);
            if (draggedPill.rowIdx < adjustedTargetRow) adjustedTargetRow--;
        }

        options.splice(adjustedTargetRow, 0, [draggedItem]);

        window.renderCanvas();
        window.saveDebounce();
    }
    draggedPill = null;
    currentDropTarget = null;
    currentDropZone = null;
};

// ==========================================
// BLOCK DRAG AND DROP
// ==========================================
window.draggedBlockIndex = null;

window.handleBlockDragStart = function (e, index) {
    window.draggedBlockIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => e.target.classList.add('dragging'), 0);
};

window.handleBlockDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
};

window.handleBlockDragLeave = function (e) {
    e.currentTarget.classList.remove('drag-over');
};

window.handleBlockDrop = function (e, targetIndex) {
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    if (window.draggedBlockIndex !== null && window.draggedBlockIndex !== targetIndex) {
        const item = window.editorSchema.splice(window.draggedBlockIndex, 1)[0];
        window.editorSchema.splice(targetIndex, 0, item);
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.handleBlockDragEnd = function (e) {
    e.currentTarget.classList.remove('dragging');
    const blocks = document.querySelectorAll('.tally-block');
    blocks.forEach(b => b.classList.remove('drag-over'));
    window.draggedBlockIndex = null;
};

window.publishForm = async function (btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A Publicar...';
    btn.disabled = true;

    clearTimeout(saveTimer);
    try {
        let titleBlock = window.editorSchema.find(b => b.type === 'title');
        let formTitle = titleBlock ? (titleBlock.content || 'Novo Inventário') : 'Novo Inventário';

        const formRef = doc(db, "forms", currentFormId);

        const safeSchema = JSON.parse(JSON.stringify(window.editorSchema));
        safeSchema.forEach(block => {
            if (block.options && Array.isArray(block.options)) {
                block.options = JSON.stringify(block.options);
            }
        });

        await setDoc(formRef, {
            schema: safeSchema,
            title: formTitle,
            updatedAt: serverTimestamp()
        }, { merge: true });

        window.location.href = "dashboard.html";
    } catch (e) {
        console.error("Error publishing form:", e);
        alert("Erro ao publicar o formulário. Veja a consola.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const btnPreview = document.getElementById('btn-preview');
    if (btnPreview) {
        btnPreview.addEventListener('click', () => {
            if (!currentFormId) return;
            window.open(`inventory_view.html?id=${currentFormId}&preview=true`, '_blank');
        });
    }
});

// --- BLOCK IMAGE ENGINE (DRAG, RESIZE, CLIPBOARD, DRAG & DROP) ---
let activeImageBlockIdx = null;

function injectImageModal() {
    if (document.getElementById('image-upload-modal')) return;
    const modalDiv = document.createElement('div');
    modalDiv.id = 'image-upload-modal';
    modalDiv.className = 'image-modal hidden';
    modalDiv.onclick = (e) => window.closeImageModal(e);
    modalDiv.innerHTML = `
        <div class="image-modal-content" onclick="event.stopPropagation()">
            <div class="image-modal-header">
                <h3><i class="ph ph-image"></i> Introduzir Imagem</h3>
                <button class="image-modal-close" onclick="window.closeImageModal()"><i class="ph ph-x"></i></button>
            </div>
            <div class="image-modal-body">
                <div class="image-tab-bar">
                    <button class="image-tab-btn active" id="btn-tab-upload" onclick="window.switchImageTab('upload')"><i class="ph ph-upload-simple"></i> Ficheiro / Clipboard</button>
                    <button class="image-tab-btn" id="btn-tab-url" onclick="window.switchImageTab('url')"><i class="ph ph-link"></i> Endereço Web (URL)</button>
                </div>
                
                <div class="image-tab-content" id="image-tab-upload">
                    <div class="image-drop-zone" id="image-drop-zone">
                        <i class="ph ph-cloud-arrow-up" style="font-size: 48px; color: #6366f1; margin-bottom: 12px;"></i>
                        <p style="font-weight: 500; margin-bottom: 4px;">Arraste e solte uma imagem aqui</p>
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">ou cole do clipboard (Ctrl+V) ou procure no PC</p>
                        <button class="builder-btn primary" type="button" onclick="document.getElementById('image-file-input').click()"><i class="ph ph-folder-open"></i> Escolher Ficheiro</button>
                        <input type="file" id="image-file-input" accept="image/*" style="display: none;">
                    </div>
                </div>
                
                <div class="image-tab-content hidden" id="image-tab-url">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 13px; color: #94a3b8; font-weight: 500;">Link da Imagem</label>
                        <input type="text" id="image-url-input" class="settings-text-input" placeholder="https://exemplo.com/imagem.png" style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 8px 12px; border-radius: 6px;">
                        <button class="builder-btn primary" type="button" onclick="window.applyImageUrl()" style="margin-top: 8px; width: fit-content; align-self: flex-end;"><i class="ph ph-check"></i> Aplicar Link</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
    
    // Bind Drag & Drop Events
    const dropZone = document.getElementById('image-drop-zone');
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => { dropZone.classList.remove('drag-over'); };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            window.processImageFile(file);
        }
    };
    
    // Bind File Input Change
    document.getElementById('image-file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) window.processImageFile(file);
    };
    
    // Bind Global Paste Event Inside Modal
    document.getElementById('image-upload-modal').onpaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                window.processImageFile(file);
            }
        }
    };
}

window.triggerBlockImage = function (e, index) {
    e.stopPropagation();
    activeImageBlockIdx = index;
    injectImageModal();
    
    // Clear url field
    const urlInput = document.getElementById('image-url-input');
    if (urlInput) urlInput.value = '';
    
    // Open Modal
    document.getElementById('image-upload-modal').classList.remove('hidden');
    window.switchImageTab('upload');
};

window.closeImageModal = function (e) {
    if (e && e.target !== e.currentTarget && e.target.className !== 'image-modal-close' && !e.target.closest('.image-modal-close')) return;
    const modal = document.getElementById('image-upload-modal');
    if (modal) modal.classList.add('hidden');
    activeImageBlockIdx = null;
};

window.switchImageTab = function (tab) {
    const btnUpload = document.getElementById('btn-tab-upload');
    const btnUrl = document.getElementById('btn-tab-url');
    const contentUpload = document.getElementById('image-tab-upload');
    const contentUrl = document.getElementById('image-tab-url');
    
    if (tab === 'upload') {
        btnUpload.classList.add('active');
        btnUrl.classList.remove('active');
        contentUpload.classList.remove('hidden');
        contentUrl.classList.add('hidden');
    } else {
        btnUpload.classList.remove('active');
        btnUrl.classList.add('active');
        contentUpload.classList.add('hidden');
        contentUrl.classList.remove('hidden');
    }
};

window.processImageFile = function (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        window.setBlockImage(activeImageBlockIdx, e.target.result);
        window.closeImageModal();
    };
    reader.readAsDataURL(file);
};

window.applyImageUrl = function () {
    const url = document.getElementById('image-url-input').value.trim();
    if (url) {
        window.setBlockImage(activeImageBlockIdx, url);
        window.closeImageModal();
    }
};

window.setBlockImage = function (index, imageSrc) {
    const block = window.editorSchema[index];
    if (!block) return;
    
    block.image = imageSrc;
    block.imageX = block.imageX ?? 10;
    block.imageY = block.imageY ?? 10;
    block.imageWidth = block.imageWidth ?? 200;
    block.imageHeight = block.imageHeight ?? 150;
    
    window.renderCanvas();
    window.saveDebounce();
};

window.removeBlockImage = function (e, index) {
    if (e) e.stopPropagation();
    const block = window.editorSchema[index];
    if (!block) return;
    
    delete block.image;
    delete block.imageX;
    delete block.imageY;
    delete block.imageWidth;
    delete block.imageHeight;
    
    window.renderCanvas();
    window.saveDebounce();
};

window.adjustBlockHeightForImage = function (blockEl, block) {
    if (!block || !block.image) {
        blockEl.style.minHeight = '';
        return;
    }
    const y = block.imageY || 0;
    const h = parseInt(block.imageHeight) || 150;
    const bottom = y + h;
    blockEl.style.minHeight = Math.max(50, bottom + 16) + 'px';
};

window.startImageDrag = function (e, index) {
    if (e.button !== 0 || e.target.classList.contains('image-resize-handle') || e.target.closest('.image-delete-btn')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const block = window.editorSchema[index];
    const wrapper = document.getElementById(`image-wrapper-${index}`);
    const blockEl = wrapper.closest('.tally-block');
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = block.imageX || 0;
    const startTop = block.imageY || 0;
    
    function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        
        newLeft = Math.max(-50, Math.min(newLeft, 800));
        newTop = Math.max(-20, Math.min(newTop, 600));
        
        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';
        
        block.imageX = newLeft;
        block.imageY = newTop;
        
        window.adjustBlockHeightForImage(blockEl, block);
    }
    
    function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.saveDebounce();
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

window.startImageResize = function (e, index) {
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const block = window.editorSchema[index];
    const wrapper = document.getElementById(`image-wrapper-${index}`);
    const blockEl = wrapper.closest('.tally-block');
    
    wrapper.classList.add('resizing');
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = wrapper.offsetWidth;
    const startHeight = wrapper.offsetHeight;
    
    function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        const newWidth = Math.max(50, startWidth + dx);
        const newHeight = Math.max(40, startHeight + dy);
        
        wrapper.style.width = newWidth + 'px';
        wrapper.style.height = newHeight + 'px';
        
        block.imageWidth = newWidth;
        block.imageHeight = newHeight;
        
        window.adjustBlockHeightForImage(blockEl, block);
    }
    
    function onMouseUp() {
        wrapper.classList.remove('resizing');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.saveDebounce();
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};


// --- Hover Insertion Line Logic between blocks (Notion-style) ---
// Draws a single unified SVG shape: thin line → smooth organic curve → circle with + sign
function initHoverInsertLine() {
    const hoverLine = document.getElementById('hover-insert-line');
    const blocksContainer = document.getElementById('blocks-container');
    const editorPage = document.querySelector('.editor-page');

    if (!blocksContainer || !hoverLine || !editorPage) return;

    function buildAndRender() {
        const W = hoverLine.offsetWidth || 700;
        const H = 28;
        const cx = W / 2;
        const cy = H / 2;
        const r = 13;
        const lw = 1;
        const spread = 52;

        const x1 = cx - r - spread;
        const x2 = cx + r + spread;
        const cTop = cy - lw;
        const cBot = cy + lw;
        const cTop2 = cy - r;
        const cBot2 = cy + r;
        const d = spread * 0.82;

        const path = [
            `M 0,${cTop}`,
            `L ${x1},${cTop}`,
            `C ${x1 + d},${cTop} ${cx - d},${cTop2} ${cx},${cTop2}`,
            `C ${cx + d},${cTop2} ${x2 - d},${cTop} ${x2},${cTop}`,
            `L ${W},${cTop}`,
            `L ${W},${cBot}`,
            `L ${x2},${cBot}`,
            `C ${x2 - d},${cBot} ${cx + d},${cBot2} ${cx},${cBot2}`,
            `C ${cx - d},${cBot2} ${x1 + d},${cBot} ${x1},${cBot}`,
            `L 0,${cBot} Z`
        ].join(' ');

        const gid = `hlg_inv_${W}`;
        const ps = 5.5;

        hoverLine.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="${W}" height="${H}"
                 class="hover-line-svg"
                 style="position:absolute;left:0;top:0;pointer-events:none;overflow:visible;">
                <defs>
                    <linearGradient id="${gid}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0"         stop-color="#3b82f6" stop-opacity="0"/>
                        <stop offset="${W*0.09}" stop-color="#3b82f6" stop-opacity="0.6"/>
                        <stop offset="${W*0.91}" stop-color="#3b82f6" stop-opacity="0.6"/>
                        <stop offset="${W}"      stop-color="#3b82f6" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="${path}" fill="url(#${gid})" class="hover-line-path"
                      style="transition: filter 0.18s ease;"/>
                <line x1="${cx - ps}" y1="${cy}" x2="${cx + ps}" y2="${cy}"
                      stroke="white" stroke-width="1.8" stroke-linecap="round" pointer-events="none"/>
                <line x1="${cx}" y1="${cy - ps}" x2="${cx}" y2="${cy + ps}"
                      stroke="white" stroke-width="1.8" stroke-linecap="round" pointer-events="none"/>
            </svg>
            <button class="hover-insert-line-btn" title="Adicionar Bloco"></button>
        `;

        const btn = hoverLine.querySelector('.hover-insert-line-btn');

        btn.addEventListener('mouseenter', () => {
            const p = hoverLine.querySelector('.hover-line-path');
            if (p) p.style.filter = 'brightness(1.4)';
        });
        btn.addEventListener('mouseleave', () => {
            const p = hoverLine.querySelector('.hover-line-path');
            if (p) p.style.filter = '';
            if (!slashMenu.classList.contains('hidden')) return;
            hoverLine.classList.remove('visible');
        });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.hoverBlockIndex = parseInt(hoverLine.dataset.insertAfterIndex);
            const editorPageRect = editorPage.getBoundingClientRect();
            const lineRect = hoverLine.getBoundingClientRect();
            slashMenu.classList.remove('hidden');
            slashMenu.style.top  = `${lineRect.bottom - editorPageRect.top + 8}px`;
            slashMenu.style.left = `${lineRect.left + lineRect.width / 2 - editorPageRect.left - 100}px`;
        });
    }

    buildAndRender();
    window.addEventListener('resize', buildAndRender);

    blocksContainer.addEventListener('mousemove', (e) => {
        if (document.querySelector('.dragging')) {
            hoverLine.classList.remove('visible');
            return;
        }
        if (!slashMenu.classList.contains('hidden')) return;

        const blocks = Array.from(blocksContainer.querySelectorAll('.tally-block'));
        if (blocks.length === 0) { hoverLine.classList.remove('visible'); return; }

        const pageRect = editorPage.getBoundingClientRect();
        const mouseY = e.clientY;
        const mouseX = e.clientX;

        if (mouseX < pageRect.left || mouseX > pageRect.right) {
            hoverLine.classList.remove('visible');
            return;
        }

        let found = false;
        for (let i = 0; i < blocks.length - 1; i++) {
            const r1 = blocks[i].getBoundingClientRect();
            const r2 = blocks[i + 1].getBoundingClientRect();
            const boundaryY = (r1.bottom + r2.top) / 2;

            if (Math.abs(mouseY - boundaryY) < 14) {
                hoverLine.style.top = `${boundaryY - pageRect.top}px`;
                hoverLine.classList.add('visible');
                hoverLine.dataset.insertAfterIndex = parseInt(blocks[i].dataset.index);
                found = true;
                break;
            }
        }
        if (!found) hoverLine.classList.remove('visible');
    });

    blocksContainer.addEventListener('mouseleave', () => {
        if (!slashMenu.classList.contains('hidden')) return;
        setTimeout(() => {
            if (!hoverLine.matches(':hover') && slashMenu.classList.contains('hidden')) {
                hoverLine.classList.remove('visible');
            }
        }, 120);
    });

    hoverLine.addEventListener('mouseleave', () => {
        if (!slashMenu.classList.contains('hidden')) return;
        hoverLine.classList.remove('visible');
    });
}
initHoverInsertLine();


window.togglePillPaletteBulk = function(e, b) {
    e.stopPropagation();
    openPaletteTitleIdx = null;
    openPaletteOption = null;
    window.startSpectrum(e, 'pill-bulk', b, null, null);
};

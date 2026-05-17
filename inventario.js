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
let lastInternalRender = 0;
let ignoreNextClick = false;

window.applyColorToDOM = function (type, b, r, c, color) {
    const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
    if (!blockEl) return;
    const textColor = getContrastYIQ(color);
    if (type === 'title') {
        const h1 = blockEl.querySelector('h1');
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

            html = `<h1 ${classAttr} contenteditable="true" data-field="content" ${styleAttr}>${block.content || ''}</h1>`;
        } else if (block.type === 'counter' || block.type === 'choice-single' || block.type === 'choice-multi') {
            const options = block.options || [[]];
            const blockColor = block.pillColor || '';
            const isCounter = block.type === 'counter';

            html = `
                <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
                    <div class="block-question" contenteditable="true" data-field="question">${block.question || (isCounter ? 'Novo Item' : 'Nova Pergunta')}</div>
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
        } else {
            // Outros tipos de blocos simplificados...
            html = `<div class="block-text" contenteditable="true" data-field="content">${block.content || ''}</div>`;
        }

        let toolsHtml = `<div class="block-tools-inline">`;

        if (block.type === 'title') {
            toolsHtml += `
                <div class="tool-btn color-trigger" onclick="window.toggleTitlePalette(event, ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>
                <div class="tool-btn style-trigger" onclick="window.toggleTitleStyle(event, ${index})" title="Mudar Estilo (Texto / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>
                <div class="tool-btn size-trigger" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho (P / M / G)"><i class="ph ph-text-aa"></i></div>
            `;

            html += `
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

                    <div style="font-size: 10px; color: #64748b; margin: 10px 0 5px 0; text-transform: uppercase; letter-spacing: 0.05em;">Cores Base</div>
                    <div class="pill-palette-grid">
                        <div class="pill-color-dot" style="background:transparent; border:1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;" onclick="window.setTitleColor(${index}, '')" title="Remover Cor">
                            <i class="ph ph-prohibit" style="font-size: 14px; color: #94a3b8;"></i>
                        </div>
                        ${['#ffffff', '#0f172a', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'].map(c => `<div class="pill-color-dot" style="background:${c}" onclick="window.setTitleColor(${index}, '${c}')"></div>`).join('')}
                    </div>

                    <div class="spectrum-bar" 
                         onmousedown="window.startSpectrum(event, 'title', ${index})"
                         title="Arraste para escolher uma cor"></div>
                </div>
            `;
        }

        toolsHtml += `<div class="tool-btn drag-handle"><i class="ph ph-dots-six-vertical"></i></div><div class="tool-btn delete-btn"><i class="ph ph-trash"></i></div></div>`;
        blockEl.innerHTML = toolsHtml + html;

        blockEl.querySelector('.delete-btn').addEventListener('click', () => {
            window.editorSchema.splice(index, 1);
            window.renderCanvas();
            window.saveDebounce();
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
    if (document.querySelector('.pill-row:hover')) return;
    document.querySelectorAll('.pill-row').forEach(rowEl => {
        const blockIdx = parseInt(rowEl.dataset.blockidx);
        const rowIdx = parseInt(rowEl.dataset.rowidx);
        const pills = Array.from(rowEl.querySelectorAll('.pill-cell-wrapper'));
        if (pills.length <= 1) return;
        let currentWidth = 0, splitIndex = -1;
        pills.forEach((p, i) => {
            currentWidth += p.getBoundingClientRect().width + 8;
            if (currentWidth > 720 && splitIndex === -1 && i > 0) splitIndex = i;
        });
        if (splitIndex !== -1) {
            const block = window.editorSchema[blockIdx];
            const newRow = block.options[rowIdx].splice(splitIndex);
            block.options.splice(rowIdx + 1, 0, newRow);
            needsReRender = true;
        }
    });
    if (needsReRender) window.renderCanvas();
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
window.duplicateOption = function (b, r, c) { const copy = JSON.parse(JSON.stringify(window.editorSchema[b].options[r][c])); window.editorSchema[b].options[r].splice(c + 1, 0, copy); window.renderCanvas(); window.saveDebounce(); };
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
    openPaletteTitleIdx = b;
    openPaletteOption = null;

    document.querySelectorAll('.pill-palette').forEach(el => el.classList.add('hidden'));
    const p = document.getElementById(`title-palette-${b}`);
    if (p) p.classList.remove('hidden');
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
    const { type, b, r, c, element } = spectrumActive;
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const hue = (x / rect.width) * 360;
    const hex = hslToHex(hue, 100, 50);

    if (type === 'pill') {
        let opt = window.editorSchema[b].options[r][c];
        if (typeof opt !== 'object' || opt === null) {
            opt = { text: String(opt) };
            window.editorSchema[b].options[r][c] = opt;
        }
        opt.color = hex;
        openPaletteOption = opt;
        openPaletteTitleIdx = null;
    } else {
        window.editorSchema[b].blockColor = hex;
        openPaletteTitleIdx = b;
        openPaletteOption = null;
    }

    // Efficiently update only the target element in the DOM instead of full renderCanvas if possible,
    // but for simplicity and correctness with all styles, renderCanvas is safer.
    // To avoid lag, we'll do a partial update of the style if we can.
    const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
    if (blockEl) {
        const textColor = getContrastYIQ(hex);
        if (type === 'title') {
            const h1 = blockEl.querySelector('h1');
            if (h1) {
                if (window.editorSchema[b].blockStyle === 'border') {
                    h1.style.setProperty('--marker-color', hex);
                } else {
                    h1.style.backgroundColor = hex;
                    h1.style.color = textColor;
                }
            }
        } else if (type === 'pill') {
            const pillWrapper = blockEl.querySelector(`.pill-cell-wrapper[data-rowidx="${r}"][data-colidx="${c}"] .pill-edit-wrapper`);
            if (pillWrapper) {
                pillWrapper.style.backgroundColor = hex;
                pillWrapper.style.color = textColor;
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
        }
    });

    const slashItems = document.querySelectorAll('.slash-item');
    slashItems.forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            window.appendNewBlock(type);
            slashMenu.classList.add('hidden');
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

// color-picker.js
// Centralized singleton color picker engine for both editor.js and inventario.js

export let savedColors = JSON.parse(localStorage.getItem('cvpSavedColors')) || Array(6).fill(null);
if (!Array.isArray(savedColors) || savedColors.length !== 6) {
    savedColors = Array.isArray(savedColors) ? [...savedColors, ...Array(6).fill(null)].slice(0, 6) : Array(6).fill(null);
}
window.savedColors = savedColors;

const BASE_COLORS = [
    { hex: null,      label: 'Remover Cor' },
    { hex: '#000000', label: 'Preto'    },
    { hex: '#ffffff', label: 'Branco'   },
    { hex: '#94a3b8', label: 'Cinzento' },
    { hex: '#ef4444', label: 'Vermelho' },
    { hex: '#22c55e', label: 'Verde'    },
    { hex: '#3b82f6', label: 'Azul'     },
    { hex: '#06b6d4', label: 'Cyan'     },
    { hex: '#ec4899', label: 'Magenta'  },
    { hex: '#eab308', label: 'Amarelo'  },
    { hex: '#f97316', label: 'Laranja'  },
    { hex: '#a855f7', label: 'Violeta'  },
];

let globalPickerEl = null;
let activeTarget = null; // { type, blockIdx, r, c }

function initGlobalPicker() {
    if (globalPickerEl) return;
    globalPickerEl = document.getElementById('global-color-picker');
    if (!globalPickerEl) {
        globalPickerEl = document.createElement('div');
        globalPickerEl.id = 'global-color-picker';
        globalPickerEl.className = 'pill-palette hidden';
        document.body.appendChild(globalPickerEl);
    }
}

export function renderPaletteHTML(type, blockIdx, sc, r, c) {
    if (!sc) sc = savedColors;
    
    const colorCb = (hex) => {
        if (type === 'pill') {
            return `window.setPillColor(${blockIdx}, ${r}, ${c}, '${hex ?? ''}')`;
        } else if (type === 'inventoryItems') {
            return `window.setPillColor(${blockIdx}, ${r}, ${c}, '${hex ?? ''}', 'inventoryItems')`;
        } else if (type === 'title') {
            return `window.setTitleColor(${blockIdx}, '${hex ?? ''}')`;
        } else if (type === 'block') {
            return `window.setBlockColor('${hex ?? ''}')`;
        }
        return '';
    };

    const baseDotsHtml = BASE_COLORS.map(col => {
        if (col.hex === null) {
            return `<div class="pill-color-dot" style="background:transparent; border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center;" onclick="${colorCb(null)}" title="${col.label}"><i class="ph ph-prohibit" style="font-size:14px; color:#94a3b8;"></i></div>`;
        }
        return `<div class="pill-color-dot" style="background:${col.hex}" onclick="${colorCb(col.hex)}" title="${col.label}"></div>`;
    }).join('');

    const savedDotsHtml = sc.map((cVal, sIdx) => {
        const md = (type === 'pill' || type === 'inventoryItems')
            ? `window.handleSlotMouseDown(event, ${sIdx}, ${blockIdx}, '${type}', ${r}, ${c})`
            : `window.handleSlotMouseDown(event, ${sIdx}, ${blockIdx}, '${type}')`;
        const oc = (type === 'pill' || type === 'inventoryItems')
            ? `window.handleSlotClick(event, ${sIdx}, ${blockIdx}, '${type}', ${r}, ${c})`
            : `window.handleSlotClick(event, ${sIdx}, ${blockIdx}, '${type}')`;
        return `<div class="pill-color-dot ${!cVal ? 'empty-slot' : ''}" style="${cVal ? `background:${cVal}` : ''}" onmousedown="${md}" onmouseup="window.handleSlotMouseUp()" onclick="${oc}" title="${cVal ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}"></div>`;
    }).join('');

    const spectrumHtml = (type === 'pill' || type === 'inventoryItems')
        ? `<div class="spectrum-bar" onmousedown="window.startSpectrum(event, '${type}', ${blockIdx}, ${r}, ${c})" title="Arraste para escolher uma cor"></div>`
        : `<div class="spectrum-bar" onmousedown="window.startSpectrum(event, '${type}', ${blockIdx})" title="Arraste para escolher uma cor"></div>`;

    return `
        <div class="pill-palette-saved" style="margin-top:0; padding-top:0; border-top:none;">
            <div style="font-size:10px; color:#94a3b8; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.05em;">Minhas Cores</div>
            <div class="pill-palette-grid">${savedDotsHtml}</div>
        </div>
        <div style="font-size:10px; color:#64748b; margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:0.05em;">Cores Base</div>
        <div class="pill-palette-grid">${baseDotsHtml}</div>
        ${spectrumHtml}
    `;
}

window.renderPaletteHTML = renderPaletteHTML;

window.openColorPicker = function (e, type, blockIdx, r, c) {
    e.stopPropagation();
    e.preventDefault();
    initGlobalPicker();
    
    // Toggle check
    const isAlreadyOpen = activeTarget && 
                          activeTarget.type === type && 
                          activeTarget.blockIdx === blockIdx && 
                          activeTarget.r === r && 
                          activeTarget.c === c && 
                          !globalPickerEl.classList.contains('hidden');
                          
    if (isAlreadyOpen) {
        window.closeColorPicker();
        return;
    }

    activeTarget = { type, blockIdx, r, c };

    // Update inner content using unified HTML
    globalPickerEl.innerHTML = renderPaletteHTML(type, blockIdx, savedColors, r, c);
    
    // Set custom data attributes
    globalPickerEl.dataset.type = type;
    globalPickerEl.dataset.blockidx = blockIdx;
    if (r !== undefined) globalPickerEl.dataset.rowidx = r;
    if (c !== undefined) globalPickerEl.dataset.colidx = c;

    // Position picker next to the clicked button
    const triggerEl = e.currentTarget;
    const rect = triggerEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    let top = rect.bottom + scrollTop + 6;
    let left = rect.left + scrollLeft;
    
    // Close other elements first
    document.querySelectorAll('.pill-palette').forEach(p => {
        if (p !== globalPickerEl) p.classList.add('hidden');
    });

    globalPickerEl.classList.remove('hidden');
    
    const pickerWidth = globalPickerEl.offsetWidth || 150;
    const pickerHeight = globalPickerEl.offsetHeight || 220;
    
    if (rect.left + pickerWidth > window.innerWidth) {
        left = rect.right + scrollLeft - pickerWidth;
    }
    if (rect.bottom + pickerHeight > window.innerHeight) {
        top = rect.top + scrollTop - pickerHeight - 6;
    }
    
    globalPickerEl.style.top = `${top}px`;
    globalPickerEl.style.left = `${left}px`;
};

window.closeColorPicker = function () {
    initGlobalPicker();
    globalPickerEl.classList.add('hidden');
    activeTarget = null;
};

// Document click to close picker
document.addEventListener('click', (e) => {
    initGlobalPicker();
    if (!globalPickerEl.classList.contains('hidden')) {
        if (!globalPickerEl.contains(e.target) && 
            !e.target.closest('.pill-color-trigger') && 
            !e.target.closest('.color-trigger') && 
            !e.target.closest('.settings-btn')) {
            window.closeColorPicker();
        }
    }
});

let ignoreNextClick = false;
let longPressTimer;

window.handleSlotClick = function (e, slotIdx, blockIdx, type, r, c) {
    e.stopPropagation();
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    if (window.editorSchema) {
        if (type === 'pill' || type === 'inventoryItems') {
            const key = type === 'inventoryItems' ? 'inventoryItems' : 'options';
            let opt = window.editorSchema[blockIdx][key][r][c];
            if (typeof opt !== 'object' || opt === null) {
                opt = { text: String(opt) };
                window.editorSchema[blockIdx][key][r][c] = opt;
            }
            if (window.setOpenPaletteOption) window.setOpenPaletteOption(opt);
        } else if (type === 'title') {
            if (window.setOpenPaletteTitleIdx) window.setOpenPaletteTitleIdx(blockIdx);
        }
    }

    const color = savedColors[slotIdx];
    if (color) {
        if (type === 'pill' || type === 'inventoryItems') {
            window.setPillColor(blockIdx, r, c, color, type === 'inventoryItems' ? 'inventoryItems' : 'options');
        } else if (type === 'title') {
            window.setTitleColor(blockIdx, color);
        } else if (type === 'block') {
            window.setBlockColor(color);
        }
    } else {
        let currentColor = '#ffffff';
        if (type === 'pill' || type === 'inventoryItems') {
            const key = type === 'inventoryItems' ? 'inventoryItems' : 'options';
            const opt = window.editorSchema[blockIdx][key][r][c];
            currentColor = (typeof opt === 'object' && opt && opt.color) ? opt.color : '#ffffff';
        } else if (type === 'title') {
            currentColor = window.editorSchema[blockIdx].blockColor || '#ffffff';
        } else if (type === 'block') {
            currentColor = window.editorSchema[blockIdx].pillColor || '#ffffff';
        }

        savedColors[slotIdx] = currentColor;
        localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));
        window.updateSavedColorsUI();
    }
};

window.handleSlotMouseDown = function (e, slotIdx, blockIdx, type, r, c) {
    e.stopPropagation();

    if (window.editorSchema) {
        if (type === 'pill' || type === 'inventoryItems') {
            const key = type === 'inventoryItems' ? 'inventoryItems' : 'options';
            let opt = window.editorSchema[blockIdx][key][r][c];
            if (typeof opt !== 'object' || opt === null) {
                opt = { text: String(opt) };
                window.editorSchema[blockIdx][key][r][c] = opt;
            }
            if (window.setOpenPaletteOption) window.setOpenPaletteOption(opt);
        } else if (type === 'title') {
            if (window.setOpenPaletteTitleIdx) window.setOpenPaletteTitleIdx(blockIdx);
        }
    }

    longPressTimer = setTimeout(() => {
        if (savedColors[slotIdx]) {
            savedColors[slotIdx] = null;
            localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));
            window.updateSavedColorsUI();
            ignoreNextClick = true;
        }
    }, 800);
};

window.handleSlotMouseUp = function () {
    clearTimeout(longPressTimer);
};

window.updateSavedColorsUI = function () {
    initGlobalPicker();
    // 1. Update slots inside the active singleton picker if it is open
    if (!globalPickerEl.classList.contains('hidden') && activeTarget) {
        const { type, blockIdx, r, c } = activeTarget;
        const savedSection = globalPickerEl.querySelector('.pill-palette-saved');
        if (savedSection) {
            const grid = savedSection.querySelector('.pill-palette-grid');
            if (grid) {
                grid.innerHTML = savedColors.map((cVal, sIdx) => {
                    const md = (type === 'pill' || type === 'inventoryItems')
                        ? `window.handleSlotMouseDown(event, ${sIdx}, ${blockIdx}, '${type}', ${r}, ${c})`
                        : `window.handleSlotMouseDown(event, ${sIdx}, ${blockIdx}, '${type}')`;
                    const oc = (type === 'pill' || type === 'inventoryItems')
                        ? `window.handleSlotClick(event, ${sIdx}, ${blockIdx}, '${type}', ${r}, ${c})`
                        : `window.handleSlotClick(event, ${sIdx}, ${blockIdx}, '${type}')`;
                    return `<div class="pill-color-dot ${!cVal ? 'empty-slot' : ''}" style="${cVal ? `background:${cVal}` : ''}" onmousedown="${md}" onmouseup="window.handleSlotMouseUp()" onclick="${oc}" title="${cVal ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}"></div>`;
                }).join('');
            }
        }
    }

    // 2. Update block settings popover palette
    const blockSavedPalette = document.getElementById('block-saved-palette');
    if (blockSavedPalette) {
        const activeIdx = window.activeSettingsIndex || 0;
        blockSavedPalette.innerHTML = savedColors.map((cVal, sIdx) => {
            const md = `window.handleSlotMouseDown(event, ${sIdx}, ${activeIdx}, 'block')`;
            const oc = `window.handleSlotClick(event, ${sIdx}, ${activeIdx}, 'block')`;
            return `<div class="pill-color-dot ${!cVal ? 'empty-slot' : ''}" style="${cVal ? `background:${cVal}` : ''}" onmousedown="${md}" onmouseup="window.handleSlotMouseUp()" onclick="${oc}" title="${cVal ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}"></div>`;
        }).join('');
    }
};

let spectrumActive = null;

window.startSpectrum = function (e, type, b, r, c) {
    e.preventDefault();
    e.stopPropagation();
    spectrumActive = { type, b, r, c, element: e.currentTarget };
    updateSpectrum(e);

    const moveHandler = (me) => { if (spectrumActive) updateSpectrum(me); };
    const upHandler = (ue) => {
        if (spectrumActive) {
            updateSpectrum(ue);
            if (window.saveDebounce) window.saveDebounce();
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
    const { b, element, type, r, c } = spectrumActive;
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const hue = (x / rect.width) * 360;
    const hex = hslToHex(hue, 100, 50);

    if (type === 'pill' || type === 'inventoryItems') {
        window.setPillColor(b, r, c, hex, type === 'inventoryItems' ? 'inventoryItems' : 'options');
    } else if (type === 'title') {
        window.setTitleColor(b, hex);
    } else if (type === 'block') {
        window.setBlockColor(hex);
    } else if (type === 'pill-bulk') {
        if (window.setPillColorBulk) {
            window.setPillColorBulk(b, hex);
        } else {
            window.editorSchema[b].pillColor = hex;
            const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
            if (blockEl) {
                // compute contrast color using YIQ formula
                const hexcolor = hex.replace("#", "");
                const rgb = hexcolor.length === 3 ? hexcolor.split('').map(ch => ch + ch).join('') : hexcolor;
                const rVal = parseInt(rgb.substr(0, 2), 16);
                const gVal = parseInt(rgb.substr(2, 2), 16);
                const bVal = parseInt(rgb.substr(4, 2), 16);
                const yiq = ((rVal * 299) + (gVal * 587) + (bVal * 114)) / 1000;
                const textColor = (yiq >= 128) ? '#0f172a' : '#ffffff';

                blockEl.querySelectorAll('.choice-pill, .counter-btn').forEach(pill => {
                    pill.style.backgroundColor = hex;
                    pill.style.color = textColor;
                    pill.style.borderColor = 'transparent';
                });
            }
        }
    }
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

let savedColors = JSON.parse(localStorage.getItem('cvpSavedColors')) || Array(6).fill(null);
if (!Array.isArray(savedColors) || savedColors.length !== 6) {
    savedColors = Array.isArray(savedColors) ? [...savedColors, ...Array(6).fill(null)].slice(0, 6) : Array(6).fill(null);
}

let openPaletteId = null;
let lastInternalRender = 0;
let ignoreNextClick = false;

function handleSlotClick(e, slotIdx, blockIdx) {
    e.stopPropagation();
    const color = savedColors[slotIdx];

    if (color) {
        // Apply color and CLOSE
        openPaletteId = null;
        setTitleColor(blockIdx, color);
    } else {
        // Save current color to empty slot and STAY OPEN
        openPaletteId = `title-palette-${blockIdx}`;
        const currentColor = editorSchema[blockIdx].blockColor || '#ffffff';
        savedColors[slotIdx] = currentColor;
        localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));
        renderCanvas();
    }
}

let longPressTimer;
function handleSlotMouseDown(e, slotIdx, blockIdx) {
    openPaletteId = `title-palette-${blockIdx}`;
    longPressTimer = setTimeout(() => {
        if (savedColors[slotIdx]) {
            savedColors[slotIdx] = null;
            localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));
            renderCanvas();
            ignoreNextClick = true; // Block the subsequent release click
        }
    }, 800);
}

function handleSlotMouseUp() {
    clearTimeout(longPressTimer);
}


function renderBlockSavedColors() {
    const section = document.getElementById('block-saved-section');
    const container = document.getElementById('block-saved-palette');
    if (!container) return;

    if (savedColors.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'flex';
    container.innerHTML = savedColors.map((c, sIdx) => `
        <div class="color-dot ${!c ? 'empty-slot' : ''}" 
             style="${c ? `background:${c}` : ''}" 
             onmousedown="handleSlotMouseDown(event, ${sIdx})"
             onmouseup="handleSlotMouseUp()"
             onclick="handleSlotClick(event, ${sIdx}, ${activeSettingsIndex})">
        </div>
    `).join('');
}

// Global helper for block colors
window.setBlockColor = function (color) {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].pillColor = color;
        const hexInput = document.getElementById('block-hex-input');
        if (hexInput) hexInput.value = color || '';
        renderCanvas();
        saveDebounce();
    }
};

window.toggleTitlePalette = function (e, b) {
    e.stopPropagation();
    const id = `title-palette-${b}`;
    const p = document.getElementById(id);

    // ONLY OPEN - NEVER CLOSE via this function
    document.querySelectorAll('.pill-palette').forEach(el => el.classList.add('hidden'));
    p.classList.remove('hidden');
    openPaletteId = id;
};

window.setTitleColor = function (b, color) {
    editorSchema[b].blockColor = color;
    renderCanvas();
    saveDebounce();
};
window.toggleTitleStyle = function (e, b) {
    e.stopPropagation();
    const styles = ['full', 'inline', 'border'];
    const current = editorSchema[b].blockStyle || 'full';
    const nextIdx = (styles.indexOf(current) + 1) % styles.length;
    editorSchema[b].blockStyle = styles[nextIdx];
    renderCanvas();
    saveDebounce();
};

// Global Color Picker for pills
const pillGlobalPicker = document.createElement('input');
pillGlobalPicker.type = 'color';
pillGlobalPicker.style.position = 'fixed';
pillGlobalPicker.style.opacity = '0';
pillGlobalPicker.style.pointerEvents = 'none';
pillGlobalPicker.style.width = '1px';
pillGlobalPicker.style.height = '1px';
document.body.appendChild(pillGlobalPicker);

let activeColorTarget = null; // { blockIdx, rowIdx, colIdx }

pillGlobalPicker.addEventListener('input', (e) => {
    if (activeColorTarget) {
        const { blockIdx, rowIdx, colIdx } = activeColorTarget;
        setPillColor(blockIdx, rowIdx, colIdx, e.target.value);
    }
});

pillGlobalPicker.addEventListener('change', (e) => {
    if (activeColorTarget) {
        // no auto-save
    }
    activeColorTarget = null;
});

const blockGlobalPicker = document.createElement('input');
blockGlobalPicker.type = 'color';
blockGlobalPicker.style.position = 'fixed';
blockGlobalPicker.style.opacity = '0';
blockGlobalPicker.style.pointerEvents = 'none';
blockGlobalPicker.style.width = '1px';
blockGlobalPicker.style.height = '1px';
document.body.appendChild(blockGlobalPicker);

blockGlobalPicker.addEventListener('input', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].pillColor = e.target.value;
        const hexInput = document.getElementById('block-hex-input');
        if (hexInput) hexInput.value = e.target.value;
        renderCanvas();
        saveDebounce();
    }
});

blockGlobalPicker.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        // no auto-save
        // Ensure hex input shows the final color
        const hexInput = document.getElementById('block-hex-input');
        if (hexInput) hexInput.value = e.target.value;
    }
});

window.openBlockFullPicker = function (e) {
    if (activeSettingsIndex !== null) {
        const rect = e ? e.currentTarget.getBoundingClientRect() : { top: 100, left: 100 };
        // Position the hidden input exactly where the trigger is
        blockGlobalPicker.style.top = `${rect.top}px`;
        blockGlobalPicker.style.left = `${rect.left}px`;

        blockGlobalPicker.value = editorSchema[activeSettingsIndex].pillColor || '#22c55e';
        blockGlobalPicker.click();
    }
};

// ==========================================
// RENDERING THE CANVAS
// ==========================================
function renderCanvas() {
    blocksContainer.innerHTML = '';
    lastInternalRender = Date.now();

    if (editorSchema.length === 0) {
        editorSchema = [{ type: 'title', content: '' }];
    }

    editorSchema.forEach((block, index) => {
        const blockEl = document.createElement('div');
        blockEl.className = `tally-block block-${block.type}`;
        blockEl.dataset.index = index;

        // Drag and drop listeners
        blockEl.addEventListener('dragstart', handleDragStart);
        blockEl.addEventListener('dragover', handleDragOver);
        blockEl.addEventListener('dragleave', handleDragLeave);
        blockEl.addEventListener('drop', handleDrop);
        blockEl.addEventListener('dragend', handleDragEnd);

        // Build internal HTML based on type
        let html = '';
        if (block.type === 'title') {
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full';
            const bSize = block.blockSize || 'large';
            const sizeMap = { 'small': '18px', 'medium': '26px', 'large': '36px' };
            const fontSize = sizeMap[bSize] || '36px';

            let styleAttr = `style="font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2;"`;
            let classAttr = `class="block-title-large"`;
            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    styleAttr = `style="--marker-color: ${bColor}; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; color: #f8fafc;"`;
                    classAttr = `class="block-title-large style-marker"`;
                } else {
                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                    styleAttr = `style="background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; ${displayStyle}"`;
                }
            }
            blockEl.innerHTML = `<div ${classAttr} contenteditable="true" data-field="content" ${styleAttr}>${block.content || ''}</div>`;
        } else if (block.type === 'section') {
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full';
            const bSize = block.blockSize || 'medium';
            const sizeMap = { 'small': '14px', 'medium': '18px', 'large': '24px' };
            const fontSize = sizeMap[bSize] || '18px';

            let styleAttr = `style="font-size: ${fontSize};"`;
            let classAttr = `class="block-section-heading"`;
            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    styleAttr = `style="--marker-color: ${bColor}; font-size: ${fontSize}; color: #f8fafc;"`;
                    classAttr = `class="block-section-heading style-marker"`;
                } else {
                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                    styleAttr = `style="background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; ${displayStyle}"`;
                }
            }
            blockEl.innerHTML = `<h2 ${classAttr} contenteditable="true" data-field="question" ${styleAttr}>${block.question || ''}</h2>`;
        } else if (block.type === 'desc') {
            const descContent = typeof block.content === 'string' ? block.content : '';
            blockEl.innerHTML = `<div class="block-desc" contenteditable="true" data-field="content">${descContent}</div>`;
        } else if (block.type === 'divider') {
            blockEl.innerHTML = `<div class="block-divider-line"></div>`;
        } else {
            // Standard Question Blocks
            html = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div class="block-question" style="margin-bottom: 0;" contenteditable="true" data-field="question">${block.question || ''}</div>
                    <button class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="toggleRequired(${index})" title="${block.required ? 'Clique para remover obrigatoriedade' : 'Clique para tornar obrigat├│rio'}" style="cursor: pointer; background: transparent; border: none; font-size: 20px; transition: color 0.2s;">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;" contenteditable="true" data-field="description">${block.description || 'Descri├º├úo opcional...'}</div>` : ''}
            `;

            if (block.type === 'text-short' || block.type === 'text-long') {

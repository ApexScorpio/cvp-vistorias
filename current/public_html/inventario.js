/**

 * INVENTÁRIO BUILDER ENGINE - FINAL STABLE VERSION

 */

import { auth, db, onAuthStateChanged, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
import './color-picker.js?v=1781534000';

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

// Bind to window to allow color-picker.js to read/write these variables
let openPaletteOption = null;
Object.defineProperty(window, 'openPaletteOption', {
    get() { return openPaletteOption; },
    set(v) { openPaletteOption = v; }
});
window.setOpenPaletteOption = (v) => { openPaletteOption = v; };

let openPaletteTitleIdx = null;
Object.defineProperty(window, 'openPaletteTitleIdx', {
    get() { return openPaletteTitleIdx; },
    set(v) { openPaletteTitleIdx = v; }
});
window.setOpenPaletteTitleIdx = (v) => { openPaletteTitleIdx = v; };

let currentHoveredBlockForTools = null; // Sticky reference for toolbar

window.invOptionsBc = new BroadcastChannel('inv_options');

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


// Color slot functions moved to color-picker.js;







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

window.pillSizingConfig = {
    mode: 'global',
    type: 'dynamic',
    sharedWidth: 200
};

let currentForm = null;

let hasUnsavedChanges = false;

let saveTimer = null;



// Global exports for HTML event handlers


window.openSlashAtGap = function(index, e) {
    e.stopPropagation();
    window.hoverBlockIndex = index;
    const slashMenu = document.getElementById('slash-menu');
    const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
    const rect = e.currentTarget.getBoundingClientRect();
    if (slashMenu) {
        slashMenu.classList.remove('hidden');
        slashMenu.style.top = `${rect.bottom - editorPageRect.top}px`;
        slashMenu.style.left = `${rect.left - editorPageRect.left}px`;
    }
};

window.renderCanvas = function () {
    const blocksContainer = document.getElementById('blocks-container');
    if (!blocksContainer) return;

    blocksContainer.innerHTML = '';
    blocksContainer.style.display = 'flex';
    blocksContainer.style.flexWrap = 'wrap';
    blocksContainer.style.gap = '16px';
    blocksContainer.style.padding = '0 40px';

    lastInternalRender = Date.now();



    window.editorSchema.forEach((block, index) => {
        // Identify groups of parallel blocks sharing the same blockGroup id
        const blockGroup = block.blockGroup;
        let groupCount = 1;
        let isParallel = false;
        
        if (blockGroup) {
            // Count how many consecutive blocks share this group id
            let startIdx = index;
            while (startIdx > 0 && window.editorSchema[startIdx - 1].blockGroup === blockGroup) {
                startIdx--;
            }
            let endIdx = index;
            while (endIdx < window.editorSchema.length - 1 && window.editorSchema[endIdx + 1].blockGroup === blockGroup) {
                endIdx++;
            }
            groupCount = (endIdx - startIdx) + 1;
            
            // If it's not the first block in the group, we skip the insertion gap to let them align horizontally
            if (index > startIdx) {
                isParallel = true;
            }
        }

        const gapBefore = document.createElement('div');
        gapBefore.className = 'block-insertion-gap';
        
        if (isParallel) {
            gapBefore.style.display = 'none';
        } else {
            gapBefore.style.width = '100%';
        }
        gapBefore.innerHTML = `
            <button class="insertion-btn" onclick="window.openSlashAtGap(${index - 1}, event)" title="Adicionar bloco aqui">
                <i class="ph ph-plus"></i>
            </button>
        `;
        blocksContainer.appendChild(gapBefore);

        const blockEl = document.createElement('div');
        blockEl.className = `tally-block block-${block.type}`;
        blockEl.dataset.index = index;
        
        if (blockGroup && groupCount > 1) {
            const widthPct = (100 / groupCount);
            blockEl.style.flex = `1 1 calc(${widthPct}% - 12px)`;
            blockEl.style.maxWidth = `calc(${widthPct}% - 12px)`;
            blockEl.style.boxSizing = 'border-box';
        } else {
            blockEl.style.flex = '1 1 100%';
            blockEl.style.maxWidth = '100%';
        }



        const bColor = block.blockColor || '';

        const bStyle = block.blockStyle || 'full';
        const isPredefinedQuestion = ['text-short', 'text-long', 'date'].includes(block.type);
        const bSize = block.blockSize || (isPredefinedQuestion ? 'small' : 'medium');

        const sizeMap = { 'small': '30px', 'medium': '42px', 'large': '54px' };
        const qFontSize = sizeMap[bSize] || '42px';

        let qStyle = `font-size: ${qFontSize} !important;`;
        let qClass = '';

        if (bColor) {
            const textColor = getContrastYIQ(bColor);
            if (bStyle === 'border') {
                qStyle += ` --marker-color: ${bColor}; color: #f8fafc;`;
                qClass = 'style-marker';
            } else {
                const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                qStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; ${displayStyle}`;
            }
        }



        let html = '';

        if (block.type === 'title') {

            const bColor = block.blockColor || '';

            const bStyle = block.blockStyle || 'full'; // 'full', 'inline', 'border'

            const bSize = block.blockSize || 'large'; // 'small', 'medium', 'large'



            const sizeMap = { 'small': '30px', 'medium': '42px', 'large': '54px' };
            const fontSize = sizeMap[bSize] || '54px';



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
            const sizeLabel = bSize === 'small' ? 'H3' : (bSize === 'medium' ? 'H2' : 'H1');
            const sizeHtml = `<span class="canvas-size-btn" contenteditable="false" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho (${sizeLabel})" style="cursor: pointer; color: #94a3b8; font-size: 13px; font-weight: 800; border: 1px solid #475569; border-radius: 4px; padding: 2px 5px; display: inline-flex; align-items: center; justify-content: center; user-select: none; transition: all 0.2s; margin-right: 8px; min-width: 22px; height: 20px; line-height: 1;">${sizeLabel}</span>`;
            
            const pinHtml = sizeHtml + `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 24px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;

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



            const sizeMap = { 'small': '30px', 'medium': '42px', 'large': '54px' };
            const fontSize = sizeMap[bSize] || '42px';



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
            const sizeLabel = bSize === 'small' ? 'H3' : (bSize === 'medium' ? 'H2' : 'H1');
            const sizeHtml = `<span class="canvas-size-btn" contenteditable="false" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho (${sizeLabel})" style="cursor: pointer; color: #94a3b8; font-size: 11px; font-weight: 800; border: 1px solid #475569; border-radius: 4px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; user-select: none; transition: all 0.2s; margin-right: 8px; min-width: 18px; height: 16px; line-height: 1;">${sizeLabel}</span>`;
            
            const pinHtml = sizeHtml + `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 18px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;

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

            const bSize = block.blockSize || 'medium';

            const sizeLabel = bSize === 'small' ? 'H3' : (bSize === 'medium' ? 'H2' : 'H1');
            const sizeHtml = `<span class="canvas-size-btn" contenteditable="false" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho (${sizeLabel})" style="cursor: pointer; color: #94a3b8; font-size: 11px; font-weight: 800; border: 1px solid #475569; border-radius: 4px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; user-select: none; transition: all 0.2s; margin-right: 8px; min-width: 18px; height: 16px; line-height: 1;">${sizeLabel}</span>`;
            let pinHtml = sizeHtml;
            if (isCounter) {
                const isSticky = block.isSticky !== false;
                pinHtml += `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 18px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
            }



            html = `

                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">

                    ${pinHtml}

                    <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="${qStyle}">${block.question || (isCounter ? 'Novo Item' : 'Nova Pergunta')}</div>

                    ${isCounter ? `<button class="required-star-btn" onclick="window.toggleBlockRequired(event, ${index})" title="${block.required ? 'Clique para remover obrigatoriedade' : 'Clique para tornar obrigatório'}" style="cursor: pointer; background: transparent; border: none; font-size: 24px; font-weight: 700; color: ${block.required ? '#ef4444' : '#cbd5e1'}; transition: color 0.2s; padding: 0; line-height: 1;">*</button>` : ''}

                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;">${block.description || 'Descricao opcional...'}</div>` : ''}
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
                    const sharedHeight = (window.pillSizingConfig && window.pillSizingConfig.sharedHeight) || 42;


                    // Sizing calculations
                    const sizingScope = (window.pillSizingConfig && window.pillSizingConfig.mode) || 'global';
                    const sizingType = (window.pillSizingConfig && window.pillSizingConfig.type) || 'dynamic';
                    const sharedWidth = (window.pillSizingConfig && window.pillSizingConfig.sharedWidth) || 200;

                    let optHeight = sharedHeight;
                    if (sizingScope === 'individual') {
                        optHeight = (typeof opt === 'object' && opt.height !== undefined) ? opt.height : sharedHeight;
                    }

                    let wrapperStyle = '';
                    if (sizingScope === 'global') {
                        if (sizingType === 'fixed') {
                            wrapperStyle = `width: ${sharedWidth}px; max-width: none;`;
                        } else {
                            // global + dynamic: auto-calculated after rendering by adjustGlobalDynamicWidths
                            wrapperStyle = `width: auto; max-width: 310px;`;
                        }
                    } else { // individual
                        if (sizingType === 'fixed') {
                            const individualWidth = (typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
                            wrapperStyle = `width: ${individualWidth}px; max-width: none;`;
                        } else { // individual + dynamic
                            wrapperStyle = `width: auto; max-width: 310px;`;
                        }
                    }

                    html += `

                        <div class="pill-cell-wrapper" draggable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" ondragstart="window.handlePillDragStart(event)" ondragover="window.handlePillDragOver(event)" ondragleave="window.handlePillDragLeave(event)" ondrop="window.handlePillDrop(event)" ondragend="window.handlePillDragEnd(event)" style="${wrapperStyle}">

                            <div class="pill-edit-wrapper" style="${styleAttr} min-height: ${optHeight}px !important; height: auto !important; max-height: 80px !important;">

                                <div class="pill-drag-handle">

                                    <i class="ph ph-dots-six-vertical"></i>

                                </div>

                                <span class="pill-input" contenteditable="true" data-placeholder="Nome" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="color: inherit;">${optText}</span>

                                ${isCounter ? `<div class="pill-inventory-target"><span>QT</span><input type="number" class="pill-target-input" value="${optTarget}" onchange="window.setPillTarget(${index}, ${rowIdx}, ${colIdx}, this.value)"></div>` : ''}

                                <button class="pill-clone-btn" title="Duplicar Opção" onclick="window.duplicateOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-copy"></i></button>

                                <button class="pill-color-trigger" onclick="window.openColorPicker(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-palette"></i></button>

                                <button class="pill-delete-btn" onclick="window.removeOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-x"></i></button>

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

            const sizeLabel = bSize === 'small' ? 'H3' : (bSize === 'medium' ? 'H2' : 'H1');
            const sizeHtml = `<span class="canvas-size-btn" contenteditable="false" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho (${sizeLabel})" style="cursor: pointer; color: #94a3b8; font-size: 11px; font-weight: 800; border: 1px solid #475569; border-radius: 4px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; user-select: none; transition: all 0.2s; margin-right: 8px; min-width: 18px; height: 16px; line-height: 1;">${sizeLabel}</span>`;

            html = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    ${sizeHtml}
                    <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="margin-bottom: 0; ${qStyle}">${block.question || 'Nova Pergunta'}</div>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;">${block.description || 'Descrição opcional...'}</div>` : ''}
                <div class="fake-input" style="${height}">${placeholder}</div>
            `;

        } else if (block.type === 'date') {

            const today = new Date().toISOString().split('T')[0];
            const sizeLabel = bSize === 'small' ? 'H3' : (bSize === 'medium' ? 'H2' : 'H1');
            const sizeHtml = `<span class="canvas-size-btn" contenteditable="false" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho (${sizeLabel})" style="cursor: pointer; color: #94a3b8; font-size: 11px; font-weight: 800; border: 1px solid #475569; border-radius: 4px; padding: 1px 4px; display: inline-flex; align-items: center; justify-content: center; user-select: none; transition: all 0.2s; margin-right: 8px; min-width: 18px; height: 16px; line-height: 1;">${sizeLabel}</span>`;

            html = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    ${sizeHtml}
                    <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="margin-bottom: 0; ${qStyle}">${block.question || 'Data'}</div>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;">${block.description || 'Descrição opcional...'}</div>` : ''}
                <input type="date" class="fake-input" style="padding: 10px; margin-top: 4px; font-family: inherit; font-size: 15px; width: fit-content; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f8fafc; color-scheme: dark;" value="${today}" disabled>
            `;

        } else {

            // Outros tipos de blocos simplificados...

            html = `<div class="block-text" contenteditable="true" data-field="content">${block.content || ''}</div>`;

        }







        const isSticky = block.isSticky !== false;



        let toolsHtml = `<div class="block-tools-inline">`;

        toolsHtml += `

            <div class="tool-btn color-trigger" onclick="window.openColorPicker(event, 'title', ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>

            <div class="tool-btn style-trigger" onclick="window.toggleTitleStyle(event, ${index})" title="Mudar Estilo (Texto / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>

            <div class="tool-btn size-trigger" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho"><i class="ph ph-text-aa"></i></div>

            <div class="tool-btn sticky-trigger" onclick="window.toggleBlockSticky(event, ${index})" title="Fixar Cabeçalho (Sticky)" style="cursor: pointer; transition: color 0.2s; ${isSticky ? 'color: #3b82f6;' : 'color: #cbd5e1;'}">

                <i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i>

            </div>

        `;





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

            <div class="tool-btn settings-btn" onclick="window.openBlockSettings(event, ${index})" title="Definições"><i class="ph ph-gear"></i></div>

            <div class="tool-btn drag-handle"><i class="ph ph-dots-six-vertical"></i></div>

            <div class="tool-btn duplicate-btn" onclick="window.duplicateBlockDirect(event, ${index})" title="Duplicar Bloco"><i class="ph ph-copy"></i></div>

            <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>

            <div class="tool-btn delete-btn"><i class="ph ph-trash"></i></div>

        </div>`;



        blockEl.innerHTML = toolsHtml + html;



        // Force relative coordinates and adjust dynamic height to fit image bounding box

        blockEl.style.position = 'relative';

        window.adjustBlockHeightForImage(blockEl, block);



        blockEl.addEventListener('mousemove', (e) => {

            if (e.target.closest('.block-tools-inline')) return;

            const tools = blockEl.querySelector('.block-tools-inline');

            if (!tools) return;

            const rect = blockEl.getBoundingClientRect();

            const toolsHeight = tools.offsetHeight || 160;



            if (rect.height > toolsHeight + 12) {

                const mouseY = e.clientY - rect.top;

                let targetTop = mouseY - toolsHeight / 2;

                const minTop = 6;

                const maxTop = rect.height - toolsHeight - 6;

                targetTop = Math.max(minTop, Math.min(targetTop, maxTop));

                tools.style.top = `${targetTop}px`;

            } else {

                tools.style.top = '6px';

            }

        });



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
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                }
            });

            input.addEventListener('blur', (e) => {
                const r = parseInt(input.dataset.rowidx);
                const c = parseInt(input.dataset.colidx);
                const val = (e.target.value !== undefined ? e.target.value : e.target.innerText).trim();
                if (typeof window.editorSchema[index].options[r][c] === 'object') {
                    window.editorSchema[index].options[r][c].text = val;
                } else {
                    window.editorSchema[index].options[r][c] = val;
                }
                window.saveDebounce();
            });

            input.addEventListener('input', (e) => {
                const r = parseInt(input.dataset.rowidx);
                const c = parseInt(input.dataset.colidx);
                const val = (e.target.value !== undefined ? e.target.value : e.target.innerText).trim();
                if (typeof window.editorSchema[index].options[r][c] === 'object') {
                    window.editorSchema[index].options[r][c].text = val;
                } else {
                    window.editorSchema[index].options[r][c] = val;
                }
                window.checkAndSplitRows();
                window.adjustGlobalDynamicWidths();
                window.fitText(e.target);
            });
        });

                blocksContainer.appendChild(blockEl);

    });

    const endGap = document.createElement('div');
    endGap.className = 'block-insertion-gap';
    endGap.innerHTML = `
        <button class="insertion-btn" onclick="window.openSlashAtGap(${window.editorSchema.length - 1}, event)" title="Adicionar bloco no final">
            <i class="ph ph-plus"></i>
        </button>
    `;
    blocksContainer.appendChild(endGap);




    // Trigger auto-split

    setTimeout(() => {
        window.checkAndSplitRows();
        window.adjustGlobalDynamicWidths();
    }, 300);

    // Calculate global dynamic widths if active
    window.adjustGlobalDynamicWidths();

    // Auto-fit all pill input texts
    document.querySelectorAll('.pill-input').forEach(el => window.fitText(el));

    // Refresh sidebar settings if open
    window.renderSidebarSettings();

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

            const themeData = (window.currentFormConfig && window.currentFormConfig.theme) ? window.currentFormConfig.theme : {};
            await setDoc(formRef, { 
                schema: safeSchema, 
                pillSizing: window.pillSizingConfig,
                showReplenishment: (window.pillSizingConfig && window.pillSizingConfig.showReplenishment !== undefined) ? window.pillSizingConfig.showReplenishment : false,
                showMainTitle: (window.pillSizingConfig && window.pillSizingConfig.showMainTitle !== undefined) ? window.pillSizingConfig.showMainTitle : false,
                useLocations: window.useLocations || false,
                locations: window.locations || [],
                theme: themeData,
                updatedAt: serverTimestamp() 
            }, { merge: true });

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
                    if (typeof targetInput.setSelectionRange === 'function') {
                        targetInput.setSelectionRange(focusedPill.selectionStart, focusedPill.selectionEnd);
                    } else {
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(targetInput);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
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

// Local palette togglers replaced by global openColorPicker

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



// Spectrum functions moved to color-picker.js







onAuthStateChanged(auth, async (user) => {

    if (!user) { window.location.href = 'login.html'; return; }

    const formSnap = await getDoc(doc(db, "forms", currentFormId));

    if (formSnap.exists()) {

        const data = formSnap.data();

        window.editorSchema = data.schema || [];
        window.useLocations = data.useLocations || false;
        window.locations = data.locations || [];

        window.editorSchema.forEach(block => { if (typeof block.options === 'string') block.options = JSON.parse(block.options); });


        // Load pill sizing config
        if (data.pillSizing) {
            window.pillSizingConfig = data.pillSizing;
            if (!window.pillSizingConfig.mode) window.pillSizingConfig.mode = 'global';
            if (!window.pillSizingConfig.type) window.pillSizingConfig.type = 'dynamic';
            if (!window.pillSizingConfig.sharedWidth) window.pillSizingConfig.sharedWidth = 200;
            if (!window.pillSizingConfig.sharedHeight) window.pillSizingConfig.sharedHeight = 42;
        } else {
            window.pillSizingConfig = {
                mode: 'global',
                type: 'dynamic',
                sharedWidth: 200,
                sharedHeight: 42
            };
        }

        // Load theme / cover image
        window.currentFormConfig = { theme: data.theme || {} };
        if (window.currentFormConfig.theme && window.currentFormConfig.theme.coverImage) {
            const coverBlock = document.getElementById('cover-block');
            if (coverBlock) {
                coverBlock.style.backgroundImage = `url('${window.currentFormConfig.theme.coverImage}')`;
            }
        }

        // Sync sidebar inputs to match loaded settings
        window.syncSidebarInputs();

        window.renderCanvas();
        window.renderLocations();

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

        const settingsPopover = document.getElementById('settings-popover');
        if (settingsPopover && !settingsPopover.classList.contains('hidden') && !e.target.closest('#settings-popover') && !e.target.closest('.settings-btn')) {
            settingsPopover.classList.add('hidden');
            window.activeSettingsIndex = null;
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

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // If hovering on the leftmost or rightmost 25% of the block, show horizontal alignment target
    e.currentTarget.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');
    if (mouseX < rect.width * 0.25) {
        e.currentTarget.classList.add('drag-over-left');
    } else if (mouseX > rect.width * 0.75) {
        e.currentTarget.classList.add('drag-over-right');
    } else {
        e.currentTarget.classList.add('drag-over');
    }
};



window.handleBlockDragLeave = function (e) {
    e.currentTarget.classList.remove('drag-over');
    e.currentTarget.classList.remove('drag-over-left');
    e.currentTarget.classList.remove('drag-over-right');
};



window.handleBlockDrop = function (e, targetIndex) {
    e.stopPropagation();
    
    const el = e.currentTarget;
    const isLeftDrop = el.classList.contains('drag-over-left');
    const isRightDrop = el.classList.contains('drag-over-right');
    
    el.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');

    if (window.draggedBlockIndex !== null && window.draggedBlockIndex !== targetIndex) {
        const draggedBlock = window.editorSchema.splice(window.draggedBlockIndex, 1)[0];
        
        // Correct target index after removal
        const adjustedTargetIndex = targetIndex > window.draggedBlockIndex ? targetIndex - 1 : targetIndex;
        const targetBlock = window.editorSchema[adjustedTargetIndex];

        if (isLeftDrop || isRightDrop) {
            // Group blocks side-by-side
            let targetGroup = targetBlock.blockGroup;
            if (!targetGroup) {
                // Generate a unique group id
                targetGroup = 'g_' + Math.random().toString(36).substr(2, 9);
                targetBlock.blockGroup = targetGroup;
            }
            draggedBlock.blockGroup = targetGroup;
            
            // Insert adjacent to target
            const insertOffset = isRightDrop ? 1 : 0;
            window.editorSchema.splice(adjustedTargetIndex + insertOffset, 0, draggedBlock);
        } else {
            // Standard vertical drag - breaks out from any blockGroup
            delete draggedBlock.blockGroup;
            
            // Clean up group on single blocks if they end up alone
            window.editorSchema.splice(targetIndex, 0, draggedBlock);
        }

        // Clean up empty groups or single-element groups
        const groupCounts = {};
        window.editorSchema.forEach(b => {
            if (b.blockGroup) {
                groupCounts[b.blockGroup] = (groupCounts[b.blockGroup] || 0) + 1;
            }
        });
        window.editorSchema.forEach(b => {
            if (b.blockGroup && groupCounts[b.blockGroup] < 2) {
                delete b.blockGroup;
            }
        });

        window.renderCanvas();
        window.saveDebounce();
    }
};



window.handleBlockDragEnd = function (e) {
    e.currentTarget.classList.remove('dragging');
    const blocks = document.querySelectorAll('.tally-block');
    blocks.forEach(b => b.classList.remove('drag-over', 'drag-over-left', 'drag-over-right'));
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

            // Save current schema to localStorage so preview loads instantly
            try {
                localStorage.setItem('lp_preview_schema', JSON.stringify(window.editorSchema || []));
                localStorage.setItem('lp_preview_config', JSON.stringify({
                    showReplenishment: window.pillSizingConfig ? window.pillSizingConfig.showReplenishment : false,
                    showMainTitle: window.pillSizingConfig ? window.pillSizingConfig.showMainTitle : true,
                    replenishmentTitle: window.pillSizingConfig ? window.pillSizingConfig.replenishmentTitle : 'Requisição de items',
                    theme: (window.currentFormConfig && window.currentFormConfig.theme) ? window.currentFormConfig.theme : {}
                }));
            } catch(e) { console.warn('Could not save preview schema to localStorage:', e); }

            const win = window.open(`inventory_view.html?id=${currentFormId}&preview=true&t=${Date.now()}`, '_blank');
            if (!win) alert('O browser bloqueou o popup do Preview. Por favor, permita popups para este site.');

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

                        <div class="settings-row" id="row-setting-width" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Largura do Bloco</span>
                        <div style="display: flex; gap: 4px;">
                            <button class="builder-btn secondary small" id="btn-width-100" style="padding: 4px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">100%</button>
                            <button class="builder-btn secondary small" id="btn-width-50" style="padding: 4px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">50%</button>
                        </div>
                    </div>
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


/* ==========================================================================
   SETTINGS SIDEBAR FOR PILL SIZING
   ========================================================================== */

// Initialize default config if not loaded yet
if (!window.pillSizingConfig) {
    window.pillSizingConfig = {
        mode: 'global',
        type: 'dynamic',
        sharedWidth: 200,
        sharedHeight: 42
    };
}

window.adjustGlobalDynamicWidths = function () {
    const sizingScope = (window.pillSizingConfig && window.pillSizingConfig.mode) || 'global';
    const sizingType = (window.pillSizingConfig && window.pillSizingConfig.type) || 'dynamic';

    if (sizingType !== 'dynamic') return;

    // Helper to measure text width using Canvas
    const getTextWidth = (text, font) => {
        const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        const context = canvas.getContext("2d");
        context.font = font;
        return context.measureText(text).width;
    };

    const font = "500 14px Outfit, sans-serif";

    if (sizingScope === 'global') {
        // Find the maximum natural width among all pills
        let maxVal = 0;
        document.querySelectorAll('.pill-cell-wrapper').forEach(w => {
            const input = w.querySelector('.pill-input');
            if (!input) return;
            const text = (input.value !== undefined ? input.value : input.innerText) || '';
            const textWidth = getTextWidth(text, font);
            const isCounter = w.closest('.tally-block').classList.contains('block-counter');
            // Counter has drag handle (16px) + QT section (45px) + paddings/borders
            const extra = isCounter ? 85 : 45;
            const naturalWidth = textWidth + extra;
            if (naturalWidth > maxVal) {
                maxVal = naturalWidth;
            }
        });

        // Clamp to min 20px, max 200px
        const finalWidth = Math.min(310, Math.max(120, maxVal));

        // Apply to all
        document.querySelectorAll('.pill-cell-wrapper').forEach(w => {
            w.style.width = `${finalWidth}px`;
            w.style.maxWidth = 'none';
        });
    } else {
        // Individual dynamic sizing: set each pill to its own text width up to 180px
        document.querySelectorAll('.pill-cell-wrapper').forEach(w => {
            const input = w.querySelector('.pill-input');
            if (!input) return;
            const text = (input.value !== undefined ? input.value : input.innerText) || '';
            const textWidth = getTextWidth(text, font);
            const isCounter = w.closest('.tally-block').classList.contains('block-counter');
            const extra = isCounter ? 85 : 45;
            const naturalWidth = textWidth + extra;
            const finalWidth = Math.min(310, Math.max(120, naturalWidth));
            w.style.width = `${finalWidth}px`;
            w.style.maxWidth = 'none';
        });
    }
};

window.fitText = function (el) {
    if (!el) return;
    const parentWrapper = el.closest('.pill-edit-wrapper') || el.closest('.inv-pill');
    const actualHeight = parentWrapper ? parentWrapper.offsetHeight : 42;
    let size = 14;
    el.style.fontSize = size + 'px';
    let maxH = actualHeight - 8;
    if (maxH < 20) maxH = 34;
    while (size > 9 && el.scrollHeight > maxH + 1) {
        size -= 0.5;
        el.style.fontSize = size + 'px';
    }
};

window.toggleSettingsSidebar = function () {
    const sidebar = document.getElementById('settings-sidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
        window.syncSidebarInputs();
        window.renderSidebarSettings();
    }
};

window.closeSettingsSidebar = function () {
    const sidebar = document.getElementById('settings-sidebar');
    if (sidebar) {
        sidebar.classList.remove('open');
    }
};

window.syncSidebarInputs = function () {
    const config = window.pillSizingConfig;
    if (!config) return;

    // 1. Sync Scope Tabs ("global" vs "individual")
    document.querySelectorAll('#tab-scope-global, #tab-scope-individual').forEach(btn => btn.classList.remove('active'));
    const activeScopeTab = document.getElementById(`tab-scope-${config.mode}`);
    if (activeScopeTab) activeScopeTab.classList.add('active');

    // 2. Sync Type Tabs ("dynamic" vs "fixed")
    document.querySelectorAll('#tab-type-dynamic, #tab-type-fixed').forEach(btn => btn.classList.remove('active'));
    const activeTypeTab = document.getElementById(`tab-type-${config.type}`);
    if (activeTypeTab) activeTypeTab.classList.add('active');

    // 3. Section visibility
    const controlGlobalFixed = document.getElementById('control-global-fixed');
    const controlIndividualFixed = document.getElementById('control-individual-fixed');
    const controlGlobalHeight = document.getElementById('control-global-height');
    const descDynamicGlobal = document.getElementById('desc-dynamic-global');
    const descDynamicIndividual = document.getElementById('desc-dynamic-individual');

    const showGlobalFixed = (config.mode === 'global' && config.type === 'fixed');
    const showIndividualPanel = (config.mode === 'individual');
    const showDynamicGlobal = (config.mode === 'global' && config.type === 'dynamic');
    const showDynamicIndividual = (config.mode === 'individual' && config.type === 'dynamic');
    const showGlobalHeight = (config.mode === 'global');

    if (controlGlobalFixed) controlGlobalFixed.style.display = showGlobalFixed ? 'block' : 'none';
    if (controlIndividualFixed) controlIndividualFixed.style.display = showIndividualPanel ? 'block' : 'none';
    if (controlGlobalHeight) controlGlobalHeight.style.display = showGlobalHeight ? 'block' : 'none';
    if (descDynamicGlobal) descDynamicGlobal.style.display = showDynamicGlobal ? 'block' : 'none';
    if (descDynamicIndividual) descDynamicIndividual.style.display = showDynamicIndividual ? 'block' : 'none';

    // 4. Update global size input controls values
    const inputGlobal = document.getElementById('input-global-width');
    const inputGlobalNum = document.getElementById('input-global-width-num');
    if (inputGlobal && inputGlobalNum) {
        const val = config.sharedWidth || 200;
        inputGlobal.value = val;
        inputGlobalNum.value = val;
    }

    // 5. Update global height input controls values
    const inputHeight = document.getElementById('input-global-height');
    const inputHeightNum = document.getElementById('input-global-height-num');
    if (inputHeight && inputHeightNum) {
        const hVal = config.sharedHeight || 42;
        inputHeight.value = hVal;
        inputHeightNum.value = hVal;
    }

    // Sync replenishment toggle button and container
    const showReplenishment = window.pillSizingConfig && window.pillSizingConfig.showReplenishment;
    const btnReplenish = document.getElementById('replenishment-toggle-btn');
    if (btnReplenish) {
        btnReplenish.textContent = showReplenishment ? 'ON' : 'OFF';
        btnReplenish.style.background = showReplenishment ? '#22c55e' : '#475569';
    }
    const panelReplenish = document.getElementById('replenishment-list-container');
    if (panelReplenish) {
        panelReplenish.style.display = showReplenishment ? 'block' : 'none';
        if (showReplenishment) window.renderReplenishmentPreview();
    }

    // Sync locations toggle button and panel
    const btnLoc = document.getElementById('locations-toggle-btn');
    if (btnLoc) {
        btnLoc.textContent = window.useLocations ? 'ON' : 'OFF';
        btnLoc.style.background = window.useLocations ? '#22c55e' : '#475569';
    }
    const panelLoc = document.getElementById('locations-panel');
    if (panelLoc) {
        panelLoc.style.display = window.useLocations ? 'block' : 'none';
    }

    // Sync main title toggle button
    const showMainTitle = window.pillSizingConfig && window.pillSizingConfig.showMainTitle;
    const btnMainTitle = document.getElementById('main-title-toggle-btn');
    if (btnMainTitle) {
        btnMainTitle.textContent = showMainTitle ? 'ON' : 'OFF';
        btnMainTitle.style.background = showMainTitle ? '#22c55e' : '#475569';
    }

    window.renderLocations();
};

window.changeSizingScope = function (mode) {
    if (!window.pillSizingConfig) return;
    window.pillSizingConfig.mode = mode;
    
    if (mode === 'individual') {
        const sharedWidth = window.pillSizingConfig.sharedWidth || 200;
        const sharedHeight = window.pillSizingConfig.sharedHeight || 42;
        window.editorSchema.forEach(block => {
            if (block.options && Array.isArray(block.options)) {
                block.options.forEach((row, rIdx) => {
                    row.forEach((opt, cIdx) => {
                        if (typeof opt === 'object') {
                            if (opt.width === undefined) {
                                opt.width = sharedWidth;
                            }
                            if (opt.height === undefined) {
                                opt.height = sharedHeight;
                            }
                        } else {
                            row[cIdx] = {
                                text: opt,
                                target: 0,
                                width: sharedWidth,
                                height: sharedHeight
                            };
                        }
                    });
                });
            }
        });
    }

    window.syncSidebarInputs();
    window.renderCanvas();
    if (mode === 'individual') {
        window.renderSidebarSettings();
    }
    window.saveDebounce();
};

window.changeSizingType = function (type) {
    if (!window.pillSizingConfig) return;
    window.pillSizingConfig.type = type;
    window.syncSidebarInputs();
    window.renderCanvas();
    if (window.pillSizingConfig.mode === 'individual') {
        window.renderSidebarSettings();
    }
    window.saveDebounce();
};

window.updateGlobalWidth = function (val, source) {
    if (!window.pillSizingConfig) return;
    
    let intVal = parseInt(val);
    if (isNaN(intVal)) return;

    // Clamp value between 120 and 350
    intVal = Math.max(120, Math.min(350, intVal));

    window.pillSizingConfig.sharedWidth = intVal;

    // Synchronize both slider and number inputs
    const inputGlobal = document.getElementById('input-global-width');
    const inputGlobalNum = document.getElementById('input-global-width-num');
    if (inputGlobal) inputGlobal.value = intVal;
    if (inputGlobalNum) inputGlobalNum.value = intVal;

    window.renderCanvas();
    window.saveDebounce();
};

window.updateGlobalHeight = function (val, source) {
    if (!window.pillSizingConfig) return;
    
    let intVal = parseInt(val);
    if (isNaN(intVal)) return;

    // Clamp value between 32 and 80
    intVal = Math.max(32, Math.min(80, intVal));

    window.pillSizingConfig.sharedHeight = intVal;

    // Synchronize both slider and number inputs
    const inputHeight = document.getElementById('input-global-height');
    const inputHeightNum = document.getElementById('input-global-height-num');
    if (inputHeight) inputHeight.value = intVal;
    if (inputHeightNum) inputHeightNum.value = intVal;

    window.renderCanvas();
    window.saveDebounce();
};

window.updateIndividualWidth = function (blockIdx, rowIdx, colIdx, val, source) {
    const block = window.editorSchema[blockIdx];
    if (block && block.options && block.options[rowIdx] && block.options[rowIdx][colIdx]) {
        const opt = block.options[rowIdx][colIdx];
        
        let intVal = parseInt(val);
        if (isNaN(intVal)) return;

        // Clamp value between 120 and 350
        intVal = Math.max(120, Math.min(350, intVal));

        if (typeof opt === 'object') {
            opt.width = intVal;
        } else {
            // Convert simple string to object option if not already object
            block.options[rowIdx][colIdx] = {
                text: opt,
                target: 0,
                width: intVal
            };
        }
        
        // Sync slider and number inputs for this individual item in the sidebar
        const rangeInput = document.getElementById(`slider-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
        const numberInput = document.getElementById(`number-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
        if (rangeInput) rangeInput.value = intVal;
        if (numberInput) numberInput.value = intVal;
        
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.updateIndividualHeight = function (blockIdx, rowIdx, colIdx, val, source) {
    const block = window.editorSchema[blockIdx];
    if (block && block.options && block.options[rowIdx] && block.options[rowIdx][colIdx]) {
        const opt = block.options[rowIdx][colIdx];
        
        let intVal = parseInt(val);
        if (isNaN(intVal)) return;

        // Clamp value between 32 and 80
        intVal = Math.max(32, Math.min(80, intVal));

        if (typeof opt === 'object') {
            opt.height = intVal;
        } else {
            const sharedWidth = (window.pillSizingConfig && window.pillSizingConfig.sharedWidth) || 200;
            block.options[rowIdx][colIdx] = {
                text: opt,
                target: 0,
                width: sharedWidth,
                height: intVal
            };
        }

        // Sync slider and number inputs for this individual item in the sidebar
        const rangeInput = document.getElementById(`slider-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
        const numberInput = document.getElementById(`number-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
        if (rangeInput) rangeInput.value = intVal;
        if (numberInput) numberInput.value = intVal;
        
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.resetPillSizingDefaults = function () {
    if (!window.pillSizingConfig) return;
    
    window.pillSizingConfig.mode = 'global';
    window.pillSizingConfig.type = 'dynamic';
    window.pillSizingConfig.sharedWidth = 200;
    window.pillSizingConfig.sharedHeight = 42;

    window.editorSchema.forEach(block => {
        if (block.options && Array.isArray(block.options)) {
            block.options.forEach((row, rIdx) => {
                row.forEach((opt, cIdx) => {
                    if (typeof opt === 'object') {
                        delete opt.width;
                        delete opt.height;
                    }
                });
            });
        }
    });

    window.syncSidebarInputs();
    window.renderCanvas();
    window.saveDebounce();
};

window.renderSidebarSettings = function () {
    const sidebar = document.getElementById('settings-sidebar');
    if (!sidebar || !sidebar.classList.contains('open')) return;

    window.renderStickyRequiredIndividualLists();

    if (window.pillSizingConfig.mode !== 'individual') return;

    const listContainer = document.getElementById('individual-sliders-list');
    if (!listContainer) return;

    // Preserve focus and dragging state by only updating values in place if user is currently interacting with the sidebar controls
    const activeEl = document.activeElement;
    if (activeEl && listContainer.contains(activeEl)) {
        window.editorSchema.forEach((block, blockIdx) => {
            if (block.type !== 'counter') return;
            const options = block.options || [];
            options.forEach((row, rowIdx) => {
                row.forEach((opt, colIdx) => {
                    const optWidth = (typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
                    const optHeight = (typeof opt === 'object' && opt.height !== undefined) ? opt.height : (window.pillSizingConfig.sharedHeight || 42);

                    const rangeInput = document.getElementById(`slider-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
                    const numberInput = document.getElementById(`number-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
                    if (rangeInput && rangeInput !== activeEl) rangeInput.value = optWidth;
                    if (numberInput && numberInput !== activeEl) numberInput.value = optWidth;

                    const rangeInputH = document.getElementById(`slider-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
                    const numberInputH = document.getElementById(`number-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
                    if (rangeInputH && rangeInputH !== activeEl) rangeInputH.value = optHeight;
                    if (numberInputH && numberInputH !== activeEl) numberInputH.value = optHeight;
                });
            });
        });
        return;
    }

    listContainer.innerHTML = '';

    let hasCounterBlocks = false;

    window.editorSchema.forEach((block, blockIdx) => {
        if (block.type !== 'counter') return;
        hasCounterBlocks = true;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'individual-block-group';

        const blockTitleText = block.question || 'Módulo sem título';
        const header = document.createElement('div');
        header.className = 'individual-block-header';
        header.textContent = blockTitleText;
        groupDiv.appendChild(header);

        const options = block.options || [];
        options.forEach((row, rowIdx) => {
            row.forEach((opt, colIdx) => {
                const optText = typeof opt === 'object' ? opt.text : opt;
                const optWidth = (typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
                const optHeight = (typeof opt === 'object' && opt.height !== undefined) ? opt.height : (window.pillSizingConfig.sharedHeight || 42);

                const itemDiv = document.createElement('div');
                itemDiv.className = 'individual-pill-item';
                itemDiv.style.marginBottom = '12px';
                itemDiv.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                itemDiv.style.paddingBottom = '8px';

                const labelRow = document.createElement('div');
                labelRow.className = 'slider-label-row';
                
                const spanName = document.createElement('span');
                spanName.style.fontSize = '12px';
                spanName.style.whiteSpace = 'nowrap';
                spanName.style.overflow = 'hidden';
                spanName.style.textOverflow = 'ellipsis';
                spanName.style.maxWidth = '200px';
                spanName.textContent = optText || `Item ${rowIdx + 1}-${colIdx + 1}`;

                labelRow.appendChild(spanName);
                itemDiv.appendChild(labelRow);

                // Width controls (only if Sizing Type is Fixed)
                if (window.pillSizingConfig.type === 'fixed') {
                    const widthLabel = document.createElement('div');
                    widthLabel.style.fontSize = '10px';
                    widthLabel.style.color = '#94a3b8';
                    widthLabel.style.marginTop = '4px';
                    widthLabel.textContent = 'Largura:';
                    itemDiv.appendChild(widthLabel);

                    const controlRow = document.createElement('div');
                    controlRow.className = 'control-input-row';

                    const rangeInput = document.createElement('input');
                    rangeInput.type = 'range';
                    rangeInput.id = `slider-indiv-${blockIdx}-${rowIdx}-${colIdx}`;
                    rangeInput.className = 'sidebar-range-input';
                    rangeInput.min = '120';
                    rangeInput.max = '350';
                    rangeInput.step = '5';
                    rangeInput.value = optWidth;
                    rangeInput.oninput = function () {
                        window.updateIndividualWidth(blockIdx, rowIdx, colIdx, this.value, 'slider');
                    };

                    const numberInput = document.createElement('input');
                    numberInput.type = 'number';
                    numberInput.id = `number-indiv-${blockIdx}-${rowIdx}-${colIdx}`;
                    numberInput.className = 'sidebar-number-input';
                    numberInput.min = '120';
                    numberInput.max = '350';
                    numberInput.value = optWidth;
                    numberInput.onchange = function () {
                        window.updateIndividualWidth(blockIdx, rowIdx, colIdx, this.value, 'number');
                    };

                    controlRow.appendChild(rangeInput);
                    controlRow.appendChild(numberInput);
                    itemDiv.appendChild(controlRow);
                }

                // Height controls (always shown in individual mode)
                const heightLabel = document.createElement('div');
                heightLabel.style.fontSize = '10px';
                heightLabel.style.color = '#94a3b8';
                heightLabel.style.marginTop = '4px';
                heightLabel.textContent = 'Altura:';
                itemDiv.appendChild(heightLabel);

                const heightControlRow = document.createElement('div');
                heightControlRow.className = 'control-input-row';

                const heightRangeInput = document.createElement('input');
                heightRangeInput.type = 'range';
                heightRangeInput.id = `slider-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`;
                heightRangeInput.className = 'sidebar-range-input';
                heightRangeInput.min = '32';
                heightRangeInput.max = '80';
                heightRangeInput.step = '2';
                heightRangeInput.value = optHeight;
                heightRangeInput.oninput = function () {
                    window.updateIndividualHeight(blockIdx, rowIdx, colIdx, this.value, 'slider');
                };

                const heightNumberInput = document.createElement('input');
                heightNumberInput.type = 'number';
                heightNumberInput.id = `number-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`;
                heightNumberInput.className = 'sidebar-number-input';
                heightNumberInput.min = '32';
                heightNumberInput.max = '80';
                heightNumberInput.value = optHeight;
                heightNumberInput.onchange = function () {
                    window.updateIndividualHeight(blockIdx, rowIdx, colIdx, this.value, 'number');
                };

                heightControlRow.appendChild(heightRangeInput);
                heightControlRow.appendChild(heightNumberInput);
                itemDiv.appendChild(heightControlRow);

                groupDiv.appendChild(itemDiv);
            });
        });

        listContainer.appendChild(groupDiv);
    });

    if (!hasCounterBlocks) {
        listContainer.innerHTML = '<p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 10px;">Adicione um bloco de contador/inventário para configurar os tamanhos.</p>';
    }
};




// --- Cover Upload Logic ---
function initCoverLogic() {
    const btnChangeCover = document.querySelector('.change-cover-btn');
    const coverUploadInput = document.getElementById('cover-upload-input');
    const coverBlock = document.getElementById('cover-block');

    if (btnChangeCover && coverUploadInput && coverBlock) {
        // Remove old listeners by cloning (just in case)
        const newBtn = btnChangeCover.cloneNode(true);
        btnChangeCover.parentNode.replaceChild(newBtn, btnChangeCover);
        
        newBtn.addEventListener('click', () => {
            coverUploadInput.click();
        });

        coverUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem não pode exceder 5MB.');
                return;
            }
            if (!file.type.match('image.*')) {
                alert('Por favor selecione um ficheiro de imagem válido.');
                return;
            }

            const originalText = newBtn.innerHTML;
            newBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A carregar imagem...';
            newBtn.disabled = true;

            const reader = new FileReader();
            reader.onload = function (event) {
                const downloadURL = event.target.result;
                coverBlock.style.backgroundImage = `url('${downloadURL}')`;
                
                if (!window.currentFormConfig) window.currentFormConfig = { theme: {} };
                if (!window.currentFormConfig.theme) window.currentFormConfig.theme = {};
                window.currentFormConfig.theme.coverImage = downloadURL;
                
                if (typeof window.saveDebounce === 'function') window.saveDebounce();
                
                newBtn.innerHTML = originalText;
                newBtn.disabled = false;
                coverUploadInput.value = '';
            };
            reader.onerror = function (err) {
                console.error(err);
                alert("Erro ao ler o ficheiro de imagem local.");
                newBtn.innerHTML = originalText;
                newBtn.disabled = false;
                coverUploadInput.value = '';
            };
            reader.readAsDataURL(file);
        });
    }
}

// Since module scripts load deferred, DOMContentLoaded might have fired.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoverLogic);
} else {
    initCoverLogic();
}


// ==========================================
// ADDITIONAL FEATURES (LOCATIONS, TOGGLES, STICKY, REQUIRED)
// ==========================================

window.renderReplenishmentPreview = function () {
    const panel = document.getElementById('replenishment-list-container');
    if (!panel) return;

    // Get editable title (saved in pillSizingConfig)
    if (!window.pillSizingConfig) window.pillSizingConfig = {};
    const savedTitle = window.pillSizingConfig.replenishmentTitle || 'Requisição de items';

    // Collect all counter items from schema
    const items = [];
    (window.editorSchema || []).forEach(block => {
        if (block.type !== 'counter') return;
        if (!Array.isArray(block.options)) return;
        block.options.forEach(row => {
            if (!Array.isArray(row)) return;
            row.forEach(opt => {
                const name = (typeof opt === 'object' ? opt.text : opt) || '';
                const target = (typeof opt === 'object' && opt.target !== undefined) ? opt.target : 0;
                if (name) items.push({ name, target });
            });
        });
    });

    let rowsHtml = '';
    if (items.length === 0) {
        rowsHtml = `<div style="text-align:center;color:#64748b;font-size:13px;padding:24px 0;">
            <i class="ph ph-info" style="font-size:20px;vertical-align:middle;margin-right:6px;"></i>
            Os itens dos blocos <strong style="color:#94a3b8;">Contador</strong> aparecerão aqui.
        </div>`;
    } else {
        items.forEach(item => {
            rowsHtml += `
            <div class="replenishment-row">
                <div class="replenishment-item-name">${item.name}</div>
                <div class="replenishment-badge">Falta: —</div>
                <div class="replenishment-qty-controls">
                    <button type="button" class="replenishment-qty-btn" disabled>−</button>
                    <input type="number" class="replenishment-qty-input" value="${item.target}" min="0" disabled>
                    <button type="button" class="replenishment-qty-btn" disabled>+</button>
                </div>
                <button type="button" class="replenishment-delete-btn" disabled title="Remover item">
                    <i class="ph ph-trash"></i>
                </button>
            </div>`;
        });
    }

    panel.innerHTML = `
        <div class="replenishment-container">
            <input type="text" class="replenishment-title-input"
                value="${savedTitle.replace(/"/g, '&quot;')}"
                placeholder="Título da lista..."
                oninput="if(!window.pillSizingConfig) window.pillSizingConfig={}; window.pillSizingConfig.replenishmentTitle=this.value; window.saveDebounce();">
            <div class="replenishment-list">
                ${rowsHtml}
            </div>
            <div class="replenishment-add-form" style="pointer-events:none;opacity:0.4;">
                <input type="text" class="replenishment-add-input" style="flex:1;" placeholder="Nome do artigo a adicionar..." disabled>
                <input type="number" class="replenishment-add-input" style="width:70px;text-align:center;" value="1" disabled>
                <button type="button" class="replenishment-add-btn" disabled>
                    <i class="ph ph-plus"></i> Adicionar
                </button>
            </div>
        </div>`;
};

window.toggleReplenishmentPanel = function () {
    if (!window.pillSizingConfig) window.pillSizingConfig = {};
    window.pillSizingConfig.showReplenishment = !window.pillSizingConfig.showReplenishment;
    
    const btn = document.getElementById('replenishment-toggle-btn');
    if (btn) {
        btn.textContent = window.pillSizingConfig.showReplenishment ? 'ON' : 'OFF';
        btn.style.background = window.pillSizingConfig.showReplenishment ? '#22c55e' : '#475569';
    }
    const panel = document.getElementById('replenishment-list-container');
    if (panel) {
        panel.style.display = window.pillSizingConfig.showReplenishment ? 'block' : 'none';
        if (window.pillSizingConfig.showReplenishment) window.renderReplenishmentPreview();
    }

    if (window.invOptionsBc) {
        window.invOptionsBc.postMessage({
            type: 'showReplenishment',
            value: window.pillSizingConfig.showReplenishment
        });
    }

    window.saveDebounce();
};

window.toggleLocationsFeature = function () {
    window.useLocations = !window.useLocations;
    
    const btn = document.getElementById('locations-toggle-btn');
    if (btn) {
        btn.textContent = window.useLocations ? 'ON' : 'OFF';
        btn.style.background = window.useLocations ? '#22c55e' : '#475569';
    }
    const panel = document.getElementById('locations-panel');
    if (panel) {
        panel.style.display = window.useLocations ? 'block' : 'none';
    }

    if (window.invOptionsBc) {
        window.invOptionsBc.postMessage({
            type: 'useLocationsChanged',
            value: window.useLocations,
            locations: window.locations || [],
            activeLocationId: window.locations && window.locations.length > 0 ? window.locations[0].id : null
        });
    }

    window.saveDebounce();
};

window.toggleMainTitle = function () {
    if (!window.pillSizingConfig) window.pillSizingConfig = {};
    window.pillSizingConfig.showMainTitle = !window.pillSizingConfig.showMainTitle;
    
    const btn = document.getElementById('main-title-toggle-btn');
    if (btn) {
        btn.textContent = window.pillSizingConfig.showMainTitle ? 'ON' : 'OFF';
        btn.style.background = window.pillSizingConfig.showMainTitle ? '#22c55e' : '#475569';
    }

    if (window.invOptionsBc) {
        window.invOptionsBc.postMessage({
            type: 'showMainTitle',
            value: window.pillSizingConfig.showMainTitle
        });
    }
    
    window.saveDebounce();
};

window.setAllSticky = function (val) {
    if (!window.editorSchema) return;
    window.editorSchema.forEach(block => {
        block.sticky = val;
    });
    window.renderCanvas();
    window.saveDebounce();
};

window.setAllRequired = function (val) {
    if (!window.editorSchema) return;
    window.editorSchema.forEach(block => {
        block.required = val;
    });
    window.renderCanvas();
    window.saveDebounce();
};

window.renderStickyRequiredIndividualLists = function () {
    const sidebar = document.getElementById('settings-sidebar');
    if (!sidebar || !sidebar.classList.contains('open')) return;

    // 1. Sticky list
    const stickyContainer = document.getElementById('sticky-individual-list');
    if (stickyContainer) {
        stickyContainer.innerHTML = '';
        window.editorSchema.forEach((block, index) => {
            const blockTitle = block.question || `Bloco ${index + 1} (${block.type})`;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '6px 0';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            const label = document.createElement('span');
            label.style.fontSize = '12px';
            label.style.color = '#cbd5e1';
            label.style.whiteSpace = 'nowrap';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.maxWidth = '130px';
            label.textContent = blockTitle;
            
            const switchBtn = document.createElement('button');
            switchBtn.style.minWidth = '40px';
            switchBtn.style.height = '20px';
            switchBtn.style.borderRadius = '10px';
            switchBtn.style.border = 'none';
            switchBtn.style.cursor = 'pointer';
            switchBtn.style.fontSize = '10px';
            switchBtn.style.fontWeight = '700';
            switchBtn.style.transition = 'all 0.2s';
            switchBtn.style.background = block.sticky ? '#60a5fa' : '#475569';
            switchBtn.style.color = 'white';
            switchBtn.textContent = block.sticky ? 'ON' : 'OFF';
            
            switchBtn.onclick = () => {
                block.sticky = !block.sticky;
                switchBtn.style.background = block.sticky ? '#60a5fa' : '#475569';
                switchBtn.textContent = block.sticky ? 'ON' : 'OFF';
                window.renderCanvas();
                window.saveDebounce();
            };
            
            row.appendChild(label);
            row.appendChild(switchBtn);
            stickyContainer.appendChild(row);
        });
    }

    // 2. Required list
    const requiredContainer = document.getElementById('required-individual-list');
    if (requiredContainer) {
        requiredContainer.innerHTML = '';
        window.editorSchema.forEach((block, index) => {
            const blockTitle = block.question || `Bloco ${index + 1} (${block.type})`;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';
            row.style.padding = '6px 0';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            const label = document.createElement('span');
            label.style.fontSize = '12px';
            label.style.color = '#cbd5e1';
            label.style.whiteSpace = 'nowrap';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.maxWidth = '130px';
            label.textContent = blockTitle;
            
            const switchBtn = document.createElement('button');
            switchBtn.style.minWidth = '40px';
            switchBtn.style.height = '20px';
            switchBtn.style.borderRadius = '10px';
            switchBtn.style.border = 'none';
            switchBtn.style.cursor = 'pointer';
            switchBtn.style.fontSize = '10px';
            switchBtn.style.fontWeight = '700';
            switchBtn.style.transition = 'all 0.2s';
            switchBtn.style.background = block.required ? '#f87171' : '#475569';
            switchBtn.style.color = 'white';
            switchBtn.textContent = block.required ? 'ON' : 'OFF';
            
            switchBtn.onclick = () => {
                block.required = !block.required;
                switchBtn.style.background = block.required ? '#f87171' : '#475569';
                switchBtn.textContent = block.required ? 'ON' : 'OFF';
                window.renderCanvas();
                window.saveDebounce();
            };
            
            row.appendChild(label);
            row.appendChild(switchBtn);
            requiredContainer.appendChild(row);
        });
    }
};

let editingLocationId = null;
const EMOJI_LIST = ['📍', '🚗', '📦', '🏢', '🏠', '🛠️', '🏥', '🚒', '🚨', '🎒', '🔋', '📱'];

window.openNewLocationModal = function () {
    editingLocationId = null;
    document.getElementById('location-modal-title').textContent = "Nova Localização";
    document.getElementById('location-name-input').value = "";
    document.getElementById('location-icon-input').value = "📍";
    window.selectEmoji('📍');
    const modal = document.getElementById('location-modal');
    if (modal) modal.style.display = 'flex';
};

window.openEditLocationModal = function (locId) {
    editingLocationId = locId;
    const loc = window.locations.find(l => l.id === locId);
    if (!loc) return;
    document.getElementById('location-modal-title').textContent = "Editar Localização";
    document.getElementById('location-name-input').value = loc.name;
    document.getElementById('location-icon-input').value = loc.icon || '📍';
    window.selectEmoji(loc.icon || '📍');
    const modal = document.getElementById('location-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeLocationModal = function () {
    const modal = document.getElementById('location-modal');
    if (modal) modal.style.display = 'none';
};

window.selectEmoji = function (emoji) {
    document.getElementById('location-icon-input').value = emoji;
    const items = document.querySelectorAll('.emoji-picker-item');
    items.forEach(item => {
        if (item.textContent === emoji) {
            item.style.background = 'rgba(16, 185, 129, 0.2)';
            item.style.borderColor = '#10b981';
        } else {
            item.style.background = 'rgba(15, 23, 42, 0.3)';
            item.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    });
};

window.deleteLocation = function (locId) {
    if (confirm("Tem a certeza que deseja eliminar esta localização?")) {
        window.locations = window.locations.filter(l => l.id !== locId);
        window.renderLocations();
        
        if (window.invOptionsBc) {
            window.invOptionsBc.postMessage({
                type: 'useLocationsChanged',
                value: window.useLocations,
                locations: window.locations || [],
                activeLocationId: window.locations && window.locations.length > 0 ? window.locations[0].id : null
            });
        }
        
        window.saveDebounce();
    }
};

window.renderLocations = function () {
    const container = document.getElementById('locations-buttons-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (!window.locations || window.locations.length === 0) {
        container.innerHTML = '<span style="font-size: 13px; color: #64748b;">Nenhuma localização adicionada.</span>';
        return;
    }
    
    window.locations.forEach(loc => {
        const btn = document.createElement('div');
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '8px';
        btn.style.padding = '8px 14px';
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        btn.style.borderRadius = '20px';
        btn.style.color = '#f8fafc';
        btn.style.fontSize = '14px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s';
        
        btn.onmouseover = () => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        };
        btn.onmouseout = () => {
            btn.style.background = 'rgba(255, 255, 255, 0.05)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        };
        
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = loc.icon || '📍';
        emojiSpan.style.fontSize = '16px';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = loc.name;
        nameSpan.style.fontWeight = '500';
        
        btn.onclick = () => {
            window.openEditLocationModal(loc.id);
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.innerHTML = '<i class="ph ph-trash"></i>';
        removeBtn.style.background = 'none';
        removeBtn.style.border = 'none';
        removeBtn.style.color = '#f87171';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.padding = '2px';
        removeBtn.style.marginLeft = '6px';
        removeBtn.style.fontSize = '14px';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            window.deleteLocation(loc.id);
        };
        
        btn.appendChild(emojiSpan);
        btn.appendChild(nameSpan);
        btn.appendChild(removeBtn);
        container.appendChild(btn);
    });
};

function initLocationsLogic() {
    // Save button in modal
    const saveBtn = document.getElementById('location-save-btn');
    if (saveBtn) {
        // Remove existing listener if any by cloning
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        
        newSaveBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('location-name-input');
            const iconInput = document.getElementById('location-icon-input');
            if (!nameInput) return;
            
            const name = nameInput.value.trim();
            const icon = iconInput ? iconInput.value.trim() : '📍';
            
            if (!name) {
                alert("Por favor introduza o nome da localização.");
                return;
            }
            
            if (editingLocationId) {
                const loc = window.locations.find(l => l.id === editingLocationId);
                if (loc) {
                    loc.name = name;
                    loc.icon = icon;
                }
            } else {
                const newLoc = {
                    id: 'loc_' + Math.random().toString(36).substr(2, 9),
                    name: name,
                    icon: icon
                };
                if (!window.locations) window.locations = [];
                window.locations.push(newLoc);
            }
            
            window.renderLocations();
            window.closeLocationModal();
            
            if (window.invOptionsBc) {
                window.invOptionsBc.postMessage({
                    type: 'useLocationsChanged',
                    value: window.useLocations,
                    locations: window.locations || [],
                    activeLocationId: window.locations && window.locations.length > 0 ? window.locations[0].id : null
                });
            }
            
            window.saveDebounce();
        });
    }

    // Emoji picker init
    const emojiContainer = document.getElementById('emoji-picker-container');
    if (emojiContainer) {
        emojiContainer.innerHTML = '';
        EMOJI_LIST.forEach(emoji => {
            const item = document.createElement('div');
            item.className = 'emoji-picker-item';
            item.textContent = emoji;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'center';
            item.style.height = '36px';
            item.style.fontSize = '18px';
            item.style.background = 'rgba(15, 23, 42, 0.3)';
            item.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            item.style.borderRadius = '8px';
            item.style.cursor = 'pointer';
            item.style.transition = 'all 0.2s';
            
            item.onclick = () => window.selectEmoji(emoji);
            
            item.onmouseover = () => {
                item.style.transform = 'scale(1.1)';
            };
            item.onmouseout = () => {
                item.style.transform = 'scale(1)';
            };
            
            emojiContainer.appendChild(item);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLocationsLogic);
} else {
    initLocationsLogic();
}

// Block Settings Popover Logic
const settingsPopover = document.getElementById('settings-popover');
const settingRequiredCheckbox = document.getElementById('setting-required');
const settingFilterCheckbox = document.getElementById('setting-filter');
const settingDescriptionCheckbox = document.getElementById('setting-description');
const settingOtherCheckbox = document.getElementById('setting-other');
const settingRandomizeCheckbox = document.getElementById('setting-randomize');
const settingMultiCheckbox = document.getElementById('setting-multi');
const settingColorCheckbox = document.getElementById('setting-color');

const rowSettingRequired = document.getElementById('row-setting-required');
const rowSettingFilter = document.getElementById('row-setting-filter');
const rowSettingDescription = document.getElementById('row-setting-description');
const rowSettingOther = document.getElementById('row-setting-other');
const rowSettingRandomize = document.getElementById('row-setting-randomize');
const rowSettingMulti = document.getElementById('row-setting-multi');
const rowSettingColor = document.getElementById('row-setting-color');

window.activeSettingsIndex = null;

function initPopoverListeners() {
    if (settingRequiredCheckbox) {
        settingRequiredCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].required = e.target.checked;
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    if (settingFilterCheckbox) {
        settingFilterCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].useAsFilter = e.target.checked;
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    if (settingDescriptionCheckbox) {
        settingDescriptionCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                const block = window.editorSchema[window.activeSettingsIndex];
                block.hasDescription = e.target.checked;
                if (e.target.checked && !block.description) {
                    block.description = "Descrição opcional...";
                }
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    if (settingOtherCheckbox) {
        settingOtherCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].hasOther = e.target.checked;
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    if (settingRandomizeCheckbox) {
        settingRandomizeCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].randomize = e.target.checked;
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    if (settingMultiCheckbox) {
        settingMultiCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                const block = window.editorSchema[window.activeSettingsIndex];
                if (e.target.checked) {
                    block.type = 'choice-multi';
                } else {
                    block.type = 'choice-single';
                }
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    if (settingColorCheckbox) {
        settingColorCheckbox.addEventListener('change', (e) => {
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].hasColorCode = e.target.checked;
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
    
    // Width settings handlers
    const btnWidth100 = document.getElementById('btn-width-100');
    const btnWidth50 = document.getElementById('btn-width-50');
    if (btnWidth100 && btnWidth50) {
        btnWidth100.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].blockWidth = '100%';
                btnWidth100.style.background = '#3b82f6';
                btnWidth100.style.color = '#fff';
                btnWidth50.style.background = '';
                btnWidth50.style.color = '';
                window.renderCanvas();
                window.saveDebounce();
            }
        });
        btnWidth50.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.activeSettingsIndex !== null) {
                window.editorSchema[window.activeSettingsIndex].blockWidth = '50%';
                btnWidth50.style.background = '#3b82f6';
                btnWidth50.style.color = '#fff';
                btnWidth100.style.background = '';
                btnWidth100.style.color = '';
                window.renderCanvas();
                window.saveDebounce();
            }
        });
    }
}

// Call it on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopoverListeners);
} else {
    initPopoverListeners();
}

window.openBlockSettings = function(event, index) {
    event.stopPropagation();
    const block = window.editorSchema[index];
    if (!block) return;

    window.activeSettingsIndex = index;
    const rect = event.currentTarget.getBoundingClientRect();

    // Show/Hide rows based on block type
    const isChoice = block.type === 'choice-single' || block.type === 'choice-multi';
    const filterableTypes = ['text-short', 'text-long', 'choice-single', 'choice-multi', 'date', 'counter'];
    const isFilterable = filterableTypes.includes(block.type);

    if (rowSettingRequired) rowSettingRequired.style.display = 'flex';
    if (rowSettingDescription) rowSettingDescription.style.display = 'flex';
    
    if (rowSettingFilter) {
        rowSettingFilter.style.display = isFilterable ? 'flex' : 'none';
    }
    if (rowSettingOther) {
        rowSettingOther.style.display = isChoice ? 'flex' : 'none';
    }
    if (rowSettingRandomize) {
        rowSettingRandomize.style.display = isChoice ? 'flex' : 'none';
    }
    if (rowSettingMulti) {
        rowSettingMulti.style.display = isChoice ? 'flex' : 'none';
    }
    if (rowSettingColor) {
        rowSettingColor.style.display = isChoice ? 'flex' : 'none';
    }

    // Set width button styles
    const btnWidth100 = document.getElementById('btn-width-100');
    const btnWidth50 = document.getElementById('btn-width-50');
    const isHalf = block.blockWidth === '50%';
    if (btnWidth100 && btnWidth50) {
        btnWidth100.style.background = isHalf ? '' : '#3b82f6';
        btnWidth100.style.color = isHalf ? '' : '#fff';
        btnWidth50.style.background = isHalf ? '#3b82f6' : '';
        btnWidth50.style.color = isHalf ? '#fff' : '';
    }

    // Set checkbox states
    if (settingRequiredCheckbox) settingRequiredCheckbox.checked = !!block.required;
    if (settingFilterCheckbox) settingFilterCheckbox.checked = !!block.useAsFilter;
    if (settingDescriptionCheckbox) settingDescriptionCheckbox.checked = !!block.hasDescription;
    if (settingOtherCheckbox) settingOtherCheckbox.checked = !!block.hasOther;
    if (settingRandomizeCheckbox) settingRandomizeCheckbox.checked = !!block.randomize;
    if (settingMultiCheckbox) settingMultiCheckbox.checked = (block.type === 'choice-multi');
    if (settingColorCheckbox) settingColorCheckbox.checked = !!block.hasColorCode;

    // Position and show popover
    if (settingsPopover) {
        const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
        settingsPopover.classList.remove('hidden');
        
        let topPos = rect.top - editorPageRect.top;
        let leftPos = rect.right - editorPageRect.left + 15;
        
        if (leftPos + 260 > editorPageRect.width) {
            leftPos = rect.left - editorPageRect.left - 275;
        }
        
        settingsPopover.style.top = `${topPos}px`;
        settingsPopover.style.left = `${leftPos}px`;
    }
};

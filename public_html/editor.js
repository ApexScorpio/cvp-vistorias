/**
 * TALLY CLONE ENGINE - INLINE WYSIWYG
 */
import { auth, db, onAuthStateChanged, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';

// Helper script for YIQ contrast
function getContrastYIQ(hexcolor) {
    if (!hexcolor) return '#ffffff';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(c => c + c).join('');
    }
    if (hexcolor.length !== 6) return '#ffffff';
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
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

// Support both URL param and localStorage
const urlParams = new URLSearchParams(window.location.search);
let currentFormId = urlParams.get('id') || localStorage.getItem('cvpCurrentFormId');

if (!currentFormId) {
    console.warn("No form ID found in URL or localStorage. Redirecting to dashboard.");
    window.location.href = 'dashboard.html';
} else {
    // Sync to localStorage for consistency
    localStorage.setItem('cvpCurrentFormId', currentFormId);
}

let editorSchema = [];
let currentForm = null;

// Auth check and load
const debugBanner = document.getElementById('blocks-container');
if (debugBanner) debugBanner.innerHTML = '<div style="padding:20px;color:#94a3b8;font-size:14px;">⏳ A carregar formulário...</div>';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (debugBanner) debugBanner.innerHTML = `<div style="padding:20px;color:#94a3b8;font-size:13px;">👤 Conta: ${user.email}<br>🔑 UID da conta: ${user.uid}<br>📋 ID do formulário: ${currentFormId}<br>⏳ A verificar permissões...</div>`;

    try {
        console.log("Loading form:", currentFormId);
        const formRef = doc(db, "forms", currentFormId);
        const formSnap = await getDoc(formRef);

        if (formSnap.exists()) {
            const formData = formSnap.data();
            console.log("Form data found:", formData);
            if (debugBanner) debugBanner.innerHTML = `<div style="padding:20px;color:#94a3b8;font-size:13px;">📋 Formulário carregado<br>👤 Conta: ${user.email}<br>🔑 UID da conta: ${user.uid}<br>🆔 UID do form: ${formData.uid}<br>✅ É dono: ${formData.uid === user.uid}<br>🤝 Partilhado: ${(formData.sharedWith || []).includes(user.email)}</div>`;

            // Permission check: owner or sharedWith
            const isOwner = formData.uid === user.uid;
            const isShared = (formData.sharedWith || []).includes(user.email);

            if (isOwner || isShared) {
                currentForm = formData;
                editorSchema = currentForm.schema || [];

                if (editorSchema.length === 0) {
                    console.log("Empty schema, initializing with title...");
                    editorSchema = [{ type: 'title', content: currentForm.title || 'Novo Formulário' }];
                }

                if (currentForm.title) {
                    const navTitle = document.querySelector('.nav-title');
                    if (navTitle) navTitle.textContent = currentForm.title;
                }

                // Apply theme if exists
                if (currentForm.theme && currentForm.theme.coverImage) {
                    const coverBlock = document.getElementById('cover-block');
                    if (coverBlock) coverBlock.style.backgroundImage = `url('${currentForm.theme.coverImage}')`;
                }

                renderCanvas();
            } else {
                // Form has a ghost/unrecognized UID — offer to claim it inline (no popup)
                const formTitle = formData.schema?.[0]?.content || formData.title || 'Sem Título';
                if (debugBanner) debugBanner.innerHTML = `
                    <div style="padding:30px;text-align:center;">
                        <p style="color:#94a3b8;margin-bottom:16px;">⚠️ Este formulário parece ter um dono inválido (UID fantasma).<br>Pode recuperá-lo para a sua conta.</p>
                        <button onclick="claimThisForm('${currentFormId}')" style="background:#6366f1;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:15px;">🔑 Recuperar formulário para minha conta</button>
                        <p style="color:#64748b;font-size:12px;margin-top:8px;">UID da conta: ${user.uid}<br>UID do form: ${formData.uid}</p>
                    </div>`;

                window.claimThisForm = async (formId) => {
                    try {
                        await setDoc(doc(db, "forms", formId), { uid: user.uid, updatedAt: new Date() }, { merge: true });
                        currentForm = { ...formData, uid: user.uid };
                        editorSchema = currentForm.schema || [];
                        if (editorSchema.length === 0) editorSchema = [{ type: 'title', content: currentForm.title || 'Novo Formulário' }];
                        renderCanvas();
                    } catch (claimErr) {
                        console.error("Failed to claim form:", claimErr);
                        if (debugBanner) debugBanner.innerHTML += `<p style="color:#f87171;padding:16px;">❌ Erro: ${claimErr.message}</p>`;
                    }
                };

            }
        } else {
            console.error("Form document does not exist in Firestore.");
            alert('Formulário não encontrado.');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error("Erro a carregar formulário:", error);
        alert("Erro de comunicação com a base de dados: " + error.message);
    }
});

const blocksContainer = document.getElementById('blocks-container');
const slashMenu = document.getElementById('slash-menu');
const settingsPopover = document.getElementById('settings-popover');
const settingRequiredCheckbox = document.getElementById('setting-required');

// New Settings Elements
const settingDescriptionCheckbox = document.getElementById('setting-description');
const settingRandomizeCheckbox = document.getElementById('setting-randomize');
const settingPlaceholderInput = document.getElementById('setting-placeholder');
const settingOtherCheckbox = document.getElementById('setting-other');
const settingMultiCheckbox = document.getElementById('setting-multi');
const settingColorCheckbox = document.getElementById('setting-color');
const btnAlignHorizontal = document.getElementById('btn-align-horizontal');
const btnAlignVertical = document.getElementById('btn-align-vertical');

const rowSettingRequired = document.getElementById('row-setting-required');
const rowSettingDescription = document.getElementById('row-setting-description');
const rowSettingOther = document.getElementById('row-setting-other');
const rowSettingRandomize = document.getElementById('row-setting-randomize');
const rowSettingMulti = document.getElementById('row-setting-multi');
const rowSettingColor = document.getElementById('row-setting-color');
const rowSettingPalette = document.getElementById('row-setting-palette');
const rowSettingPlaceholder = document.getElementById('row-setting-placeholder');

const btnDuplicateBlock = document.getElementById('btn-duplicate-block');
const btnDeleteBlock = document.getElementById('btn-delete-block');

const saveStatus = document.getElementById('save-status');
const addBlockEndBtn = document.getElementById('add-block-end');

let activeBlockIndex = null;
let activeSettingsIndex = null;
let hoverBlockIndex = null;

// User Preferences (Saved Colors) - Using 6 manual slots
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
                    <button class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="toggleRequired(${index})" title="${block.required ? 'Clique para remover obrigatoriedade' : 'Clique para tornar obrigatório'}" style="cursor: pointer; background: transparent; border: none; font-size: 20px; transition: color 0.2s;">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
            `;

            if (block.type === 'text-short' || block.type === 'text-long') {
                const placeholder = block.placeholder || 'Resposta...';
                const height = block.type === 'text-long' ? 'min-height: 100px;' : '';
                html += `<div class="fake-input" style="${height}">${placeholder}</div>`;
            } else if (block.type === 'date') {
                const today = new Date().toISOString().split('T')[0];
                html += `<input type="date" class="fake-input" style="padding: 10px; margin-top: 8px; font-family: inherit; font-size: 15px; width: fit-content; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f8fafc; color-scheme: dark;" value="${today}" disabled>`;
            } else if (block.type === 'choice-single' || block.type === 'choice-multi') {
                html += `<div class="pill-options-container">`;

                // Ensure options is a 2D array of objects
                if (typeof block.options === 'string') {
                    try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
                }
                const opts = block.options || [];
                // Migration: 1D strings → 2D objects
                if (opts.length > 0 && typeof opts[0] === 'string') {
                    block.options = [[...opts.map(opt => ({ text: opt }))]];
                } else if (opts.length > 0 && Array.isArray(opts[0])) {
                    block.options = opts.map(row => row.map(opt => typeof opt === 'string' ? { text: opt } : opt));
                }

                // Render each ROW with a dedicated gap-zone BEFORE it for new-row drops
                block.options.forEach((row, rowIdx) => {
                    // Gap zone BEFORE this row — dropping here creates new row at rowIdx
                    html += `<div class="pill-row-gap" data-blockidx="${index}" data-insertidx="${rowIdx}" ondragover="handleRowDragOver(event)" ondragleave="handleRowDragLeave(event)" ondrop="handleRowDrop(event, ${index}, ${rowIdx})"></div>`;

                    // The row itself — catches drops that land in gap between pills
                    html += `<div class="pill-row" ondragover="handlePillRowDragOver(event)" ondrop="handlePillRowDrop(event)">`;

                    row.forEach((optObj, colIdx) => {
                        const optText = optObj.text || '';
                        const optColor = optObj.color || null;
                        let pillStyle = '';
                        let iconStyle = '';
                        let activeColor = optColor || (block.hasColorCode ? block.pillColor : null);
                        if (activeColor) {
                            const textColor = getContrastYIQ(activeColor);
                            pillStyle = `background-color: ${activeColor}; color: ${textColor}; border-color: rgba(255,255,255,0.1);`;
                            iconStyle = `color: ${textColor};`;
                        }
                        const inputWidth = Math.max(optText.length, 3) + 2;

                        html += `
                            <div class="pill-cell-wrapper" draggable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" ondragstart="handlePillDragStart(event)" ondragover="handlePillDragOver(event)" ondragleave="handlePillDragLeave(event)" ondrop="handlePillDrop(event)" ondragend="handlePillDragEnd(event)">
                                <div class="pill-edit-wrapper" style="${pillStyle}">
                                    <div class="pill-drag-handle" style="${iconStyle}"><i class="ph ph-dots-six-vertical"></i></div>
                                    <input type="text" class="pill-input" value="${optText}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" placeholder="Opção">
                                    <button class="pill-color-trigger" id="trigger-${index}-${rowIdx}-${colIdx}" title="Cor da pílula" onclick="togglePillPalette(event, ${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                        <i class="ph ph-palette"></i>
                                    </button>
                                    <button class="pill-delete-btn" title="Remover Opção" onclick="removeOption(${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                        <i class="ph ph-x"></i>
                                    </button>
                                    <div id="palette-${index}-${rowIdx}-${colIdx}" class="pill-palette ${openPaletteId === `palette-${index}-${rowIdx}-${colIdx}` ? '' : 'hidden'}">
                                        <div class="palette-section">
                                            <div class="palette-label">Padrão</div>
                                            <div class="palette-grid">
                                                <div class="pill-color-dot" title="Emerald" style="background:#22c55e" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#22c55e')"></div>
                                                <div class="pill-color-dot" title="Red" style="background:#ef4444" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#ef4444')"></div>
                                                <div class="pill-color-dot" title="Blue" style="background:#3b82f6" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#3b82f6')"></div>
                                                <div class="pill-color-dot" title="Yellow" style="background:#eab308" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#eab308')"></div>
                                                <div class="pill-color-dot" title="Orange" style="background:#f97316" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#f97316')"></div>
                                                <div class="pill-color-dot" title="Purple" style="background:#a855f7" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#a855f7')"></div>
                                                <div class="pill-color-dot" title="Pink" style="background:#ec4899" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#ec4899')"></div>
                                                <div class="pill-color-dot" title="Cyan" style="background:#06b6d4" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '#06b6d4')"></div>
                                            </div>
                                        </div>
                                        <div class="palette-footer">
                                            <input type="text" class="palette-hex-input" placeholder="#HEX" maxlength="7" value="${optColor || ''}" onchange="setPillColor(${index}, ${rowIdx}, ${colIdx}, this.value)">
                                            <div class="pill-color-dot rainbow" title="Custom" onclick="openFullPicker(event, ${index}, ${rowIdx}, ${colIdx})"></div>
                                            <div class="pill-color-dot reset" title="Reset" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, null)">
                                                <i class="ph ph-prohibit"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });

                    // [+] to add a pill on this same row
                    html += `<button class="tally-dashed-add" title="Adicionar pílula nesta linha" onclick="addOptionToRow(${index}, ${rowIdx})"><i class="ph ph-plus"></i></button>`;
                    html += `</div>`; // close pill-row
                });

                // Final gap zone AFTER all rows — dropping here adds a new row at the end
                html += `
                    <div class="pill-row-gap pill-row-gap--end" data-blockidx="${index}" data-insertidx="${block.options.length}" ondragover="handleRowDragOver(event)" ondragleave="handleRowDragLeave(event)" ondrop="handleRowDrop(event, ${index}, ${block.options.length})">
                        <button class="tally-dashed-add" title="Adicionar nova linha" onclick="addOption(${index})"><i class="ph ph-plus"></i></button>
                    </div>
                `;

                html += `</div>`; // close pill-options-container

            } else if (block.type === 'counter') {
                const target = block.target || 0;
                html = `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <div class="block-question" style="margin-bottom: 0;" contenteditable="true" data-field="question">${block.question || ''}</div>
                    </div>
                    <div class="counter-meta-row" style="display: flex; align-items: center; gap: 12px; margin-top: 8px; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); width: fit-content;">
                        <span style="font-size: 13px; color: #94a3b8; font-weight: 500;">Qtd. Alvo:</span>
                        <input type="number" class="counter-target-input" value="${target}" data-index="${index}" style="background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f8fafc; padding: 4px 8px; width: 60px; font-family: inherit; font-size: 14px; outline: none;">
                    </div>
                `;
            }

            blockEl.innerHTML = html;
        }


        let extraTools = '';
        let extraHtml = '';
        if (block.type === 'title' || block.type === 'section') {
            extraTools = `
                <div class="tool-btn color-trigger" onclick="toggleTitlePalette(event, ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>
                <div class="tool-btn style-trigger" onclick="toggleTitleStyle(event, ${index})" title="Mudar Estilo (Texto / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>
            `;
            extraHtml = `
                <div class="pill-palette ${openPaletteTitleIdx === index ? '' : 'hidden'}" id="title-palette-${index}" style="top: 40px; left: 0;">
                    <div class="pill-palette-saved" style="margin-top: 0; padding-top: 0; border-top: none;">
                        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;">Minhas Cores</div>
                        <div class="pill-palette-grid">
                            ${savedColors.map((c, sIdx) => `
                                <div class="pill-color-dot ${!c ? 'empty-slot' : ''}" 
                                     style="${c ? `background:${c}` : ''}" 
                                     onmousedown="handleSlotMouseDown(event, ${sIdx}, ${index})"
                                     onmouseup="handleSlotMouseUp()"
                                     onclick="handleSlotClick(event, ${sIdx}, ${index})"
                                     title="${c ? 'Clique para aplicar, Long Press para apagar' : 'Clique para guardar a cor atual'}">
                                </div>`).join('')}
                        </div>
                    </div>

                    <div style="font-size: 10px; color: #64748b; margin: 10px 0 5px 0; text-transform: uppercase; letter-spacing: 0.05em;">Cores Base</div>
                    <div class="pill-palette-grid">
                        <div class="pill-color-dot" style="background:transparent; border:1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;" onclick="setTitleColor(${index}, '')" title="Remover Cor">
                            <i class="ph ph-prohibit" style="font-size: 14px; color: #94a3b8;"></i>
                        </div>
                        ${['#ffffff', '#0f172a', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'].map(c => `<div class="pill-color-dot" style="background:${c}" onclick="setTitleColor(${index}, '${c}')"></div>`).join('')}
                    </div>

                    <div class="spectrum-bar" 
                         onmousedown="startSpectrum(event, 'title', ${index})"
                         title="Arraste para escolher uma cor"></div>
                </div>
            `;
        }

        const toolsHtml = `
            <div class="block-tools-inline">
                ${extraTools}
                <div class="tool-btn image-trigger" onclick="triggerBlockImage(event, ${index})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
                <div class="tool-btn drag-handle" title="Arrastar para mover"><i class="ph ph-dots-six-vertical"></i></div>
                <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
                <div class="tool-btn settings-btn" title="Definições"><i class="ph ph-gear"></i></div>
                <div class="tool-btn delete-btn" title="Eliminar"><i class="ph ph-trash"></i></div>
            </div>
        `;

        // Inject tools + content
        if (block.type === 'divider') {
            blockEl.innerHTML = toolsHtml + blockEl.innerHTML;
        } else if (block.type === 'title' || block.type === 'desc' || block.type === 'section') {
            blockEl.innerHTML = toolsHtml + blockEl.innerHTML + extraHtml;
        } else {
            blockEl.innerHTML = toolsHtml + html;
        }

        // Render the image absolute wrapper if this block contains an image
        if (block.image) {
            blockEl.innerHTML += `
                <div class="block-image-wrapper" 
                     id="image-wrapper-${index}"
                     style="left: ${block.imageX}px; top: ${block.imageY}px; width: ${block.imageWidth}px; height: ${block.imageHeight}px;"
                     onmousedown="startImageDrag(event, ${index})">
                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain;">
                    <div class="image-resize-handle" onmousedown="startImageResize(event, ${index})"></div>
                    <div class="image-delete-btn" onclick="removeBlockImage(event, ${index})" title="Eliminar imagem"><i class="ph ph-trash"></i></div>
                </div>
            `;
        }

        // Force relative coordinates and adjust dynamic height to fit image bounding box
        blockEl.style.position = 'relative';
        adjustBlockHeightForImage(blockEl, block);

        // --- Bind block-specific Tool Events ---
        blockEl.querySelector('.delete-btn').addEventListener('click', () => {
            editorSchema.splice(index, 1);
            renderCanvas();
            saveDebounce();
        });

        blockEl.querySelector('.drag-handle').addEventListener('mousedown', () => {
            blockEl.setAttribute('draggable', 'true');
        });

        blockEl.querySelector('.add-below').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents document click from immediately closing the slash menu
            const rect = blockEl.querySelector('.add-below').getBoundingClientRect();
            const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
            hoverBlockIndex = index; // Used by slash menu to know where to insert
            slashMenu.classList.remove('hidden');
            slashMenu.style.top = `${rect.top - editorPageRect.top + 30}px`;
            slashMenu.style.left = `${rect.left - editorPageRect.left + 30}px`;
        });

        blockEl.querySelector('.settings-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (block.type !== 'title' && block.type !== 'desc' && block.type !== 'section') {
                activeSettingsIndex = index;
                const rect = e.currentTarget.getBoundingClientRect();

                // Show/Hide specific rows based on block type
                rowSettingRequired.style.display = 'flex';
                rowSettingDescription.style.display = 'flex';
                rowSettingOther.style.display = 'none';
                rowSettingRandomize.style.display = 'none';
                rowSettingMulti.style.display = 'none';
                rowSettingColor.style.display = 'none';
                rowSettingPalette.style.display = (editorSchema[index].hasColorCode) ? 'flex' : 'none';
                rowSettingPlaceholder.style.display = 'none';

                if (block.type === 'choice-single' || block.type === 'choice-multi') {
                    rowSettingRandomize.style.display = 'flex';
                    rowSettingOther.style.display = 'flex';
                    rowSettingMulti.style.display = 'flex';
                    rowSettingColor.style.display = 'flex';
                    rowSettingPlaceholder.style.display = 'none';
                } else {
                    rowSettingRandomize.style.display = 'none';
                    rowSettingPlaceholder.style.display = 'flex';
                }

                // Show/Hide alignment for choice blocks
                const alignmentRow = document.getElementById('row-setting-alignment');
                if (block.type.startsWith('choice')) {
                    if (alignmentRow) alignmentRow.style.display = 'flex';
                } else {
                    if (alignmentRow) alignmentRow.style.display = 'none';
                }

                // Set current values
                settingRequiredCheckbox.checked = !!editorSchema[index].required;
                settingDescriptionCheckbox.checked = !!editorSchema[index].hasDescription;
                settingRandomizeCheckbox.checked = !!editorSchema[index].randomize;
                settingPlaceholderInput.value = editorSchema[index].placeholder || '';
                settingOtherCheckbox.checked = !!editorSchema[index].hasOther;
                settingMultiCheckbox.checked = editorSchema[index].type === 'choice-multi';
                settingColorCheckbox.checked = !!editorSchema[index].hasColorCode;
                rowSettingPalette.style.display = editorSchema[index].hasColorCode ? 'flex' : 'none';

                // Refresh saved colors in settings
                renderBlockSavedColors();
                const blockHex = document.getElementById('block-hex-input');
                if (blockHex) blockHex.value = editorSchema[index].pillColor || '';

                const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();

                // Position and show popover
                settingsPopover.classList.remove('hidden');
                settingsPopover.style.top = `${rect.top - editorPageRect.top}px`;
                settingsPopover.style.left = `${rect.right - editorPageRect.left + 15}px`;
            } else {
                alert("Este bloco não tem configurações disponíveis no momento.");
            }
        });

        // Attach input listeners for contenteditable elements
        const editables = blockEl.querySelectorAll('[contenteditable="true"]');
        editables.forEach(ed => {
            ed.addEventListener('blur', (e) => {
                const field = ed.dataset.field;
                editorSchema[index][field] = e.target.textContent;
                saveDebounce();
            });
            ed.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (index === editorSchema.length - 1) appendNewBlock('text-short');
                }
            });
        });

        // Attach listeners for pill inputs — use .pill-input (current class)
        const pillInputs = blockEl.querySelectorAll('.pill-input');
        pillInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                // CRITICAL: skip if a pill drag is in progress — the blur fires when drag
                // starts and stale row/col indices would corrupt editorSchema
                if (draggedPill) return;
                const r = parseInt(input.dataset.rowidx);
                const c = parseInt(input.dataset.colidx);
                if (!editorSchema[index]?.options?.[r]?.[c]) return;
                // Save text while preserving other properties (color etc.)
                editorSchema[index].options[r][c] = {
                    ...editorSchema[index].options[r][c],
                    text: e.target.value
                };
                saveDebounce();
            });
        });

        const otherInputs = blockEl.querySelectorAll('.pill-other-input');
        otherInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                editorSchema[index].otherText = e.target.value;
                saveDebounce();
            });
        });

        const targetInputs = blockEl.querySelectorAll('.counter-target-input');
        targetInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(input.dataset.index);
                editorSchema[idx].target = parseInt(e.target.value) || 0;
                saveDebounce();
            });
        });

        blocksContainer.appendChild(blockEl);
    });
}

// ==========================================
// DRAG AND DROP LOGIC
// ==========================================
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedIndex);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove('drag-over');

    const targetIndex = parseInt(this.dataset.index);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    // Reorder editorSchema
    const draggedItem = editorSchema.splice(draggedIndex, 1)[0];
    editorSchema.splice(targetIndex, 0, draggedItem);

    renderCanvas();
    saveDebounce();
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    this.removeAttribute('draggable');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedIndex = null;
}

// ==========================================
// ADDING BLOCKS (Slash Menu / Plus Button)
// ==========================================
document.getElementById('add-block-end').addEventListener('click', (e) => {
    e.stopPropagation();
    hoverBlockIndex = null; // MUST reset so it adds at the end
    // Show slash menu at bottom of the add button itself
    const rect = addBlockEndBtn.getBoundingClientRect();
    const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
    slashMenu.classList.remove('hidden');
    slashMenu.style.top = `${rect.bottom - editorPageRect.top + 10}px`;
    slashMenu.style.left = `${rect.left - editorPageRect.left}px`;
});

// Clicking outside slash menu or settings hides them
document.addEventListener('click', (e) => {
    if (!slashMenu.classList.contains('hidden') && !e.target.closest('#slash-menu') && !e.target.closest('#add-block-end')) {
        slashMenu.classList.add('hidden');
    }
    if (!settingsPopover.classList.contains('hidden') && !e.target.closest('#settings-popover') && !e.target.closest('.settings-btn')) {
        settingsPopover.classList.add('hidden');
        activeSettingsIndex = null;
    }
});


const slashItems = document.querySelectorAll('.slash-item');
slashItems.forEach(item => {
    item.addEventListener('click', () => {
        const type = item.dataset.type;
        appendNewBlock(type);
        slashMenu.classList.add('hidden');
    });
});
function appendNewBlock(type) {
    let actualType = type;
    let blockSize = 'large';
    let initialContent = '';
    let initialQuestion = '';

    if (type === 'title-h1') {
        actualType = 'title';
        blockSize = 'large';
        initialContent = 'Título Principal';
    } else if (type === 'title-h2') {
        actualType = 'section'; // In editor.js, H2 is 'section'
        blockSize = 'medium';
        initialQuestion = 'Título Médio';
    } else if (type === 'title-h3') {
        actualType = 'section';
        blockSize = 'small';
        initialQuestion = 'Título Pequeno';
    }

    const newBlock = { type: actualType, question: initialQuestion, content: initialContent, blockSize: blockSize };
    if (actualType === 'choice-single' || actualType === 'choice-multi') {
        newBlock.options = [['Opção 1']];
    }
    if (actualType === 'counter') {
        newBlock.target = 0;
        newBlock.question = 'Novo Item de Inventário';
    }

    // If hoverBlockIndex is set, insert below it, otherwise append end
    if (hoverBlockIndex !== null) {
        editorSchema.splice(hoverBlockIndex + 1, 0, newBlock);
    } else {
        editorSchema.push(newBlock);
    }

    renderCanvas();
    saveDebounce();

    // Focus treatment for new additions
    if (type !== 'divider') {
        setTimeout(() => {
            const newIdx = hoverBlockIndex !== null ? hoverBlockIndex + 1 : editorSchema.length - 1;
            const blocks = document.querySelectorAll('.tally-block');
            if (blocks[newIdx]) {
                const editable = blocks[newIdx].querySelector('[contenteditable="true"]');
                if (editable) editable.focus();
            }
        }, 50);
    }
}



// ==========================================
// SETTINGS POPOVER LOGIC
// ==========================================
settingRequiredCheckbox.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].required = e.target.checked;
        renderCanvas();
        saveDebounce();
    }
});

settingDescriptionCheckbox.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].hasDescription = e.target.checked;
        if (e.target.checked && !editorSchema[activeSettingsIndex].description) {
            editorSchema[activeSettingsIndex].description = "Descrição opcional...";
        }
        renderCanvas();
        saveDebounce();
    }
});

settingRandomizeCheckbox.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].randomize = e.target.checked;
        saveDebounce(); // Display only, doesn't need re-render right now
    }
});

settingMultiCheckbox.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].type = e.target.checked ? 'choice-multi' : 'choice-single';
        renderCanvas();
        saveDebounce();
    }
});

settingOtherCheckbox.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].hasOther = e.target.checked;
        renderCanvas();
        saveDebounce();
    }
});

settingColorCheckbox.addEventListener('change', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].hasColorCode = e.target.checked;
        rowSettingPalette.style.display = e.target.checked ? 'flex' : 'none';

        // If turned off, remove color coding
        if (!e.target.checked) {
            delete editorSchema[activeSettingsIndex].pillColor;
        } else {
            // Default color (Vibrant Green)
            editorSchema[activeSettingsIndex].pillColor = '#22c55e';
        }
        renderCanvas();
        saveDebounce();
    }
});

// Click on color palette dots (Block settings)
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
        if (activeSettingsIndex !== null && editorSchema[activeSettingsIndex].hasColorCode) {
            editorSchema[activeSettingsIndex].pillColor = e.currentTarget.dataset.color;
            renderCanvas();
            saveDebounce();
        }
    });
});

settingPlaceholderInput.addEventListener('blur', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].placeholder = e.target.value;
        renderCanvas();
        saveDebounce();
    }
});

settingPlaceholderInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
});

btnDuplicateBlock.addEventListener('click', () => {
    if (activeSettingsIndex !== null) {
        // Deep copy the object to avoid reference issues
        const blockToDuplicate = JSON.parse(JSON.stringify(editorSchema[activeSettingsIndex]));
        editorSchema.splice(activeSettingsIndex + 1, 0, blockToDuplicate);

        settingsPopover.classList.add('hidden');
        activeSettingsIndex = null;

        renderCanvas();
        saveDebounce();
    }
});

// Alignment Actions
btnAlignHorizontal.addEventListener('click', () => {
    if (activeSettingsIndex !== null) {
        alignBlockHorizontal(activeSettingsIndex);
    }
});

btnAlignVertical.addEventListener('click', () => {
    if (activeSettingsIndex !== null) {
        alignBlockVertical(activeSettingsIndex);
    }
});

window.alignBlockHorizontal = function (index) {
    const block = editorSchema[index];
    if (!block.options || !block.options.length) return;

    // Flatten all existing options into a single array
    const allOptions = block.options.flat();
    if (allOptions.length === 0) return;

    block.options = [allOptions]; // Make it a single row
    renderCanvas();
    saveDebounce();
};

window.alignBlockVertical = function (index) {
    const block = editorSchema[index];
    if (!block.options || !block.options.length) return;

    // Flatten all options and then put each into its own array (row)
    const allOptions = block.options.flat();
    if (allOptions.length === 0) return;

    block.options = allOptions.map(opt => [opt]); // One row per option
    renderCanvas();
    saveDebounce();
};

btnDeleteBlock.addEventListener('click', () => {
    if (activeSettingsIndex !== null) {
        editorSchema.splice(activeSettingsIndex, 1);
        settingsPopover.classList.add('hidden');
        activeSettingsIndex = null;
        renderCanvas();
        saveDebounce();
    }
});

// ==========================================
// PILL DRAG AND DROP LOGIC (2D GRID)
// ==========================================
let draggedPill = null; // { blockIdx, rowIdx, colIdx, width, height }
let currentDropTarget = null; // The element being hovered
let currentDropZone = null; // 'left', 'right', 'top', 'bottom'


// Row-level drag/drop fallback — fires when drop lands in gap between pills.
// Uses currentDropTarget/currentDropZone set by the last pill's ondragover.
window.handlePillRowDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedPill) e.dataTransfer.dropEffect = 'move';
};

window.handlePillRowDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();
    // If we have a tracked drop target from the last pill dragover, do the pill-level insertion
    if (draggedPill && currentDropTarget && currentDropZone) {
        window.handlePillDrop(e);
    }
};

window.handlePillDragStart = function (e) {
    e.stopPropagation();
    const el = e.currentTarget; // capture before setTimeout loses currentTarget
    draggedPill = {
        blockIdx: parseInt(el.dataset.blockidx),
        rowIdx: parseInt(el.dataset.rowidx),
        colIdx: parseInt(el.dataset.colidx),
        width: el.offsetWidth,
        height: el.offsetHeight
    };
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { el.style.opacity = '0.3'; }, 0);
};

window.handlePillDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget; // pill-edit-wrapper
    const pillCell = target.closest('.pill-cell-wrapper'); // FIXED: was .pill-cell
    const row = target.closest('.pill-row');
    if (!row || !pillCell) return;

    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine zone — only top/bottom 5px edge creates new row; rest is left/right same-row
    let zone;
    if (y < 5) zone = 'drop-top';
    else if (y > rect.height - 5) zone = 'drop-bottom';
    else if (x < rect.width / 2) zone = 'drop-left';
    else zone = 'drop-right';

    // If same as before, do nothing
    if (currentDropTarget === target && currentDropZone === zone) return;

    // Cleanup previous
    if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-left', 'drop-right', 'drop-top', 'drop-bottom');
    }

    currentDropTarget = target;
    currentDropZone = zone;
    target.classList.add(zone);

    // Ghost pill — pointer-events:none so drops pass through to the pill-row (which has ondrop)
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
            row.insertBefore(ghost, pillCell);
        } else {
            pillCell.after(ghost);
        }
    }
};


window.handlePillDragLeave = function (e) {
    // We don't necessarily want to cleanup here because it might flicker
    // Cleanup is handled by new DragOver or DragEnd
};


window.handlePillDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const action = currentDropZone?.replace('drop-', '');
    const targetEl = currentDropTarget;

    // Cleanup UI immediately
    document.getElementById('pill-drag-ghost')?.remove();
    if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
    }

    if (!draggedPill || !targetEl || !action) {
        draggedPill = null;
        currentDropTarget = null;
        currentDropZone = null;
        return;
    }

    const tBlockIdx = parseInt(targetEl.dataset.blockidx);
    const tRowIdx = parseInt(targetEl.dataset.rowidx);
    const tColIdx = parseInt(targetEl.dataset.colidx);

    if (draggedPill.blockIdx === tBlockIdx) {
        const options = editorSchema[tBlockIdx].options;
        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

        // Perform the move logic
        // 1. Remove
        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedRowIdx = tRowIdx;
        let adjustedColIdx = tColIdx;

        // 2. Adjust indices if we removed from above/before the target
        if (options[draggedPill.rowIdx].length === 0) {
            options.splice(draggedPill.rowIdx, 1);
            if (draggedPill.rowIdx < adjustedRowIdx) adjustedRowIdx--;
        } else if (draggedPill.rowIdx === adjustedRowIdx && draggedPill.colIdx < adjustedColIdx) {
            adjustedColIdx--;
        }

        // 3. Insert
        if (action === 'left') {
            options[adjustedRowIdx].splice(adjustedColIdx, 0, draggedItem);
        } else if (action === 'right') {
            options[adjustedRowIdx].splice(adjustedColIdx + 1, 0, draggedItem);
        } else if (action === 'top') {
            options.splice(adjustedRowIdx, 0, [draggedItem]);
        } else if (action === 'bottom') {
            options.splice(adjustedRowIdx + 1, 0, [draggedItem]);
        }

        renderCanvas();
        saveDebounce();
    }

    draggedPill = null;
    currentDropTarget = null;
    currentDropZone = null;
};

window.handlePillDragEnd = function (e) {
    e.currentTarget.style.opacity = '1';
    document.getElementById('pill-drag-ghost')?.remove();

    // Clear targets after a small delay to allow handlePillDrop to execute
    setTimeout(() => {
        if (currentDropTarget) {
            currentDropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
        }
        currentDropTarget = null;
        currentDropZone = null;
        draggedPill = null;
    }, 50);
};



/* --- NEW: Empty Row Drop Handlers --- */
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
    document.getElementById('pill-drag-ghost')?.remove();
    if (!draggedPill) return;

    // Use blockIdx from the function argument (passed in onclick/ondrop)
    const tBlockIdx = blockIdx !== undefined ? blockIdx : parseInt(target.dataset.blockidx);

    if (draggedPill.blockIdx === tBlockIdx) {
        const options = editorSchema[draggedPill.blockIdx].options;
        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

        // 1. Remove from original position
        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedTargetRow = targetRowIdx !== undefined ? targetRowIdx : options.length;

        // 2. If the original row is now empty, remove it and adjust target index
        if (options[draggedPill.rowIdx].length === 0) {
            options.splice(draggedPill.rowIdx, 1);
            if (draggedPill.rowIdx < adjustedTargetRow) adjustedTargetRow--;
        }

        // 3. Insert as a new row at the target position
        options.splice(adjustedTargetRow, 0, [draggedItem]);

        renderCanvas();
        saveDebounce();
    }
    draggedPill = null;
    currentDropTarget = null;
    currentDropZone = null;
};

// ==========================================
// PILL OPTIONS LOGIC
// ==========================================
window.addOption = function (blockIndex) {
    editorSchema[blockIndex].options.push([{ text: 'Nova Opção' }]);
    renderCanvas();
    saveDebounce();
};

window.removeOption = function (blockIndex, rowIdx, colIdx) {
    editorSchema[blockIndex].options[rowIdx].splice(colIdx, 1);
    if (editorSchema[blockIndex].options[rowIdx].length === 0) {
        editorSchema[blockIndex].options.splice(rowIdx, 1);
    }
    renderCanvas();
    saveDebounce();
};

window.toggleRequired = function (blockIndex) {
    editorSchema[blockIndex].required = !editorSchema[blockIndex].required;
    renderCanvas();
    saveDebounce();
};

window.addOptionToRow = function (blockIndex, rowIdx, colIdx) {
    const row = editorSchema[blockIndex].options[rowIdx];
    if (!row) return;
    // Insert AFTER the pill that was clicked
    row.splice(colIdx + 1, 0, { text: 'Opção', color: null });
    renderCanvas();
    saveDebounce();
};

window.addOptionRow = function (blockIndex, rowIdx) {
    editorSchema[blockIndex].options.splice(rowIdx + 1, 0, [{ text: 'Opção', color: null }]);
    renderCanvas();
    saveDebounce();
};

window.togglePillPalette = function (e, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    const id = `palette-${blockIdx}-${rowIdx}-${colIdx}`;
    const palette = document.getElementById(id);
    const trigger = document.getElementById(`trigger-${blockIdx}-${rowIdx}-${colIdx}`);

    // Close other palettes first
    document.querySelectorAll('.pill-palette').forEach(p => {
        if (p.id !== id) p.classList.add('hidden');
    });

    // Store reference
    openPaletteOption = editorSchema[blockIdx].options[rowIdx][colIdx];
    openPaletteTitleIdx = null;

    // UI Update
    palette.classList.remove('hidden');

    // Intelligent Positioning
    if (trigger) {
        const triggerRect = trigger.getBoundingClientRect();
        const paletteWidth = 140; // Approx width
        const paletteHeight = palette.offsetHeight || 160;

        let left = 0;
        if (triggerRect.left + paletteWidth > window.innerWidth) {
            left = triggerRect.right - paletteWidth - triggerRect.left;
        }

        let top = 40; // Default below
        if (triggerRect.bottom + paletteHeight > window.innerHeight) {
            top = -paletteHeight - 10; // Flip to above
        }

        palette.style.top = `${top}px`;
        palette.style.left = `${left}px`;
    }
};

window.setPillColor = function (blockIdx, rowIdx, colIdx, color) {
    const optObj = editorSchema[blockIdx].options[rowIdx][colIdx];
    if (typeof optObj === 'object') {
        optObj.color = color;
    } else {
        editorSchema[blockIdx].options[rowIdx][colIdx] = { text: optObj, color: color };
    }

    // We don't reset activeColorTarget here to allow real-time picker updates
    renderCanvas();
    saveDebounce();
};

window.startSpectrum = function (e, type, b) {
    e.preventDefault();
    e.stopPropagation();
    spectrumActive = { type, b, element: e.currentTarget };
    updateSpectrum(e);

    const moveHandler = (me) => { if (spectrumActive) updateSpectrum(me); };
    const upHandler = (ue) => {
        if (spectrumActive) {
            updateSpectrum(ue);
            const { type, b } = spectrumActive;
            renderCanvas(); // Re-render to show updated slots
            saveDebounce();
            spectrumActive = null;
        }
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
};

let spectrumActive = null; // { type, b, element }

function updateSpectrum(e) {
    if (!spectrumActive) return;
    const { type, b, element } = spectrumActive;
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const hue = (x / rect.width) * 360;
    const hex = hslToHex(hue, 100, 50);

    editorSchema[b].blockColor = hex;

    const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
    if (blockEl) {
        const textColor = getContrastYIQ(hex);
        const target = blockEl.querySelector('.block-title-large, .block-section-heading');
        if (target) {
            if (editorSchema[b].blockStyle === 'border') {
                target.style.setProperty('--marker-color', hex);
            } else {
                target.style.backgroundColor = hex;
                target.style.color = textColor;
            }
        }
    }
}

// Event delegation for pill input editing
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('pill-edit-input')) {
        const blockIdx = parseInt(e.target.dataset.blockidx);
        const rowIdx = parseInt(e.target.dataset.rowidx);
        const colIdx = parseInt(e.target.dataset.colidx);
        const optObj = editorSchema[blockIdx].options[rowIdx][colIdx];

        if (typeof optObj === 'object') {
            optObj.text = e.target.value;
        } else {
            editorSchema[blockIdx].options[rowIdx][colIdx] = { text: e.target.value };
        }
        saveDebounce();
    }
});

// Event delegation on blocks container for asterisk toggle
blocksContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-required]');
    if (btn) {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.toggleRequired);
        editorSchema[idx].required = !editorSchema[idx].required;
        renderCanvas();
        saveDebounce();
    }
});

// Close palettes on document click
document.addEventListener('click', (e) => {
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    // Se o elemento foi removido do DOM (re-render), ignoramos
    if (!e.target.isConnected) return;

    // If we just re-rendered (within 300ms), ignore
    if (Date.now() - lastInternalRender < 300) return;

    if (!e.target.closest('.pill-palette') && !e.target.closest('.tool-btn') && !e.target.closest('.settings-btn')) {
        document.querySelectorAll('.pill-palette').forEach(p => p.classList.add('hidden'));
        openPaletteOption = null;
        openPaletteTitleIdx = null;
    }
});


// ==========================================
// SAVING LOGIC (FIRESTORE)
// ==========================================
let saveTimer;
async function saveDebounce() {
    saveStatus.textContent = "A guardar na nuvem...";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            let titleBlock = editorSchema.find(b => b.type === 'title');
            let formTitle = titleBlock ? (titleBlock.content || 'Novo Formulário') : 'Novo Formulário';

            const formRef = doc(db, "forms", currentFormId);

            // Deep copy schema to avoid mutating the UI state, and stringify options
            const safeSchema = JSON.parse(JSON.stringify(editorSchema));
            safeSchema.forEach(block => {
                if (block.options && Array.isArray(block.options)) {
                    block.options = JSON.stringify(block.options);
                }
            });

            const coverBlock = document.getElementById('cover-block');
            const theme = {
                coverImage: coverBlock ? coverBlock.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '') : null
            };

            await setDoc(formRef, {
                schema: safeSchema,
                title: formTitle,
                theme: theme,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Still sync to localStorage strictly for the preview.html to work without needing auth
            localStorage.setItem('cvpTallySchema', JSON.stringify(editorSchema));

            const navTitle = document.querySelector('.nav-title');
            if (navTitle) navTitle.textContent = formTitle;

            saveStatus.textContent = "Guardado na nuvem";
        } catch (error) {
            console.error("Erro ao guardar:", error);
            saveStatus.textContent = "Erro ao guardar!";
        }
    }, 1200);
}

// Block palette event delegation (for static dots)
document.getElementById('block-color-palette')?.addEventListener('click', (e) => {
    const dot = e.target.closest('.color-dot');
    if (dot && dot.dataset.color) {
        setBlockColor(dot.dataset.color);
    }
});

document.getElementById('block-hex-input')?.addEventListener('change', (e) => {
    setBlockColor(e.target.value);
    // no auto-save
});



window.publishForm = async function (btn) {
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A Publicar...';
    btn.disabled = true;

    // Force an immediate save
    clearTimeout(saveTimer);
    try {
        let titleBlock = editorSchema.find(b => b.type === 'title');
        let formTitle = titleBlock ? (titleBlock.content || 'Novo Formulário') : 'Novo Formulário';

        const formRef = doc(db, "forms", currentFormId);

        // Deep copy schema to avoid mutating the UI state, and stringify options
        const safeSchema = JSON.parse(JSON.stringify(editorSchema));
        safeSchema.forEach(block => {
            if (block.options && Array.isArray(block.options)) {
                block.options = JSON.stringify(block.options);
            }
        });

        const coverBlock = document.getElementById('cover-block');
        const theme = {
            coverImage: coverBlock ? coverBlock.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '') : null
        };

        await setDoc(formRef, {
            schema: safeSchema,
            title: formTitle,
            theme: theme,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Go back to dashboard on publish
        window.location.href = "dashboard.html";
    } catch (e) {
        console.error("Error publishing form:", e);
        alert("Erro ao publicar o formulário. Veja a consola.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

window.magiaDOM = async function () {
    const btn = document.getElementById('btn-magic');
    if (!btn) return;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A Construir...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const resp = await fetch('mapped_schema.json');
        if (!resp.ok) throw new Error("JSON not found locally");
        const schema = await resp.json();

        // Clear editor and prep for animation
        editorSchema = [];
        renderCanvas();

        const canvasScrolling = document.getElementById('editor-canvas');

        for (let i = 0; i < schema.length; i++) {
            // Push block
            editorSchema.push(schema[i]);
            renderCanvas();

            // Scroll dynamically to bottom
            canvasScrolling.scrollTo({
                top: canvasScrolling.scrollHeight,
                behavior: 'smooth'
            });

            // Artificial delay to simulate human building (150ms)
            await new Promise(r => setTimeout(r, 150));
        }

        saveDebounce();
        btn.innerHTML = '<i class="ph ph-check"></i> Concluído!';
        setTimeout(() => {
            btn.style.display = 'none'; // hide it after done
        }, 3000);

    } catch (e) {
        console.error(e);
        alert('Erro na magia DOM.');
        btn.innerHTML = '✨ Falhou';
        btn.disabled = false;
    }
};

// Init done via onAuthStateChanged

// ==========================================
// THEME LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnChangeCover = document.querySelector('.change-cover-btn');
    const coverUploadInput = document.getElementById('cover-upload-input');
    const coverBlock = document.getElementById('cover-block');

    if (btnChangeCover && coverUploadInput && coverBlock) {
        btnChangeCover.addEventListener('click', () => {
            coverUploadInput.click();
        });

        coverUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Basic validation
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem não pode exceder 5MB.');
                return;
            }
            if (!file.type.match('image.*')) {
                alert('Por favor selecione um ficheiro de imagem válido.');
                return;
            }

            const originalText = btnChangeCover.innerHTML;
            btnChangeCover.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A carregar imagem...';
            btnChangeCover.disabled = true;

            try {
                const clientId = '546c25a59c58ad7';
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('https://api.imgur.com/3/image', {
                    method: 'POST',
                    headers: { 'Authorization': `Client-ID ${clientId}` },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    const downloadURL = data.data.link;
                    coverBlock.style.backgroundImage = `url('${downloadURL}')`;
                    saveDebounce();
                } else {
                    console.error("Imgur upload failed:", data);
                    alert("Falha no upload. O servidor pode estar ocupado. Tenta novamente.");
                }
            } catch (err) {
                console.error("Fetch error during image upload:", err);
                alert("Erro de ligação ao fazer upload. Verifica a tua internet.");
            } finally {
                btnChangeCover.innerHTML = originalText;
                btnChangeCover.disabled = false;
                coverUploadInput.value = ''; // Reset input
            }
        });
    }

    const btnPreview = document.getElementById('btn-preview');
    if (btnPreview) {
        btnPreview.addEventListener('click', () => {
            if (!currentFormId) {
                alert('Formulário não carregado ainda. Tente guardar primeiro.');
                return;
            }
            // Open the real public form view in preview mode
            window.open(`view.html?id=${currentFormId}&preview=true`, '_blank');
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
    const block = editorSchema[index];
    if (!block) return;
    
    block.image = imageSrc;
    block.imageX = block.imageX ?? 10;
    block.imageY = block.imageY ?? 10;
    block.imageWidth = block.imageWidth ?? 200;
    block.imageHeight = block.imageHeight ?? 150;
    
    renderCanvas();
    saveDebounce();
};

window.removeBlockImage = function (e, index) {
    if (e) e.stopPropagation();
    const block = editorSchema[index];
    if (!block) return;
    
    delete block.image;
    delete block.imageX;
    delete block.imageY;
    delete block.imageWidth;
    delete block.imageHeight;
    
    renderCanvas();
    saveDebounce();
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
    
    const block = editorSchema[index];
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
        saveDebounce();
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

window.startImageResize = function (e, index) {
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const block = editorSchema[index];
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
        saveDebounce();
    }
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

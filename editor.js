/**
 * TALLY CLONE ENGINE - INLINE WYSIWYG
 */
import { auth, db, doc, getDoc, setDoc, onAuthStateChanged, serverTimestamp } from './firebase-config.js';

let currentFormId = localStorage.getItem('cvpCurrentFormId');

if (!currentFormId) {
    window.location.href = 'dashboard.html';
}

let editorSchema = [];
let currentForm = null;

// Auth check and load
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const formRef = doc(db, "forms", currentFormId);
        const formSnap = await getDoc(formRef);

        if (formSnap.exists() && formSnap.data().uid === user.uid) {
            currentForm = formSnap.data();
            editorSchema = currentForm.schema || [];

            if (editorSchema.length === 0) {
                editorSchema = [{ type: 'title', content: 'Novo Formulário' }];
            }

            if (currentForm.title) {
                const navTitle = document.querySelector('.nav-title');
                if (navTitle) navTitle.textContent = currentForm.title;
            }

            renderCanvas();
        } else {
            alert('Formulário não encontrado ou sem permissão.');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error("Erro a carregar formulário:", error);
        alert("Erro de comunicação com a base de dados.");
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

// User Preferences (Saved Colors)
let savedColors = JSON.parse(localStorage.getItem('cvpSavedColors')) || [];

function addSavedColor(color) {
    if (!color || color === 'transparent') return;
    const hex = color.toLowerCase();

    // Prevent flooding with very similar/same color consecutively
    if (savedColors[0] === hex) return;

    // Keep only unique colors, max 8
    savedColors = [hex, ...savedColors.filter(c => c !== hex)].slice(0, 8);
    localStorage.setItem('cvpSavedColors', JSON.stringify(savedColors));

    // Refresh block settings palette if open
    if (!settingsPopover.classList.contains('hidden')) {
        renderBlockSavedColors();
    }
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
    container.innerHTML = savedColors.map(c => `
        <div class="color-dot" style="background:${c}" onclick="setBlockColor('${c}'); addSavedColor('${c}')"></div>
    `).join('');
}

// Global helper for block colors
window.setBlockColor = function (color) {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].pillColor = color;
        const hexInput = document.getElementById('block-hex-input');
        if (hexInput) hexInput.value = color || '';
        // We don't call addSavedColor here for standard dots to avoid clutter,
        // it will be called for custom picks (Hex/Rainbow)
        renderCanvas();
        saveDebounce();
    }
};

// Contrast Helper
function getContrastYIQ(hexcolor) {
    if (!hexcolor || hexcolor === 'transparent') return '#ffffff';
    // Handle rgba or named colors if any (though we use hex)
    if (hexcolor.startsWith('rgba')) return '#ffffff';

    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(c => c + c).join('');
    }

    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#0f172a' : '#ffffff';
}

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
        addSavedColor(e.target.value);
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
        addSavedColor(e.target.value);
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
            blockEl.innerHTML = `<div class="block-title-large" contenteditable="true" data-field="content">${block.content || ''}</div>`;
        } else if (block.type === 'desc') {
            blockEl.innerHTML = `<div class="block-desc" contenteditable="true" data-field="content">${block.content || ''}</div>`;
        } else if (block.type === 'section') {
            blockEl.innerHTML = `<h2 class="block-question" style="font-size: 24px" contenteditable="true" data-field="question">${block.question || ''}</h2>`;
        } else {
            // Standard Question Blocks
            html = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div class="block-question" style="margin-bottom: 0;" contenteditable="true" data-field="question">${block.question || ''}</div>
                    ${block.required ? '<span class="required" style="color: #f87171; font-size: 14px; margin-top: -4px;">*</span>' : ''}
                </div>
                ${block.hasDescription ? `<div class="block-desc" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
            `;

            if (block.type === 'text-short' || block.type === 'text-long' || block.type === 'date') {
                const defaultPlaceholder = block.type === 'date' ? 'dd/mm/aaaa' : 'Resposta...';
                const placeholder = block.placeholder || defaultPlaceholder;
                const height = block.type === 'text-long' ? 'min-height: 100px;' : '';
                html += `<div class="fake-input" style="${height}">${placeholder}</div>`;
            } else if (block.type === 'choice-single' || block.type === 'choice-multi') {
                html += `<div class="pill-options-container">`;
                const opts = block.options || [];
                // Migrate legacy 1D array to 2D array of objects
                if (opts.length > 0 && typeof opts[0] === 'string') {
                    block.options = opts.map(opt => [{ text: opt }]);
                } else if (opts.length > 0 && Array.isArray(opts[0])) {
                    // Migrate 2D strings to 2D objects
                    block.options = opts.map(row => row.map(opt => typeof opt === 'string' ? { text: opt } : opt));
                }

                block.options.forEach((row, rowIdx) => {
                    html += `<div class="pill-row" style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">`;
                    row.forEach((optObj, colIdx) => {
                        const optText = typeof optObj === 'string' ? optObj : (optObj.text || '');
                        const optColor = typeof optObj === 'object' ? optObj.color : null;

                        // Use individual color if set, otherwise fallback to block-level color if block color-coding is ON
                        let pillStyle = '';
                        let iconStyle = '';

                        let activeColor = null;
                        if (optColor) {
                            activeColor = optColor;
                        } else if (block.hasColorCode && block.pillColor) {
                            activeColor = block.pillColor;
                        }

                        if (activeColor) {
                            const pillText = getContrastYIQ(activeColor);
                            pillStyle = `background-color: ${activeColor}; color: ${pillText}; border-color: rgba(255,255,255,0.1);`;
                            iconStyle = `color: ${pillText};`;
                        }

                        const savedDots = savedColors.map(c => `<div class="pill-color-dot" style="background:${c}" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, '${c}'); addSavedColor('${c}')"></div>`).join('');

                        html += `
                            <div class="pill-edit-wrapper" id="pill-wrapper-${index}-${rowIdx}-${colIdx}" draggable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" ondragstart="handlePillDragStart(event)" ondragover="handlePillDragOver(event)" ondragleave="handlePillDragLeave(event)" ondrop="handlePillDrop(event)" ondragend="handlePillDragEnd(event)" style="${pillStyle}">
                                <div class="pill-drag-handle" style="${iconStyle}"><i class="ph ph-dots-six-vertical"></i></div>
                                <input type="text" class="pill-edit-input" value="${optText}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" data-blockidx="${index}" placeholder="Opção" style="${pillStyle}">
                                
                                <button class="pill-color-trigger" id="trigger-${index}-${rowIdx}-${colIdx}" title="Cor da pílula" onclick="togglePillPalette(event, ${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                    <i class="ph ph-palette"></i>
                                </button>
                                
                                <button class="pill-remove-btn" title="Remover Opção" onclick="removeOption(${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                    <i class="ph ph-x"></i>
                                </button>
                                
                                <div id="palette-${index}-${rowIdx}-${colIdx}" class="pill-palette hidden">
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
                                    
                                    ${savedColors.length > 0 ? `
                                    <div class="palette-section">
                                        <div class="palette-label">Guardadas</div>
                                        <div class="palette-grid">${savedDots}</div>
                                    </div>
                                    ` : ''}

                                    <div class="palette-footer">
                                        <input type="text" class="palette-hex-input" placeholder="#HEX" maxlength="7" value="${optColor || ''}" onchange="setPillColor(${index}, ${rowIdx}, ${colIdx}, this.value); addSavedColor(this.value);">
                                        <div class="pill-color-dot rainbow" title="Custom" onclick="openFullPicker(event, ${index}, ${rowIdx}, ${colIdx})"></div>
                                        <div class="pill-color-dot reset" title="Reset" onclick="setPillColor(${index}, ${rowIdx}, ${colIdx}, null)">
                                            <i class="ph ph-prohibit"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                });

                // Add "Other" pill if enabled
                if (block.hasOther) {
                    let pillStyle = '';
                    let iconStyle = '';

                    let activeColor = null;
                    if (block.hasColorCode && block.pillColor) {
                        activeColor = block.pillColor;
                    }

                    if (activeColor) {
                        const otherText = getContrastYIQ(activeColor);
                        pillStyle = `background-color: ${activeColor}; color: ${otherText}; border-color: rgba(255,255,255,0.1);`;
                        iconStyle = `color: ${otherText};`;
                    }

                    pillStyle += ` opacity: 0.8;`;

                    const otherLabel = block.otherText || 'Outra';

                    html += `
                        <div class="pill-row" style="display: flex; gap: 12px; align-items: center; margin-bottom: 4px;">
                            <div class="pill-edit-wrapper" style="${pillStyle} cursor: default; width: auto; min-width: 100px;">
                                <i class="ph ph-plus" style="margin-left: 8px; ${iconStyle}"></i>
                                <input type="text" class="pill-other-input" value="${otherLabel}" data-blockidx="${index}" placeholder="Outra" style="flex:1; padding: 6px 12px; font-size: 14px; background: transparent; border: none; outline: none; min-width: 60px; ${iconStyle}">
                            </div>
                            <input type="text" disabled placeholder="Especificar..." style="background: transparent; border: none; border-bottom: 1px dashed rgba(255,255,255,0.4); color: rgba(255,255,255,0.7); outline: none; padding: 4px 8px; width: 200px; font-size: 14px; cursor: not-allowed;">
                        </div>
                    `;
                }

                html += `<button class="add-pill-btn" onclick="addOption(${index})"><i class="ph ph-plus"></i></button>`;
                html += `</div>`;
            }

            blockEl.innerHTML = html;
        }

        const toolsHtml = `
            <div class="block-tools-inline">
                <div class="tool-btn drag-handle" title="Arrastar para mover"><i class="ph ph-dots-six-vertical"></i></div>
                <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
                <div class="tool-btn settings-btn" title="Definições"><i class="ph ph-gear"></i></div>
                <div class="tool-btn delete-btn" title="Eliminar"><i class="ph ph-trash"></i></div>
            </div>
        `;

        // Inject tools + content
        if (block.type === 'title' || block.type === 'desc' || block.type === 'section') {
            blockEl.innerHTML = toolsHtml + blockEl.innerHTML;
        } else {
            blockEl.innerHTML = toolsHtml + html;
        }

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
            hoverBlockIndex = index; // Used by slash menu to know where to insert
            slashMenu.classList.remove('hidden');
            slashMenu.style.top = `${rect.top + window.scrollY + 30}px`;
            slashMenu.style.left = `${rect.left + window.scrollX + 30}px`;
        });

        blockEl.querySelector('.settings-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (block.type !== 'title' && block.type !== 'desc' && block.type !== 'section') {
                activeSettingsIndex = index;
                const rect = e.currentTarget.getBoundingClientRect();

                // Show/Hide specific rows based on block type
                rowSettingRequired.style.display = 'flex';
                rowSettingDescription.style.display = 'flex';

                if (block.type === 'choice-single' || block.type === 'choice-multi') {
                    rowSettingRandomize.style.display = 'flex';
                    rowSettingPlaceholder.style.display = 'none';
                } else {
                    rowSettingRandomize.style.display = 'none';
                    rowSettingPlaceholder.style.display = 'flex';
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

                // Position and show popover
                settingsPopover.classList.remove('hidden');
                settingsPopover.style.top = `${rect.top + window.scrollY}px`;
                settingsPopover.style.left = `${rect.right + window.scrollX + 15}px`;
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

        // Attach listeners for pill inputs
        const pillInputs = blockEl.querySelectorAll('.pill-edit-input');
        pillInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                const r = parseInt(input.dataset.rowidx);
                const c = parseInt(input.dataset.colidx);
                editorSchema[index].options[r][c] = e.target.value;
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
    hoverBlockIndex = null; // MUST reset so it adds at the end
    // Show slash menu at bottom
    const rect = addBlockEndBtn.getBoundingClientRect();
    slashMenu.classList.remove('hidden');
    slashMenu.style.top = `${rect.bottom + window.scrollY + 10}px`;
    slashMenu.style.left = `${rect.left + window.scrollX}px`;
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
    const newBlock = { type: type, question: '' };
    if (type === 'choice-single' || type === 'choice-multi') {
        newBlock.options = [['Opção 1']];
    }

    // If hoverBlockIndex is set, insert below it, otherwise append end
    if (hoverBlockIndex !== null) {
        editorSchema.splice(hoverBlockIndex + 1, 0, newBlock);
    } else {
        editorSchema.push(newBlock);
    }

    renderCanvas();
    saveDebounce();

    // Focus the new block
    setTimeout(() => {
        const newIdx = hoverBlockIndex !== null ? hoverBlockIndex + 1 : editorSchema.length - 1;
        const blocks = document.querySelectorAll('.tally-block');
        const editable = blocks[newIdx].querySelector('[contenteditable="true"]');
        if (editable) editable.focus();
    }, 50);
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
let draggedPill = null; // { blockIdx, rowIdx, colIdx }

window.handlePillDragStart = function (e) {
    e.stopPropagation();
    draggedPill = {
        blockIdx: parseInt(e.currentTarget.dataset.blockidx),
        rowIdx: parseInt(e.currentTarget.dataset.rowidx),
        colIdx: parseInt(e.currentTarget.dataset.colidx)
    };
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.currentTarget.style.opacity = '0.5', 0);
};

window.handlePillDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    e.currentTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');

    const slope = h / w;
    const isTopRight = y < slope * x;
    const isBottomRight = y > h - slope * x;

    if (isTopRight && !isBottomRight) e.currentTarget.classList.add('drop-top');
    else if (!isTopRight && isBottomRight) e.currentTarget.classList.add('drop-bottom');
    else if (!isTopRight && !isBottomRight) e.currentTarget.classList.add('drop-left');
    else e.currentTarget.classList.add('drop-right');
};

window.handlePillDragLeave = function (e) {
    e.currentTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
};

window.handlePillDrop = function (e) {
    e.stopPropagation();

    // Determine intention based on which class it had
    const classList = e.currentTarget.classList;
    const action = classList.contains('drop-top') ? 'top' :
        classList.contains('drop-bottom') ? 'bottom' :
            classList.contains('drop-left') ? 'left' : 'right';

    e.currentTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');

    if (!draggedPill) return;

    let targetBlockIdx = parseInt(e.currentTarget.dataset.blockidx);
    let targetRowIdx = parseInt(e.currentTarget.dataset.rowidx);
    let targetColIdx = parseInt(e.currentTarget.dataset.colidx);

    if (draggedPill.blockIdx !== targetBlockIdx) return;
    if (draggedPill.rowIdx === targetRowIdx && draggedPill.colIdx === targetColIdx) return;

    const options = editorSchema[targetBlockIdx].options;
    const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

    // 1. Remove from original spot
    options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);

    // 2. Cleanup empty rows immediately to prevent visual gaps and keep indices accurate
    if (options[draggedPill.rowIdx].length === 0) {
        options.splice(draggedPill.rowIdx, 1);
        // Adjust target Row index if we just deleted a row that sits ABOVE our target
        if (draggedPill.rowIdx < targetRowIdx) {
            targetRowIdx--;
        }
    } else {
        // We only adjust target Col index if we removed from the SAME row, and it was BEFORE our target
        if (draggedPill.rowIdx === targetRowIdx && draggedPill.colIdx < targetColIdx) {
            targetColIdx--;
        }
    }

    // 3. Insert into new spot
    if (action === 'left') {
        options[targetRowIdx].splice(targetColIdx, 0, draggedItem);
    } else if (action === 'right') {
        options[targetRowIdx].splice(targetColIdx + 1, 0, draggedItem);
    } else if (action === 'top') {
        // Create an entirely new row above
        options.splice(targetRowIdx, 0, [draggedItem]);
    } else if (action === 'bottom') {
        // Create an entirely new row below
        options.splice(targetRowIdx + 1, 0, [draggedItem]);
    }

    renderCanvas();
    saveDebounce();
};

window.handlePillDragEnd = function (e) {
    e.currentTarget.style.opacity = '1';
    draggedPill = null;
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

window.togglePillPalette = function (e, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    const id = `palette-${blockIdx}-${rowIdx}-${colIdx}`;
    const palette = document.getElementById(id);
    const trigger = document.getElementById(`trigger-${blockIdx}-${rowIdx}-${colIdx}`);

    // Close other palettes first
    document.querySelectorAll('.pill-palette').forEach(p => {
        if (p.id !== id) p.classList.add('hidden');
    });

    const isHidden = palette.classList.contains('hidden');
    if (isHidden) {
        palette.classList.remove('hidden');

        // Intelligent Positioning
        const triggerRect = trigger.getBoundingClientRect();
        const paletteWidth = 140; // Approx width
        const paletteHeight = palette.offsetHeight || 160;

        // Horizontal: Stay near the trigger but don't go off-screen
        let left = 0;
        if (triggerRect.left + paletteWidth > window.innerWidth) {
            left = triggerRect.right - paletteWidth - triggerRect.left;
        }

        // Vertical: Above or Below?
        let top = 40; // Default below
        if (triggerRect.bottom + paletteHeight > window.innerHeight) {
            top = -paletteHeight - 10; // Flip to above
        }

        palette.style.top = `${top}px`;
        palette.style.left = `${left}px`;
    } else {
        palette.classList.add('hidden');
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

window.openFullPicker = function (e, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    activeColorTarget = { blockIdx, rowIdx, colIdx };

    const rect = e.currentTarget.getBoundingClientRect();
    pillGlobalPicker.style.top = `${rect.top}px`;
    pillGlobalPicker.style.left = `${rect.left}px`;

    const optObj = editorSchema[blockIdx].options[rowIdx][colIdx];
    pillGlobalPicker.value = (typeof optObj === 'object' && optObj.color) ? optObj.color : '#22c55e';
    pillGlobalPicker.click();
};

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

// Close palettes on document click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.pill-edit-wrapper')) {
        document.querySelectorAll('.pill-palette').forEach(p => p.classList.add('hidden'));
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
            let formTitle = titleBlock ? (titleBlock.title || 'Novo Formulário') : 'Novo Formulário';

            const formRef = doc(db, "forms", currentFormId);
            await setDoc(formRef, {
                schema: editorSchema,
                title: formTitle,
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
    addSavedColor(e.target.value);
});

document.getElementById('btn-preview')?.addEventListener('click', () => {
    saveDebounce(); // Ensure latest state is saved
    window.open('preview.html', '_blank');
});

// Init done via onAuthStateChanged

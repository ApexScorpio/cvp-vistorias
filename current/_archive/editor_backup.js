/**
 * FORM ENGINE - INLINE WYSIWYG
 */
import { auth, db, onAuthStateChanged, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
import { THEMES, applyTheme } from './themes.js';
import { applyGlobalTheme, setGlobalTheme } from './global-theme.js';

// Apply saved global app theme immediately on builder load
applyGlobalTheme();

// Open/close the app-wide theme picker from the builder nav
window.openAppThemePicker = function (btn) {
    const tray = document.getElementById('app-theme-tray');
    if (!tray) return;
    const isOpen = tray.style.display === 'flex';
    if (isOpen) { tray.style.display = 'none'; return; }
    const rect = btn.getBoundingClientRect();
    tray.style.top = (rect.bottom + 8) + 'px';
    tray.style.right = (window.innerWidth - rect.right) + 'px';
    tray.style.display = 'flex';

    const currentId = localStorage.getItem('lp_app_theme') || 'midnight';
    const swatches = document.getElementById('app-theme-swatches');
    if (!swatches) return;
    swatches.innerHTML = '';
    if (!swatches.dataset.wired) {
        swatches.dataset.wired = '1';
        swatches.addEventListener('click', (e) => {
            const el = e.target.closest('[data-theme-id]');
            if (!el) return;
            setGlobalTheme(el.dataset.themeId);
            swatches.querySelectorAll('[data-theme-id]').forEach(s => {
                s.style.borderColor = s.dataset.themeId === el.dataset.themeId ? '#fff' : 'transparent';
            });
        });
    }
    Object.values(THEMES).forEach(t => {
        const div = document.createElement('div');
        div.dataset.themeId = t.id;
        div.title = t.name;
        div.onmouseover = () => div.style.transform = 'scale(1.12)';
        div.onmouseout = () => div.style.transform = 'scale(1)';
        Object.assign(div.style, {
            width: '44px', height: '44px', borderRadius: '10px',
            background: t.swatch, cursor: 'pointer',
            border: `2px solid ${currentId === t.id ? '#fff' : 'transparent'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            transition: 'transform 0.15s, border-color 0.15s',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: '3px', fontSize: '18px'
        });
        div.textContent = t.emoji;
        swatches.appendChild(div);
    });

    setTimeout(() => {
        document.addEventListener('click', function closeTray(e) {
            if (!tray.contains(e.target) && !e.target.closest('[onclick*="openAppThemePicker"]')) {
                tray.style.display = 'none';
                document.removeEventListener('click', closeTray);
            }
        });
    }, 0);
};

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

// Support both URL param and localStorage
const urlParams = new URLSearchParams(window.location.search);
let currentFormId = urlParams.get('id') || localStorage.getItem('lpCurrentFormId');

if (!currentFormId) {
    console.warn("No form ID found in URL or localStorage. Redirecting to dashboard.");
    window.location.href = 'index.html';
} else {
    // Sync to localStorage for consistency
    localStorage.setItem('lpCurrentFormId', currentFormId);
}

let editorSchema = [];
let currentForm = null;

// Auth check and load
const debugBanner = document.getElementById('blocks-container');
if (debugBanner) debugBanner.innerHTML = '<div style="padding:20px;color:#94a3b8;font-size:14px;">⏳ A carregar formulário...</div>';

onAuthStateChanged(auth, async (u) => {
    const isAgent = new URLSearchParams(window.location.search).get('agent') === 'true';
    let user = u;
    if (!user && !isAgent) {
        window.location.href = 'login.html';
        return;
    }
    if (isAgent && !user) {
        user = { uid: 'agent-cvp', email: 'agent@lpx.io' };
    }
    window.currentUser = user;

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
                
                // Auto-heal broken reference map images loaded from Firebase
                editorSchema.forEach(block => {
                    if (block.type === 'image' && block.url === 'https://i.imgur.com/vHq0M5z.png') {
                        block.url = 'assets/mala_trauma_mapa.jpg';
                    }
                });

                if (currentForm.title) {
                    const navTitle = document.querySelector('.nav-title');
                    if (navTitle) navTitle.textContent = currentForm.title;
                }

                if (currentForm.theme) {
                    const themeObj = currentForm.theme;
                    const themeId = (typeof themeObj === 'object') ? (themeObj.id || 'midnight') : (themeObj || 'midnight');
                    applyTheme(themeId);

                    if (themeObj.color) {
                        document.documentElement.style.setProperty('--brand-color', themeObj.color);
                        document.documentElement.style.setProperty('--theme-primary', themeObj.color);
                    }
                    if (themeObj.coverImage) {
                        const coverBlock = document.getElementById('cover-block');
                        if (coverBlock) {
                            coverBlock.style.backgroundImage = `url('${themeObj.coverImage}')`;
                            coverBlock.style.setProperty("background-size", "contain", "important");
                            coverBlock.style.setProperty("background-repeat", "no-repeat", "important");
                            coverBlock.style.setProperty("background-position", "center", "important");
                        }
                    } else {
                        const coverBlock = document.getElementById('cover-block');
                        if (coverBlock) coverBlock.style.backgroundImage = 'none';
                    }
                } else {
                    applyTheme('midnight');
                    document.documentElement.style.setProperty('--brand-color', '#3b82f6');
                    document.documentElement.style.setProperty('--theme-primary', '#3b82f6');
                    const coverBlock = document.getElementById('cover-block');
                    if (coverBlock) coverBlock.style.backgroundImage = 'none';
                }

                renderCanvas();
                if (typeof setupGlobalFileDrop === 'function') setupGlobalFileDrop();
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
            window.location.href = 'index.html';
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

const rowSettingImage = document.getElementById('row-setting-image');
const settingImageUrl = document.getElementById('setting-image-url');

const saveStatus = document.getElementById('save-status');
const addBlockEndBtn = document.getElementById('add-block-end');

let activeBlockIndex = null;
let activeSettingsIndex = null;
let hoverBlockIndex = null;

// Undo/Redo System
let undoStack = [];
let redoStack = [];

function pushToHistory() {
    // Save current state to undo stack
    undoStack.push(JSON.stringify(editorSchema));
    if (undoStack.length > 50) undoStack.shift(); // Limit history
    redoStack = []; // Clear redo stack on new action
}

window.undo = function () {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.stringify(editorSchema));
    editorSchema = JSON.parse(undoStack.pop());
    renderCanvas();
    saveToLocal && saveToLocal();
};

window.redo = function () {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.stringify(editorSchema));
    editorSchema = JSON.parse(redoStack.pop());
    renderCanvas();
    saveToLocal && saveToLocal();
};

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        window.undo();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        window.redo();
    } else if (e.ctrlKey && (e.key === 'Z' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        window.redo();
    }
});

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
        const { blockIdx, rowIdx, colIdx, key } = activeColorTarget;
        setPillColor(blockIdx, rowIdx, colIdx, e.target.value, key || 'options');
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

window.triggerImageUpload = function (index) {
    const input = document.getElementById('block-image-upload');
    if (!input) return;

    // Attach listener for THIS block index
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (re) => {
            const dataUrl = re.target.result;
            editorSchema[index].url = dataUrl;

            // If it's the active settings block, update URL input
            const urlInput = document.getElementById('setting-image-url');
            if (activeSettingsIndex === index && urlInput) {
                urlInput.value = dataUrl;
            }

            renderCanvas();
            saveDebounce();
        };
        reader.readAsDataURL(file);
    };

    input.click();
};

window.setImageAlign = function (align) {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].align = align;
        renderCanvas();
        saveDebounce();
    }
};

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
    const toolsHtml = `
        <div class="block-tools-inline">
            <div class="tool-btn drag-handle" title="Arrastar para mover"><i class="ph ph-dots-six-vertical"></i></div>
            <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
            <div class="tool-btn settings-btn" title="Definições"><i class="ph ph-gear"></i></div>
            <div class="tool-btn delete-btn" title="Eliminar"><i class="ph ph-trash"></i></div>
        </div>
    `;

    blocksContainer.innerHTML = '';

    if (editorSchema.length === 0) {
        editorSchema = [{ type: 'title', content: '' }];
    }

    if (document.body.classList.contains('mobile-view')) {
        // Logo injection deliberately removed to maintain purely clean layout
    }

    editorSchema.forEach((block, index) => {
        // --- ADDED: Insertion Gap BEFORE the block ---
        const gapBefore = document.createElement('div');
        gapBefore.className = 'block-insertion-gap';
        gapBefore.innerHTML = `
            <button class="insertion-btn" onclick="window.openSlashAtGap(${index - 1}, event)" title="Adicionar bloco aqui">
                <i class="ph ph-plus"></i>
            </button>
        `;
        blocksContainer.appendChild(gapBefore);

        const blockEl = document.createElement('div');
        const layoutMode = block.layoutMode || 'flow';
        blockEl.className = `tally-block block-${block.type} layout-mode-${layoutMode}`;
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
            blockEl.innerHTML = `<div class="block-title-large quill-editor" contenteditable="true" data-index="${index}" data-field="content">${block.content || ''}</div>`;
        } else if (block.type === 'desc') {
            const descContent = typeof block.content === 'string' ? block.content : '';
            blockEl.innerHTML = `<div class="block-desc quill-editor" contenteditable="true" data-index="${index}" data-field="content">${descContent}</div>`;
        } else if (block.type === 'section') {
            blockEl.innerHTML = `<div class="block-section-heading quill-editor" contenteditable="true" data-index="${index}" data-field="question">${block.question || ''}</div>`;
        } else if (block.type === 'image') {
            const url = block.url || '';
            const width = block.width || 100;
            const offsetX = block.offsetX || 0;
            const offsetY = block.offsetY || 0;
            
            html = `
                <div class="image-block-wrapper">
                    ${(layoutMode !== 'flow' && url) ? `
                        <div class="image-anchor-badge" onclick="event.stopPropagation(); const sbtn = document.querySelector('.tally-block[data-index=\\'${index}\\'] .settings-btn'); if(sbtn) sbtn.click();" onmouseenter="document.getElementById('img-layer-${index}').style.zIndex = '10000'" onmouseleave="document.getElementById('img-layer-${index}').style.zIndex = ''" title="Gerir imagem (Clique para abrir definições)">
                            <i class="ph ph-anchor"></i> ${layoutMode === 'front' ? 'Imagem À Frente' : 'Imagem no Fundo'}
                        </div>
                    ` : ''}
                    ${url ? 
                        `<div id="img-layer-${index}" class="image-interactive-layer" style="width: ${width}%; margin-left: ${offsetX}%; transform: translateY(${offsetY}px);">
                            ${toolsHtml}
                            <img src="${url}" style="box-shadow: 0 12px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);">
                            
                            <!-- Drag Handle -->
                            <div class="image-drag-handle" onmousedown="window.handleImageInteractionStart(event, ${index}, 'move')"></div>
                            
                            <!-- Resize Handles -->
                            <div class="resize-handle left" onmousedown="window.handleImageInteractionStart(event, ${index}, 'resize-left')"></div>
                            <div class="resize-handle right" onmousedown="window.handleImageInteractionStart(event, ${index}, 'resize-right')"></div>
                        </div>` : 
                        `<div class="image-upload-placeholder" onclick="window.triggerImageUpload(${index})">
                            <i class="ph ph-image-square"></i>
                            <span>Clique para carregar imagem</span>
                        </div>`
                    }
                    ${block.hasDescription ? `<div class="block-desc quill-editor" style="font-size: 14px; color: #94a3b8; margin-top: 8px; text-align: center; width: 100%;" data-index="${index}" data-field="description">${block.description || 'Legenda da imagem...'}</div>` : ''}
                </div>
            `;
            blockEl.innerHTML = html;
        } else if (block.type === 'divider') {
            blockEl.innerHTML = `<div class="block-divider-line"></div>`;
        } else {
            // Standard Question Blocks
            const isInventory = block.type === 'inventory';
            const headerClass = isInventory ? 'inventory-category-header' : '';
            html = `
                <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                    <div class="block-question quill-editor ${headerClass}" contenteditable="true" style="margin-bottom: 0px; flex: 1; background: ${block.pillColor || 'transparent'};" data-index="${index}" data-field="question">${block.question || ''}</div>
                    <button class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="toggleRequired(${index})" title="${block.required ? 'Clique para remover obrigatoriedade' : 'Clique para tornar obrigatório'}" style="cursor: pointer; background: transparent; border: none; font-size: 20px; transition: color 0.2s; margin-top: ${isInventory ? '4px' : '8px'};">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc quill-editor" style="font-size: 14px; color: #94a3b8; margin-bottom: 12px; min-height: 20px;" data-index="${index}" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
            `;

            if (block.type === 'inventory') {
                if (!block.inventoryItems) block.inventoryItems = [];
                if (block.inventoryItems.length > 0 && !Array.isArray(block.inventoryItems[0])) {
                    block.inventoryItems = [block.inventoryItems];
                }

                html += '<div class="inventory-builder">';
                
                block.inventoryItems.forEach((row, rowIdx) => {
                    // Gap zone BEFORE this row
                    html += `<div class="pill-row-gap" data-key="inventoryItems" data-blockidx="${index}" data-insertidx="${rowIdx}" ondragover="window.handleRowDragOver(event)" ondragleave="window.handleRowDragLeave(event)" ondrop="window.handleRowDrop(event, ${index}, ${rowIdx})"></div>`;
                    
                    // The row itself - catches drops between pills
                    html += `<div class="pill-row wrap" data-key="inventoryItems" data-blockidx="${index}" data-rowidx="${rowIdx}" ondragover="window.handlePillRowDragOver(event)" ondrop="window.handlePillRowDrop(event)">`;
                    
                    row.forEach((item, iIdx) => {
                        const pillWidth = item.width || 185; // Slightly wider for inventory
                        const optColor = item.color || null;
                        let pillStyle = '';
                        let iconStyle = '';
                        if (optColor) {
                            const textColor = getContrastYIQ(optColor);
                            pillStyle = `background-color: ${optColor}; color: ${textColor}; border-color: rgba(255,255,255,0.1);`;
                            iconStyle = `color: ${textColor};`;
                        }

                        html += `
                            <div class="pill-cell-wrapper" id="cell-${index}-${rowIdx}-${iIdx}" style="width: auto; max-width: 280px;" ondragover="window.handlePillDragOver(event)">
                                <div class="pill-edit-wrapper inventory-pill" 
                                     draggable="true"
                                     data-blockidx="${index}" 
                                     data-rowidx="${rowIdx}" 
                                     data-colidx="${iIdx}" 
                                     data-key="inventoryItems"
                                     ondragstart="window.handlePillDragStart(event)" 
                                     ondragover="window.handlePillDragOver(event)"
                                     ondragleave="window.handlePillDragLeave(event)"
                                     ondrop="window.handlePillDrop(event)"
                                     ondragend="window.handlePillDragEnd(event)"
                                     onclick="event.stopPropagation()"
                                     style="${pillStyle}">
                                    
                                    <div class="pill-drag-handle" style="${iconStyle}"><i class="ph ph-dots-six-vertical"></i></div>
                                    
                                    <div class="inventory-pill-content">
                                        <span class="inventory-pill-name" 
                                              contenteditable="true" 
                                              spellcheck="false" 
                                              onblur="updateInventoryItemField(event, ${index}, ${rowIdx}, ${iIdx}, 'name')">
                                              ${item.name || ''}
                                        </span>
                                        <div class="inventory-pill-qt">
                                            <label>Qt:</label>
                                            <input type="number" 
                                                   value="${item.required || 0}" 
                                                   onchange="updateInventoryItemField(event, ${index}, ${rowIdx}, ${iIdx}, 'required')"
                                                   style="${iconStyle}">
                                        </div>
                                    </div>

                                    <div class="pill-actions-hover">
                                        <button class="pill-clone-btn" title="Duplicar Item" onclick="window.cloneInventoryItem(${index}, ${rowIdx}, ${iIdx})" style="${iconStyle}">
                                            <i class="ph ph-copy"></i>
                                        </button>
                                        <button class="pill-color-trigger" title="Cor" id="trigger-inventoryItems-${index}-${rowIdx}-${iIdx}" onclick="window.togglePillPalette(event, ${index}, ${rowIdx}, ${iIdx}, 'inventoryItems')" style="${iconStyle}">
                                            <i class="ph ph-palette"></i>
                                        </button>
                                        <button class="pill-delete-btn" title="Remover Item" onclick="window.removeInventoryItem(${index}, ${rowIdx}, ${iIdx})" style="${iconStyle}">
                                            <i class="ph ph-trash"></i>
                                        </button>
                                    </div>
                                    <div id="palette-inventoryItems-${index}-${rowIdx}-${iIdx}" class="pill-palette hidden">
                                        <div class="palette-section">
                                            <div class="palette-label">Padrão</div>
                                            <div class="palette-grid">
                                                <div class="pill-color-dot" style="background:#22c55e" onclick="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, '#22c55e', 'inventoryItems')"></div>
                                                <div class="pill-color-dot" style="background:#ef4444" onclick="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, '#ef4444', 'inventoryItems')"></div>
                                                <div class="pill-color-dot" style="background:#3b82f6" onclick="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, '#3b82f6', 'inventoryItems')"></div>
                                                <div class="pill-color-dot" style="background:#eab308" onclick="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, '#eab308', 'inventoryItems')"></div>
                                                <div class="pill-color-dot" style="background:#f97316" onclick="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, '#f97316', 'inventoryItems')"></div>
                                            </div>
                                        </div>
                                        <div class="palette-footer">
                                            <input type="text" class="palette-hex-input" placeholder="#HEX" maxlength="7" onchange="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, this.value, 'inventoryItems')">
                                            <div class="pill-color-dot reset" onclick="window.setPillColor(${index}, ${rowIdx}, ${iIdx}, null, 'inventoryItems')"><i class="ph ph-prohibit"></i></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `;
                    });
                    
                    html += `
                        <div class="tally-dashed-add" title="Adicionar item" onclick="window.addInventoryItemToRow(${index}, ${rowIdx})">
                            <i class="ph ph-plus"></i>
                        </div>
                    `;
                    html += `</div>`; // end pill-row
                });

                html += `
                    <div class="category-add-row">
                        <button class="category-add-btn" onclick="window.addInventoryItemRow(${index})">
                            <i class="ph ph-plus" style="font-size: 16px;"></i>
                        </button>
                    </div>
                `;
                html += '</div>';
            } else if (block.type === 'text-short' || block.type === 'text-long') {
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
                        const cellWidth = optObj.width || 165; 

                        html += `
                            <div class="pill-cell-wrapper" draggable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" ondragstart="handlePillDragStart(event)" ondragover="handlePillDragOver(event)" ondragleave="handlePillDragLeave(event)" ondrop="handlePillDrop(event)" ondragend="handlePillDragEnd(event)" style="${cellWidth !== 'auto' ? `--pill-width: ${cellWidth}px; width: var(--pill-width);` : ''}">
                                <div class="pill-edit-wrapper" style="${pillStyle}">
                                    <div class="pill-drag-handle" style="${iconStyle}"><i class="ph ph-dots-six-vertical"></i></div>
                                    <span class="pill-input" contenteditable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" oninput="updateOptionText(event, ${index}, ${rowIdx}, ${colIdx}); window.fitText(this);" placeholder="Opção">${optText}</span>
                                    <button class="pill-clone-btn" title="Clonar Opção" onclick="cloneOption(${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                        <i class="ph ph-copy"></i>
                                    </button>
                                    <button class="pill-color-trigger" id="trigger-${index}-${rowIdx}-${colIdx}" title="Cor da pílula" onclick="togglePillPalette(event, ${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                        <i class="ph ph-palette"></i>
                                    </button>
                                    <button class="pill-delete-btn" title="Remover Opção" onclick="removeOption(${index}, ${rowIdx}, ${colIdx})" style="${iconStyle}">
                                        <i class="ph ph-x"></i>
                                    </button>
                                    <div class="pill-width-resizer" title="Arraste para redimensionar (Ctrl+Click repõe)" onmousedown="startPillResize(event, ${index}, ${rowIdx}, ${colIdx})"></div>
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
                                        <div class="palette-footer">
                                            <input type="text" class="palette-hex-input" placeholder="#HEX" maxlength="7" value="${optColor || ''}" onchange="setPillColor(${index}, ${rowIdx}, ${colIdx}, this.value); addSavedColor(this.value);">
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

                if (block.hasOther) {
                    let style = '';
                    if (block.hasColorCode && block.pillColor) {
                        const textColor = getContrastYIQ(block.pillColor);
                        style = `background-color: ${block.pillColor}; color: ${textColor}; border-color: rgba(255,255,255,0.1);`;
                    } else {
                        style = `background-color: rgba(255, 255, 255, 0.1); color: #f8fafc;`;
                    }

                    html += `
                        <div class="pill-row" style="margin-top: 8px;">
                            <div class="pill-cell-wrapper" style="--pill-width: 165px;">
                                <div class="pill-edit-wrapper pill-other" style="${style} cursor: default; width: 100%;">
                                    <div class="pill-edit-input">
                                        <input type="text" class="pill-other-input" style="background:transparent; border:none; border-bottom:1px solid rgba(255,255,255,0.3); color:inherit; text-align:center; outline:none; font-family:inherit; font-weight:500; font-size:15px; width:80%;" value="${block.otherText || 'Outra'}" placeholder="Texto da opção Outra...">
                                    </div>
                                    <button class="pill-delete-btn" title="Desativar 'Outra'" onclick="toggleOtherDisabled(${index})" style="opacity: 1; pointer-events: auto; background: rgba(0,0,0,0.3); right: 8px;"><i class="ph ph-x"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                html += `</div>`; // close pill-options-container

            }

            blockEl.innerHTML = html;
        }



        // Inject tools + content
        if (block.type === 'image') {
            // Tools are already inside the interactive layer for images
            blockEl.innerHTML = html;
        } else if (block.type === 'divider') {
            blockEl.innerHTML = toolsHtml + blockEl.innerHTML;
        } else if (block.type === 'title' || block.type === 'desc' || block.type === 'section') {
            blockEl.innerHTML = toolsHtml + blockEl.innerHTML;
        } else {
            blockEl.innerHTML = toolsHtml + html;
        }

        // --- Bind block-specific Tool Events ---
        blockEl.querySelector('.delete-btn').addEventListener('click', () => {
            pushToHistory();
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

                // Custom: Reset Position for Image
                const resetRow = document.getElementById('row-setting-reset-image');
                if (resetRow) {
                    resetRow.style.display = (block.type === 'image') ? 'flex' : 'none';
                }

                // Custom: Layout Mode for Image
                const layoutRow = document.getElementById('row-setting-layout-mode');
                if (layoutRow) {
                    layoutRow.style.display = (block.type === 'image') ? 'flex' : 'none';
                    if (block.type === 'image') {
                        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
                        const currentMode = block.layoutMode || 'flow';
                        const activeBtn = document.getElementById(`layout-${currentMode}`);
                        if (activeBtn) activeBtn.classList.add('active');
                    }
                }
                
                // Inventory Settings
                const inventoryRow = document.getElementById('row-setting-inventory');
                if (inventoryRow) {
                    if (block.type === 'inventory') {
                        inventoryRow.style.display = 'flex';
                        rowSettingColor.style.display = 'flex'; 
                        // Update label for clarity in inventory blocks
                        const colorLabel = rowSettingColor.querySelector('span');
                        if (colorLabel) colorLabel.textContent = 'Cor do Separador';
                        renderInventoryItemsEditor(index);
                    } else {
                        inventoryRow.style.display = 'none';
                        const colorLabel = rowSettingColor.querySelector('span');
                        if (colorLabel) colorLabel.textContent = 'Cores nas Opções';
                    }
                }

                // Image Settings
                const imageRow = document.getElementById('row-setting-image');
                if (imageRow) {
                    if (block.type === 'image') {
                        imageRow.style.display = 'flex';
                        settingImageUrl.value = block.url || '';
                    } else {
                        imageRow.style.display = 'none';
                    }
                }

                // Set current values
                settingRequiredCheckbox.checked = !!editorSchema[index].required;
                settingDescriptionCheckbox.checked = !!editorSchema[index].hasDescription;
                settingRandomizeCheckbox.checked = !!editorSchema[index].randomize;
                settingPlaceholderInput.value = editorSchema[index].placeholder || '';
                settingOtherCheckbox.checked = !!editorSchema[index].hasOther;
                settingMultiCheckbox.checked = editorSchema[index].type === 'choice-multi';
                settingColorCheckbox.checked = !!editorSchema[index].hasColorCode;
                
                // Force palette visibility for inventory blocks, otherwise use the toggle state
                if (block.type === 'inventory') {
                    rowSettingPalette.style.display = 'flex';
                } else {
                    rowSettingPalette.style.display = editorSchema[index].hasColorCode ? 'flex' : 'none';
                }

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
                    text: e.target.textContent
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

        blocksContainer.appendChild(blockEl);
    });

    // --- Initialize Quill Editors ---
    document.querySelectorAll('.quill-editor').forEach(el => {
        const idx = parseInt(el.dataset.index);
        const field = el.dataset.field;

        const quill = new Quill(el, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'clean']
                ],
                clipboard: {
                    matchers: [
                        [Node.ELEMENT_NODE, (node, delta) => {
                            delta.ops.forEach(op => {
                                if (op.attributes) {
                                    // Remove background and color but keep others
                                    delete op.attributes.background;
                                    delete op.attributes.color;
                                }
                            });
                            return delta;
                        }]
                    ]
                }
            }
        });

        // Set initial content as HTML
        const initialContent = (field === 'question' || field === 'description' || field === 'content') ? editorSchema[idx][field] : '';
        if (initialContent) {
            quill.root.innerHTML = initialContent;
        }

        quill.on('text-change', () => {
            // Use innerHTML to preserve bold, etc.
            editorSchema[idx][field] = quill.root.innerHTML;
            saveDebounce();
        });
    });

    // Auto fit font sizes
    setTimeout(() => {
        if (window.autoFitAllPills) window.autoFitAllPills();
    }, 10);
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
    slashMenu.style.top = `${rect.bottom - editorPageRect.top + 10} px`;
    slashMenu.style.left = `${rect.left - editorPageRect.left} px`;
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
    pushToHistory();
    const newBlock = { type: type, question: '' };
    if (type === 'choice-single' || type === 'choice-multi') {
        newBlock.options = [['Opção 1']];
    } else if (type === 'inventory') {
        newBlock.inventoryItems = [{ name: 'Item de Exemplo', required: 1 }];
    }

    // If hoverBlockIndex is set, insert below it, otherwise append end
    if (hoverBlockIndex !== null) {
        editorSchema.splice(hoverBlockIndex + 1, 0, newBlock);
    } else {
        editorSchema.push(newBlock);
    }

    renderCanvas();
    saveDebounce();

    // Focus the new block (only for blocks with contenteditable)
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
        pushToHistory();
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

settingPlaceholderInput.addEventListener('input', (e) => {
    if (activeSettingsIndex !== null) {
        editorSchema[activeSettingsIndex].placeholder = e.target.value;
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
        if (activeSettingsIndex !== null) {
            const block = editorSchema[activeSettingsIndex];
            // Auto-enable color if we're in an inventory block picking a color
            if (block.type === 'inventory') {
                block.hasColorCode = true;
                settingColorCheckbox.checked = true;
            }
            
            if (block.hasColorCode) {
                block.pillColor = e.currentTarget.dataset.color;
                renderCanvas();
                saveDebounce();
            }
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

// Image Settings Logic
if (settingImageUrl) {
    settingImageUrl.addEventListener('input', (e) => {
        if (activeSettingsIndex !== null && editorSchema[activeSettingsIndex].type === 'image') {
            editorSchema[activeSettingsIndex].url = e.target.value;
            renderCanvas();
            saveDebounce();
        }
    });
}

window.setImageAlign = function(alignment) {
    if (activeSettingsIndex !== null && editorSchema[activeSettingsIndex].type === 'image') {
        editorSchema[activeSettingsIndex].alignment = alignment;
        renderCanvas();
        saveDebounce();
    }
};

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
    if (!draggedPill) return;
    
    e.dataTransfer.dropEffect = 'move';
    
    // Set this row as the current target if we're not over a specific pill
    const target = e.currentTarget;
    if (currentDropTarget !== target) {
        if (currentDropTarget) {
            currentDropTarget.classList.remove('drop-left', 'drop-right', 'drop-top', 'drop-bottom', 'drop-left');
        }
        currentDropTarget = target;
        currentDropZone = 'drop-right'; // Default to append to row
    }
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
        key: el.dataset.key || 'options',
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
        const options = editorSchema[tBlockIdx][targetEl.dataset.key || "options"];
        const draggedItem = editorSchema[draggedPill.blockIdx][draggedPill.key || "options"][draggedPill.rowIdx][draggedPill.colIdx];

        // Perform the move logic
        // 1. Remove
        editorSchema[draggedPill.blockIdx][draggedPill.key || "options"][draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedRowIdx = tRowIdx;
        let adjustedColIdx = tColIdx;

        // 2. Adjust indices if we removed from above/before the target
        if (editorSchema[draggedPill.blockIdx][draggedPill.key || "options"][draggedPill.rowIdx].length === 0) {
            editorSchema[draggedPill.blockIdx][draggedPill.key || "options"].splice(draggedPill.rowIdx, 1);
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
        const key = draggedPill.key || "options";
        const list = editorSchema[draggedPill.blockIdx][key];
        const draggedItem = list[draggedPill.rowIdx][draggedPill.colIdx];

        // 1. Remove from original position
        list[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedTargetRow = targetRowIdx !== undefined ? targetRowIdx : list.length;

        // 2. If the original row is now empty, remove it and adjust target index
        if (list[draggedPill.rowIdx].length === 0) {
            list.splice(draggedPill.rowIdx, 1);
            if (draggedPill.rowIdx < adjustedTargetRow) adjustedTargetRow--;
        }

        // 3. Insert as a new row at the target position
        list.splice(adjustedTargetRow, 0, [draggedItem]);

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

window.toggleOtherDisabled = function (blockIndex) {
    editorSchema[blockIndex].hasOther = false;
    renderCanvas();
    saveDebounce();
};

window.togglePillPalette = function (e, blockIdx, rowIdx, colIdx, key = 'options') {
    e.stopPropagation();
    const id = `palette-${key}-${blockIdx}-${rowIdx}-${colIdx}`;
    const palette = document.getElementById(id);
    const trigger = document.getElementById(`trigger-${key}-${blockIdx}-${rowIdx}-${colIdx}`);

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

window.setPillColor = function (blockIdx, rowIdx, colIdx, color, key = 'options') {
    const block = editorSchema[blockIdx];
    const dataRow = block[key][rowIdx];
    const optObj = dataRow[colIdx];
    
    if (typeof optObj === 'object') {
        optObj.color = color;
    } else {
        dataRow[colIdx] = { text: optObj, color: color };
    }

    // We don't reset activeColorTarget here to allow real-time picker updates
    renderCanvas();
    saveDebounce();
};

window.openFullPicker = function (e, blockIdx, rowIdx, colIdx, key = 'options') {
    e.stopPropagation();
    activeColorTarget = { blockIdx, rowIdx, colIdx, key };

    const rect = e.currentTarget.getBoundingClientRect();
    pillGlobalPicker.style.top = `${rect.top} px`;
    pillGlobalPicker.style.left = `${rect.left} px`;

    const block = editorSchema[blockIdx];
    const optObj = block[key][rowIdx][colIdx];
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
        const newText = e.target.textContent;

        if (typeof optObj === 'object') {
            optObj.text = newText;
        } else {
            editorSchema[blockIdx].options[rowIdx][colIdx] = { text: newText };
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
    if (!e.target.closest('.pill-edit-wrapper')) {
        document.querySelectorAll('.pill-palette').forEach(p => p.classList.add('hidden'));
    }
});


// ==========================================
// SEÇÃO DE AUTO-SAVE REMOVIDA (USAR PUBLICAR)
// ==========================================

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
        let coverUrl = null;
        if (coverBlock && coverBlock.style.backgroundImage) {
            // More robust extraction of URL from background-image
            const match = coverBlock.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (match && match[1]) {
                coverUrl = match[1];
            }
        }

        const theme = {
            id: document.documentElement.dataset.theme || 'cobalt',
            coverImage: coverUrl,
            color: getComputedStyle(document.documentElement).getPropertyValue('--brand-color').trim() || '#EF4444'
        };

        await setDoc(formRef, {
            schema: safeSchema,
            title: formTitle,
            theme: theme,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Go back to dashboard on publish
        window.location.href = "index.html";
    } catch (e) {
        console.error("Error publishing form:", e);
        alert("Erro ao publicar o formulário. Veja a consola.");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

// ==========================================
// THEME PICKER
// ==========================================
window.openGlobalThemePicker = function () {
    const tray = document.getElementById('theme-tray');
    if (!tray) return;

    const isOpen = tray.style.display === 'flex';
    tray.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) return;

    const container = document.getElementById('builder-theme-swatches');
    if (!container) return;

    const currentThemeId = (typeof currentForm?.theme === 'object') ? currentForm?.theme?.id : currentForm?.theme;

    // Render a swatch for each theme
    container.innerHTML = Object.values(THEMES).map(t => `
        <div
            title="${t.name}"
            onclick="window.selectBuilderTheme('${t.id}')"
            style="
                width: 44px; height: 44px;
                border-radius: 10px;
                background: ${t.swatch};
                cursor: pointer;
                border: 2px solid ${currentThemeId === t.id ? '#fff' : 'transparent'};
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                transition: transform 0.15s, border-color 0.15s;
                display: flex; align-items: flex-end; justify-content: center;
                padding-bottom: 3px;
                font-size: 18px;
            "
            onmouseover="this.style.transform='scale(1.12)'"
            onmouseout="this.style.transform='scale(1)'"
        >${t.emoji}</div>
    `).join('');

    // Custom color picker override
    const picker = document.getElementById('custom-theme-picker');
    if (picker) {
        picker.oninput = (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--theme-primary', color);
            document.documentElement.style.setProperty('--theme-accent', color);
            if (currentForm) {
                currentForm.theme = { ...(currentForm.theme || {}), color };
                saveDebounce();
            }
        };
    }

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeTray(e) {
            if (!tray.contains(e.target) && !e.target.closest('[onclick*="openGlobalThemePicker"]')) {
                tray.style.display = 'none';
                document.removeEventListener('click', closeTray);
            }
        });
    }, 0);
};

window.selectBuilderTheme = function (themeId) {
    applyTheme(themeId);
    if (currentForm) {
        const existingTheme = (typeof currentForm.theme === 'object') ? currentForm.theme : {};
        currentForm.theme = { ...existingTheme, id: themeId };
        saveDebounce();
    }
    // Update swatch selection border
    document.querySelectorAll('#builder-theme-swatches div').forEach((el, i) => {
        const tId = Object.keys(THEMES)[i];
        el.style.borderColor = tId === themeId ? '#fff' : 'transparent';
    });
};

window.fitText = function (el) {
    if (!el) return;
    let size = 15;
    el.style.fontSize = size + 'px';
    // Use a fixed threshold of 38px (internal area of a 42px pill)
    // scrollHeight gives us the total text height including overflow
    let maxH = el.clientHeight || 38; 
    if (maxH < 20) maxH = 38; // Fallback for hidden elements
    
    while (size > 8 && el.scrollHeight > maxH + 1) {
        size -= 0.5;
        el.style.fontSize = size + 'px';
    }
};

window.autoFitAllPills = function () {
    document.querySelectorAll('.pill-input').forEach(el => fitText(el));
};

function saveToLocal() {
    // Only save to localStorage for undo/redo persistence across sessions if desired, 
    // but here we mainly use it as the "session" save.
    localStorage.setItem(`cvp_draft_${currentFormId}`, JSON.stringify(editorSchema));
    if (saveStatus) {
        const now = new Date().toLocaleTimeString();
        saveStatus.innerHTML = `<i class="ph ph-cloud-check"></i> Rascunho salvo às ${now}`;
    }
}

let saveTimer;
function saveDebounce() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveToLocal();
    }, 1000);
}

let resizingPill = null;
let resizingStartX = 0;
let resizingStartWidth = 0;

window.cloneOption = function (blockIdx, rowIdx, colIdx) {
    pushToHistory();
    const block = editorSchema[blockIdx];
    const optionToClone = JSON.parse(JSON.stringify(block.options[rowIdx][colIdx]));
    block.options[rowIdx].splice(colIdx + 1, 0, optionToClone);
    renderCanvas();
    saveDebounce();
};

window.startPillResize = function (e, blockIdx, rowIdx, colIdx) {
    e.preventDefault();
    e.stopPropagation();

    const block = editorSchema[blockIdx];
    const opt = block.options[rowIdx][colIdx];

    const cellWrapper = e.target.closest('.pill-cell-wrapper');
    if (!cellWrapper) return;

    if (e.ctrlKey) {
        // Reset to default width immediately
        delete opt.width;
        pushToHistory();
        renderCanvas();
        saveDebounce();
        return;
    }

    resizingPill = { blockIdx, rowIdx, colIdx, cellWrapper, opt };
    resizingStartX = e.clientX;
    resizingStartWidth = cellWrapper.offsetWidth;

    document.addEventListener('mousemove', doPillResize);
    document.addEventListener('mouseup', stopPillResize);

    e.target.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
};

function doPillResize(e) {
    if (!resizingPill) return;

    let newWidth;
    if (e.ctrlKey) {
        newWidth = 165; // fixed default
    } else {
        const dx = e.clientX - resizingStartX;
        newWidth = Math.max(80, resizingStartWidth + dx);
    }

    resizingPill.cellWrapper.style.setProperty('--pill-width', `${newWidth}px`);
    resizingPill.cellWrapper.style.width = `${newWidth}px`;

    const input = resizingPill.cellWrapper.querySelector('.pill-input');
    if (input) fitText(input);
}

function stopPillResize(e) {
    if (!resizingPill) return;

    document.removeEventListener('mousemove', doPillResize);
    document.removeEventListener('mouseup', stopPillResize);
    document.body.style.cursor = '';

    // Save final width
    // Re-evaluating width since it's a CSS variable now
    const styleStr = resizingPill.cellWrapper.style.getPropertyValue('--pill-width');
    const finalWidth = parseInt(styleStr.replace('px', '')) || resizingPill.cellWrapper.offsetWidth;

    if (finalWidth === 165 || e.ctrlKey) {
        delete resizingPill.opt.width;
    } else {
        resizingPill.opt.width = finalWidth;
    }

    pushToHistory();
    renderCanvas();
    saveDebounce();

    const resizers = document.querySelectorAll('.pill-width-resizer');
    resizers.forEach(r => r.classList.remove('is-resizing'));

    resizingPill = null;
}

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
                    // Log for debugging
                    console.log("Image uploaded and applied to cover-block:", downloadURL);
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
            console.log("Preview button clicked. Saving schema...");
            // Save current state to local preview storage
            localStorage.setItem('lp_preview_schema', JSON.stringify(editorSchema));
            
            // If we have an ID, use it, otherwise use 'local-draft'
            const previewId = currentFormId || 'local-draft';
            // Target view.html directly to support local dev servers
            const url = `./view.html?id=${previewId}&preview=true&t=${Date.now()}`;
            console.log("Opening preview URL (Clean URL):", url);
            
            const win = window.open(url, '_blank');
            if (!win) {
                alert("O browser bloqueou o popup do Preview. Por favor, permita popups para este site.");
            }
        });
    }

    const btnSmartphone = document.getElementById('btn-smartphone');
    if (btnSmartphone) {
        btnSmartphone.addEventListener('click', () => {
            document.body.classList.toggle('mobile-view');
            renderCanvas();
        });
    }
});

// ==========================================
// THEME SELECTION TRAY (BUILDER)
// ==========================================
let _isThemeTrayOpen = false;

window.openGlobalThemePicker = function () {
    console.log("Opening theme picker...");
    const tray = document.getElementById('theme-tray');
    if (!tray) {
        console.error("Theme tray element not found!");
        return;
    }

    _isThemeTrayOpen = !_isThemeTrayOpen;
    tray.style.setProperty('display', _isThemeTrayOpen ? 'flex' : 'none', 'important');
    tray.classList.toggle('hidden', !_isThemeTrayOpen);

    if (_isThemeTrayOpen) {
        renderThemeSwatches();
    }
};

function renderThemeSwatches() {
    const container = document.getElementById('builder-theme-swatches');
    if (!container) return;

    const currentThemeId = document.documentElement.dataset.theme || 'cobalt';

    container.innerHTML = Object.values(THEMES).map(t => `
        <button type="button" 
            onclick="window.switchBuilderTheme('${t.id}')"
            style="width:44px; height:44px; border-radius:10px; cursor:pointer; font-size:18px;
                   background:${t.swatch};
                   border:2px solid ${t.id === currentThemeId ? '#ffffff' : 'transparent'};
                   box-shadow: ${t.id === currentThemeId ? '0 0 0 2px var(--brand-color)' : 'none'};
                   transition: transform 0.15s, border-color 0.15s;
                   display:flex; align-items:center; justify-content:center;"
        >${t.emoji}</button>
    `).join('');

    const customPicker = document.getElementById('custom-theme-picker');
    if (customPicker) {
        customPicker.value = getComputedStyle(document.documentElement).getPropertyValue('--brand-color').trim() || '#EF4444';
        customPicker.oninput = (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--brand-color', color);
            document.documentElement.style.setProperty('--theme-primary', color);
            saveDebounce();
        };
    }
}

window.switchBuilderTheme = function (themeId) {
    applyTheme(themeId);
    renderThemeSwatches(); // refresh borders
    saveDebounce();
};

// Close tray on outside click
document.addEventListener('click', (e) => {
    const tray = document.getElementById('theme-tray');
    const themeBtn = document.querySelector('button[onclick*="openGlobalThemePicker"]');
    if (tray && _isThemeTrayOpen && !tray.contains(e.target) && !themeBtn.contains(e.target)) {
        _isThemeTrayOpen = false;
        tray.style.display = 'none';
    }
});

// ==========================================
// PILL EXPANSION FLUIDITY
// ==========================================
document.addEventListener('mouseover', (e) => {
    const wrapper = e.target.closest('.pill-cell-wrapper');
    if (!wrapper) return;
    
    // Only proceed if not already expanded to this specific pill
    if (wrapper.dataset.isHovered === 'true') return;
    wrapper.dataset.isHovered = 'true';

    // Target either standard pill input or the "other" input
    const input = wrapper.querySelector('.pill-input') || wrapper.querySelector('.pill-other-input') || wrapper.querySelector('.inventory-pill-name');
    if (!input) return;

    // 1. Measure pure text width using Canvas (most precise, ignores layout quirks)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const style = getComputedStyle(input);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = ctx.measureText((input.innerText || input.textContent).trim());
    const textWidth = metrics.width;

    // 2. Calculate final target
    const baseWidth = parseFloat(getComputedStyle(wrapper).getPropertyValue('--pill-width')) || 165;
    
    let extraPadding = 120; // 30 (drag) + 80 (actions) + 10 buffer
    const innerWrapper = wrapper.querySelector('.pill-edit-wrapper');
    if (innerWrapper && innerWrapper.classList.contains('inventory-pill')) {
        // Inventory pills have an additional quantity badge (~75px) + extra room for medical names
        extraPadding += 110; 
    }
    
    const targetWidth = textWidth + extraPadding;
    
    // Ensure the expansion doesn't push the pill off-screen.
    // We cap the width to the parent container's width (minus a small margin).
    const parentWidth = wrapper.parentElement ? wrapper.parentElement.offsetWidth : window.innerWidth;
    const finalTarget = Math.min(Math.max(baseWidth, targetWidth), parentWidth - 40);

    console.log(`[PillDebug] text: "${input.innerText.trim()}", textWidth: ${textWidth.toFixed(1)}, finalTarget: ${finalTarget.toFixed(1)}`);

    // 3. Apply numeric width to trigger smooth CSS transition
    wrapper.style.width = `${finalTarget}px`;
});

document.addEventListener('mouseout', (e) => {
    const wrapper = e.target.closest('.pill-cell-wrapper');
    if (wrapper && !wrapper.contains(e.relatedTarget)) {
        wrapper.style.width = ''; // Return to CSS var handle
        wrapper.dataset.isHovered = 'false';
    }
});

// ==========================================
// INVENTORY MANAGEMENT LOGIC
// ==========================================

window.renderInventoryItemsEditor = function (blockIdx) {
    const block = editorSchema[blockIdx];
    const container = document.getElementById('inventory-items-list');
    if (!container) return;

    const items = block.inventoryItems || [];
    container.innerHTML = items.map((item, i) => `
        <div style="display: flex; gap: 4px; align-items: center;">
            <input type="text" class="settings-text-input" style="flex: 1; font-size: 13px; padding: 6px;" 
                value="${item.name || ''}" placeholder="Nome do item"
                onchange="updateInventoryItem(${blockIdx}, ${i}, 'name', this.value)">
            <input type="number" class="settings-text-input" style="width: 50px; font-size: 13px; padding: 6px; text-align: center;" 
                value="${item.required || 0}" min="0"
                onchange="updateInventoryItem(${blockIdx}, ${i}, 'required', parseInt(this.value))">
            <button onclick="removeInventoryItem(${blockIdx}, ${i})" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 4px;">
                <i class="ph ph-trash"></i>
            </button>
        </div>
    `).join('');

    // Wire up buttons (they are static in builder.html, we just need to update their onclick/listeners)
    const addBtn = document.getElementById('btn-add-inventory-item');
    if (addBtn) {
        addBtn.onclick = () => addInventoryItem(blockIdx);
    }
    const kitBtn = document.getElementById('btn-import-ambulance');
    if (kitBtn) {
        kitBtn.style.display = 'none';
    }
};

window.updateInventoryItem = function (blockIdx, itemIdx, field, value) {
    if (!editorSchema[blockIdx].inventoryItems) editorSchema[blockIdx].inventoryItems = [];
    editorSchema[blockIdx].inventoryItems[itemIdx][field] = value;
    renderCanvas();
    saveDebounce();
};

window.removeInventoryItem = function (blockIdx, itemIdx) {
    pushToHistory();
    editorSchema[blockIdx].inventoryItems.splice(itemIdx, 1);
    renderInventoryItemsEditor(blockIdx);
    renderCanvas();
    saveDebounce();
};

window.addInventoryItem = function (blockIdx) {
    pushToHistory();
    if (!editorSchema[blockIdx].inventoryItems) editorSchema[blockIdx].inventoryItems = [];
    editorSchema[blockIdx].inventoryItems.push({ name: '', required: 1 });
    renderInventoryItemsEditor(blockIdx);
    renderCanvas();
    saveDebounce();
};

window.importAmbulanceKit = function (blockIdx) {
    if (!confirm("Isto irá substituir o conteúdo deste bloco pelos itens da Ambulância. Continuar?")) return;

    const ambulanceKit = [
        { cat: "Cockpit - Porta Luvas", items: ["Cartão abastecimento", "Declaração Europeia de Acidente", "Documento Único Automóvel", "Carta Verde", "Comprovativo de Inspeção INEM", "Comprovativo de Inspeção IMT", "Colete Refletor"], qts: [1, 1, 1, 1, 1, 1, 2] },
        { cat: "Cockpit - Porta Verbetes", items: ["Verbetes INEM", "Folha Ocorrência", "Folha Registo Nacional PCR"], qts: [1, 5, 5] },
        { cat: "Cockpit - Banco Passageiro", items: ["Triângulo de Sinalização", "Macaco", "Chave Rodas"], qts: [1, 1, 1] },
        { cat: "Cockpit - Consola Central", items: ["Capacete", "Óculos de proteção", "Luvas Trabalho", "Lanterna busca", "Extintor", "Luvas nitrilo M", "Luvas nitrilo L"], qts: [2, 2, 2, 1, 1, 1, 1] },
        { cat: "Célula Sanitária - Estante 1", items: ["Mala 1ª Abordagem"], qts: [1] },
        { cat: "Célula Sanitária - Estante 2", items: ["Mala Trauma"], qts: [1] },
        { cat: "Célula Sanitária - Estante 3", items: ["Saco Colares Cervicais", "Imobilizadores de cabeça", "Cabrestos", "Aranha", "Cintos maca vácuo", "Manta térmica"], qts: [1, 2, 2, 1, 3, 1] },
        { cat: "Célula Sanitária - Espaço 13 (Mesa)", items: ["DAE (Checklist interior)"], qts: [1] },
        { cat: "Célula Sanitária - Imobilização", items: ["Maca Vácuo", "Bomba para maca vácuo", "Retentor pediátrico", "Maca de lona", "Cinta pélvica"], qts: [1, 1, 1, 1, 1] },
        { cat: "Célula Sanitária - Espaço 5", items: ["Cadeia de transporte", "Botija O2 20L"], qts: [1, 2] },
        { cat: "Célula Sanitária - Lavatório", items: ["Tanque água limpa", "Tanque água suja"], qts: [1, 1] },
        { cat: "Célula Sanitária - Espaço 10 (Limpeza)", items: ["Rolo papel", "Desinfetante mãos"], qts: [1, 1] },
        { cat: "Célula Sanitária - Espaço 8", items: ["Botija O2 3L"], qts: [2] },
        { cat: "Célula Sanitária - Espaço 4 (Imobilização)", items: ["Maca pluma", "Plano duro adulto"], qts: [1, 1] },
        { cat: "Célula Sanitária - Espaço 11 (Saco Talas)", items: ["Pequenas", "Médias", "Grande"], qts: [2, 2, 2] },
        { cat: "Célula Sanitária - Espaço 6", items: ["Colete de extração"], qts: [1] },
        { cat: "Célula Sanitária - Espaço 3", items: ["Aspirador Secreções", "Sonda aspiração CH12", "Sonda aspiração CH14", "Sonda aspiração CH16", "Sonda aspiração CH18", "Sonda aspiração CH06", "Sonda aspiração CH08"], qts: [1, 2, 2, 2, 2, 1, 1] }
    ];

    pushToHistory();

    // Option A: Just fill the CURRENT block with the first category? 
    // No, let's be smart. Ask which section to import or just import ALL as new blocks?
    // User said "preciso EXACTAMENTE o que esta ai!".
    
    // I will replace the current block with the first category and APPEND the rest.
    const startIdx = blockIdx;
    
    ambulanceKit.forEach((kitPart, kIdx) => {
        const newBlock = {
            type: 'inventory',
            question: kitPart.cat,
            inventoryItems: kitPart.items.map((name, i) => ({ name, required: kitPart.qts[i] }))
        };
        
        if (kIdx === 0) {
            editorSchema[startIdx] = newBlock;
        } else {
            editorSchema.splice(startIdx + kIdx, 0, newBlock);
        }
    });

    settingsPopover.classList.add('hidden');
    renderCanvas();
    saveDebounce();
    alert("Kit completo de Ambulância importado com sucesso!");
};

window.importMalaTraumaKit = function (blockIdx) {
    if (!confirm("Isto irá substituir o conteúdo deste bloco pelos itens da Mala de Trauma. Continuar?")) return;

    const malaTraumaKit = [
        { cat: "1", items: ["Torniquete", "Marcador", "Gilete", "Laminas Bisturi", "Clamp", "Pinça Pequena", "Pinça Grande", "Corta Cintos", "Espátulas"], qts: [1, 1, 1, 3, 1, 1, 1, 1, 2] },
        { cat: "2", items: ["Colar Laranja", "Colar Amarelo", "Colar Azul"], qts: [1, 1, 1] },
        { cat: "3", items: ["Colar Cervical P1", "Colar Cervical P2", "Colar Cervical P3"], qts: [1, 1, 1] },
        { cat: "4", items: ["Soro Fisiológico 250ml", "Soro Fisiológico 100ml"], qts: [4, 2] },
        { cat: "5", items: ["Lençol Queimado", "Penso Absorvente 10x20", "Penso Absorvente 10x10", "Lençol Térmico", "Lençol Descartável", "Saco Vomito"], qts: [1, 2, 2, 1, 2, 2] },
        { cat: "6", items: ["Iodopovidona 10ml", "Soro fisiológico 5ml", "Soro fisiológico 100ml", "Iodopovidona 100ml", "Agua Oxigenada"], qts: [2, 1, 1, 1, 1] },
        { cat: "7", items: ["Esponja Hemostática", "Steril Strip", "Pensos Oftálmicos", "Pensos Rápidos"], qts: [2, 2, 2, 10] },
        { cat: "8", items: ["Compressa estéril 10x10", "Compressas 10x20"], qts: [5, 4] },
        { cat: "9", items: ["Ligadura Elástica 10cm", "Ligadura Elástica 5cm"], qts: [5, 5] },
        { cat: "10", items: ["Ligadura Pano 5cm", "Ligadura Pano 10cm"], qts: [2, 2] },
        { cat: "11", items: ["Ligadura Triangular"], qts: [1] },
        { cat: "12", items: ["Ligadura Elástica 15cm"], qts: [5] },
        { cat: "13", items: ["Meyfix 10cm", "Adesivo 2cm", "Tesoura"], qts: [1, 1, 1] },
        { cat: "14", items: ["Saco Frio", "Saco Calor"], qts: [1, 1] },
        { cat: "15", items: ["Luvas estéreis 6,5", "Luvas estéreis 7,0", "Luvas estéreis 7,5", "Compressa estéril 10x20", "Saco Grupo III"], qts: [1, 1, 1, 5, 1] }
    ];

    pushToHistory();
    const startIdx = blockIdx;

    // Header fields
    const headerBlocks = [
        { type: 'title', content: 'Inventário - Mala Trauma' },
        { type: 'date', question: 'Data', required: true },
        { type: 'text-short', question: 'Turno', placeholder: 'Qual o turno?' },
        { type: 'text-short', question: 'Socorrista', placeholder: 'Nome do socorrista' },
        { type: 'text-short', question: 'Ambulância', placeholder: 'Identificação da Viatura' },
        { type: 'divider' }
    ];
    
    // Header image block (Reference map)
    const imageBlock = {
        type: 'image',
        url: 'assets/mala_trauma_mapa.jpg', // Reference Map from image
        alignment: 'center',
        hasDescription: true,
        description: 'Mapa de Referência - Mala de Trauma'
    };
    
    // Construct new schema portion
    const newItems = [...headerBlocks, imageBlock];

    malaTraumaKit.forEach((kitPart) => {
        newItems.push({
            type: 'inventory',
            question: kitPart.cat,
            inventoryItems: kitPart.items.map((name, i) => ({ name, required: kitPart.qts[i] }))
        });
    });

    // Replace current block with the first item and splice the rest
    editorSchema.splice(startIdx, 1, ...newItems);

    settingsPopover.classList.add('hidden');
    renderCanvas();
    saveDebounce();
    alert("Kit completo de Mala de Trauma importado com sucesso acompanhando as 15 secções!");
};


// ==========================================
// INVENTORY MANAGEMENT FUNCTIONS
// ==========================================
window.addInventoryItemRow = function(blockIdx) {
    if (!editorSchema[blockIdx].inventoryItems) editorSchema[blockIdx].inventoryItems = [];
    editorSchema[blockIdx].inventoryItems.push([{ name: '', required: 1 }]);
    renderCanvas();
    saveDebounce();
};

window.addInventoryItemToRow = function(blockIdx, rowIdx) {
    if (!editorSchema[blockIdx].inventoryItems[rowIdx]) editorSchema[blockIdx].inventoryItems[rowIdx] = [];
    editorSchema[blockIdx].inventoryItems[rowIdx].push({ name: '', required: 1 });
    renderCanvas();
    saveDebounce();
};

window.cloneInventoryItem = function(blockIdx, rowIdx, iIdx) {
    const item = JSON.parse(JSON.stringify(editorSchema[blockIdx].inventoryItems[rowIdx][iIdx]));
    editorSchema[blockIdx].inventoryItems[rowIdx].splice(iIdx + 1, 0, item);
    renderCanvas();
    saveDebounce();
};

window.removeInventoryItem = function(blockIdx, rowIdx, iIdx) {
    editorSchema[blockIdx].inventoryItems[rowIdx].splice(iIdx, 1);
    if (editorSchema[blockIdx].inventoryItems[rowIdx].length === 0) {
        editorSchema[blockIdx].inventoryItems.splice(rowIdx, 1);
    }
    renderCanvas();
    saveDebounce();
};

window.updateInventoryItemField = function(e, blockIdx, rowIdx, iIdx, field) {
    const val = field === 'required' ? (parseInt(e.target.value) || 0) : e.target.innerText;
    editorSchema[blockIdx].inventoryItems[rowIdx][iIdx][field] = val;
    saveDebounce();
};


// ==========================================
// GLOBAL FILE DRAG AND DROP (IMAGES)
// ==========================================
function setupGlobalFileDrop() {
    const container = document.getElementById('blocks-container');
    if (!container) return;

    // Create a visual indicator for where the image will land
    let indicator = document.createElement('div');
    indicator.className = 'global-insert-indicator';
    indicator.style.display = 'none';

    container.addEventListener('dragover', (e) => {
        // Only trigger for external files
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();

        const blocks = Array.from(container.querySelectorAll('.tally-block'));
        let found = false;

        for (let i = 0; i < blocks.length; i++) {
            const rect = blocks[i].getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (e.clientY < mid) {
                container.insertBefore(indicator, blocks[i]);
                found = true;
                break;
            }
        }

        if (!found) container.appendChild(indicator);
        indicator.style.display = 'block';
    });

    container.addEventListener('dragleave', (e) => {
        // Logic to prevent hiding when moving between elements inside the container
        if (e.relatedTarget && container.contains(e.relatedTarget)) return;
        indicator.style.display = 'none';
    });

    container.addEventListener('drop', (e) => {
        if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
        e.preventDefault();
        indicator.style.display = 'none';

        const blocks = Array.from(container.querySelectorAll('.tally-block'));
        let targetIndex = editorSchema.length; // Default to end

        for (let i = 0; i < blocks.length; i++) {
            const rect = blocks[i].getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (e.clientY < mid) {
                targetIndex = i;
                break;
            }
        }

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const base64Data = re.target.result;
                // Create new image block
                const newBlock = {
                    type: 'image',
                    url: base64Data,
                    align: 'center',
                    question: 'Imagem carregada',
                    hasDescription: true,
                    description: ''
                };
                
                editorSchema.splice(targetIndex, 0, newBlock);
                renderCanvas();
                saveDebounce();
            };
            reader.readAsDataURL(file);
        }
    });
}

// ==========================================
// FREE-FORM IMAGE INTERACTION (DRAG & RESIZE)
// ==========================================
let activeImageInteraction = null;

window.handleImageInteractionStart = function(e, index, type) {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    
    const block = editorSchema[index];
    activeImageInteraction = {
        index,
        type,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: block.width || 100,
        startOffset: block.offsetX || 0,
        startOffsetY: block.offsetY || 0,
        containerWidth: document.querySelector('.blocks-container').offsetWidth
    };
    
    document.addEventListener('mousemove', handleGlobalImageMouseMove);
    document.addEventListener('mouseup', handleGlobalImageMouseUp);
};

function handleGlobalImageMouseMove(e) {
    if (!activeImageInteraction) return;
    
    const { index, type, startWidth, startOffset, containerWidth } = activeImageInteraction;
    const block = editorSchema[index];
    
    if (type === 'move') {
        const deltaX = e.clientX - activeImageInteraction.startX;
        const deltaY = e.clientY - activeImageInteraction.startY;
        
        const percentDeltaX = (deltaX / containerWidth) * 100;
        
        let newOffsetX = startOffset + percentDeltaX;
        const width = block.width || 100;
        newOffsetX = Math.max(0, Math.min(100 - width, newOffsetX));
        block.offsetX = newOffsetX;
        
        // Vertical movement
        block.offsetY = (activeImageInteraction.startOffsetY || 0) + deltaY;
    } else if (type === 'resize-right') {
        const deltaX = e.clientX - activeImageInteraction.startX;
        const percentDelta = (deltaX / containerWidth) * 100;
        let newWidth = startWidth + percentDelta;
        newWidth = Math.max(10, Math.min(100 - (block.offsetX || 0), newWidth));
        block.width = newWidth;
    } else if (type === 'resize-left') {
        const deltaX = e.clientX - activeImageInteraction.startX;
        const percentDelta = (deltaX / containerWidth) * 100;
        let newWidth = startWidth - percentDelta;
        if (newWidth >= 10) {
            let newOffset = startOffset + percentDelta;
            newOffset = Math.max(0, newOffset);
            block.width = startWidth + (startOffset - newOffset);
            block.offsetX = newOffset;
        }
    }
    
    renderCanvas(); // Smooth update
}

function handleGlobalImageMouseUp() {
    if (activeImageInteraction) {
        saveDebounce();
    }
    activeImageInteraction = null;
    document.removeEventListener('mousemove', handleGlobalImageMouseMove);
    document.removeEventListener('mouseup', handleGlobalImageMouseUp);
}

window.resetImagePosition = function(index) {
    if (index === undefined) index = activeSettingsIndex;
    if (index === null) return;
    
    pushToHistory();
    editorSchema[index].offsetX = 0;
    editorSchema[index].offsetY = 0;
    editorSchema[index].width = 100;
    editorSchema[index].layoutMode = 'flow';
    
    renderCanvas();
    saveDebounce();
    if (activeSettingsIndex !== null) closeSettings();
};

window.setImageLayout = function(mode, index) {
    const targetIdx = index !== undefined ? index : activeSettingsIndex;
    if (targetIdx === null || targetIdx === undefined) return;
    
    pushToHistory();
    editorSchema[targetIdx].layoutMode = mode;
    saveDebounce();
    renderCanvas();
    
    // Update UI in settings panel if open
    if (activeSettingsIndex === targetIdx) {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(`layout-${mode}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
};

// ==========================================
// BLOCK INSERTION AT GAP
// ==========================================
window.openSlashAtGap = function(index, e) {
    e.preventDefault();
    e.stopPropagation();
    
    // hoverBlockIndex = index; means insert AFTER index.
    // If click before first block (index 0), then index-1 is passed.
    hoverBlockIndex = index; 
    
    const rect = e.currentTarget.getBoundingClientRect();
    const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
    const menuWidth = 220; 
    let left = rect.left + (rect.width / 2) - (menuWidth / 2) - editorPageRect.left;
    
    slashMenu.style.top = `${rect.bottom - editorPageRect.top + 8}px`;
    slashMenu.style.left = Math.max(20, left) + 'px';
    slashMenu.classList.remove('hidden');
    
    setTimeout(() => {
        const searchInput = slashMenu.querySelector('input');
        if (searchInput) searchInput.focus();
    }, 10);
};

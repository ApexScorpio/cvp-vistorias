/**
 * INVENTÁRIO BUILDER ENGINE — ARQUITETURA NATIVA RECONSTRUÍDA
 * CVP Vistorias / LPX
 * 
 * Dono absoluto do editor de inventário.
 * Integração estrita de Toolbar, Settings Popover, Block Drag,
 * Novo DOM de Pills (Isolamento Visual Shell vs Tools), QT/Counters,
 * Capa, Localizações Copy-on-Write, Resting Layout e Pipeline Única de Persistência.
 */

import { auth, db, onAuthStateChanged, signInAnonymously, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
import { canManagePillVisibility, optionRows, toggleOptionDisabled } from './form-recovery.js?v=20260909-miguel-original-v3';

// ==========================================================================
// 1. HELPERS DE CONTRASTE, CORES E SANITIZAÇÃO
// ==========================================================================

export function getContrastYIQ(hexcolor) {
    if (!hexcolor) return '#ffffff';
    let hex = hexcolor.replace("#", "");
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#0f172a' : '#ffffff';
}
window.getContrastYIQ = getContrastYIQ;

export function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

window.sanitizeForFirestore = function sanitizeForFirestore(obj, insideArray = false) {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirestore(item, true));
    }

    const clean = {};
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val === undefined) {
            clean[key] = null;
        } else if (typeof val === 'function') {
            // Ignorar funções
        } else if (Array.isArray(val)) {
            clean[key] = val.map(item => sanitizeForFirestore(item, true));
        } else if (typeof val === 'object' && val !== null) {
            clean[key] = sanitizeForFirestore(val, false);
        } else {
            clean[key] = val;
        }
    });
    return clean;
};

// ==========================================================================
// 2. ESTADO GLOBAL DO EDITOR
// ==========================================================================

const urlParams = new URLSearchParams(window.location.search);
const currentFormId = urlParams.get('id');

let currentFormConfig = null;
let editorSchema = [];
let activeSettingsIndex = null;
let saveTimer = null;
let hasUnsavedChanges = false;
let activePickerTarget = null; // { type, b, r, c }

// Variáveis de estado de Localizações
window.useLocations = false;
window.locations = [];
window.activeLocationId = '__base__';

// Configuração de Pill Sizing
window.pillSizingConfig = {
    mode: 'global',
    type: 'dynamic',
    sharedWidth: 200,
    sharedHeight: 42,
    fontMode: 'dynamic',
    fontSize: 18
};

window.editorSchema = editorSchema;
window.currentFormConfig = currentFormConfig;
window.activeSettingsIndex = null;

// ==========================================================================
// 3. PERSISTÊNCIA CENTRALIZADA & SERIALIZADOR ÚNICO
// ==========================================================================

window.serializeInventoryEditorState = function () {
    if (!currentFormConfig) currentFormConfig = {};

    // 1. Sincronizar o schema ativo na sua localização ou no modelo base
    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
        currentFormConfig.schema = editorSchema;
    } else {
        const activeLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (activeLoc && activeLoc.schema) {
            activeLoc.schema = editorSchema;
        }
    }

    // 2. Determinar título a partir do bloco de título no modelo base
    const baseSchema = currentFormConfig.schema || editorSchema || [];
    const titleBlock = baseSchema.find(b => b.type === 'title');
    const formTitle = titleBlock ? (titleBlock.content || 'Novo Inventário') : (currentFormConfig.title || 'Novo Inventário');

    // 3. Formatar schema com options serializadas (conforme padrão Firestore do CVP)
    const prepareSchema = (raw) => {
        if (!Array.isArray(raw)) return [];
        const safe = JSON.parse(JSON.stringify(raw));
        safe.forEach(block => {
            if (block.options && Array.isArray(block.options)) {
                block.options = JSON.stringify(block.options);
            }
        });
        return safe;
    };

    const safeBaseSchema = prepareSchema(currentFormConfig.schema || editorSchema);

    // 4. Formatar array de localizações
    const safeLocations = (window.locations || []).map(loc => {
        const clean = { ...loc };
        if (clean.schema) {
            clean.schema = prepareSchema(clean.schema);
        }
        return clean;
    });

    // 5. Tema e Capa
    const coverBlock = document.getElementById('cover-block');
    const coverUrl = coverBlock && coverBlock.style.backgroundImage
        ? coverBlock.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '')
        : (currentFormConfig.theme?.coverImage || null);

    const theme = {
        ...(currentFormConfig.theme || {}),
        coverImage: coverUrl
    };

    // 6. Payload unificado preservando campos Firestore existentes
    const payload = {
        ...currentFormConfig,
        title: formTitle,
        schema: safeBaseSchema,
        theme: theme,
        pillSizing: window.pillSizingConfig,
        useLocations: !!window.useLocations,
        locations: safeLocations,
        isInventory: true,
        updatedAt: serverTimestamp()
    };

    return payload;
};

window.saveDebounce = function () {
    hasUnsavedChanges = true;
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) saveStatus.textContent = "A guardar...";

    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const formRef = doc(db, "forms", currentFormId);
            const payload = window.serializeInventoryEditorState();
            await setDoc(formRef, payload, { merge: true });
            if (saveStatus) saveStatus.textContent = "Guardado na nuvem";
            hasUnsavedChanges = false;
        } catch (e) {
            console.error("Erro ao guardar formulário:", e);
            if (saveStatus) saveStatus.textContent = "Erro ao guardar!";
        }
    }, 1200);
};

window.publishForm = async function (btn) {
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A Publicar...';
        btn.disabled = true;
    }
    clearTimeout(saveTimer);
    try {
        const formRef = doc(db, "forms", currentFormId);
        const payload = window.serializeInventoryEditorState();
        await setDoc(formRef, payload, { merge: true });
        window.location.href = "dashboard.html";
    } catch (e) {
        console.error("Erro ao publicar:", e);
        alert("Erro ao publicar o formulário: " + (e.message || e));
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
};

// ==========================================================================
// 4. MOTOR DE LOCALIZAÇÕES (CANVAS BAR, SIDEBAR & COPY-ON-WRITE)
// ==========================================================================

window.renderCanvasLocationsBar = function () {
    const container = document.getElementById('builder-locations-container');
    const bar = document.getElementById('builder-locations-bar');
    const bannerTitle = document.getElementById('active-schema-title');
    const bannerBadge = document.getElementById('active-schema-badge');
    if (!container || !bar) return;

    if (!window.useLocations) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    // Atualizar banner informativo do schema ativo
    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
        if (bannerTitle) bannerTitle.textContent = "Modelo Base (Padrão)";
        if (bannerBadge) {
            bannerBadge.textContent = "Base";
            bannerBadge.className = "active-schema-badge";
        }
    } else {
        const loc = (window.locations || []).find(l => l.id === window.activeLocationId);
        const isCustom = !!(loc && loc.schema);
        if (bannerTitle) bannerTitle.textContent = loc ? `${loc.icon || '🚑'} ${loc.name}` : "Localização";
        if (bannerBadge) {
            bannerBadge.textContent = isCustom ? "Personalizada" : "Herda Modelo Base";
            bannerBadge.className = `active-schema-badge ${isCustom ? 'custom' : ''}`;
        }
    }

    // Renderizar botões de seleção de localização
    let html = `
        <button type="button" class="loc-tab-btn ${window.activeLocationId === '__base__' ? 'active' : ''}" onclick="window.switchActiveLocation('__base__')">
            <span>📋</span>
            <span>Modelo Base</span>
        </button>
    `;

    (window.locations || []).forEach(loc => {
        const isActive = loc.id === window.activeLocationId;
        const isCustom = !!loc.schema;
        html += `
            <button type="button" class="loc-tab-btn ${isActive ? 'active' : ''}" onclick="window.switchActiveLocation('${loc.id}')">
                <span>${loc.icon || '🚑'}</span>
                <span>${loc.name}</span>
                <span class="loc-tab-status">${isCustom ? 'Pers.' : 'Base'}</span>
            </button>
        `;
    });

    bar.innerHTML = html;
};

window.switchActiveLocation = function (locId) {
    // 1. Persistir schema atual em memória antes de trocar
    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
        if (currentFormConfig) currentFormConfig.schema = editorSchema;
    } else {
        const prevLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (prevLoc && prevLoc.schema) {
            prevLoc.schema = editorSchema;
        }
    }

    // 2. Alternar para a nova localização
    window.activeLocationId = locId;

    if (locId === '__base__') {
        editorSchema = currentFormConfig.schema || [];
    } else {
        const targetLoc = (window.locations || []).find(l => l.id === locId);
        if (targetLoc && targetLoc.schema) {
            editorSchema = targetLoc.schema;
        } else {
            // Herda modelo base
            editorSchema = currentFormConfig.schema || [];
        }
    }
    window.editorSchema = editorSchema;

    window.renderCanvasLocationsBar();
    window.renderSidebarLocations();
    window.renderCanvas();
};

window.toggleUseLocations = function (checked) {
    window.useLocations = !!checked;
    const controls = document.getElementById('locations-controls-container');
    if (controls) controls.style.display = window.useLocations ? 'block' : 'none';

    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.addNewLocation = function () {
    const count = (window.locations || []).length + 1;
    const newLoc = {
        id: `loc_${Date.now()}`,
        name: `Ambulância ${count < 10 ? '0' + count : count}`,
        icon: '🚑'
    };
    if (!window.locations) window.locations = [];
    window.locations.push(newLoc);

    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.updateLocationName = function (idx, name) {
    if (!window.locations[idx]) return;
    window.locations[idx].name = name.trim() || 'Sem nome';
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.updateLocationIcon = function (idx, icon) {
    if (!window.locations[idx]) return;
    window.locations[idx].icon = icon.trim() || '🚑';
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.moveLocationUp = function (idx) {
    if (idx <= 0 || !window.locations[idx]) return;
    const temp = window.locations[idx];
    window.locations[idx] = window.locations[idx - 1];
    window.locations[idx - 1] = temp;
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.moveLocationDown = function (idx) {
    if (idx >= window.locations.length - 1 || !window.locations[idx]) return;
    const temp = window.locations[idx];
    window.locations[idx] = window.locations[idx + 1];
    window.locations[idx + 1] = temp;
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.deleteLocation = function (idx) {
    if (!window.locations[idx]) return;
    const loc = window.locations[idx];
    if (!confirm(`Tem a certeza que deseja eliminar "${loc.name}"?`)) return;

    if (window.activeLocationId === loc.id) {
        window.switchActiveLocation('__base__');
    }
    window.locations.splice(idx, 1);
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

// Copy-on-Write: Clona a estrutura do template para esta localização
window.personalizeLocationSchema = function (idx) {
    if (!window.locations[idx]) return;
    const loc = window.locations[idx];
    const templateSchema = currentFormConfig.schema || [];
    loc.schema = JSON.parse(JSON.stringify(templateSchema));
    window.switchActiveLocation(loc.id);
    window.saveDebounce();
};

// Reverte localização para usar o modelo base (remove loc.schema)
window.revertLocationToBaseSchema = function (idx) {
    if (!window.locations[idx]) return;
    const loc = window.locations[idx];
    if (!confirm(`Tem a certeza que deseja repor o Modelo Base em "${loc.name}"? Todas as alterações específicas desta viatura serão removidas.`)) return;

    delete loc.schema;
    window.switchActiveLocation(loc.id);
    window.saveDebounce();
};

window.renderSidebarLocations = function () {
    const listContainer = document.getElementById('sidebar-locations-list');
    const useLocationsCheckbox = document.getElementById('setting-use-locations');
    const controlsContainer = document.getElementById('locations-controls-container');
    if (useLocationsCheckbox) useLocationsCheckbox.checked = !!window.useLocations;
    if (controlsContainer) controlsContainer.style.display = window.useLocations ? 'block' : 'none';
    if (!listContainer) return;

    if (!window.locations || window.locations.length === 0) {
        listContainer.innerHTML = '<p style="font-size:12px;color:#64748b;margin:4px 0;">Nenhuma localização adicionada ainda.</p>';
        return;
    }

    let html = '';
    window.locations.forEach((loc, idx) => {
        const isActive = loc.id === window.activeLocationId;
        const isCustom = !!loc.schema;
        html += `
            <div class="sidebar-loc-card ${isActive ? 'is-active' : ''}">
                <div class="sidebar-loc-header">
                    <input type="text" class="sidebar-loc-icon-input" value="${loc.icon || '🚑'}" maxlength="4" onchange="window.updateLocationIcon(${idx}, this.value)" title="Ícone / Emoji">
                    <input type="text" class="sidebar-loc-name-input" value="${loc.name}" onchange="window.updateLocationName(${idx}, this.value)" placeholder="Nome da viatura">
                    <div class="sidebar-loc-btns">
                        <button type="button" class="sidebar-loc-btn" onclick="window.moveLocationUp(${idx})" title="Subir" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}><i class="ph ph-arrow-up"></i></button>
                        <button type="button" class="sidebar-loc-btn" onclick="window.moveLocationDown(${idx})" title="Descer" ${idx === window.locations.length - 1 ? 'disabled style="opacity:0.3;"' : ''}><i class="ph ph-arrow-down"></i></button>
                        <button type="button" class="sidebar-loc-btn danger" onclick="window.deleteLocation(${idx})" title="Eliminar"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                <div class="sidebar-loc-actions">
                    <span class="sidebar-loc-status ${isCustom ? 'custom' : ''}">
                        ${isCustom ? '★ Personalizada' : 'Herda Base'}
                    </span>
                    <div>
                        ${isCustom ? `
                            <button type="button" class="sidebar-loc-btn" onclick="window.revertLocationToBaseSchema(${idx})" title="Repor estrutura do modelo base">Repor Base</button>
                        ` : `
                            <button type="button" class="sidebar-loc-btn primary" onclick="window.personalizeLocationSchema(${idx})" title="Criar cópia independente para esta viatura">Personalizar</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
};

// ==========================================================================
// 5. COLOR PICKER GLOBAL
// ==========================================================================

const globalColorPicker = document.createElement('input');
globalColorPicker.type = 'color';
globalColorPicker.style.display = 'none';
document.body.appendChild(globalColorPicker);

globalColorPicker.addEventListener('input', (e) => {
    if (!activePickerTarget) return;
    const { type, b, r, c } = activePickerTarget;
    const color = e.target.value;

    if (type === 'pill') {
        window.setPillColor(b, r, c, color);
    } else if (type === 'title') {
        window.setTitleColor(b, color);
    } else if (type === 'block') {
        window.setBlockColor(color);
    }
});

globalColorPicker.addEventListener('change', () => {
    activePickerTarget = null;
    window.saveDebounce();
});

window.openColorPicker = function (e, type, b, r, c) {
    if (e) e.stopPropagation();
    activePickerTarget = { type, b, r, c };

    let initialColor = '#3b82f6';
    if (type === 'pill') {
        const opt = editorSchema[b]?.options?.[r]?.[c];
        initialColor = (typeof opt === 'object' && opt?.color) ? opt.color : (editorSchema[b]?.pillColor || '#3b82f6');
    } else if (type === 'title') {
        initialColor = editorSchema[b]?.blockColor || '#ffffff';
    } else if (type === 'block') {
        initialColor = editorSchema[window.activeSettingsIndex]?.pillColor || '#22c55e';
    }

    globalColorPicker.value = initialColor.startsWith('#') && initialColor.length === 7 ? initialColor : '#3b82f6';
    globalColorPicker.click();
};

window.openBlockFullPicker = function (e) {
    if (window.activeSettingsIndex !== null) {
        window.openColorPicker(e, 'block', window.activeSettingsIndex);
    }
};

window.setBlockColor = function (color) {
    if (window.activeSettingsIndex !== null) {
        if (color) {
            editorSchema[window.activeSettingsIndex].pillColor = color;
            editorSchema[window.activeSettingsIndex].hasColorCode = true;
        } else {
            delete editorSchema[window.activeSettingsIndex].pillColor;
            editorSchema[window.activeSettingsIndex].hasColorCode = false;
        }
        const hexInput = document.getElementById('block-hex-input');
        if (hexInput) hexInput.value = color || '';
        renderCanvas();
        window.saveDebounce();
    }
};

window.setPillColor = function (blockIdx, rowIdx, colIdx, color) {
    const block = editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    let opt = block.options[rowIdx][colIdx];
    if (typeof opt !== 'object' || opt === null) {
        opt = { text: String(opt || '') };
        block.options[rowIdx][colIdx] = opt;
    }
    opt.color = color;
    renderCanvas();
    window.saveDebounce();
};

window.setTitleColor = function (blockIdx, color) {
    if (!editorSchema[blockIdx]) return;
    editorSchema[blockIdx].blockColor = color;
    renderCanvas();
    window.saveDebounce();
};

window.toggleTitleStyle = function (e, blockIdx) {
    if (e) e.stopPropagation();
    const block = editorSchema[blockIdx];
    if (!block) return;
    const styles = ['full', 'inline', 'border'];
    const current = block.blockStyle || 'full';
    let nextIdx = (styles.indexOf(current) + 1) % styles.length;
    block.blockStyle = styles[nextIdx];
    renderCanvas();
    window.saveDebounce();
};

window.toggleTitleSize = function (e, blockIdx) {
    if (e) e.stopPropagation();
    const block = editorSchema[blockIdx];
    if (!block) return;
    const sizes = ['small', 'medium', 'large'];
    const current = block.blockSize || 'large';
    let nextIdx = (sizes.indexOf(current) + 1) % sizes.length;
    block.blockSize = sizes[nextIdx];
    renderCanvas();
    window.saveDebounce();
};

window.toggleBlockSticky = function (e, blockIdx) {
    if (e) e.stopPropagation();
    const block = editorSchema[blockIdx];
    if (!block) return;
    block.isSticky = block.isSticky === false ? true : false;
    renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 6. RENDERIZAÇÃO DO CANVAS DO BUILDER
// ==========================================================================

export function renderCanvas() {
    const container = document.getElementById('blocks-container');
    if (!container) return;
    container.innerHTML = '';

    // Se estiver em modo localização, garantir que o schema ativo está consistente
    if (window.activeLocationId && window.activeLocationId !== '__base__') {
        const activeLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (activeLoc && activeLoc.schema) {
            editorSchema = activeLoc.schema;
        } else {
            editorSchema = currentFormConfig.schema || [];
        }
        window.editorSchema = editorSchema;
    }

    const sizingScope = window.pillSizingConfig.mode || 'global';
    const sizingType = window.pillSizingConfig.type || 'dynamic';
    const sharedWidth = window.pillSizingConfig.sharedWidth || 200;
    const sharedHeight = window.pillSizingConfig.sharedHeight || 42;
    const canManageVisibility = canManagePillVisibility(auth.currentUser);

    editorSchema.forEach((block, index) => {
        const blockEl = document.createElement('div');
        blockEl.dataset.index = index;

        // Classificação semântica fiel a inventory_view.html
        const isL1 = (['title', 'title-h1'].includes(block.type) && (block.blockSize === 'large' || !block.blockSize) && block.blockStyle !== 'inline');
        const isL2 = block.type !== 'counter' && (block.type === 'title-h2' || block.type === 'section' || (block.type === 'title' && (block.blockSize === 'medium' || block.blockStyle === 'inline')));
        const isCounter = block.type === 'counter';

        let semanticClass = 'inventory-content';
        if (isL1) semanticClass = 'inventory-level-1';
        else if (isL2) semanticClass = 'inventory-level-2';
        else if (isCounter) semanticClass = 'inventory-level-3';

        // Análise de transição para o próximo bloco
        const nextBlock = editorSchema[index + 1];
        let gapClass = '';
        if (isL1 && nextBlock && !(['title-h2', 'section'].includes(nextBlock.type) || (nextBlock.type === 'title' && (nextBlock.blockSize === 'medium' || nextBlock.blockStyle === 'inline')))) {
            gapClass = 'gap-section';
        } else if (isL2 && nextBlock && nextBlock.type !== 'counter') {
            gapClass = 'gap-section';
        }

        blockEl.className = `tally-block block-${block.type} ${semanticClass} ${gapClass}`.trim();

        // Toolbar dos Blocos
        const isHeaderBlock = ['title', 'section'].includes(block.type);
        const isSticky = block.isSticky !== false;

        let extraHeaderTools = '';
        if (isHeaderBlock) {
            extraHeaderTools = `
                <div class="tool-btn color-trigger" onclick="window.openColorPicker(event, 'title', ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>
                <div class="tool-btn style-trigger" onclick="window.toggleTitleStyle(event, ${index})" title="Mudar Estilo (Texto / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>
                <div class="tool-btn size-trigger" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho"><i class="ph ph-text-aa"></i></div>
                <div class="tool-btn sticky-trigger" onclick="window.toggleBlockSticky(event, ${index})" title="Fixar Cabeçalho (Sticky)" style="cursor: pointer; ${isSticky ? 'color: #3b82f6;' : 'color: #cbd5e1;'}">
                    <i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i>
                </div>
            `;
        }

        const toolsHtml = `
            <div class="block-tools-inline">
                ${extraHeaderTools}
                <div class="tool-btn image-trigger" onclick="window.triggerBlockImage(event, ${index})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
                <div class="tool-btn drag-handle" title="Arrastar para mover bloco"><i class="ph ph-dots-six-vertical"></i></div>
                <div class="tool-btn duplicate-btn" onclick="window.duplicateBlockDirect(event, ${index})" title="Duplicar Bloco"><i class="ph ph-copy"></i></div>
                <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
                <div class="tool-btn settings-btn" title="Definições do Bloco"><i class="ph ph-gear"></i></div>
                <div class="tool-btn delete-btn" title="Eliminar Bloco"><i class="ph ph-trash"></i></div>
            </div>
        `;

        let contentHtml = '';

        if (block.type === 'title') {
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full';
            const bSize = block.blockSize || 'large';
            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
            const fontSize = sizeMap[bSize] || '33px';

            let titleStyle = `font-size: ${fontSize}; line-height: 1.2; font-weight: 700;`;
            let titleClass = 'block-title';

            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    titleStyle += ` --marker-color: ${bColor}; color: #f8fafc; padding-left: 18px;`;
                    titleClass += ' style-marker';
                } else if (bStyle === 'inline') {
                    titleStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: inline-block; width: fit-content;`;
                } else {
                    titleStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: block; width: 100%; box-sizing: border-box;`;
                }
            }

            contentHtml = `
                <div style="display: flex; align-items: center; width: 100%; margin-bottom: 4px;">
                    <h1 class="${titleClass}" contenteditable="true" data-field="content" style="${titleStyle} flex: 1; margin: 0; outline: none;">${block.content || ''}</h1>
                </div>
            `;
        } else if (block.type === 'section') {
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full';
            const bSize = block.blockSize || 'medium';
            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
            const fontSize = sizeMap[bSize] || '25px';

            let secStyle = `font-size: ${fontSize}; line-height: 1.2; font-weight: 600;`;
            let secClass = 'section-title';

            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    secStyle += ` --marker-color: ${bColor}; color: #f8fafc; padding-left: 18px;`;
                    secClass += ' style-marker';
                } else if (bStyle === 'inline') {
                    secStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: inline-block; width: fit-content;`;
                } else {
                    secStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: block; width: 100%; box-sizing: border-box;`;
                }
            }

            contentHtml = `
                <div style="display: flex; align-items: center; width: 100%; margin-bottom: 4px;">
                    <div class="${secClass}" contenteditable="true" data-field="question" style="${secStyle} flex: 1; margin: 0; outline: none;">${block.question || ''}</div>
                </div>
            `;
        } else if (block.type === 'divider') {
            contentHtml = `<div class="block-divider-line"></div>`;
        } else if (['choice-single', 'choice-multi', 'counter'].includes(block.type)) {
            // Normalizar matriz de opções 2D
            block.options = optionRows(block.options);
            if (block.options.length === 0) block.options = [[{ text: 'Opção' }]];

            const isBlockCounter = block.type === 'counter';
            const bColor = block.blockColor || '';
            const bStyle = block.blockStyle || 'full';
            const bSize = block.blockSize || 'medium';
            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
            const qFontSize = sizeMap[bSize] || '25px';

            let qStyle = `font-size: ${qFontSize}; font-weight: 600; line-height: 1.2;`;
            let qClass = 'block-question';
            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    qStyle += ` --marker-color: ${bColor}; color: #f8fafc; padding-left: 18px;`;
                    qClass += ' style-marker';
                } else if (bStyle === 'inline') {
                    qStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: inline-block; width: fit-content;`;
                } else {
                    qStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: block; width: 100%; box-sizing: border-box;`;
                }
            }

            contentHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div class="${qClass}" contenteditable="true" data-field="question" style="${qStyle} flex: 1; outline: none;">${block.question || (isBlockCounter ? 'Novo Item de Inventário' : 'Nova Pergunta')}</div>
                    ${block.required ? '<span class="required-indicator" style="color: #ef4444; font-weight: 700;">*</span>' : ''}
                </div>
            `;

            if (block.hasDescription) {
                contentHtml += `
                    <div class="block-description" contenteditable="true" data-field="description" style="font-size: 13px; color: #94a3b8; margin-bottom: 8px; outline: none;">${block.description || 'Descrição opcional...'}</div>
                `;
            }

            // Renderizar linhas de Pílulas com Novo DOM Desacoplado
            block.options.forEach((row, rowIdx) => {
                contentHtml += `<div class="pill-row" data-blockidx="${index}" data-rowidx="${rowIdx}">`;

                row.forEach((opt, colIdx) => {
                    const optText = typeof opt === 'object' ? (opt.text || '') : String(opt || '');
                    const optTarget = typeof opt === 'object' ? (opt.target || 0) : 0;
                    const isDisabled = typeof opt === 'object' && opt.disabled === true;

                    // Resolução de Cor: opt.color -> block.pillColor -> block.blockColor -> default
                    const pillColor = (typeof opt === 'object' && opt.color)
                        ? opt.color
                        : (block.pillColor || (isBlockCounter ? '' : block.blockColor) || '#1e293b');

                    const textColor = getContrastYIQ(pillColor);

                    // Dimensionamento configurado
                    let pWidth = sharedWidth;
                    let pHeight = sharedHeight;

                    if (sizingScope === 'individual' && typeof opt === 'object') {
                        if (opt.width) pWidth = opt.width;
                        if (opt.height) pHeight = opt.height;
                    }

                    const isFixed = sizingType === 'fixed';
                    const shellStyle = `
                        ${isFixed ? `width: ${pWidth}px;` : 'min-width: 140px;'}
                        height: ${pHeight}px;
                        background-color: ${pillColor};
                    `.trim();

                    const pillNameStyle = `
                        color: ${textColor};
                        font-size: ${window.pillSizingConfig.fontSize || 14}px;
                    `.trim();

                    contentHtml += `
                        <div class="pill-cell-wrapper ${isDisabled ? 'is-disabled' : ''}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}">
                            <div class="pill-visual-shell" style="${shellStyle}">
                                <input type="text" class="pill-name-input" value="${optText}" placeholder="Nome" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="${pillNameStyle}">
                                ${isBlockCounter ? `
                                    <div class="pill-qt-zone">
                                        <span>QT</span>
                                        <input type="number" class="pill-target-input" value="${optTarget}" min="0" onchange="window.setPillTarget(${index}, ${rowIdx}, ${colIdx}, this.value)">
                                    </div>
                                ` : ''}
                            </div>
                            <div class="pill-editor-tools">
                                <div class="pill-drag-handle" title="Arrastar para reordenar"><i class="ph ph-dots-six-vertical"></i></div>
                                ${canManageVisibility ? `
                                <button type="button" class="pill-visibility-btn ${isDisabled ? 'is-disabled' : ''}" title="${isDisabled ? 'Reativar opção' : 'Desativar opção'}" onclick="window.togglePillVisibility(event, ${index}, ${rowIdx}, ${colIdx})">
                                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                        ${isDisabled ? '<path d="m3 3 18 18"/>' : ''}
                                    </svg>
                                </button>` : ''}
                                <button type="button" class="pill-clone-btn" title="Clonar opção" onclick="window.duplicateOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-copy"></i></button>
                                <button type="button" class="pill-color-trigger" title="Cor da opção" onclick="window.openColorPicker(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-palette"></i></button>
                                <button type="button" class="pill-delete-btn" title="Remover opção" onclick="window.removeOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-x"></i></button>
                            </div>
                        </div>
                    `;
                });

                contentHtml += `<button type="button" class="add-pill-btn" title="Adicionar pílula nesta linha" onclick="window.addOptionToRow(${index}, ${rowIdx})"><i class="ph ph-plus"></i></button>`;
                contentHtml += `</div>`; // .pill-row
            });

            // Opção "Outra" se ativa
            if (block.hasOther) {
                const otherLabel = block.otherText || 'Outra';
                contentHtml += `
                    <div class="pill-row" style="margin-top: 6px;">
                        <div class="pill-visual-shell" style="width: auto; min-width: 130px; height: 38px; border: 1px dashed rgba(255,255,255,0.3); padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; opacity: 0.85;">
                            <i class="ph ph-pencil-simple" style="color: #94a3b8;"></i>
                            <input type="text" class="pill-other-input" value="${otherLabel}" data-blockidx="${index}" style="background:transparent;border:none;color:white;font-size:13px;width:100%;outline:none;">
                        </div>
                    </div>
                `;
            }

            contentHtml += `
                <button type="button" class="add-row-btn" onclick="window.addOption(${index})" style="margin-top: 8px; font-size: 12px; color: #38bdf8; background: transparent; border: 1px dashed rgba(56,189,248,0.3); padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="ph ph-plus"></i> Adicionar Nova Linha de Itens
                </button>
            `;
        } else {
            // Textos normais
            contentHtml = `<div class="block-text" contenteditable="true" data-field="content" style="outline:none;">${block.content || ''}</div>`;
        }

        // Wrapper de imagem se o bloco tiver imagem
        let imageHtml = '';
        if (block.image) {
            const zMode = block.imageZ || 'front';
            const zIndexVal = zMode === 'back' ? 0 : 10;
            const inFlow = block.imageInFlow === true;
            const imgStyle = inFlow
                ? `position: relative; margin: 12px 0; width: ${block.imageWidth || 200}px; height: ${block.imageHeight || 'auto'}px; z-index: ${zIndexVal};`
                : `position: absolute; left: ${block.imageX || 0}px; top: ${block.imageY || 0}px; width: ${block.imageWidth || 200}px; height: ${block.imageHeight || 'auto'}px; z-index: ${zIndexVal};`;

            imageHtml = `
                <div class="block-image-wrapper" style="${imgStyle}" data-blockidx="${index}">
                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain;">
                    <div class="image-resize-handle" title="Redimensionar Imagem"></div>
                    <div class="image-delete-btn" onclick="window.removeBlockImage(${index})" title="Remover Imagem"><i class="ph ph-x"></i></div>
                </div>
            `;
        }

        blockEl.innerHTML = toolsHtml + contentHtml + imageHtml;
        container.appendChild(blockEl);

        // Bindings de drag do bloco (APENAS na drag-handle!)
        const dragHandle = blockEl.querySelector('.block-tools-inline .drag-handle');
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', () => {
                blockEl.setAttribute('draggable', 'true');
            });
        }

        blockEl.addEventListener('dragstart', (e) => window.handleBlockDragStart(e, index));
        blockEl.addEventListener('dragover', (e) => window.handleBlockDragOver(e, index));
        blockEl.addEventListener('dragleave', (e) => window.handleBlockDragLeave(e, index));
        blockEl.addEventListener('drop', (e) => window.handleBlockDrop(e, index));
        blockEl.addEventListener('dragend', (e) => {
            blockEl.removeAttribute('draggable');
            window.handleBlockDragEnd(e);
        });

        // Bindings de edição inline de texto
        blockEl.querySelectorAll('[contenteditable="true"]').forEach(editable => {
            editable.addEventListener('blur', (e) => {
                const field = e.target.dataset.field;
                const val = e.target.innerText.trim();
                if (field && editorSchema[index]) {
                    editorSchema[index][field] = val;
                    window.saveDebounce();
                }
            });
        });

        // Bindings de inputs de pílulas
        blockEl.querySelectorAll('.pill-name-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const b = parseInt(e.target.dataset.blockidx);
                const r = parseInt(e.target.dataset.rowidx);
                const c = parseInt(e.target.dataset.colidx);
                if (editorSchema[b]?.options?.[r]?.[c]) {
                    if (typeof editorSchema[b].options[r][c] === 'object') {
                        editorSchema[b].options[r][c].text = e.target.value;
                    } else {
                        editorSchema[b].options[r][c] = { text: e.target.value };
                    }
                    window.saveDebounce();
                }
            });
        });

        // Bindings dos botões da toolbar
        const settingsBtn = blockEl.querySelector('.block-tools-inline .settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openBlockSettings(index, e.currentTarget);
            });
        }

        const addBelowBtn = blockEl.querySelector('.block-tools-inline .add-below');
        if (addBelowBtn) {
            addBelowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openSlashMenu(e, index);
            });
        }

        const deleteBtn = blockEl.querySelector('.block-tools-inline .delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm("Eliminar este bloco?")) {
                    editorSchema.splice(index, 1);
                    renderCanvas();
                    window.saveDebounce();
                }
            });
        }

        // Drag handles de pílulas: ativa draggable apenas no mousedown do .pill-drag-handle
        blockEl.querySelectorAll('.pill-editor-tools .pill-drag-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                const wrapper = handle.closest('.pill-cell-wrapper');
                if (wrapper) wrapper.setAttribute('draggable', 'true');
            });
        });

        // Pill drag events
        blockEl.querySelectorAll('.pill-cell-wrapper').forEach(wrapper => {
            wrapper.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                const b = parseInt(wrapper.dataset.blockidx);
                const r = parseInt(wrapper.dataset.rowidx);
                const c = parseInt(wrapper.dataset.colidx);
                e.dataTransfer.setData('text/plain', JSON.stringify({ b, r, c }));
                wrapper.classList.add('dragging');
            });

            wrapper.addEventListener('dragend', () => {
                wrapper.removeAttribute('draggable');
                wrapper.classList.remove('dragging');
            });

            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const targetB = parseInt(wrapper.dataset.blockidx);
                    const targetR = parseInt(wrapper.dataset.rowidx);
                    const targetC = parseInt(wrapper.dataset.colidx);

                    if (data.b === targetB) {
                        const block = editorSchema[targetB];
                        const item = block.options[data.r].splice(data.c, 1)[0];
                        block.options[targetR].splice(targetC, 0, item);
                        renderCanvas();
                        window.saveDebounce();
                    }
                } catch (err) {
                    console.error("Erro no drop de pílula:", err);
                }
            });
        });

        // Redimensionamento de imagens no bloco
        const imgResizeHandle = blockEl.querySelector('.image-resize-handle');
        if (imgResizeHandle) {
            imgResizeHandle.addEventListener('mousedown', (e) => {
                window.startImageResize(e, index);
            });
        }
    });

    // Ajustar larguras dinâmicas após render
    window.adjustGlobalDynamicWidths();
}
window.renderCanvas = renderCanvas;

// ==========================================================================
// 7. SETTINGS POPOVER (WIRING COMPLETO DOS 11 CONTROLOS)
// ==========================================================================

const settingsPopover = document.getElementById('settings-popover');
const rowSettingRequired = document.getElementById('row-setting-required');
const rowSettingDescription = document.getElementById('row-setting-description');
const rowSettingOther = document.getElementById('row-setting-other');
const rowSettingRandomize = document.getElementById('row-setting-randomize');
const rowSettingMulti = document.getElementById('row-setting-multi');
const rowSettingColor = document.getElementById('row-setting-color');
const rowSettingAlignment = document.getElementById('row-setting-alignment');
const rowSettingPalette = document.getElementById('row-setting-palette');
const rowSettingPlaceholder = document.getElementById('row-setting-placeholder');

const settingRequired = document.getElementById('setting-required');
const settingDescription = document.getElementById('setting-description');
const settingOther = document.getElementById('setting-other');
const settingRandomize = document.getElementById('setting-randomize');
const settingMulti = document.getElementById('setting-multi');
const settingColor = document.getElementById('setting-color');
const btnAlignHorizontal = document.getElementById('btn-align-horizontal');
const btnAlignVertical = document.getElementById('btn-align-vertical');
const settingPlaceholder = document.getElementById('setting-placeholder');
const btnDuplicateBlock = document.getElementById('btn-duplicate-block');
const btnDeleteBlock = document.getElementById('btn-delete-block');

window.openBlockSettings = function (index, triggerEl) {
    const block = editorSchema[index];
    if (!block) return;

    if (['title', 'desc'].includes(block.type)) {
        alert("Este bloco não possui configurações avançadas adicionais.");
        return;
    }

    window.activeSettingsIndex = index;

    // Mostrar/ocultar controlos por tipo de bloco
    const isChoice = ['choice-single', 'choice-multi'].includes(block.type);
    const isCounter = block.type === 'counter';

    if (rowSettingRequired) rowSettingRequired.style.display = 'flex';
    if (rowSettingDescription) rowSettingDescription.style.display = 'flex';
    if (rowSettingOther) rowSettingOther.style.display = isChoice ? 'flex' : 'none';
    if (rowSettingRandomize) rowSettingRandomize.style.display = isChoice ? 'flex' : 'none';
    if (rowSettingMulti) rowSettingMulti.style.display = isChoice ? 'flex' : 'none';
    if (rowSettingColor) rowSettingColor.style.display = (isChoice || isCounter) ? 'flex' : 'none';
    if (rowSettingAlignment) rowSettingAlignment.style.display = isChoice ? 'flex' : 'none';
    if (rowSettingPalette) rowSettingPalette.style.display = (block.hasColorCode || block.pillColor) ? 'flex' : 'none';
    if (rowSettingPlaceholder) rowSettingPlaceholder.style.display = (!isChoice && !isCounter) ? 'flex' : 'none';

    // Popular valores
    if (settingRequired) settingRequired.checked = !!block.required;
    if (settingDescription) settingDescription.checked = !!block.hasDescription;
    if (settingOther) settingOther.checked = !!block.hasOther;
    if (settingRandomize) settingRandomize.checked = !!block.randomize;
    if (settingMulti) settingMulti.checked = block.type === 'choice-multi';
    if (settingColor) settingColor.checked = !!(block.hasColorCode || block.pillColor);
    if (settingPlaceholder) settingPlaceholder.value = block.placeholder || '';

    const hexInput = document.getElementById('block-hex-input');
    if (hexInput) hexInput.value = block.pillColor || '';

    // Posicionar popover
    if (settingsPopover && triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        const pageRect = document.querySelector('.editor-page').getBoundingClientRect();
        settingsPopover.classList.remove('hidden');
        settingsPopover.style.top = `${rect.top - pageRect.top}px`;
        settingsPopover.style.left = `${rect.right - pageRect.left + 15}px`;
    }
};

// Bindings dos controlos do Popover
if (settingRequired) {
    settingRequired.addEventListener('change', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].required = e.target.checked;
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (settingDescription) {
    settingDescription.addEventListener('change', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].hasDescription = e.target.checked;
            if (e.target.checked && !editorSchema[window.activeSettingsIndex].description) {
                editorSchema[window.activeSettingsIndex].description = "Descrição opcional...";
            }
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (settingOther) {
    settingOther.addEventListener('change', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].hasOther = e.target.checked;
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (settingRandomize) {
    settingRandomize.addEventListener('change', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].randomize = e.target.checked;
            window.saveDebounce();
        }
    });
}

if (settingMulti) {
    settingMulti.addEventListener('change', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].type = e.target.checked ? 'choice-multi' : 'choice-single';
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (settingColor) {
    settingColor.addEventListener('change', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].hasColorCode = e.target.checked;
            if (rowSettingPalette) rowSettingPalette.style.display = e.target.checked ? 'flex' : 'none';
            if (e.target.checked) {
                editorSchema[window.activeSettingsIndex].pillColor = editorSchema[window.activeSettingsIndex].pillColor || '#22c55e';
            } else {
                delete editorSchema[window.activeSettingsIndex].pillColor;
            }
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (btnAlignHorizontal) {
    btnAlignHorizontal.addEventListener('click', () => {
        if (window.activeSettingsIndex !== null) {
            const block = editorSchema[window.activeSettingsIndex];
            if (!block.options || !block.options.length) return;
            const all = block.options.flat();
            if (all.length === 0) return;
            block.options = [all];
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (btnAlignVertical) {
    btnAlignVertical.addEventListener('click', () => {
        if (window.activeSettingsIndex !== null) {
            const block = editorSchema[window.activeSettingsIndex];
            if (!block.options || !block.options.length) return;
            const all = block.options.flat();
            if (all.length === 0) return;
            block.options = all.map(opt => [opt]);
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (settingPlaceholder) {
    settingPlaceholder.addEventListener('blur', (e) => {
        if (window.activeSettingsIndex !== null) {
            editorSchema[window.activeSettingsIndex].placeholder = e.target.value;
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (btnDuplicateBlock) {
    btnDuplicateBlock.addEventListener('click', () => {
        if (window.activeSettingsIndex !== null) {
            const copy = JSON.parse(JSON.stringify(editorSchema[window.activeSettingsIndex]));
            editorSchema.splice(window.activeSettingsIndex + 1, 0, copy);
            if (settingsPopover) settingsPopover.classList.add('hidden');
            window.activeSettingsIndex = null;
            renderCanvas();
            window.saveDebounce();
        }
    });
}

if (btnDeleteBlock) {
    btnDeleteBlock.addEventListener('click', () => {
        if (window.activeSettingsIndex !== null) {
            editorSchema.splice(window.activeSettingsIndex, 1);
            if (settingsPopover) settingsPopover.classList.add('hidden');
            window.activeSettingsIndex = null;
            renderCanvas();
            window.saveDebounce();
        }
    });
}

// Fechar popovers ao clicar fora
document.addEventListener('click', (e) => {
    const slashMenu = document.getElementById('slash-menu');
    if (slashMenu && !slashMenu.classList.contains('hidden') && !e.target.closest('#slash-menu') && !e.target.closest('.add-below') && !e.target.closest('#add-block-end')) {
        slashMenu.classList.add('hidden');
    }
    if (settingsPopover && !settingsPopover.classList.contains('hidden') && !e.target.closest('#settings-popover') && !e.target.closest('.settings-btn')) {
        settingsPopover.classList.add('hidden');
        window.activeSettingsIndex = null;
    }
});

// ==========================================================================
// 8. MANIPULAÇÃO DE PÍLULAS (CLONE ADJACENTE, DELETE, ADD, VISIBILITY, TARGET)
// ==========================================================================

window.duplicateOption = function (blockIdx, rowIdx, colIdx) {
    const block = editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    const original = block.options[rowIdx][colIdx];
    const clone = JSON.parse(JSON.stringify(original));
    if (typeof clone === 'object' && clone.id) clone.id = crypto.randomUUID();

    // Clona adjacente na MESMA linha!
    block.options[rowIdx].splice(colIdx + 1, 0, clone);
    renderCanvas();
    window.saveDebounce();

    setTimeout(() => {
        const input = document.querySelector(`.pill-name-input[data-blockidx="${blockIdx}"][data-rowidx="${rowIdx}"][data-colidx="${colIdx + 1}"]`);
        if (input) {
            input.focus();
            if (typeof input.select === 'function') input.select();
        }
    }, 50);
};

window.removeOption = function (blockIdx, rowIdx, colIdx) {
    const block = editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    block.options[rowIdx].splice(colIdx, 1);
    if (block.options[rowIdx].length === 0) {
        block.options.splice(rowIdx, 1);
    }
    renderCanvas();
    window.saveDebounce();
};

window.addOptionToRow = function (blockIdx, rowIdx) {
    const block = editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    const newOpt = { text: 'Nova Opção', target: 1 };
    block.options[rowIdx].push(newOpt);
    renderCanvas();
    window.saveDebounce();
};

window.addOption = function (blockIdx) {
    const block = editorSchema[blockIdx];
    if (!block) return;
    if (!block.options) block.options = [];
    block.options.push([{ text: 'Nova Opção', target: 1 }]);
    renderCanvas();
    window.saveDebounce();
};

window.togglePillVisibility = function (event, blockIdx, rowIdx, colIdx) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!toggleOptionDisabled(editorSchema, blockIdx, rowIdx, colIdx, auth.currentUser)) return;
    renderCanvas();
    window.saveDebounce();
};

window.setPillTarget = function (blockIdx, rowIdx, colIdx, val) {
    const block = editorSchema[blockIdx];
    if (!block?.options?.[rowIdx]?.[colIdx]) return;
    let opt = block.options[rowIdx][colIdx];
    if (typeof opt !== 'object' || opt === null) {
        opt = { text: String(opt || '') };
        block.options[rowIdx][colIdx] = opt;
    }
    opt.target = parseInt(val) || 0;
    window.saveDebounce();
};

// ==========================================================================
// 9. DRAG & DROP DE BLOCOS
// ==========================================================================

let draggedBlockIndex = null;

window.handleBlockDragStart = function (e, index) {
    draggedBlockIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    setTimeout(() => {
        const el = document.querySelector(`.tally-block[data-index="${index}"]`);
        if (el) el.classList.add('dragging');
    }, 0);
};

window.handleBlockDragOver = function (e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetEl = document.querySelector(`.tally-block[data-index="${index}"]`);
    if (!targetEl || index === draggedBlockIndex) return;

    const rect = targetEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    targetEl.classList.remove('drag-over-top', 'drag-over-bottom');
    if (e.clientY < midY) {
        targetEl.classList.add('drag-over-top');
    } else {
        targetEl.classList.add('drag-over-bottom');
    }
};

window.handleBlockDragLeave = function (e, index) {
    const targetEl = document.querySelector(`.tally-block[data-index="${index}"]`);
    if (targetEl) targetEl.classList.remove('drag-over-top', 'drag-over-bottom');
};

window.handleBlockDrop = function (e, targetIndex) {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) return;

    const item = editorSchema.splice(draggedBlockIndex, 1)[0];
    const targetEl = document.querySelector(`.tally-block[data-index="${targetIndex}"]`);
    let insertIndex = targetIndex;

    if (targetEl && targetEl.classList.contains('drag-over-bottom')) {
        insertIndex = draggedBlockIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
        insertIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }

    editorSchema.splice(Math.max(0, insertIndex), 0, item);
    draggedBlockIndex = null;
    renderCanvas();
    window.saveDebounce();
};

window.handleBlockDragEnd = function (e) {
    draggedBlockIndex = null;
    document.querySelectorAll('.tally-block').forEach(el => {
        el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
        el.removeAttribute('draggable');
    });
};

window.duplicateBlockDirect = function (e, index) {
    if (e) e.stopPropagation();
    const copy = JSON.parse(JSON.stringify(editorSchema[index]));
    editorSchema.splice(index + 1, 0, copy);
    renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 10. LÓGICA DE SIZING & FONT ENGINE
// ==========================================================================

window.changeSizingScope = function (scope) {
    window.pillSizingConfig.mode = scope;
    window.syncSidebarInputs();
    renderCanvas();
    window.saveDebounce();
};

window.changeSizingType = function (type) {
    window.pillSizingConfig.type = type;
    window.syncSidebarInputs();
    renderCanvas();
    window.saveDebounce();
};

window.updateGlobalWidth = function (val, src) {
    const num = parseInt(val) || 200;
    window.pillSizingConfig.sharedWidth = num;
    const slider = document.getElementById('input-global-width');
    const numInput = document.getElementById('input-global-width-num');
    if (slider && src !== 'slider') slider.value = num;
    if (numInput && src !== 'number') numInput.value = num;
    renderCanvas();
    window.saveDebounce();
};

window.updateGlobalHeight = function (val, src) {
    const num = parseInt(val) || 42;
    window.pillSizingConfig.sharedHeight = num;
    const slider = document.getElementById('input-global-height');
    const numInput = document.getElementById('input-global-height-num');
    if (slider && src !== 'slider') slider.value = num;
    if (numInput && src !== 'number') numInput.value = num;
    renderCanvas();
    window.saveDebounce();
};

window.updateIndividualWidth = function (b, r, c, val) {
    if (editorSchema[b]?.options?.[r]?.[c]) {
        if (typeof editorSchema[b].options[r][c] !== 'object') {
            editorSchema[b].options[r][c] = { text: String(editorSchema[b].options[r][c]) };
        }
        editorSchema[b].options[r][c].width = parseInt(val) || 200;
        renderCanvas();
        window.saveDebounce();
    }
};

window.updateIndividualHeight = function (b, r, c, val) {
    if (editorSchema[b]?.options?.[r]?.[c]) {
        if (typeof editorSchema[b].options[r][c] !== 'object') {
            editorSchema[b].options[r][c] = { text: String(editorSchema[b].options[r][c]) };
        }
        editorSchema[b].options[r][c].height = parseInt(val) || 42;
        renderCanvas();
        window.saveDebounce();
    }
};

window.changeFontSizingMode = function (mode) {
    window.pillSizingConfig.fontMode = mode;
    window.syncSidebarInputs();
    renderCanvas();
    window.saveDebounce();
};

window.updatePillFontSize = function (val) {
    const num = parseFloat(val) || 16;
    window.pillSizingConfig.fontSize = num;
    window.pillSizingConfig.fontMode = 'static';
    window.syncSidebarInputs();
    renderCanvas();
    window.saveDebounce();
};

window.applyPillFontPreset = function (size) {
    window.updatePillFontSize(size);
};

window.syncSidebarInputs = function () {
    const cfg = window.pillSizingConfig;
    const btnScopeGlobal = document.getElementById('btn-scope-global');
    const btnScopeIndividual = document.getElementById('btn-scope-individual');
    const btnTypeDynamic = document.getElementById('btn-type-dynamic');
    const btnTypeFixed = document.getElementById('btn-type-fixed');

    if (btnScopeGlobal && btnScopeIndividual) {
        btnScopeGlobal.classList.toggle('active', cfg.mode === 'global');
        btnScopeIndividual.classList.toggle('active', cfg.mode === 'individual');
    }
    if (btnTypeDynamic && btnTypeFixed) {
        btnTypeDynamic.classList.toggle('active', cfg.type === 'dynamic');
        btnTypeFixed.classList.toggle('active', cfg.type === 'fixed');
    }

    const ctrlGlobalFixed = document.getElementById('control-global-fixed');
    const ctrlIndivFixed = document.getElementById('control-individual-fixed');
    const descDynGlobal = document.getElementById('desc-dynamic-global');
    const descDynIndiv = document.getElementById('desc-dynamic-individual');

    if (ctrlGlobalFixed) ctrlGlobalFixed.style.display = (cfg.mode === 'global' && cfg.type === 'fixed') ? 'block' : 'none';
    if (ctrlIndivFixed) ctrlIndivFixed.style.display = (cfg.mode === 'individual' && cfg.type === 'fixed') ? 'block' : 'none';
    if (descDynGlobal) descDynGlobal.style.display = (cfg.mode === 'global' && cfg.type === 'dynamic') ? 'block' : 'none';
    if (descDynIndiv) descDynIndiv.style.display = (cfg.mode === 'individual' && cfg.type === 'dynamic') ? 'block' : 'none';

    const sWidth = document.getElementById('input-global-width');
    const nWidth = document.getElementById('input-global-width-num');
    if (sWidth) sWidth.value = cfg.sharedWidth || 200;
    if (nWidth) nWidth.value = cfg.sharedWidth || 200;

    const sHeight = document.getElementById('input-global-height');
    const nHeight = document.getElementById('input-global-height-num');
    if (sHeight) sHeight.value = cfg.sharedHeight || 42;
    if (nHeight) nHeight.value = cfg.sharedHeight || 42;

    const sFont = document.getElementById('input-font-size');
    const nFont = document.getElementById('input-font-size-num');
    if (sFont) sFont.value = cfg.fontSize || 16;
    if (nFont) nFont.value = cfg.fontSize || 16;
};

window.renderSidebarSettings = function () {
    window.syncSidebarInputs();
    window.renderSidebarLocations();
};

window.toggleSettingsSidebar = function () {
    const sidebar = document.getElementById('settings-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
};

// Medição e quebra de linhas para cálculo dinâmico de pílulas
window.adjustGlobalDynamicWidths = function () {
    if (window.pillSizingConfig.type !== 'dynamic') return;

    document.querySelectorAll('.pill-row').forEach(rowEl => {
        let maxTextW = 0;
        const shells = rowEl.querySelectorAll('.pill-visual-shell');

        shells.forEach(shell => {
            const input = shell.querySelector('.pill-name-input');
            const qtZone = shell.querySelector('.pill-qt-zone');
            if (input) {
                const textW = window.getTextWidth(input.value || 'Opção', '14px Outfit, sans-serif');
                const qtW = qtZone ? qtZone.offsetWidth : 0;
                const totalW = textW + qtW + 36;
                if (totalW > maxTextW) maxTextW = totalW;
            }
        });

        if (maxTextW > 0) {
            shells.forEach(shell => {
                shell.style.width = `${Math.max(120, maxTextW)}px`;
            });
        }
    });
};

window.getTextWidth = function (text, font) {
    const canvas = window.getTextWidth.canvas || (window.getTextWidth.canvas = document.createElement('canvas'));
    const context = canvas.getContext('2d');
    context.font = font || '14px sans-serif';
    return context.measureText(text).width;
};

// ==========================================================================
// 11. SLASH MENU (ADICIONAR BLOCOS)
// ==========================================================================

let slashInsertIndex = -1;

window.openSlashMenu = function (e, index) {
    e.stopPropagation();
    slashInsertIndex = index;
    const slashMenu = document.getElementById('slash-menu');
    if (!slashMenu) return;

    const rect = e.currentTarget.getBoundingClientRect();
    slashMenu.classList.remove('hidden');
    slashMenu.style.top = `${rect.bottom + window.scrollY + 6}px`;
    slashMenu.style.left = `${rect.left + window.scrollX}px`;
};

window.insertBlock = function (type) {
    const newBlock = {
        type: type,
        id: crypto.randomUUID()
    };

    if (type === 'title') {
        newBlock.content = "Novo Título";
        newBlock.blockSize = "large";
    } else if (type === 'section') {
        newBlock.question = "Nova Secção";
        newBlock.blockSize = "medium";
    } else if (type === 'counter') {
        newBlock.question = "Novo Item de Inventário";
        newBlock.options = [[{ text: "Item 1", target: 5 }]];
    } else if (['choice-single', 'choice-multi'].includes(type)) {
        newBlock.question = "Nova Pergunta";
        newBlock.options = [[{ text: "Opção 1" }, { text: "Opção 2" }]];
    } else if (type === 'divider') {
        // Apenas divisor
    }

    if (slashInsertIndex === -1 || slashInsertIndex === undefined) {
        editorSchema.push(newBlock);
    } else {
        editorSchema.splice(slashInsertIndex + 1, 0, newBlock);
    }

    const slashMenu = document.getElementById('slash-menu');
    if (slashMenu) slashMenu.classList.add('hidden');

    renderCanvas();
    window.saveDebounce();
};

document.getElementById('add-block-end')?.addEventListener('click', (e) => {
    window.openSlashMenu(e, editorSchema.length - 1);
});

document.querySelectorAll('#slash-menu .slash-item').forEach(item => {
    item.addEventListener('click', () => {
        const type = item.dataset.type;
        if (type) window.insertBlock(type);
    });
});

// ==========================================================================
// 12. CAPA (PORTADA DO EDITOR NORMAL)
// ==========================================================================

function initCoverLogic() {
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
                // Tenta carregar via Imgur; se falhar usa base64 DataURL
                const clientId = '546c25a59c58ad7';
                const formData = new FormData();
                formData.append('image', file);

                let downloadURL = null;
                try {
                    const response = await fetch('https://api.imgur.com/3/image', {
                        method: 'POST',
                        headers: { 'Authorization': `Client-ID ${clientId}` },
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success && data.data?.link) {
                        downloadURL = data.data.link;
                    }
                } catch (fetchErr) {
                    console.warn("Imgur fetch indisponível, usando DataURL local:", fetchErr);
                }

                if (!downloadURL) {
                    downloadURL = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                }

                coverBlock.style.backgroundImage = `url('${downloadURL}')`;
                if (!currentFormConfig.theme) currentFormConfig.theme = {};
                currentFormConfig.theme.coverImage = downloadURL;
                window.saveDebounce();
            } catch (err) {
                console.error("Erro durante o upload da capa:", err);
                alert("Erro ao processar imagem da capa.");
            } finally {
                btnChangeCover.innerHTML = originalText;
                btnChangeCover.disabled = false;
                coverUploadInput.value = '';
            }
        });
    }
}

// ==========================================================================
// 13. MOTOR DE IMAGENS NOS BLOCOS
// ==========================================================================

const blockImageInput = document.createElement('input');
blockImageInput.type = 'file';
blockImageInput.accept = 'image/*';
blockImageInput.style.display = 'none';
document.body.appendChild(blockImageInput);

let targetImageBlockIndex = null;

window.triggerBlockImage = function (e, index) {
    if (e) e.stopPropagation();
    targetImageBlockIndex = index;
    blockImageInput.click();
};

blockImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || targetImageBlockIndex === null) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const block = editorSchema[targetImageBlockIndex];
        if (block) {
            block.image = evt.target.result;
            block.imageWidth = 220;
            block.imageHeight = 160;
            block.imageX = 0;
            block.imageY = 0;
            block.imageInFlow = true;
            renderCanvas();
            window.saveDebounce();
        }
    };
    reader.readAsDataURL(file);
    blockImageInput.value = '';
});

window.removeBlockImage = function (index) {
    const block = editorSchema[index];
    if (block) {
        delete block.image;
        delete block.imageWidth;
        delete block.imageHeight;
        renderCanvas();
        window.saveDebounce();
    }
};

window.startImageResize = function (e, index) {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = e.target.closest('.block-image-wrapper');
    const block = editorSchema[index];
    if (!wrapper || !block) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = wrapper.offsetWidth;
    const startHeight = wrapper.offsetHeight;

    function onMouseMove(me) {
        const newWidth = Math.max(50, startWidth + (me.clientX - startX));
        const newHeight = Math.max(40, startHeight + (me.clientY - startY));
        wrapper.style.width = `${newWidth}px`;
        wrapper.style.height = `${newHeight}px`;
        block.imageWidth = newWidth;
        block.imageHeight = newHeight;
    }

    function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.saveDebounce();
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

// ==========================================================================
// 14. INICIALIZAÇÃO DO RUNTIME E AUTENTICAÇÃO
// ==========================================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        try { await signInAnonymously(auth); } catch (e) { console.warn(e); }
    }

    try {
        const formSnap = await getDoc(doc(db, "forms", currentFormId));
        if (formSnap.exists()) {
            currentFormConfig = formSnap.data();

            // Sincronizar título
            if (currentFormConfig.title) {
                const navTitle = document.querySelector('.nav-title');
                if (navTitle) navTitle.textContent = currentFormConfig.title;
            }

            // Carregar tema / capa
            if (currentFormConfig.theme?.coverImage) {
                const coverBlock = document.getElementById('cover-block');
                if (coverBlock) coverBlock.style.backgroundImage = `url('${currentFormConfig.theme.coverImage}')`;
            }

            // Carregar Pill Sizing
            if (currentFormConfig.pillSizing) {
                window.pillSizingConfig = {
                    mode: currentFormConfig.pillSizing.mode || 'global',
                    type: currentFormConfig.pillSizing.type || 'dynamic',
                    sharedWidth: currentFormConfig.pillSizing.sharedWidth || 200,
                    sharedHeight: currentFormConfig.pillSizing.sharedHeight || 42,
                    fontMode: currentFormConfig.pillSizing.fontMode || 'dynamic',
                    fontSize: currentFormConfig.pillSizing.fontSize || 18
                };
            }

            // Carregar Localizações
            window.useLocations = !!currentFormConfig.useLocations;
            window.locations = currentFormConfig.locations || [];

            // Normalizar schemas de localizações (deserializar options stringified se necessário)
            window.locations.forEach(loc => {
                if (typeof loc.schema === 'string') {
                    try { loc.schema = JSON.parse(loc.schema); } catch (e) { loc.schema = null; }
                }
                if (Array.isArray(loc.schema)) {
                    loc.schema.forEach(block => {
                        if (typeof block.options === 'string') {
                            try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
                        }
                    });
                }
            });

            // Normalizar schema base
            let baseSchema = currentFormConfig.schema || [];
            if (typeof baseSchema === 'string') {
                try { baseSchema = JSON.parse(baseSchema); } catch (e) { baseSchema = []; }
            }
            baseSchema.forEach(block => {
                if (typeof block.options === 'string') {
                    try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
                }
            });
            currentFormConfig.schema = baseSchema;

            // Iniciar com Modelo Base
            window.activeLocationId = '__base__';
            editorSchema = baseSchema;
            window.editorSchema = editorSchema;

            // Renderizar componentes
            window.syncSidebarInputs();
            window.renderSidebarLocations();
            window.renderCanvasLocationsBar();
            renderCanvas();
        } else {
            alert("Formulário não encontrado.");
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        console.error("Erro a carregar formulário:", err);
        alert("Erro de comunicação com a base de dados: " + (err.message || err));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initCoverLogic();

    // Preview
    const btnPreview = document.getElementById('btn-preview');
    if (btnPreview) {
        btnPreview.addEventListener('click', () => {
            if (!currentFormId) return;
            window.open(`inventory_view.html?id=${currentFormId}&preview=true`, '_blank');
        });
    }
});

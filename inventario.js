/**
 * INVENTÁRIO BUILDER ENGINE — ARQUITETURA NATIVA CORRIGIDA
 * CVP Vistorias / LPX
 * 
 * Conforme Requisitos de Auditoria 1 a 28:
 * - H0 tratado separadamente e ignorado no loop de blocos
 * - Ordem WYSIWYG exata: Capa -> H0 -> Localizações -> Blocos
 * - Espaçamento naturalHeaderGap = 12px idêntico ao client final
 * - Counter = H3 com toolbar completa (cor, style, size, isSticky, etc.)
 * - Insert H1/H2/H3 com mapeamento do editor normal
 * - Standard questions (text-short, text-long, date) com preview e question contenteditable
 * - Settings popover com gating estrito por tipo de bloco
 * - Casca visual desacoplada (.pill-visual-shell) sem esmagamento de texto
 * - Motor de rows com checkAndSplitRows medindo apenas .pill-visual-shell
 * - adjustPillWidths() idêntico ao inventory_view.html (global vs individual)
 * - Painel de sliders individuais restaurado para mode=individual & type=fixed
 * - Tab IDs corrigidos (tab-scope-*, tab-type-*, tab-font-*)
 * - Font Engine idêntico com fitText() em passos de 0.5px
 * - Presets mapeados numericamente (14, 16, 18, 20)
 * - resetPillSizingDefaults() canónico
 * - Imagens dos blocos restauradas sem bug 'autopx' e sem interferir com drag de bloco
 * - Omissão de botão de visibilidade no counter
 * - Localização "Outra" suportada na barra sem poluir Firestore
 * - Capa guardada estritamente como string URL sem base64 excessivo
 * - Preview pré-popula lp_preview_schema e lp_preview_config
 * - UNRESOLVED_APP_HANDLERS = 0
 */

import { auth, db, onAuthStateChanged, signInAnonymously, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
import { canManagePillVisibility, optionRows } from './form-recovery.js?v=20260909-miguel-original-v3';

// ==========================================================================
// 1. HELPERS DE CORES, CONTRASTE E TIPOGRAFIA
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
window.hslToHex = hslToHex;

// ==========================================================================
// 2. ESTADO GLOBAL DO BUILDER
// ==========================================================================

let currentFormId = null;
let currentFormData = null;
window.currentFormConfig = {
    title: 'Check List - Material',
    schema: [],
    theme: {},
    useLocations: false,
    locations: [],
    showMainTitle: true,
    showReplenishment: true,
    replenishmentTitle: 'Requisição de items'
};

window.editorSchema = [];
window.activeLocationId = '__base__';
window.useLocations = false;
window.locations = [];

window.pillSizingConfig = {
    scope: 'global',
    mode: 'global',
    type: 'dynamic',
    sharedWidth: 200,
    sharedHeight: 42,
    fontMode: 'dynamic',
    fontSize: 18,
    maxFontSize: 18,
    fontPreset: 'large',
    individual: {}
};

window.activeSettingsIndex = null;
let activeImageBlockIdx = null;
let hoverBlockIndex = null;
let draggedBlockIndex = null;
let draggedPill = null;
let currentDropTarget = null;
let currentDropZone = null;

let saveTimer = null;
let hasUnsavedChanges = false;

// Documentar formalmente limitações do client final protegido
window.PILL_VISIBILITY_FINAL_CLIENT = 'NAO_SUPORTADO';
window.OTHER_FINAL_CLIENT = 'NAO_SUPORTADO';
window.RANDOMIZE_FINAL_CLIENT = 'NAO_SUPORTADO';

// ==========================================================================
// 3. PERSISTÊNCIA CENTRALIZADA (MERGE: TRUE & ZERO DATA LOSS)
// ==========================================================================

window.serializeInventoryEditorState = function () {
    if (!window.currentFormConfig) window.currentFormConfig = {};

    // 1. Sincronizar o schema ativo na sua localização ou no modelo base
    if (window.activeLocationId === '__base__' || !window.activeLocationId || window.activeLocationId === 'outra') {
        window.currentFormConfig.schema = window.editorSchema;
    } else {
        const activeLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (activeLoc && activeLoc.schema) {
            activeLoc.schema = window.editorSchema;
        }
    }

    // 2. Determinar título a partir do primeiro bloco de título ou config
    const baseSchema = window.currentFormConfig.schema || window.editorSchema || [];
    const firstTitleIndex = baseSchema.findIndex(b => ['title', 'title-h1', 'title-h2', 'title-h3'].includes(b.type));
    const titleBlock = firstTitleIndex !== -1 ? baseSchema[firstTitleIndex] : null;
    const formTitle = titleBlock ? (titleBlock.content || titleBlock.question || window.currentFormConfig.title || 'Check List - Material') : (window.currentFormConfig.title || 'Check List - Material');

    // 3. Formatar schema com options serializadas (padrão do backend Firestore)
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

    const safeBaseSchema = prepareSchema(window.currentFormConfig.schema || window.editorSchema);

    // 4. Formatar localizações (sem persistir objeto fake para "outra")
    const safeLocations = (window.locations || [])
        .filter(loc => loc.id !== 'outra')
        .map(loc => {
            const clean = { ...loc };
            if (clean.schema) {
                clean.schema = prepareSchema(clean.schema);
            }
            return clean;
        });

    // 5. Tema e Capa: garantido como STRING URL
    const coverBlock = document.getElementById('cover-block');
    let coverUrl = null;
    if (coverBlock && coverBlock.style.backgroundImage) {
        coverUrl = coverBlock.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
    } else if (typeof window.currentFormConfig.theme?.coverImage === 'string') {
        coverUrl = window.currentFormConfig.theme.coverImage;
    }

    const theme = {
        ...(window.currentFormConfig.theme || {}),
        coverImage: coverUrl
    };

    // 6. Payload integral
    const payload = {
        ...window.currentFormConfig,
        title: formTitle,
        schema: safeBaseSchema,
        theme: theme,
        pillSizing: window.pillSizingConfig,
        useLocations: !!window.useLocations,
        locations: safeLocations,
        showMainTitle: window.currentFormConfig.showMainTitle !== false,
        showReplenishment: window.currentFormConfig.showReplenishment !== false,
        replenishmentTitle: window.currentFormConfig.replenishmentTitle || 'Requisição de items',
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
// 4. MOTOR DE LOCALIZAÇÕES / VIATURAS (COM "OUTRA" WYSIWYG & COPY-ON-WRITE)
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

    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
        if (bannerTitle) bannerTitle.textContent = "Modelo Base (Padrão)";
        if (bannerBadge) {
            bannerBadge.textContent = "Base";
            bannerBadge.className = "active-schema-badge";
        }
    } else if (window.activeLocationId === 'outra') {
        if (bannerTitle) bannerTitle.textContent = "📝 Outra";
        if (bannerBadge) {
            bannerBadge.textContent = "Herda Modelo Base";
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

    let tabsHtml = `
        <button type="button" class="builder-location-tab ${window.activeLocationId === '__base__' || !window.activeLocationId ? 'active' : ''}" onclick="window.switchActiveLocation('__base__')">
            <i class="ph ph-file-text"></i> Modelo Base
        </button>
    `;

    (window.locations || []).forEach(loc => {
        const isSelected = window.activeLocationId === loc.id;
        const isCustom = !!loc.schema;
        tabsHtml += `
            <button type="button" class="builder-location-tab ${isSelected ? 'active' : ''}" onclick="window.switchActiveLocation('${loc.id}')">
                <span>${loc.icon || '🚑'}</span>
                <span>${loc.name}</span>
                ${isCustom ? '<span class="loc-custom-dot" title="Estrutura personalizada">Pers.</span>' : ''}
            </button>
        `;
    });

    // Representação WYSIWYG de "Outra" (sem persistir objeto fake no array locations)
    tabsHtml += `
        <button type="button" class="builder-location-tab ${window.activeLocationId === 'outra' ? 'active' : ''}" onclick="window.switchActiveLocation('outra')">
            <span>📝</span>
            <span>Outra</span>
        </button>
    `;

    bar.innerHTML = tabsHtml;
};

window.switchActiveLocation = function (locId) {
    if (window.activeLocationId === locId) return;

    // Salvar schema anterior
    if (window.activeLocationId === '__base__' || window.activeLocationId === 'outra') {
        window.currentFormConfig.schema = window.editorSchema;
    } else {
        const prevLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (prevLoc && prevLoc.schema) {
            prevLoc.schema = window.editorSchema;
        }
    }

    window.activeLocationId = locId;

    if (locId === '__base__' || locId === 'outra') {
        window.editorSchema = window.currentFormConfig.schema;
    } else {
        const targetLoc = (window.locations || []).find(l => l.id === locId);
        if (targetLoc) {
            if (targetLoc.schema) {
                window.editorSchema = targetLoc.schema;
            } else {
                window.editorSchema = window.currentFormConfig.schema;
            }
        }
    }

    window.renderCanvasLocationsBar();
    window.renderSidebarLocations();
    window.renderCanvas();
};

window.toggleUseLocations = function (checked) {
    window.useLocations = !!checked;
    window.currentFormConfig.useLocations = window.useLocations;

    const locControls = document.getElementById('locations-controls-container');
    if (locControls) {
        locControls.style.display = window.useLocations ? 'block' : 'none';
    }

    window.renderCanvasLocationsBar();
    window.renderSidebarLocations();
    window.saveDebounce();
};

window.addNewLocation = function () {
    if (!window.locations) window.locations = [];
    const count = window.locations.length + 1;
    const newLoc = {
        id: 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: 'Viatura ' + count,
        icon: '🚑'
    };
    window.locations.push(newLoc);
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.updateLocationName = function (locId, newName) {
    const loc = (window.locations || []).find(l => l.id === locId);
    if (loc) {
        loc.name = newName.trim() || 'Viatura';
        window.renderCanvasLocationsBar();
        window.saveDebounce();
    }
};

window.updateLocationIcon = function (locId, newIcon) {
    const loc = (window.locations || []).find(l => l.id === locId);
    if (loc) {
        loc.icon = newIcon.trim() || '🚑';
        window.renderCanvasLocationsBar();
        window.saveDebounce();
    }
};

window.moveLocationUp = function (index) {
    if (index <= 0) return;
    const temp = window.locations[index];
    window.locations[index] = window.locations[index - 1];
    window.locations[index - 1] = temp;
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.moveLocationDown = function (index) {
    if (index >= (window.locations || []).length - 1) return;
    const temp = window.locations[index];
    window.locations[index] = window.locations[index + 1];
    window.locations[index + 1] = temp;
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.deleteLocation = function (locId) {
    if (!confirm("Tem a certeza que deseja eliminar esta viatura?")) return;
    if (window.activeLocationId === locId) {
        window.switchActiveLocation('__base__');
    }
    window.locations = (window.locations || []).filter(l => l.id !== locId);
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.personalizeLocationSchema = function (locId) {
    const loc = (window.locations || []).find(l => l.id === locId);
    if (!loc) return;
    loc.schema = JSON.parse(JSON.stringify(window.currentFormConfig.schema || []));
    window.switchActiveLocation(locId);
    window.renderSidebarLocations();
    window.saveDebounce();
};

window.revertLocationToBaseSchema = function (locId) {
    if (!confirm("Deseja repor o Modelo Base? Todas as personalizações desta viatura serão eliminadas.")) return;
    const loc = (window.locations || []).find(l => l.id === locId);
    if (!loc) return;
    delete loc.schema;
    if (window.activeLocationId === locId) {
        window.editorSchema = window.currentFormConfig.schema;
        window.renderCanvas();
    }
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.renderSidebarLocations = function () {
    const list = document.getElementById('sidebar-locations-list');
    const chk = document.getElementById('setting-use-locations');
    const controls = document.getElementById('locations-controls-container');
    if (chk) chk.checked = !!window.useLocations;
    if (controls) controls.style.display = window.useLocations ? 'block' : 'none';
    if (!list) return;

    if (!window.locations || !window.locations.length) {
        list.innerHTML = '<p style="font-size: 12px; color: #64748b; font-style: italic; margin: 4px 0;">Nenhuma viatura registada.</p>';
        return;
    }

    let html = '';
    window.locations.forEach((loc, index) => {
        const isCustom = !!loc.schema;
        html += `
            <div class="sidebar-loc-card">
                <div class="sidebar-loc-row">
                    <input type="text" class="sidebar-loc-icon" value="${loc.icon || '🚑'}" maxlength="4" onchange="window.updateLocationIcon('${loc.id}', this.value)" title="Ícone">
                    <input type="text" class="sidebar-loc-name" value="${loc.name}" onchange="window.updateLocationName('${loc.id}', this.value)" title="Nome da viatura">
                    <button type="button" class="sidebar-loc-btn icon-only" onclick="window.moveLocationUp(${index})" title="Mover para cima" ${index === 0 ? 'disabled' : ''}><i class="ph ph-arrow-up"></i></button>
                    <button type="button" class="sidebar-loc-btn icon-only" onclick="window.moveLocationDown(${index})" title="Mover para baixo" ${index === window.locations.length - 1 ? 'disabled' : ''}><i class="ph ph-arrow-down"></i></button>
                    <button type="button" class="sidebar-loc-btn icon-only danger" onclick="window.deleteLocation('${loc.id}')" title="Eliminar viatura"><i class="ph ph-trash"></i></button>
                </div>
                <div class="sidebar-loc-actions">
                    <span class="sidebar-loc-status ${isCustom ? 'custom' : ''}">${isCustom ? '★ Personalizada' : '○ Padrão'}</span>
                    <div class="sidebar-loc-btns">
                        ${isCustom ? `
                            <button type="button" class="sidebar-loc-btn" onclick="window.revertLocationToBaseSchema('${loc.id}')">Repor Base</button>
                        ` : `
                            <button type="button" class="sidebar-loc-btn primary" onclick="window.personalizeLocationSchema('${loc.id}')">Personalizar</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
};

// ==========================================================================
// 5. MOTOR WYSIWYG & RENDER CANVAS (H0, SPACING 12PX & LEVEL CLASSIFICATION)
// ==========================================================================

window.renderCanvas = function () {
    const blocksContainer = document.getElementById('blocks-container');
    const h0Container = document.getElementById('builder-h0-container');
    if (!blocksContainer) return;

    const schema = window.editorSchema || [];

    // 1. Identificar e renderizar H0 separadamente
    const firstTitleIndex = schema.findIndex(b => ['title', 'title-h1', 'title-h2', 'title-h3'].includes(b.type));
    const firstTitleBlock = firstTitleIndex !== -1 ? schema[firstTitleIndex] : null;
    const titleText = firstTitleBlock ? (firstTitleBlock.content || firstTitleBlock.question || window.currentFormConfig.title || 'Check List - Material') : (window.currentFormConfig.title || 'Check List - Material');

    if (h0Container) {
        h0Container.innerHTML = `
            <div class="builder-h0-input" contenteditable="true" data-field="h0-title" placeholder="Título do Formulário">${titleText}</div>
        `;
        const h0Input = h0Container.querySelector('.builder-h0-input');
        if (h0Input) {
            h0Input.addEventListener('blur', (e) => {
                const val = e.target.innerText.trim();
                if (firstTitleBlock) {
                    if (firstTitleBlock.content !== undefined) firstTitleBlock.content = val;
                    else firstTitleBlock.question = val;
                }
                window.currentFormConfig.title = val;
                const navTitle = document.querySelector('.nav-title');
                if (navTitle) navTitle.textContent = val;
                window.saveDebounce();
            });
        }
    }

    // 2. Classificação de níveis e cálculo de espaçamento idêntico ao inventory_view.html
    const activeBlocks = schema.filter((b, i) => i !== firstTitleIndex);

    let blocksHtml = '';

    schema.forEach((block, index) => {
        // Ignora H0 no loop de blocos conforme inventory_view.html
        if (index === firstTitleIndex) return;

        // Determinar próximo bloco ativo para cálculo de espaçamento
        const activeIdx = activeBlocks.indexOf(block);
        const nextBlock = activeBlocks[activeIdx + 1];

        // Classificação idêntica ao client final
        const isL1 = (['title', 'title-h1'].includes(block.type) && (block.blockSize === 'large' || !block.blockSize) && block.blockStyle !== 'inline');
        const isL2 = block.type !== 'counter' && (block.type === 'title-h2' || block.type === 'section' || (block.type === 'title' && (block.blockSize === 'medium' || block.blockStyle === 'inline')));
        const isCounter = block.type === 'counter';
        const isSectionLevelBlock = isL1 || isL2;
        const isFollowedBySection = nextBlock && (['section', 'title', 'title-h1', 'title-h2', 'title-h3'].includes(nextBlock.type));

        const naturalHeaderGap = '12px';
        let mb = '28px';
        let pb = '0px';

        if (isL1 && nextBlock && (['title-h2', 'section'].includes(nextBlock.type) || (nextBlock.type === 'title' && (nextBlock.blockSize === 'medium' || nextBlock.blockStyle === 'inline')))) {
            mb = naturalHeaderGap;
        } else if (isL1) {
            mb = '0px';
        } else if (isL2 && nextBlock && nextBlock.type === 'counter') {
            mb = naturalHeaderGap;
        } else if (isL2) {
            mb = '0px';
        } else if (isCounter && nextBlock && nextBlock.type === 'counter') {
            mb = '3px';
            pb = '9px';
        } else if (!isFollowedBySection && isSectionLevelBlock) {
            mb = '0px';
        }

        const isSticky = block.isSticky !== false;
        const blockColor = block.blockColor || null;
        const blockStyle = block.blockStyle || 'full';
        const blockSize = block.blockSize || 'large';

        // 3. Montar Toolbar do Bloco
        const isHeaderLike = isL1 || isL2 || isCounter || ['title', 'section'].includes(block.type);

        let toolsHtml = `
            <div class="block-tools-inline" data-blockidx="${index}">
                <div class="tool-btn drag-handle" title="Arrastar Bloco" draggable="true" ondragstart="window.handleBlockDragStart(event, ${index})" ondragend="window.handleBlockDragEnd(event)"><i class="ph ph-dots-six-vertical"></i></div>
                ${isHeaderLike ? `
                    <div class="tool-btn" onclick="window.toggleTitleStyle(${index})" title="Alternar Estilo de Destaque"><i class="ph ph-arrows-out-line-horizontal"></i></div>
                    <div class="tool-btn" onclick="window.toggleTitleSize(${index})" title="Alternar Tamanho"><i class="ph ph-text-aa"></i></div>
                    <div class="tool-btn ${isSticky ? 'active-pin' : ''}" onclick="window.toggleBlockSticky(${index})" title="${isSticky ? 'Desafixar Cabeçalho' : 'Fixar Cabeçalho (Sticky)'}"><i class="ph ph-push-pin"></i></div>
                    <div class="tool-btn" onclick="window.openBlockFullPicker(event, ${index})" title="Cor do Cabeçalho"><i class="ph ph-palette"></i></div>
                ` : ''}
                <div class="tool-btn image-trigger" onclick="window.triggerBlockImage(event, ${index})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
                <div class="tool-btn" onclick="window.duplicateBlockDirect(${index})" title="Duplicar Bloco"><i class="ph ph-copy"></i></div>
                <div class="tool-btn" onclick="window.openSlashMenu(event, ${index})" title="Inserir Bloco Abaixo"><i class="ph ph-plus"></i></div>
                <div class="tool-btn settings-btn" onclick="window.openBlockSettings(event, ${index})" title="Definições do Bloco"><i class="ph ph-gear"></i></div>
                <div class="tool-btn delete-btn" onclick="window.deleteBlock(${index})" title="Eliminar Bloco"><i class="ph ph-trash"></i></div>
            </div>
        `;

        // Imagem do Bloco (se existir)
        let imageHtml = '';
        if (block.image) {
            const imgW = (block.imageWidth && Number.isFinite(Number(block.imageWidth))) ? `${block.imageWidth}px` : '200px';
            const imgH = (block.imageHeight && Number.isFinite(Number(block.imageHeight))) ? `${block.imageHeight}px` : 'auto';
            const imgX = (block.imageX && Number.isFinite(Number(block.imageX))) ? `${block.imageX}px` : '10px';
            const imgY = (block.imageY && Number.isFinite(Number(block.imageY))) ? `${block.imageY}px` : '10px';

            imageHtml = `
                <div class="block-image-wrapper" id="image-wrapper-${index}"
                    style="left: ${imgX}; top: ${imgY}; width: ${imgW}; height: ${imgH};"
                    onmousedown="window.startImageDrag(event, ${index})">
                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                    <div class="image-resize-handle" onmousedown="window.startImageResize(event, ${index})"></div>
                    <div class="image-delete-btn" onclick="window.removeBlockImage(event, ${index})" title="Eliminar imagem"><i class="ph ph-trash"></i></div>
                </div>
            `;
        }

        // 4. Conteúdo por tipo de bloco
        let bodyHtml = '';

        if (block.type === 'title' || block.type === 'section') {
            const fontMap = { 'small': '18px', 'medium': '22px', 'large': '28px' };
            const fSize = fontMap[blockSize] || '24px';
            const textColor = blockColor ? getContrastYIQ(blockColor) : '#f8fafc';
            const bgAttr = blockColor ? `background-color: ${blockColor}; color: ${textColor};` : 'background: rgba(255,255,255,0.06); color: #f8fafc;';
            const padAttr = blockStyle === 'inline' ? 'padding: 4px 12px; display: inline-block; border-radius: 6px;' : 'padding: 8px 16px; display: block; border-radius: 8px; width: 100%;';
            const textVal = block.content || block.question || 'Título de Secção';

            bodyHtml = `
                <div class="block-section-heading" contenteditable="true" data-field="${block.content !== undefined ? 'content' : 'question'}"
                    style="font-size: ${fSize}; font-weight: 700; ${bgAttr} ${padAttr}">${textVal}</div>
            `;
        } else if (block.type === 'counter') {
            const fSize = blockSize === 'small' ? '18px' : (blockSize === 'medium' ? '20px' : '22px');
            const textColor = blockColor ? getContrastYIQ(blockColor) : '#f8fafc';
            const bgAttr = blockColor ? `background-color: ${blockColor}; color: ${textColor};` : 'background: rgba(239, 68, 68, 0.85); color: #ffffff;';
            const padAttr = blockStyle === 'inline' ? 'padding: 4px 12px; display: inline-block; border-radius: 6px;' : 'padding: 8px 16px; display: block; border-radius: 8px; width: 100%;';
            const textVal = block.question || block.content || 'Novo Grupo de Contadores';

            bodyHtml = `
                <div class="block-counter-header" contenteditable="true" data-field="question"
                    style="font-size: ${fSize}; font-weight: 700; margin-bottom: 12px; ${bgAttr} ${padAttr}">${textVal}</div>
                ${renderPillsContainerHtml(block, index, true)}
            `;
        } else if (block.type === 'choice-single' || block.type === 'choice-multi') {
            bodyHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div class="block-question" contenteditable="true" data-field="question">${block.question || 'Pergunta de Escolha'}</div>
                    <button type="button" class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="window.toggleBlockRequired(${index})" title="${block.required ? 'Obrigatório' : 'Opcional'}">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
                ${renderPillsContainerHtml(block, index, false)}
            `;
        } else if (block.type === 'text-short' || block.type === 'text-long') {
            const isLong = block.type === 'text-long';
            const ph = block.placeholder || (isLong ? 'Escreva aqui a resposta longa...' : 'Escreva aqui a resposta curta...');
            bodyHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div class="block-question" contenteditable="true" data-field="question">${block.question || (isLong ? 'Pergunta de Texto Longo' : 'Pergunta de Texto Curto')}</div>
                    <button type="button" class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="window.toggleBlockRequired(${index})" title="${block.required ? 'Obrigatório' : 'Opcional'}">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
                <div class="fake-input" style="${isLong ? 'min-height: 90px;' : ''}">${ph}</div>
            `;
        } else if (block.type === 'date') {
            const today = new Date().toISOString().split('T')[0];
            bodyHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div class="block-question" contenteditable="true" data-field="question">${block.question || 'Data'}</div>
                    <button type="button" class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="window.toggleBlockRequired(${index})" title="${block.required ? 'Obrigatório' : 'Opcional'}">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
                <input type="date" class="fake-input" style="padding: 10px; width: fit-content; color-scheme: dark;" value="${today}" disabled>
            `;
        } else if (block.type === 'desc') {
            bodyHtml = `<div class="block-desc" contenteditable="true" data-field="content">${block.content || 'Texto informativo...'}</div>`;
        } else if (block.type === 'divider') {
            bodyHtml = `<div class="block-divider-line"></div>`;
        }

        blocksHtml += `
            <div class="canvas-block tally-block block-${block.type}" id="block-${index}" data-blockidx="${index}"
                style="position: relative; margin-bottom: ${mb}; padding-bottom: ${pb}; background-color: #0f172a;"
                ondragover="window.handleBlockDragOver(event, ${index})" ondragleave="window.handleBlockDragLeave(event)" ondrop="window.handleBlockDrop(event, ${index})">
                ${toolsHtml}
                ${imageHtml}
                ${bodyHtml}
            </div>
        `;
    });

    blocksContainer.innerHTML = blocksHtml;

    // Ligar handlers de edição de texto in-place
    attachInlineTextHandlers();

    // Ajustar larguras e fontes das pílulas
    window.adjustPillWidths();
    window.fitAllPillText();

    // Aplicar verificação e divisão de linhas sem quebrar
    window.checkAndSplitRows();
};

function renderPillsContainerHtml(block, index, isCounter) {
    let rawOptions = block.options || [];
    if (typeof rawOptions === 'string') {
        try { rawOptions = JSON.parse(rawOptions); } catch (e) { rawOptions = []; }
    }
    const options = optionRows(rawOptions);
    block.options = options;

    let html = `<div class="pill-options-container" data-blockidx="${index}">`;

    options.forEach((row, rowIdx) => {
        html += `
            <div class="pill-row-gap" data-blockidx="${index}" data-insertidx="${rowIdx}" ondragover="window.handleRowDragOver(event)" ondragleave="window.handleRowDragLeave(event)" ondrop="window.handleRowDrop(event, ${index}, ${rowIdx})"></div>
            <div class="pill-row" data-blockidx="${index}" data-rowidx="${rowIdx}" ondragover="window.handlePillRowDragOver(event)" ondrop="window.handlePillRowDrop(event, ${index}, ${rowIdx})">
        `;

        row.forEach((opt, colIdx) => {
            const optText = (typeof opt === 'object' && opt !== null) ? (opt.text || '') : String(opt || '');
            const optColor = (typeof opt === 'object' && opt !== null && opt.color) ? opt.color : null;
            const optTarget = (typeof opt === 'object' && opt !== null && opt.target !== undefined) ? opt.target : 0;
            const isDisabled = (typeof opt === 'object' && opt !== null && opt.disabled);

            const shellStyle = optColor ? `background-color: ${optColor}; color: ${getContrastYIQ(optColor)};` : '';

            html += `
                <div class="pill-cell-wrapper" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}">
                    <div class="pill-visual-shell ${isDisabled ? 'pill-disabled' : ''}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="${shellStyle}">
                        <input type="text" class="pill-input pill-name-input" value="${optText}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}">
                        ${isCounter ? `
                            <div class="pill-qt-zone" onclick="window.setPillTarget(event, ${index}, ${rowIdx}, ${colIdx})" title="Clique para definir quantidade alvo">
                                <span class="qt-label">QT</span>
                                <span class="qt-val">${optTarget}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="pill-editor-tools">
                        <div class="pill-drag-handle" title="Arrastar opção" draggable="true" ondragstart="window.handlePillDragStart(event, ${index}, ${rowIdx}, ${colIdx})" ondragend="window.handlePillDragEnd(event)"><i class="ph ph-dots-six-vertical"></i></div>
                        ${!isCounter && canManagePillVisibility(block.type) ? `
                            <button type="button" class="pill-tool-btn" onclick="window.togglePillVisibility(event, ${index}, ${rowIdx}, ${colIdx})" title="Visibilidade"><i class="ph ph-eye"></i></button>
                        ` : ''}
                        <button type="button" class="pill-tool-btn" onclick="window.duplicateOption(${index}, ${rowIdx}, ${colIdx})" title="Duplicar item"><i class="ph ph-copy"></i></button>
                        <button type="button" class="pill-tool-btn" onclick="window.openColorPicker(event, 'pill', ${index}, ${rowIdx}, ${colIdx})" title="Cor do item"><i class="ph ph-palette"></i></button>
                        <button type="button" class="pill-tool-btn danger" onclick="window.removeOption(${index}, ${rowIdx}, ${colIdx})" title="Eliminar item"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;
        });

        html += `
                <button type="button" class="pill-add-btn" onclick="window.addOptionToRow(${index}, ${rowIdx})" title="Adicionar item nesta linha"><i class="ph ph-plus"></i></button>
            </div>
        `;
    });

    html += `
        <div class="pill-row-gap pill-row-gap--end" data-blockidx="${index}" data-insertidx="${options.length}" ondragover="window.handleRowDragOver(event)" ondragleave="window.handleRowDragLeave(event)" ondrop="window.handleRowDrop(event, ${index}, ${options.length})"></div>
        <button type="button" class="add-row-btn" onclick="window.addOption(${index})"><i class="ph ph-plus"></i> Adicionar Nova Linha de Itens</button>
    </div>`;

    return html;
}

function attachInlineTextHandlers() {
    // Inputs de pílula
    document.querySelectorAll('.pill-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const bIdx = parseInt(e.target.dataset.blockidx);
            const rIdx = parseInt(e.target.dataset.rowidx);
            const cIdx = parseInt(e.target.dataset.colidx);
            const block = window.editorSchema[bIdx];
            if (block && block.options && block.options[rIdx] && block.options[rIdx][cIdx] !== undefined) {
                if (typeof block.options[rIdx][cIdx] === 'object') {
                    block.options[rIdx][cIdx].text = e.target.value;
                } else {
                    block.options[rIdx][cIdx] = e.target.value;
                }
            }
            window.fitText(e.target);
            window.saveDebounce();
        });

        input.addEventListener('blur', () => {
            window.checkAndSplitRows();
        });
    });

    // Contenteditable titles and questions
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        if (el.dataset.field === 'h0-title') return; // Handled separately
        el.addEventListener('blur', (e) => {
            const blockEl = e.target.closest('.canvas-block');
            if (!blockEl) return;
            const bIdx = parseInt(blockEl.dataset.blockidx);
            const field = e.target.dataset.field;
            const val = e.target.innerText.trim();
            if (window.editorSchema[bIdx] && field) {
                window.editorSchema[bIdx][field] = val;
                window.saveDebounce();
            }
        });
    });
}

// ==========================================================================
// 6. MOTOR DE ROWS & DRAG & DROP DE PÍLULAS
// ==========================================================================

window.checkAndSplitRows = function () {
    let needsReRender = false;
    let focusedPill = null;
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList.contains('pill-name-input')) {
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
        const availableWidth = editorPage ? (editorPage.clientWidth - 90) : 720;

        pills.forEach((p, i) => {
            const shell = p.querySelector('.pill-visual-shell');
            let w = shell ? shell.getBoundingClientRect().width : p.getBoundingClientRect().width;
            currentWidth += w;
            if (i > 0) currentWidth += 8; // gap

            if (currentWidth > availableWidth && splitIndex === -1 && i > 0) {
                splitIndex = i;
            }
        });

        if (splitIndex !== -1 && window.editorSchema[blockIdx] && window.editorSchema[blockIdx].options) {
            const block = window.editorSchema[blockIdx];
            if (block.options[rowIdx]) {
                const newRow = block.options[rowIdx].splice(splitIndex);
                block.options.splice(rowIdx + 1, 0, newRow);
                if (focusedPill && focusedPill.blockIdx === blockIdx && focusedPill.rowIdx === rowIdx && focusedPill.colIdx >= splitIndex) {
                    focusedPill.rowIdx = rowIdx + 1;
                    focusedPill.colIdx -= splitIndex;
                }
                needsReRender = true;
            }
        }
    });

    if (needsReRender) {
        window.renderCanvas();
        if (focusedPill) {
            setTimeout(() => {
                const targetInput = document.querySelector(
                    `.pill-name-input[data-blockidx="${focusedPill.blockIdx}"][data-rowidx="${focusedPill.rowIdx}"][data-colidx="${focusedPill.colIdx}"]`
                );
                if (targetInput) {
                    targetInput.focus();
                    if (targetInput.setSelectionRange && focusedPill.selectionStart !== null) {
                        targetInput.setSelectionRange(focusedPill.selectionStart, focusedPill.selectionEnd);
                    }
                }
            }, 50);
        }
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
    e.currentTarget.classList.remove('drag-over');
    if (!draggedPill) return;

    if (draggedPill.blockIdx === blockIdx) {
        const options = window.editorSchema[blockIdx].options;
        const item = options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1)[0];
        if (options[draggedPill.rowIdx].length === 0 && options.length > 1) {
            options.splice(draggedPill.rowIdx, 1);
        }
        options.splice(targetRowIdx, 0, [item]);
        draggedPill = null;
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.handlePillRowDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

window.handlePillRowDrop = function (e, blockIdx, rowIdx) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedPill) return;

    if (draggedPill.blockIdx === blockIdx) {
        const options = window.editorSchema[blockIdx].options;
        const item = options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1)[0];
        if (options[draggedPill.rowIdx].length === 0 && options.length > 1) {
            options.splice(draggedPill.rowIdx, 1);
        }
        options[rowIdx].push(item);
        draggedPill = null;
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.handlePillDragStart = function (e, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    draggedPill = { blockIdx, rowIdx, colIdx };
    e.dataTransfer.setData('text/plain', JSON.stringify({ blockIdx, rowIdx, colIdx }));
    e.dataTransfer.effectAllowed = 'move';
};

window.handlePillDragEnd = function (e) {
    draggedPill = null;
    document.querySelectorAll('.pill-row-gap').forEach(el => el.classList.remove('drag-over'));
};

window.duplicateOption = function (blockIdx, rowIdx, colIdx) {
    const block = window.editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    const orig = block.options[rowIdx][colIdx];
    const clone = typeof orig === 'object' ? JSON.parse(JSON.stringify(orig)) : { text: orig, target: 0 };
    if (typeof clone === 'object') {
        clone.id = 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        clone.text = (clone.text || '') + ' (Cópia)';
    }
    block.options[rowIdx].splice(colIdx + 1, 0, clone);
    window.renderCanvas();
    window.saveDebounce();
};

window.removeOption = function (blockIdx, rowIdx, colIdx) {
    const block = window.editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    block.options[rowIdx].splice(colIdx, 1);
    if (block.options[rowIdx].length === 0 && block.options.length > 1) {
        block.options.splice(rowIdx, 1);
    }
    window.renderCanvas();
    window.saveDebounce();
};

window.addOptionToRow = function (blockIdx, rowIdx) {
    const block = window.editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    block.options[rowIdx].push({
        id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: 'Nova Opção',
        target: 1
    });
    window.renderCanvas();
    window.saveDebounce();
};

window.addOption = function (blockIdx) {
    const block = window.editorSchema[blockIdx];
    if (!block) return;
    if (!block.options) block.options = [];
    block.options.push([{
        id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: 'Nova Opção',
        target: 1
    }]);
    window.renderCanvas();
    window.saveDebounce();
};

window.setPillTarget = function (e, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    const block = window.editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    const opt = block.options[rowIdx][colIdx];
    const current = typeof opt === 'object' && opt.target !== undefined ? opt.target : 0;
    const input = prompt("Definir quantidade alvo (Target):", current);
    if (input === null) return;
    const num = parseInt(input, 10);
    const safeNum = isNaN(num) ? 0 : Math.max(0, num);
    if (typeof opt === 'object') {
        opt.target = safeNum;
    } else {
        block.options[rowIdx][colIdx] = { text: opt, target: safeNum };
    }
    window.renderCanvas();
    window.saveDebounce();
};

window.togglePillVisibility = function (e, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    const block = window.editorSchema[blockIdx];
    if (!block || !block.options || !block.options[rowIdx]) return;
    const opt = block.options[rowIdx][colIdx];
    if (typeof opt === 'object') {
        opt.disabled = !opt.disabled;
    } else {
        block.options[rowIdx][colIdx] = { text: opt, disabled: true };
    }
    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 7. DRAG & DROP DE BLOCOS
// ==========================================================================

window.handleBlockDragStart = function (e, index) {
    e.stopPropagation();
    draggedBlockIndex = index;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
};

window.handleBlockDragOver = function (e, index) {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
    const target = e.currentTarget;
    target.style.outline = '2px dashed #38bdf8';
    e.dataTransfer.dropEffect = 'move';
};

window.handleBlockDragLeave = function (e) {
    e.currentTarget.style.outline = 'none';
};

window.handleBlockDrop = function (e, targetIndex) {
    e.preventDefault();
    e.currentTarget.style.outline = 'none';
    if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) return;

    const item = window.editorSchema.splice(draggedBlockIndex, 1)[0];
    window.editorSchema.splice(targetIndex, 0, item);
    draggedBlockIndex = null;
    window.renderCanvas();
    window.saveDebounce();
};

window.handleBlockDragEnd = function (e) {
    draggedBlockIndex = null;
    document.querySelectorAll('.canvas-block').forEach(b => b.style.outline = 'none');
};

// ==========================================================================
// 8. PILL SIZING ENGINE (PORTADO DO INVENTORY_VIEW.HTML COM GLOBAL VS INDIVIDUAL)
// ==========================================================================

window.adjustPillWidths = function () {
    const config = window.pillSizingConfig || {};
    const shells = document.querySelectorAll('.pill-visual-shell');
    if (!shells.length) return;

    const font = "500 14px Outfit, sans-serif";
    const getTextWidth = (text, fontStyle) => {
        const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
        const context = canvas.getContext("2d");
        context.font = fontStyle;
        return context.measureText(text).width;
    };

    if (config.type === 'fixed') {
        shells.forEach(shell => {
            const blockIdx = parseInt(shell.dataset.blockidx);
            const rowIdx = parseInt(shell.dataset.rowidx);
            const colIdx = parseInt(shell.dataset.colidx);
            const block = window.editorSchema[blockIdx];
            const opt = (block && block.options && block.options[rowIdx]) ? block.options[rowIdx][colIdx] : null;

            let w = config.sharedWidth || 200;
            if (config.mode === 'individual') {
                w = (opt && typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
            }

            let h = config.sharedHeight || 42;
            if (config.mode === 'individual') {
                h = (opt && typeof opt === 'object' && opt.height !== undefined) ? opt.height : h;
            }

            shell.style.width = `${w}px`;
            shell.style.minHeight = `${h}px`;
            shell.style.height = `${h}px`;
        });
    } else {
        // Dynamic
        shells.forEach(shell => {
            const blockIdx = parseInt(shell.dataset.blockidx);
            const rowIdx = parseInt(shell.dataset.rowidx);
            const colIdx = parseInt(shell.dataset.colidx);
            const block = window.editorSchema[blockIdx];
            const opt = (block && block.options && block.options[rowIdx]) ? block.options[rowIdx][colIdx] : null;

            let h = config.sharedHeight || 42;
            if (config.mode === 'individual') {
                h = (opt && typeof opt === 'object' && opt.height !== undefined) ? opt.height : h;
            }
            shell.style.minHeight = `${h}px`;
            shell.style.height = `${h}px`;
        });

        if (config.mode === 'global') {
            let maxVal = 0;
            window.editorSchema.forEach(block => {
                if (block.type !== 'counter' && !['choice-single', 'choice-multi'].includes(block.type)) return;
                if (!block.options || !Array.isArray(block.options)) return;
                block.options.forEach(row => {
                    row.forEach(opt => {
                        const text = (opt && typeof opt === 'object') ? (opt.text || '') : String(opt || '');
                        const textWidth = getTextWidth(text, font);
                        const isCounter = block.type === 'counter';
                        const extra = isCounter ? 85 : 45;
                        const naturalWidth = textWidth + extra;
                        if (naturalWidth > maxVal) maxVal = naturalWidth;
                    });
                });
            });

            const finalWidth = Math.min(310, Math.max(120, maxVal));
            shells.forEach(shell => {
                shell.style.width = `${finalWidth}px`;
            });
        } else {
            // Dynamic Individual
            shells.forEach(shell => {
                const blockIdx = parseInt(shell.dataset.blockidx);
                const rowIdx = parseInt(shell.dataset.rowidx);
                const colIdx = parseInt(shell.dataset.colidx);
                const block = window.editorSchema[blockIdx];
                const opt = (block && block.options && block.options[rowIdx]) ? block.options[rowIdx][colIdx] : null;
                const text = (opt && typeof opt === 'object') ? (opt.text || '') : String(opt || '');
                const textWidth = getTextWidth(text, font);
                const isCounter = block && block.type === 'counter';
                const extra = isCounter ? 85 : 45;
                const finalWidth = Math.min(310, Math.max(120, textWidth + extra));
                shell.style.width = `${finalWidth}px`;
            });
        }
    }
};

// ==========================================================================
// 9. FONT ENGINE (PORTADO DO INVENTORY_VIEW.HTML COM PASSOS DE 0.5PX)
// ==========================================================================

window.getPillFontConfig = function () {
    const config = window.pillSizingConfig || {};
    const fontMode = config.fontMode === 'static' ? 'static' : 'dynamic';
    const rawSize = Number(config.fontSize || config.maxFontSize);
    const fontSize = Math.max(9, Math.min(24, Number.isFinite(rawSize) ? rawSize : 18));
    return { fontMode, fontSize };
};

window.fitText = function (el) {
    if (!el) return 0;
    const font = window.getPillFontConfig();
    if (font.fontMode === 'static') {
        el.style.fontSize = font.fontSize + 'px';
        return font.fontSize;
    }
    const parentWrapper = el.closest('.pill-visual-shell') || el.closest('.pill-cell-wrapper');
    const availableHeight = parentWrapper ? Math.max(1, parentWrapper.getBoundingClientRect().height) : 42;

    const fits = size => {
        el.style.fontSize = size + 'px';
        void el.offsetHeight;
        const widthOk = el.clientWidth <= 1 || el.scrollWidth <= el.clientWidth + 1;
        const heightOk = el.scrollHeight <= availableHeight + 1;
        return widthOk && heightOk;
    };

    let size = font.fontSize;
    while (size > 9 && !fits(size)) {
        size = Math.max(9, Math.round((size - 0.5) * 2) / 2);
    }
    el.style.fontSize = size + 'px';
    return size;
};

window.fitAllPillText = function (root = document) {
    root.querySelectorAll('.pill-name-input, .pill-input').forEach(el => window.fitText(el));
};

// ==========================================================================
// 10. GAVETA DE LAYOUT, SLIDERS & PRESETS
// ==========================================================================

window.toggleSettingsSidebar = function () {
    const sb = document.getElementById('settings-sidebar');
    if (sb) {
        sb.classList.toggle('open');
        if (sb.classList.contains('open')) {
            window.syncSidebarInputs();
            window.renderSidebarSettings();
        }
    }
};

window.changeSizingScope = function (scope) {
    window.pillSizingConfig.scope = scope;
    window.pillSizingConfig.mode = scope;
    window.syncSidebarInputs();
    window.renderSidebarSettings();
    window.adjustPillWidths();
    window.saveDebounce();
};

window.changeSizingType = function (type) {
    window.pillSizingConfig.type = type;
    window.syncSidebarInputs();
    window.renderSidebarSettings();
    window.adjustPillWidths();
    window.saveDebounce();
};

window.changeFontSizingMode = function (mode) {
    window.pillSizingConfig.fontMode = mode;
    window.syncSidebarInputs();
    window.fitAllPillText();
    window.saveDebounce();
};

window.updateGlobalHeight = function (val) {
    const num = Math.max(32, Math.min(80, parseInt(val, 10) || 42));
    window.pillSizingConfig.sharedHeight = num;
    window.syncSidebarInputs();
    window.adjustPillWidths();
    window.fitAllPillText();
    window.saveDebounce();
};

window.updateGlobalWidth = function (val) {
    const num = Math.max(120, Math.min(350, parseInt(val, 10) || 200));
    window.pillSizingConfig.sharedWidth = num;
    window.syncSidebarInputs();
    window.adjustPillWidths();
    window.saveDebounce();
};

window.updatePillFontSize = function (val) {
    const num = Math.max(9, Math.min(24, parseFloat(val) || 18));
    window.pillSizingConfig.fontSize = num;
    window.pillSizingConfig.maxFontSize = num;
    window.pillSizingConfig.fontPreset = 'custom';
    window.syncSidebarInputs();
    window.fitAllPillText();
    window.saveDebounce();
};

window.applyPillFontPreset = function (preset) {
    const presetMap = {
        'compact': 14,
        'normal': 16,
        'large': 18,
        'maximum': 20
    };
    if (presetMap[preset]) {
        window.pillSizingConfig.fontSize = presetMap[preset];
        window.pillSizingConfig.maxFontSize = presetMap[preset];
        window.pillSizingConfig.fontPreset = preset;
    } else if (preset === 'custom') {
        window.pillSizingConfig.fontPreset = 'custom';
    }
    window.syncSidebarInputs();
    window.fitAllPillText();
    window.saveDebounce();
};

window.resetPillSizingDefaults = function () {
    window.pillSizingConfig = {
        scope: 'global',
        mode: 'global',
        type: 'dynamic',
        sharedWidth: 200,
        sharedHeight: 42,
        fontMode: 'dynamic',
        fontSize: 18,
        maxFontSize: 18,
        fontPreset: 'large',
        individual: {}
    };
    window.syncSidebarInputs();
    window.renderSidebarSettings();
    window.renderCanvas();
    window.saveDebounce();
};

window.updateIndividualWidth = function (bIdx, rIdx, cIdx, val) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options || !block.options[rIdx]) return;
    const num = Math.max(100, Math.min(350, parseInt(val, 10) || 200));
    if (typeof block.options[rIdx][cIdx] === 'object') {
        block.options[rIdx][cIdx].width = num;
    } else {
        block.options[rIdx][cIdx] = { text: block.options[rIdx][cIdx], width: num };
    }
    window.adjustPillWidths();
    window.saveDebounce();
};

window.updateIndividualHeight = function (bIdx, rIdx, cIdx, val) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options || !block.options[rIdx]) return;
    const num = Math.max(32, Math.min(80, parseInt(val, 10) || 42));
    if (typeof block.options[rIdx][cIdx] === 'object') {
        block.options[rIdx][cIdx].height = num;
    } else {
        block.options[rIdx][cIdx] = { text: block.options[rIdx][cIdx], height: num };
    }
    window.adjustPillWidths();
    window.fitAllPillText();
    window.saveDebounce();
};

window.syncSidebarInputs = function () {
    const cfg = window.pillSizingConfig || {};

    // Tabs com os IDs reais do HTML
    const tabScopeGlobal = document.getElementById('tab-scope-global');
    const tabScopeIndividual = document.getElementById('tab-scope-individual');
    if (tabScopeGlobal && tabScopeIndividual) {
        tabScopeGlobal.classList.toggle('active', cfg.mode !== 'individual');
        tabScopeIndividual.classList.toggle('active', cfg.mode === 'individual');
    }

    const tabTypeDynamic = document.getElementById('tab-type-dynamic');
    const tabTypeFixed = document.getElementById('tab-type-fixed');
    if (tabTypeDynamic && tabTypeFixed) {
        tabTypeDynamic.classList.toggle('active', cfg.type !== 'fixed');
        tabTypeFixed.classList.toggle('active', cfg.type === 'fixed');
    }

    const tabFontDynamic = document.getElementById('tab-font-dynamic');
    const tabFontStatic = document.getElementById('tab-font-static');
    if (tabFontDynamic && tabFontStatic) {
        tabFontDynamic.classList.toggle('active', cfg.fontMode !== 'static');
        tabFontStatic.classList.toggle('active', cfg.fontMode === 'static');
    }

    // Altura global
    const inH = document.getElementById('input-global-height');
    const inHNum = document.getElementById('input-global-height-num');
    if (inH) inH.value = cfg.sharedHeight || 42;
    if (inHNum) inHNum.value = cfg.sharedHeight || 42;

    // Largura global fixa
    const inW = document.getElementById('input-global-width');
    const inWNum = document.getElementById('input-global-width-num');
    if (inW) inW.value = cfg.sharedWidth || 200;
    if (inWNum) inWNum.value = cfg.sharedWidth || 200;

    // Tamanho de fonte
    const inF = document.getElementById('input-font-size');
    const inFNum = document.getElementById('input-font-size-num');
    const curFont = cfg.fontSize || cfg.maxFontSize || 18;
    if (inF) inF.value = curFont;
    if (inFNum) inFNum.value = curFont;

    // Select preset
    const selPreset = document.getElementById('setting-pill-font-preset');
    if (selPreset) {
        selPreset.value = cfg.fontPreset || 'large';
    }

    // Visibilidade dos painéis contextuais
    const ctrlGlobalFixed = document.getElementById('control-global-fixed');
    const ctrlIndFixed = document.getElementById('control-individual-fixed');
    const descDynGlobal = document.getElementById('desc-dynamic-global');
    const descDynInd = document.getElementById('desc-dynamic-individual');

    if (ctrlGlobalFixed) ctrlGlobalFixed.style.display = (cfg.mode !== 'individual' && cfg.type === 'fixed') ? 'block' : 'none';
    if (ctrlIndFixed) ctrlIndFixed.style.display = (cfg.mode === 'individual' && cfg.type === 'fixed') ? 'block' : 'none';
    if (descDynGlobal) descDynGlobal.style.display = (cfg.mode !== 'individual' && cfg.type !== 'fixed') ? 'block' : 'none';
    if (descDynInd) descDynInd.style.display = (cfg.mode === 'individual' && cfg.type !== 'fixed') ? 'block' : 'none';
};

window.renderSidebarSettings = function () {
    const cfg = window.pillSizingConfig || {};
    const indList = document.getElementById('individual-sliders-list');
    if (!indList) return;

    if (cfg.mode !== 'individual' || cfg.type !== 'fixed') {
        indList.innerHTML = '';
        return;
    }

    let html = '';
    window.editorSchema.forEach((block, bIdx) => {
        if (!block.options || !Array.isArray(block.options)) return;
        block.options.forEach((row, rIdx) => {
            row.forEach((opt, cIdx) => {
                const optText = (typeof opt === 'object' && opt !== null) ? (opt.text || 'Item') : String(opt || 'Item');
                const optW = (typeof opt === 'object' && opt !== null && opt.width !== undefined) ? opt.width : (cfg.sharedWidth || 200);
                const optH = (typeof opt === 'object' && opt !== null && opt.height !== undefined) ? opt.height : (cfg.sharedHeight || 42);

                html += `
                    <div class="individual-pill-card">
                        <div class="individual-pill-card-title">${optText}</div>
                        <div class="individual-control-row">
                            <span>Largura:</span>
                            <input type="range" min="100" max="350" step="5" value="${optW}" oninput="window.updateIndividualWidth(${bIdx}, ${rIdx}, ${cIdx}, this.value); this.nextElementSibling.textContent = this.value + 'px';">
                            <span class="val">${optW}px</span>
                        </div>
                        <div class="individual-control-row">
                            <span>Altura:</span>
                            <input type="range" min="32" max="80" step="2" value="${optH}" oninput="window.updateIndividualHeight(${bIdx}, ${rIdx}, ${cIdx}, this.value); this.nextElementSibling.textContent = this.value + 'px';">
                            <span class="val">${optH}px</span>
                        </div>
                    </div>
                `;
            });
        });
    });

    indList.innerHTML = html || '<p style="font-size: 11px; color: #64748b;">Nenhuma pílula encontrada no esquema.</p>';
};

// ==========================================================================
// 11. TOOLBAR, SETTINGS POPOVER & GATING POR TIPO
// ==========================================================================

window.toggleTitleStyle = function (index) {
    const block = window.editorSchema[index];
    if (!block) return;
    block.blockStyle = (block.blockStyle === 'inline') ? 'full' : 'inline';
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleTitleSize = function (index) {
    const block = window.editorSchema[index];
    if (!block) return;
    const cycle = { 'small': 'medium', 'medium': 'large', 'large': 'small' };
    block.blockSize = cycle[block.blockSize] || 'medium';
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleBlockSticky = function (index) {
    const block = window.editorSchema[index];
    if (!block) return;
    block.isSticky = (block.isSticky === false) ? true : false;
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleBlockRequired = function (index) {
    const block = window.editorSchema[index];
    if (!block) return;
    block.required = !block.required;
    window.renderCanvas();
    window.saveDebounce();
};

window.openBlockFullPicker = function (event, index) {
    window.openColorPicker(event, 'block', index);
};

window.openColorPicker = function (event, targetType, blockIndex, rowIdx, colIdx) {
    if (event) event.stopPropagation();

    document.querySelectorAll('.inline-color-popover').forEach(p => p.remove());

    const popover = document.createElement('div');
    popover.className = 'inline-color-popover';
    popover.style.cssText = `
        position: fixed; z-index: 2000; background: #1e293b; border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px; padding: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 220px;
    `;

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#10b981', '#06b6d4', '#38bdf8', '#3b82f6', '#6366f1',
        '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#0f172a'
    ];

    let dotsHtml = '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 8px;">';
    colors.forEach(hex => {
        dotsHtml += `<div class="color-dot" style="width: 28px; height: 28px; border-radius: 50%; background: ${hex}; cursor: pointer; border: 2px solid rgba(255,255,255,0.2);" onclick="window.applyChosenColor('${targetType}', ${blockIndex}, ${rowIdx ?? 'null'}, ${colIdx ?? 'null'}, '${hex}')"></div>`;
    });
    dotsHtml += '</div>';

    popover.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Escolher Cor</div>
        ${dotsHtml}
        <button type="button" class="builder-btn secondary small" style="width: 100%;" onclick="window.applyChosenColor('${targetType}', ${blockIndex}, ${rowIdx ?? 'null'}, ${colIdx ?? 'null'}, null)">Sem Cor (Padrão)</button>
    `;

    const rect = event.currentTarget.getBoundingClientRect();
    popover.style.top = Math.min(window.innerHeight - 200, rect.bottom + 8) + 'px';
    popover.style.left = Math.min(window.innerWidth - 240, Math.max(10, rect.left - 80)) + 'px';

    document.body.appendChild(popover);

    const closeHandler = (e) => {
        if (!popover.contains(e.target)) {
            popover.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 50);
};

window.applyChosenColor = function (targetType, blockIdx, rowIdx, colIdx, color) {
    document.querySelectorAll('.inline-color-popover').forEach(p => p.remove());
    const block = window.editorSchema[blockIdx];
    if (!block) return;

    if (targetType === 'block') {
        block.blockColor = color;
    } else if (targetType === 'pill' && rowIdx !== null && colIdx !== null) {
        if (block.options && block.options[rowIdx]) {
            if (typeof block.options[rowIdx][colIdx] === 'object') {
                block.options[rowIdx][colIdx].color = color;
            } else {
                block.options[rowIdx][colIdx] = { text: block.options[rowIdx][colIdx], color: color };
            }
        }
    }
    window.renderCanvas();
    window.saveDebounce();
};

window.openBlockSettings = function (event, index) {
    if (event) event.stopPropagation();
    const block = window.editorSchema[index];
    if (!block) return;

    // Gating estrito: títulos e descrições puras não têm popover de perguntas
    if (block.type === 'title' || block.type === 'section' || block.type === 'desc' || block.type === 'divider') {
        alert("Este bloco é formatado diretamente através da barra de ferramentas (cor, tamanho, destaque).");
        return;
    }

    window.activeSettingsIndex = index;
    const popover = document.getElementById('settings-popover');
    if (!popover) return;

    // Controlos visíveis por tipo
    const rowReq = document.getElementById('row-setting-required');
    const rowDesc = document.getElementById('row-setting-description');
    const rowOther = document.getElementById('row-setting-other');
    const rowRand = document.getElementById('row-setting-randomize');
    const rowMulti = document.getElementById('row-setting-multi');
    const rowColor = document.getElementById('row-setting-color');
    const rowAlign = document.getElementById('row-setting-alignment');
    const rowPh = document.getElementById('row-setting-placeholder');

    const chkReq = document.getElementById('setting-required');
    const chkDesc = document.getElementById('setting-description');
    const chkOther = document.getElementById('setting-other');
    const chkRand = document.getElementById('setting-randomize');
    const chkMulti = document.getElementById('setting-multi');
    const chkColor = document.getElementById('setting-color');
    const inPh = document.getElementById('setting-placeholder');

    // Reset visibility
    if (rowReq) rowReq.style.display = 'flex';
    if (rowDesc) rowDesc.style.display = 'flex';
    if (rowOther) rowOther.style.display = 'none';
    if (rowRand) rowRand.style.display = 'none';
    if (rowMulti) rowMulti.style.display = 'none';
    if (rowColor) rowColor.style.display = 'none';
    if (rowAlign) rowAlign.style.display = 'none';
    if (rowPh) rowPh.style.display = 'none';

    if (block.type === 'counter') {
        if (rowColor) rowColor.style.display = 'flex';
    } else if (block.type === 'choice-single' || block.type === 'choice-multi') {
        if (rowOther) rowOther.style.display = 'flex';
        if (rowRand) rowRand.style.display = 'flex';
        if (rowMulti) rowMulti.style.display = 'flex';
        if (rowColor) rowColor.style.display = 'flex';
        if (rowAlign) rowAlign.style.display = 'flex';
    } else if (block.type === 'text-short' || block.type === 'text-long') {
        if (rowPh) rowPh.style.display = 'flex';
    }

    // Valores
    if (chkReq) chkReq.checked = !!block.required;
    if (chkDesc) chkDesc.checked = !!block.hasDescription;
    if (chkOther) chkOther.checked = !!block.hasOther;
    if (chkRand) chkRand.checked = !!block.randomize;
    if (chkMulti) chkMulti.checked = block.type === 'choice-multi';
    if (chkColor) chkColor.checked = !!block.hasColorCode;
    if (inPh) inPh.value = block.placeholder || '';

    // Posicionamento ancorado
    const rect = event.currentTarget.getBoundingClientRect();
    popover.classList.remove('hidden');
    popover.style.top = Math.min(window.innerHeight - 360, rect.bottom + 6) + 'px';
    popover.style.left = Math.min(window.innerWidth - 300, Math.max(10, rect.left - 120)) + 'px';

    const closeHandler = (e) => {
        if (!popover.contains(e.target) && !e.target.closest('.settings-btn')) {
            popover.classList.add('hidden');
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 50);
};

window.toggleSettingParam = function (param, val) {
    if (window.activeSettingsIndex === null) return;
    const block = window.editorSchema[window.activeSettingsIndex];
    if (!block) return;

    if (param === 'required') block.required = !!val;
    if (param === 'description') {
        block.hasDescription = !!val;
        if (block.hasDescription && !block.description) block.description = 'Descrição opcional...';
    }
    if (param === 'hasOther') block.hasOther = !!val;
    if (param === 'randomize') block.randomize = !!val;
    if (param === 'color') block.hasColorCode = !!val;
    if (param === 'multi') {
        block.type = val ? 'choice-multi' : 'choice-single';
    }

    window.renderCanvas();
    window.saveDebounce();
};

window.setBlockPlaceholder = function (val) {
    if (window.activeSettingsIndex === null) return;
    const block = window.editorSchema[window.activeSettingsIndex];
    if (block) {
        block.placeholder = val;
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.setBlockAlignment = function (align) {
    if (window.activeSettingsIndex === null) return;
    const block = window.editorSchema[window.activeSettingsIndex];
    if (block) {
        block.alignment = align;
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.deleteActiveSettingsBlock = function () {
    if (window.activeSettingsIndex === null) return;
    window.deleteBlock(window.activeSettingsIndex);
    const pop = document.getElementById('settings-popover');
    if (pop) pop.classList.add('hidden');
};

window.duplicateActiveSettingsBlock = function () {
    if (window.activeSettingsIndex === null) return;
    window.duplicateBlockDirect(window.activeSettingsIndex);
    const pop = document.getElementById('settings-popover');
    if (pop) pop.classList.add('hidden');
};

window.duplicateBlockDirect = function (index) {
    const block = window.editorSchema[index];
    if (!block) return;
    const clone = JSON.parse(JSON.stringify(block));
    window.editorSchema.splice(index + 1, 0, clone);
    window.renderCanvas();
    window.saveDebounce();
};

window.deleteBlock = function (index) {
    if (!confirm("Tem a certeza que deseja eliminar este bloco?")) return;
    window.editorSchema.splice(index, 1);
    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 12. SLASH MENU & INSERT BLOCK (COM CONVERSÃO CORRETA H1/H2/H3)
// ==========================================================================

window.openSlashMenu = function (event, index) {
    if (event) event.stopPropagation();
    hoverBlockIndex = index;

    const slashMenu = document.getElementById('slash-menu');
    if (!slashMenu) return;

    slashMenu.classList.remove('hidden');

    if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        slashMenu.style.top = Math.min(window.innerHeight - 380, rect.bottom + 6) + 'px';
        slashMenu.style.left = Math.min(window.innerWidth - 260, Math.max(20, rect.left)) + 'px';
    } else {
        slashMenu.style.top = '50%';
        slashMenu.style.left = '50%';
        slashMenu.style.transform = 'translate(-50%, -50%)';
    }

    const closeHandler = (e) => {
        if (!slashMenu.contains(e.target) && !e.target.closest('.insert-btn') && !e.target.closest('.tool-btn')) {
            slashMenu.classList.add('hidden');
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 50);
};

window.insertBlock = function (type) {
    const slashMenu = document.getElementById('slash-menu');
    if (slashMenu) slashMenu.classList.add('hidden');

    let actualType = type;
    let blockSize = 'large';
    let initialContent = '';
    let initialQuestion = '';

    // Mapeamento comprovado da semântica do editor normal
    if (type === 'title-h1') {
        actualType = 'title';
        blockSize = 'large';
        initialContent = 'Título Principal';
    } else if (type === 'title-h2') {
        actualType = 'section';
        blockSize = 'medium';
        initialQuestion = 'Título Médio';
    } else if (type === 'title-h3') {
        actualType = 'section';
        blockSize = 'small';
        initialQuestion = 'Título Pequeno';
    } else if (type === 'counter') {
        actualType = 'counter';
        initialQuestion = 'Novo Grupo de Contadores';
    } else if (type === 'text-short') {
        initialQuestion = 'Pergunta de Texto Curto';
    } else if (type === 'text-long') {
        initialQuestion = 'Pergunta de Texto Longo';
    } else if (type === 'date') {
        initialQuestion = 'Data';
    } else if (type === 'choice-single' || type === 'choice-multi') {
        initialQuestion = 'Pergunta de Escolha';
    }

    const newBlock = {
        type: actualType,
        question: initialQuestion,
        content: initialContent,
        blockSize: blockSize,
        isSticky: true
    };

    if (actualType === 'counter') {
        newBlock.options = [['Novo Item']];
        newBlock.target = 0;
        newBlock.blockStyle = 'full';
        newBlock.blockColor = '#ef4444';
    } else if (actualType === 'choice-single' || actualType === 'choice-multi') {
        newBlock.options = [['Opção 1']];
    }

    if (hoverBlockIndex !== null && hoverBlockIndex >= 0) {
        window.editorSchema.splice(hoverBlockIndex + 1, 0, newBlock);
    } else {
        window.editorSchema.push(newBlock);
    }

    hoverBlockIndex = null;
    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 13. MOTOR DE IMAGENS NOS BLOCOS (DRAG, RESIZE, MODAL, SEM BUG AUTOPX)
// ==========================================================================

window.triggerBlockImage = function (e, index) {
    if (e) e.stopPropagation();
    activeImageBlockIdx = index;
    injectImageModal();

    const urlInput = document.getElementById('image-url-input');
    if (urlInput) urlInput.value = '';

    const modal = document.getElementById('image-upload-modal');
    if (modal) {
        modal.classList.remove('hidden');
        window.switchImageTab('upload');
    }
};

window.closeImageModal = function (e) {
    if (e && e.target !== e.currentTarget && !e.target.closest('.image-modal-close')) return;
    const modal = document.getElementById('image-upload-modal');
    if (modal) modal.classList.add('hidden');
    activeImageBlockIdx = null;
};

window.switchImageTab = function (tab) {
    const btnUpload = document.getElementById('btn-tab-upload');
    const btnUrl = document.getElementById('btn-tab-url');
    const contentUpload = document.getElementById('image-tab-upload');
    const contentUrl = document.getElementById('image-tab-url');

    if (!btnUpload || !btnUrl) return;

    if (tab === 'upload') {
        btnUpload.classList.add('active');
        btnUrl.classList.remove('active');
        if (contentUpload) contentUpload.classList.remove('hidden');
        if (contentUrl) contentUrl.classList.add('hidden');
    } else {
        btnUpload.classList.remove('active');
        btnUrl.classList.add('active');
        if (contentUpload) contentUpload.classList.add('hidden');
        if (contentUrl) contentUrl.classList.remove('hidden');
    }
};

window.processImageFile = function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        window.setBlockImage(activeImageBlockIdx, e.target.result);
        window.closeImageModal();
    };
    reader.readAsDataURL(file);
};

window.applyImageUrl = function () {
    const urlInput = document.getElementById('image-url-input');
    const url = urlInput ? urlInput.value.trim() : '';
    if (url && activeImageBlockIdx !== null) {
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
    if (block) {
        delete block.image;
        delete block.imageX;
        delete block.imageY;
        delete block.imageWidth;
        delete block.imageHeight;
        window.renderCanvas();
        window.saveDebounce();
    }
};

window.startImageDrag = function (e, index) {
    if (e.button !== 0 || e.target.classList.contains('image-resize-handle') || e.target.closest('.image-delete-btn')) return;
    e.preventDefault();
    e.stopPropagation();

    const block = window.editorSchema[index];
    const wrapper = document.getElementById(`image-wrapper-${index}`);
    if (!block || !wrapper) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = Number(block.imageX) || 10;
    const startTop = Number(block.imageY) || 10;

    function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        let newLeft = Math.max(-50, Math.min(startLeft + dx, 800));
        let newTop = Math.max(-20, Math.min(startTop + dy, 600));

        wrapper.style.left = newLeft + 'px';
        wrapper.style.top = newTop + 'px';
        block.imageX = newLeft;
        block.imageY = newTop;
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
    if (!block || !wrapper) return;

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
                <button type="button" class="image-modal-close" onclick="window.closeImageModal()"><i class="ph ph-x"></i></button>
            </div>
            <div class="image-modal-body">
                <div class="image-tab-bar">
                    <button type="button" class="image-tab-btn active" id="btn-tab-upload" onclick="window.switchImageTab('upload')"><i class="ph ph-upload-simple"></i> Ficheiro / Clipboard</button>
                    <button type="button" class="image-tab-btn" id="btn-tab-url" onclick="window.switchImageTab('url')"><i class="ph ph-link"></i> Endereço Web (URL)</button>
                </div>
                <div class="image-tab-content" id="image-tab-upload">
                    <div class="image-drop-zone" id="image-drop-zone" onclick="document.getElementById('block-image-file-input').click()">
                        <i class="ph ph-cloud-arrow-up" style="font-size: 40px; color: #38bdf8; margin-bottom: 8px;"></i>
                        <p style="font-weight: 500; margin-bottom: 4px;">Clique ou arraste um ficheiro de imagem</p>
                        <span style="font-size: 11px; color: #64748b;">PNG, JPG, WebP</span>
                    </div>
                    <input type="file" id="block-image-file-input" accept="image/png, image/jpeg, image/webp" style="display: none;" onchange="window.processImageFile(this.files[0])">
                </div>
                <div class="image-tab-content hidden" id="image-tab-url">
                    <input type="text" id="image-url-input" class="settings-text-input" placeholder="https://exemplo.com/imagem.png" style="width: 100%; box-sizing: border-box; margin-bottom: 12px;">
                    <button type="button" class="builder-btn primary" onclick="window.applyImageUrl()" style="width: 100%;"><i class="ph ph-check"></i> Aplicar Imagem</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

// ==========================================================================
// 14. INICIALIZAÇÃO DA CAPA & CARREGAMENTO DE DADOS
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
            btnChangeCover.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A carregar...';
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
                    if (!window.currentFormConfig.theme) window.currentFormConfig.theme = {};
                    window.currentFormConfig.theme.coverImage = downloadURL;
                    window.saveDebounce();
                } else {
                    console.error("Imgur upload failed:", data);
                    alert("Falha no envio da capa. O servidor pode estar ocupado. Tente novamente.");
                }
            } catch (err) {
                console.error("Fetch error during cover upload:", err);
                alert("Erro de comunicação ao enviar imagem: " + (err.message || err));
            } finally {
                btnChangeCover.innerHTML = originalText;
                btnChangeCover.disabled = false;
                coverUploadInput.value = '';
            }
        });
    }
}

// ==========================================================================
// 15. BOOTSTRAP: AUTH, LOAD FORMS & PREVIEW
// ==========================================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.warn("Autenticação anónima fallback:", e);
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentFormId = urlParams.get('id');

    if (!currentFormId) {
        alert("ID de formulário não especificado.");
        return;
    }

    try {
        const formDocRef = doc(db, 'forms', currentFormId);
        const formSnap = await getDoc(formDocRef);

        if (formSnap.exists()) {
            const data = formSnap.data();
            currentFormData = data;
            window.currentFormConfig = { ...data };

            // Título
            const navTitle = document.querySelector('.nav-title');
            if (navTitle) navTitle.textContent = data.title || 'Check List - Material';

            // Capa
            if (data.theme?.coverImage) {
                const coverBlock = document.getElementById('cover-block');
                if (coverBlock) {
                    const cUrl = typeof data.theme.coverImage === 'string' ? data.theme.coverImage : (data.theme.coverImage.url || '');
                    if (cUrl) coverBlock.style.backgroundImage = `url('${cUrl}')`;
                }
            }

            // Localizações
            window.useLocations = !!data.useLocations;
            window.locations = Array.isArray(data.locations) ? data.locations : [];
            window.currentFormConfig.useLocations = window.useLocations;
            window.currentFormConfig.locations = window.locations;

            // Sizing Config
            if (data.pillSizing && typeof data.pillSizing === 'object') {
                window.pillSizingConfig = {
                    ...window.pillSizingConfig,
                    ...data.pillSizing
                };
            }

            // Deserializar baseSchema
            const parseSchema = (raw) => {
                if (!Array.isArray(raw)) return [];
                return raw.map(b => {
                    const clone = { ...b };
                    if (typeof clone.options === 'string') {
                        try { clone.options = JSON.parse(clone.options); } catch (e) { clone.options = []; }
                    }
                    return clone;
                });
            };

            const baseSchema = parseSchema(data.schema || []);
            window.currentFormConfig.schema = baseSchema;

            // Deserializar schemas de viaturas personalizadas
            window.locations.forEach(loc => {
                if (loc.schema) {
                    loc.schema = parseSchema(loc.schema);
                }
            });

            // Iniciar com Modelo Base
            window.activeLocationId = '__base__';
            window.editorSchema = baseSchema;

            // Renderizar
            window.syncSidebarInputs();
            window.renderSidebarLocations();
            window.renderCanvasLocationsBar();
            window.renderCanvas();
        } else {
            alert("Formulário não encontrado.");
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        console.error("Erro ao carregar formulário:", err);
        alert("Erro de comunicação com a base de dados: " + (err.message || err));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initCoverLogic();

    // Preview com pré-população obrigatória de lp_preview_schema e lp_preview_config
    const btnPreview = document.getElementById('btn-preview');
    if (btnPreview) {
        btnPreview.addEventListener('click', () => {
            if (!currentFormId) return;

            // 1. Limpar e serializar schema limpo para localStorage
            const cleanSchema = JSON.parse(JSON.stringify(window.editorSchema || []));
            localStorage.setItem('lp_preview_schema', JSON.stringify(cleanSchema));

            // 2. Serializar configuração de preview
            const previewConfig = {
                theme: window.currentFormConfig.theme || {},
                showReplenishment: window.currentFormConfig.showReplenishment !== false,
                showMainTitle: window.currentFormConfig.showMainTitle !== false,
                replenishmentTitle: window.currentFormConfig.replenishmentTitle || 'Requisição de items',
                pillSizing: window.pillSizingConfig || {}
            };
            localStorage.setItem('lp_preview_config', JSON.stringify(previewConfig));

            // 3. Abrir janela de preview
            window.open(`inventory_view.html?id=${currentFormId}&preview=true`, '_blank');
        });
    }
});

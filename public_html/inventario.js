/**
 * INVENTÁRIO BUILDER ENGINE — ARQUITETURA NATIVA CORRIGIDA V2
 * CVP Vistorias / LPX
 * 
 * Conforme Requisitos de Auditoria Externa V2:
 * 1. Pill Visibility com canManagePillVisibility(auth.currentUser) e toggleOptionDisabled()
 * 2. Cor das Pills: opt.color -> block.pillColor -> block.blockColor -> default
 *    Para counter: o nome recebe optColor, QT continua sempre escuro
 * 3. Toggle "Cores nas opções" define/remove block.pillColor e atualiza canvas
 * 4. Alinhamento Horizontal / Vertical: transforma block.options ([allOptions] vs allOptions.map([opt]))
 * 5. Block Style "Border": ciclo full -> inline -> border -> full com .style-marker e --marker-color
 * 6. Copy-on-Write: personalizar localização já selecionada aponta window.editorSchema = loc.schema
 * 7. Desativar localizações: preserva schema se custom ativo, volta a __base__ e base schema
 * 8. Image Engine: handlers reais de dropZone (dragover, drop) e modal (paste)
 * 9. imageInFlow e imageZ: relative vs absolute, z-index front/back, e adjustBlockHeightForImage()
 * 10. H0 WYSIWYG Real: usa blockColor, blockStyle (border/inline/full), blockSize e imagem do primeiro título
 * 11. H1/H2/Counter: escala canónica do client (small: 20px, medium: 25px, large: 33px)
 * 12. Row Drag: ajusta target index quando a row de origem é esvaziada e removida
 * 13. Block Drag: cálculo de rect + midpoint vertical com feedback top/bottom e ajuste de índices
 * 14. Documentação de Preview (limitações conhecidas do client)
 * 15. Documentação de Outra / Randomize (limitações conhecidas do client)
 */

import { auth, db, onAuthStateChanged, signInAnonymously, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
import { canManagePillVisibility, optionRows, toggleOptionDisabled } from './form-recovery.js?v=20260909-miguel-original-v3';

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

export const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];
window.PRESET_COLORS = PRESET_COLORS;

// ==========================================================================
// 2. ESTADO GLOBAL DO BUILDER
// ==========================================================================

window.currentFormId = null;
window.currentFormConfig = {};
window.editorSchema = [];
window.activeLocationId = '__base__';
window.useLocations = false;
window.locations = [];

// Drag state
window.draggedBlockIdx = null;
window.draggedBlockPosition = null;
let draggedPill = null;
let currentDropTarget = null;
let currentDropZone = null;

// Settings Popover state
let activeSettingsBlockIdx = null;

// Save Debounce state
let saveTimeout = null;
let isSaving = false;

// ==========================================================================
// 3. SERIALIZADOR CENTRAL E SALVAMENTO DEBOUNCED
// ==========================================================================

export function serializeInventoryEditorState() {
    if (window.activeLocationId === '__base__' || !window.activeLocationId || window.activeLocationId === 'outra') {
        window.currentFormConfig.schema = window.editorSchema;
    } else {
        const activeLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (activeLoc) {
            activeLoc.schema = window.editorSchema;
        }
    }

    const cleanBaseSchema = (window.currentFormConfig.schema || []).map(block => {
        const b = { ...block };
        if (Array.isArray(b.options)) {
            b.options = JSON.stringify(optionRows(b.options));
        }
        return b;
    });

    const safeLocations = (window.locations || [])
        .filter(l => l.id !== 'outra')
        .map(loc => {
            const l = { ...loc };
            if (l.schema && Array.isArray(l.schema)) {
                l.schema = l.schema.map(block => {
                    const b = { ...block };
                    if (Array.isArray(b.options)) {
                        b.options = JSON.stringify(optionRows(b.options));
                    }
                    return b;
                });
            } else {
                delete l.schema;
            }
            return l;
        });

    let coverImageStr = '';
    if (window.currentFormConfig.theme && window.currentFormConfig.theme.coverImage) {
        if (typeof window.currentFormConfig.theme.coverImage === 'string') {
            coverImageStr = window.currentFormConfig.theme.coverImage;
        } else if (typeof window.currentFormConfig.theme.coverImage === 'object' && window.currentFormConfig.theme.coverImage.url) {
            coverImageStr = window.currentFormConfig.theme.coverImage.url;
        }
    }

    const payload = {
        title: window.currentFormConfig.title || 'Check List - Material',
        description: window.currentFormConfig.description || '',
        schema: cleanBaseSchema,
        locations: safeLocations,
        useLocations: !!window.useLocations,
        pillSizing: window.currentFormConfig.pillSizing || {
            scope: 'global',
            type: 'dynamic',
            sharedWidth: 160,
            sharedHeight: 48,
            fontMode: 'dynamic',
            fontSize: 16,
            fontPreset: 'normal'
        },
        theme: {
            coverImage: coverImageStr,
            primaryColor: window.currentFormConfig.theme?.primaryColor || '#10b981',
            backgroundColor: window.currentFormConfig.theme?.backgroundColor || '#0f172a'
        },
        showReplenishment: window.currentFormConfig.showReplenishment !== false,
        showMainTitle: window.currentFormConfig.showMainTitle !== false,
        replenishmentTitle: window.currentFormConfig.replenishmentTitle || 'Itens para Reposição',
        updatedAt: serverTimestamp()
    };

    return payload;
}

window.saveDebounce = function () {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
        statusEl.innerHTML = '<i class="ph ph-arrows-clockwise animate-spin"></i> A guardar...';
        statusEl.style.color = '#38bdf8';
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        if (!window.currentFormId) return;
        try {
            isSaving = true;
            const payload = serializeInventoryEditorState();
            await setDoc(doc(db, "forms", window.currentFormId), payload, { merge: true });
            if (statusEl) {
                statusEl.innerHTML = '<i class="ph ph-check-circle"></i> Guardado';
                statusEl.style.color = '#10b981';
            }
        } catch (err) {
            console.error("Erro ao guardar formulário:", err);
            if (statusEl) {
                statusEl.innerHTML = '<i class="ph ph-warning-circle"></i> Erro ao guardar';
                statusEl.style.color = '#ef4444';
            }
        } finally {
            isSaving = false;
        }
    }, 400);
};

export async function publishForm() {
    if (!window.currentFormId) return;
    const btn = document.getElementById('btn-publish');
    if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A publicar...';
    try {
        const payload = serializeInventoryEditorState();
        await setDoc(doc(db, "forms", window.currentFormId), payload, { merge: true });
        alert("Formulário de inventário publicado com sucesso!");
        window.location.href = "dashboard.html";
    } catch (e) {
        console.error("Erro ao publicar:", e);
        alert("Erro ao publicar formulário: " + e.message);
    } finally {
        if (btn) btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Publicar';
    }
}
window.publishForm = publishForm;

// ==========================================================================
// 4. MOTOR DE LOCALIZAÇÕES COM COPY-ON-WRITE E "OUTRA"
// ==========================================================================

window.renderCanvasLocationsBar = function () {
    const container = document.getElementById('builder-locations-container');
    if (!container) return;

    if (!window.useLocations) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'block';

    let badgeText = '';
    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
        badgeText = '<span class="location-state-badge base">Modelo Base</span>';
    } else if (window.activeLocationId === 'outra') {
        badgeText = '<span class="location-state-badge base">Outra (Representação WYSIWYG)</span>';
    } else {
        const loc = (window.locations || []).find(l => l.id === window.activeLocationId);
        if (loc && loc.schema && Array.isArray(loc.schema)) {
            badgeText = '<span class="location-state-badge custom">Personalizada</span>';
        } else {
            badgeText = '<span class="location-state-badge inherited">Herda Base</span>';
        }
    }

    let tabsHtml = `
        <div class="builder-locations-bar">
            <button type="button" class="builder-location-tab ${window.activeLocationId === '__base__' || !window.activeLocationId ? 'active' : ''}" onclick="window.switchActiveLocation('__base__')">
                <span class="tab-icon">📋</span>
                <span class="tab-name">Modelo Base</span>
            </button>
    `;

    (window.locations || []).forEach(loc => {
        const isSelected = window.activeLocationId === loc.id;
        const isCustom = loc.schema && Array.isArray(loc.schema);
        tabsHtml += `
            <button type="button" class="builder-location-tab ${isSelected ? 'active' : ''} ${isCustom ? 'has-custom' : ''}" onclick="window.switchActiveLocation('${loc.id}')">
                <span class="tab-icon">${loc.icon || '🚑'}</span>
                <span class="tab-name">${loc.name}</span>
                ${isCustom ? '<span class="custom-dot" title="Possui alterações específicas"></span>' : ''}
            </button>
        `;
    });

    tabsHtml += `
            <button type="button" class="builder-location-tab ${window.activeLocationId === 'outra' ? 'active' : ''}" onclick="window.switchActiveLocation('outra')">
                <span class="tab-icon">📝</span>
                <span class="tab-name">Outra</span>
            </button>
        </div>
        <div class="builder-locations-status">${badgeText}</div>
    `;

    container.innerHTML = tabsHtml;
};

window.switchActiveLocation = function (locId) {
    if (window.activeLocationId === locId) return;

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
        if (targetLoc && targetLoc.schema && Array.isArray(targetLoc.schema)) {
            window.editorSchema = targetLoc.schema;
        } else {
            window.editorSchema = window.currentFormConfig.schema;
        }
    }

    window.renderCanvas();
    window.renderCanvasLocationsBar();
    window.renderSidebarLocations();
};

window.toggleUseLocations = function (checked) {
    window.useLocations = !!checked;
    window.currentFormConfig.useLocations = window.useLocations;

    if (!window.useLocations) {
        if (window.activeLocationId !== '__base__') {
            const currentLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
            if (currentLoc && currentLoc.schema) {
                currentLoc.schema = window.editorSchema;
            }
            window.activeLocationId = '__base__';
            window.editorSchema = window.currentFormConfig.schema;
            window.renderCanvas();
        }
    }

    const locControls = document.getElementById('location-controls');
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
        id: 'loc_' + Date.now(),
        name: `Viatura ${count}`,
        icon: '🚑'
    };
    window.locations.push(newLoc);
    window.renderSidebarLocations();
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.updateLocationName = function (locId, newName) {
    const loc = (window.locations || []).find(l => l.id === locId);
    if (!loc) return;
    loc.name = newName.trim() || 'Viatura';
    window.renderCanvasLocationsBar();
    window.saveDebounce();
};

window.updateLocationIcon = function (locId, newIcon) {
    const loc = (window.locations || []).find(l => l.id === locId);
    if (!loc) return;
    loc.icon = newIcon.trim() || '🚑';
    window.renderCanvasLocationsBar();
    window.saveDebounce();
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
    if (window.activeLocationId === locId) {
        window.editorSchema = loc.schema;
        window.renderCanvas();
        window.renderSidebarLocations();
        window.renderCanvasLocationsBar();
    } else {
        window.switchActiveLocation(locId);
    }
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
    const list = document.getElementById('locations-list');
    const chk = document.getElementById('use-locations-toggle');
    const controls = document.getElementById('location-controls');

    if (chk) chk.checked = !!window.useLocations;
    if (controls) controls.style.display = window.useLocations ? 'block' : 'none';
    if (!list) return;

    if (!window.locations || !window.locations.length) {
        list.innerHTML = '<p class="sidebar-empty-hint">Nenhuma viatura configurada.</p>';
        return;
    }

    let html = '';
    window.locations.forEach((loc, index) => {
        const isCustom = loc.schema && Array.isArray(loc.schema);
        html += `
            <div class="sidebar-loc-card" data-locid="${loc.id}">
                <div class="sidebar-loc-card-header">
                    <input type="text" class="sidebar-loc-icon" value="${loc.icon || '🚑'}" maxlength="4" onchange="window.updateLocationIcon('${loc.id}', this.value)" title="Ícone">
                    <input type="text" class="sidebar-loc-name" value="${loc.name}" onchange="window.updateLocationName('${loc.id}', this.value)" title="Nome da viatura">
                    <button type="button" class="sidebar-loc-btn icon-only" onclick="window.moveLocationUp(${index})" title="Mover para cima" ${index === 0 ? 'disabled' : ''}><i class="ph ph-arrow-up"></i></button>
                    <button type="button" class="sidebar-loc-btn icon-only" onclick="window.moveLocationDown(${index})" title="Mover para baixo" ${index === window.locations.length - 1 ? 'disabled' : ''}><i class="ph ph-arrow-down"></i></button>
                    <button type="button" class="sidebar-loc-btn icon-only danger" onclick="window.deleteLocation('${loc.id}')" title="Eliminar viatura"><i class="ph ph-trash"></i></button>
                </div>
                <div class="sidebar-loc-card-footer">
                    <span class="sidebar-loc-state ${isCustom ? 'custom' : 'base'}">${isCustom ? 'Personalizada' : 'Herda Base'}</span>
                    <div class="sidebar-loc-actions">
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

    // 1. Identificar e renderizar H0 separadamente conforme inventory_view.html
    const firstTitleIndex = schema.findIndex(b => ['title', 'title-h1', 'title-h2', 'title-h3'].includes(b.type));
    const firstTitleBlock = firstTitleIndex !== -1 ? schema[firstTitleIndex] : null;
    const titleText = firstTitleBlock ? (firstTitleBlock.content || firstTitleBlock.question || window.currentFormConfig.title || 'Check List - Material') : (window.currentFormConfig.title || 'Check List - Material');

    if (h0Container) {
        let h0ToolsHtml = '';
        let h0ImageHtml = '';
        let h0StyleAttr = '';
        let h0ClassAttr = 'builder-h0-input';

        if (firstTitleBlock) {
            const bColor = firstTitleBlock.blockColor || '';
            const bStyle = firstTitleBlock.blockStyle || 'full';
            const bSize = firstTitleBlock.blockSize || 'large';
            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
            const fontSize = sizeMap[bSize] || '33px';

            if (bColor) {
                const textColor = getContrastYIQ(bColor);
                if (bStyle === 'border') {
                    h0StyleAttr = `--marker-color: ${bColor}; font-size: ${fontSize}; color: #f8fafc;`;
                    h0ClassAttr = 'builder-h0-input style-marker';
                } else {
                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
                    h0StyleAttr = `background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; ${displayStyle}`;
                }
            } else {
                if (bStyle === 'border') {
                    h0StyleAttr = `--marker-color: #475569; font-size: ${fontSize}; color: #f8fafc;`;
                    h0ClassAttr = 'builder-h0-input style-marker';
                } else if (bStyle === 'inline') {
                    h0StyleAttr = `display: inline-block; width: fit-content; font-size: ${fontSize}; color: #f8fafc;`;
                } else {
                    h0StyleAttr = `font-size: ${fontSize}; color: #f8fafc;`;
                }
            }

            const isSticky = firstTitleBlock.isSticky !== false;
            h0ToolsHtml = `
                <div class="block-tools-inline" data-blockidx="${firstTitleIndex}">
                    <div class="tool-btn" onclick="window.toggleTitleStyle(${firstTitleIndex})" title="Alternar Estilo de Destaque"><i class="ph ph-arrows-out-line-horizontal"></i></div>
                    <div class="tool-btn" onclick="window.toggleTitleSize(${firstTitleIndex})" title="Alternar Tamanho"><i class="ph ph-text-aa"></i></div>
                    <div class="tool-btn ${isSticky ? 'active-pin' : ''}" onclick="window.toggleBlockSticky(${firstTitleIndex})" title="${isSticky ? 'Desafixar Cabeçalho' : 'Fixar Cabeçalho (Sticky)'}"><i class="ph ph-push-pin"></i></div>
                    <div class="tool-btn" onclick="window.openBlockFullPicker(event, ${firstTitleIndex})" title="Cor do Cabeçalho"><i class="ph ph-palette"></i></div>
                    <div class="tool-btn image-trigger" onclick="window.triggerBlockImage(event, ${firstTitleIndex})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
                    <div class="tool-btn settings-btn" onclick="window.openBlockSettings(event, ${firstTitleIndex})" title="Definições do Bloco"><i class="ph ph-gear"></i></div>
                </div>
            `;

            if (firstTitleBlock.image) {
                const inFlow = firstTitleBlock.imageInFlow === true;
                const zMode = firstTitleBlock.imageZ || 'front';
                const zIndexVal = zMode === 'back' ? 1 : 20;
                const imgW = (firstTitleBlock.imageWidth && Number.isFinite(Number(firstTitleBlock.imageWidth))) ? `${firstTitleBlock.imageWidth}px` : '200px';
                const imgH = (firstTitleBlock.imageHeight && Number.isFinite(Number(firstTitleBlock.imageHeight))) ? `${firstTitleBlock.imageHeight}px` : 'auto';
                const imgX = (firstTitleBlock.imageX && Number.isFinite(Number(firstTitleBlock.imageX))) ? `${firstTitleBlock.imageX}px` : '0px';
                const imgY = (firstTitleBlock.imageY && Number.isFinite(Number(firstTitleBlock.imageY))) ? `${firstTitleBlock.imageY}px` : '0px';

                const wrapperStyle = inFlow
                    ? `position: relative; margin: 12px 0; left: ${imgX}; top: ${imgY}; width: ${imgW}; height: ${imgH}; z-index: ${zIndexVal}; display: block;`
                    : `position: absolute; left: ${imgX}; top: ${imgY}; width: ${imgW}; height: ${imgH}; z-index: ${zIndexVal};`;

                h0ImageHtml = `
                    <div class="block-image-wrapper" id="image-wrapper-${firstTitleIndex}"
                        style="${wrapperStyle}"
                        onmousedown="window.startImageDrag(event, ${firstTitleIndex})">
                        <img src="${firstTitleBlock.image}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                        <div class="image-resize-handle" onmousedown="window.startImageResize(event, ${firstTitleIndex})"></div>
                        <div class="image-delete-btn" onclick="window.removeBlockImage(event, ${firstTitleIndex})" title="Eliminar imagem"><i class="ph ph-trash"></i></div>
                        <div class="image-flow-btn" onclick="window.toggleImageFlow(event, ${firstTitleIndex})" title="${inFlow ? 'Tornar Imagem Flutuante (Absolute)' : 'Integrar no Fluxo (Relative)'}"><i class="ph ${inFlow ? 'ph-anchor' : 'ph-arrows-out-cardinal'}"></i></div>
                        <div class="image-z-btn" onclick="window.toggleImageZ(event, ${firstTitleIndex})" title="${zMode === 'back' ? 'Enviar para a Frente' : 'Enviar para Trás'}"><i class="ph ${zMode === 'back' ? 'ph-stack' : 'ph-stack-simple'}"></i></div>
                    </div>
                `;
            }
        }

        h0Container.style.position = 'relative';
        h0Container.innerHTML = `
            ${h0ToolsHtml}
            <div class="${h0ClassAttr}" contenteditable="true" data-field="h0-title" placeholder="Título do Formulário" style="${h0StyleAttr}">${titleText}</div>
            ${h0ImageHtml}
        `;

        if (firstTitleBlock && firstTitleBlock.image) {
            window.adjustBlockHeightForImage(h0Container, firstTitleBlock);
        }

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
        if (index === firstTitleIndex) return;

        const activeIdx = activeBlocks.indexOf(block);
        const nextBlock = activeBlocks[activeIdx + 1];

        const isL1 = (['title', 'title-h1'].includes(block.type) && (block.blockSize === 'large' || !block.blockSize) && block.blockStyle !== 'inline');
        const isL2 = block.type !== 'counter' && (block.type === 'title-h2' || block.type === 'section' || (block.type === 'title' && (block.blockSize === 'medium' || block.blockStyle === 'inline')));
        const isCounter = block.type === 'counter';
        const isSectionLevelBlock = isL1 || isL2;
        const isFollowedBySection = nextBlock && (['section', 'title', 'title-h1', 'title-h2', 'title-h3'].includes(nextBlock.type));

        const naturalHeaderGap = '12px';
        let mb = '28px';
        let pb = '0px';

        if (isL1 && isL2) {
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
        const blockSize = block.blockSize || (block.type === 'title-h3' ? 'small' : (block.type === 'title-h2' || block.type === 'section' || isCounter ? 'medium' : 'large'));

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

        let imageHtml = '';
        if (block.image) {
            const inFlow = block.imageInFlow === true;
            const zMode = block.imageZ || 'front';
            const zIndexVal = zMode === 'back' ? 1 : 20;
            const imgW = (block.imageWidth && Number.isFinite(Number(block.imageWidth))) ? `${block.imageWidth}px` : '200px';
            const imgH = (block.imageHeight && Number.isFinite(Number(block.imageHeight))) ? `${block.imageHeight}px` : 'auto';
            const imgX = (block.imageX && Number.isFinite(Number(block.imageX))) ? `${block.imageX}px` : '0px';
            const imgY = (block.imageY && Number.isFinite(Number(block.imageY))) ? `${block.imageY}px` : '0px';

            const wrapperStyle = inFlow
                ? `position: relative; margin: 12px 0; left: ${imgX}; top: ${imgY}; width: ${imgW}; height: ${imgH}; z-index: ${zIndexVal}; display: block;`
                : `position: absolute; left: ${imgX}; top: ${imgY}; width: ${imgW}; height: ${imgH}; z-index: ${zIndexVal};`;

            imageHtml = `
                <div class="block-image-wrapper" id="image-wrapper-${index}"
                    style="${wrapperStyle}"
                    onmousedown="window.startImageDrag(event, ${index})">
                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                    <div class="image-resize-handle" onmousedown="window.startImageResize(event, ${index})"></div>
                    <div class="image-delete-btn" onclick="window.removeBlockImage(event, ${index})" title="Eliminar imagem"><i class="ph ph-trash"></i></div>
                    <div class="image-flow-btn" onclick="window.toggleImageFlow(event, ${index})" title="${inFlow ? 'Tornar Imagem Flutuante (Absolute)' : 'Integrar no Fluxo (Relative)'}"><i class="ph ${inFlow ? 'ph-anchor' : 'ph-arrows-out-cardinal'}"></i></div>
                    <div class="image-z-btn" onclick="window.toggleImageZ(event, ${index})" title="${zMode === 'back' ? 'Enviar para a Frente' : 'Enviar para Trás'}"><i class="ph ${zMode === 'back' ? 'ph-stack' : 'ph-stack-simple'}"></i></div>
                </div>
            `;
        }

        const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
        let bodyHtml = '';

        if (block.type === 'title' || block.type === 'section') {
            const fSize = sizeMap[blockSize] || (block.type === 'section' ? '25px' : '33px');
            const textColor = blockColor ? getContrastYIQ(blockColor) : '#f8fafc';
            let bgAttr = '';
            let classMarker = '';

            if (blockStyle === 'border') {
                classMarker = 'style-marker';
                bgAttr = `--marker-color: ${blockColor || '#475569'}; color: #f8fafc;`;
            } else if (blockStyle === 'inline') {
                bgAttr = blockColor ? `background-color: ${blockColor}; color: ${textColor}; padding: 4px 12px; display: inline-block; width: fit-content; border-radius: 6px;` : 'background: rgba(255,255,255,0.06); color: #f8fafc; padding: 4px 12px; display: inline-block; width: fit-content; border-radius: 6px;';
            } else {
                bgAttr = blockColor ? `background-color: ${blockColor}; color: ${textColor}; padding: 4px 12px; display: block; width: 100%; border-radius: 6px; box-sizing: border-box;` : 'background: rgba(255,255,255,0.06); color: #f8fafc; padding: 4px 12px; display: block; width: 100%; border-radius: 6px; box-sizing: border-box;';
            }
            const textVal = block.content || block.question || 'Título de Secção';

            bodyHtml = `
                <div class="block-section-heading ${classMarker}" contenteditable="true" data-field="${block.content !== undefined ? 'content' : 'question'}"
                    style="font-size: ${fSize}; font-weight: 700; ${bgAttr}">${textVal}</div>
            `;
        } else if (block.type === 'counter') {
            const fSize = sizeMap[blockSize] || '25px';
            const textColor = blockColor ? getContrastYIQ(blockColor) : '#ffffff';
            let bgAttr = '';
            let classMarker = '';

            if (blockStyle === 'border') {
                classMarker = 'style-marker';
                bgAttr = `--marker-color: ${blockColor || '#ef4444'}; color: #f8fafc; margin-bottom: 8px;`;
            } else if (blockStyle === 'inline') {
                bgAttr = blockColor ? `background-color: ${blockColor}; color: ${textColor}; padding: 4px 12px; display: inline-block; width: fit-content; border-radius: 6px; margin-bottom: 8px;` : 'background: rgba(239, 68, 68, 0.85); color: #ffffff; padding: 4px 12px; display: inline-block; width: fit-content; border-radius: 6px; margin-bottom: 8px;';
            } else {
                bgAttr = blockColor ? `background-color: ${blockColor}; color: ${textColor}; padding: 4px 12px; display: block; width: 100%; border-radius: 6px; box-sizing: border-box; margin-bottom: 8px;` : 'background: rgba(239, 68, 68, 0.85); color: #ffffff; padding: 4px 12px; display: block; width: 100%; border-radius: 6px; box-sizing: border-box; margin-bottom: 8px;';
            }
            const textVal = block.question || block.content || 'Novo Grupo de Contadores';

            bodyHtml = `
                <div class="block-counter-header ${classMarker}" contenteditable="true" data-field="question"
                    style="font-size: ${fSize}; font-weight: 700; ${bgAttr}">${textVal}</div>
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
        } else if (block.type === 'text-short') {
            bodyHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div class="block-question" contenteditable="true" data-field="question">${block.question || 'Pergunta de Texto Curto'}</div>
                    <button type="button" class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="window.toggleBlockRequired(${index})" title="${block.required ? 'Obrigatório' : 'Opcional'}">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
                <input type="text" class="fake-input" placeholder="${block.placeholder || 'Sua resposta curta...'}" disabled>
            `;
        } else if (block.type === 'text-long') {
            bodyHtml = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <div class="block-question" contenteditable="true" data-field="question">${block.question || 'Pergunta de Texto Longo'}</div>
                    <button type="button" class="required-star-btn ${block.required ? 'is-required' : ''}" onclick="window.toggleBlockRequired(${index})" title="${block.required ? 'Obrigatório' : 'Opcional'}">*</button>
                </div>
                ${block.hasDescription ? `<div class="block-desc" contenteditable="true" data-field="description">${block.description || 'Descrição opcional...'}</div>` : ''}
                <textarea class="fake-textarea" placeholder="${block.placeholder || 'Sua resposta detalhada...'}" rows="3" disabled></textarea>
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

    document.querySelectorAll('.canvas-block').forEach(blockEl => {
        const idx = parseInt(blockEl.getAttribute('data-blockidx'));
        const b = window.editorSchema[idx];
        if (b && b.image) {
            window.adjustBlockHeightForImage(blockEl, b);
        }
    });

    attachInlineTextHandlers();
    window.adjustPillWidths();
    window.fitAllPillText();
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
            <div class="pill-options-row" data-blockidx="${index}" data-rowidx="${rowIdx}" ondragover="window.handlePillRowDragOver(event)" ondrop="window.handlePillRowDrop(event)">
        `;

        row.forEach((opt, colIdx) => {
            const optText = (typeof opt === 'object' && opt !== null) ? (opt.text || '') : String(opt || '');
            const blockLevelColor = block.pillColor || block.blockColor || '';
            const optColor = (typeof opt === 'object' && opt !== null && opt.color) ? opt.color : blockLevelColor;
            const optTarget = (typeof opt === 'object' && opt !== null && opt.target !== undefined) ? opt.target : 0;
            const isDisabled = (typeof opt === 'object' && opt !== null && opt.disabled);

            let shellStyle = '';
            let nameInputStyle = '';
            if (isCounter) {
                if (optColor) {
                    nameInputStyle = `background-color: ${optColor}; color: ${getContrastYIQ(optColor)};`;
                }
            } else {
                if (optColor) {
                    shellStyle = `background-color: ${optColor}; color: ${getContrastYIQ(optColor)};`;
                }
            }

            const canManage = !isCounter && canManagePillVisibility(auth.currentUser) && ['choice-single', 'choice-multi'].includes(block.type);

            html += `
                <div class="pill-cell-wrapper ${isDisabled ? 'is-disabled' : ''}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}">
                    <div class="pill-visual-shell ${isDisabled ? 'pill-disabled' : ''}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="${shellStyle}">
                        <input type="text" class="pill-input pill-name-input" value="${optText}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="${nameInputStyle}">
                        ${isCounter ? `
                            <div class="pill-qt-zone" onclick="window.setPillTarget(event, ${index}, ${rowIdx}, ${colIdx})" title="Clique para definir quantidade alvo">
                                <span class="qt-label">QT</span>
                                <span class="qt-val">${optTarget}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="pill-editor-tools">
                        <div class="pill-drag-handle" title="Arrastar opção" draggable="true" ondragstart="window.handlePillDragStart(event, ${index}, ${rowIdx}, ${colIdx})" ondragend="window.handlePillDragEnd(event)"><i class="ph ph-dots-six-vertical"></i></div>
                        ${canManage ? `
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
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        el.oninput = () => {
            const blockEl = el.closest('.canvas-block');
            if (!blockEl) return;
            const index = parseInt(blockEl.dataset.blockidx);
            const block = window.editorSchema[index];
            if (!block) return;
            const field = el.dataset.field;
            if (field) {
                block[field] = el.innerText.trim();
                window.saveDebounce();
            }
        };
    });

    document.querySelectorAll('.pill-name-input').forEach(input => {
        input.oninput = () => {
            const bIdx = parseInt(input.dataset.blockidx);
            const rIdx = parseInt(input.dataset.rowidx);
            const cIdx = parseInt(input.dataset.colidx);
            const block = window.editorSchema[bIdx];
            if (!block || !block.options) return;
            const opt = block.options[rIdx][cIdx];
            if (typeof opt === 'object' && opt !== null) {
                opt.text = input.value;
            } else {
                block.options[rIdx][cIdx] = { text: input.value };
            }
            window.adjustPillWidths();
            window.fitAllPillText();
            window.checkAndSplitRows();
            window.saveDebounce();
        };
    });
}

// ==========================================================================
// 6. CONTROLOS DE CABEÇALHO, ESTILO, TAMANHO E STICKY (COUNTER = H3)
// ==========================================================================

window.toggleTitleStyle = function(index) {
    const block = window.editorSchema[index];
    if (!block) return;
    if (!block.blockStyle || block.blockStyle === 'full') {
        block.blockStyle = 'inline';
    } else if (block.blockStyle === 'inline') {
        block.blockStyle = 'border';
    } else {
        block.blockStyle = 'full';
    }
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleTitleSize = function(index) {
    const block = window.editorSchema[index];
    if (!block) return;
    const current = block.blockSize || (block.type === 'title-h3' ? 'small' : (block.type === 'title-h2' || block.type === 'section' || block.type === 'counter' ? 'medium' : 'large'));
    if (current === 'large') block.blockSize = 'medium';
    else if (current === 'medium') block.blockSize = 'small';
    else block.blockSize = 'large';
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleBlockSticky = function(index) {
    const block = window.editorSchema[index];
    if (!block) return;
    block.isSticky = (block.isSticky === false);
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleBlockRequired = function(index) {
    const block = window.editorSchema[index];
    if (!block) return;
    block.required = !block.required;
    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 7. SETTINGS POPOVER GATADO POR TIPO & ALINHAMENTO REAL
// ==========================================================================

window.openBlockSettings = function(event, index) {
    if (event) event.stopPropagation();
    activeSettingsBlockIdx = index;
    const block = window.editorSchema[index];
    if (!block) return;

    let popover = document.getElementById('block-settings-popover');
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'block-settings-popover';
        popover.className = 'block-settings-popover';
        document.body.appendChild(popover);
    }

    const isQuestion = ['choice-single', 'choice-multi', 'text-short', 'text-long', 'date', 'counter'].includes(block.type);
    const isChoice = ['choice-single', 'choice-multi'].includes(block.type);
    const isText = ['text-short', 'text-long'].includes(block.type);

    let html = `
        <div class="popover-header">
            <h4>Definições do Bloco (${block.type})</h4>
            <button type="button" class="close-btn" onclick="window.closeBlockSettings()"><i class="ph ph-x"></i></button>
        </div>
        <div class="popover-body">
    `;

    if (isQuestion) {
        html += `
            <div class="settings-row">
                <span class="settings-label">Obrigatório</span>
                <label class="switch">
                    <input type="checkbox" ${block.required ? 'checked' : ''} onchange="window.toggleSettingParam('required')">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">Descrição adicional</span>
                <label class="switch">
                    <input type="checkbox" ${block.hasDescription ? 'checked' : ''} onchange="window.toggleSettingParam('description')">
                    <span class="slider"></span>
                </label>
            </div>
        `;
    }

    if (isText) {
        html += `
            <div class="settings-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                <span class="settings-label">Texto de Ajuda / Placeholder</span>
                <input type="text" class="builder-input" style="width: 100%;" value="${block.placeholder || ''}" onchange="window.setBlockPlaceholder(this.value)">
            </div>
        `;
    }

    if (isChoice) {
        html += `
            <div class="settings-row">
                <span class="settings-label">Opção "Outra"</span>
                <label class="switch">
                    <input type="checkbox" ${block.hasOther ? 'checked' : ''} onchange="window.toggleSettingParam('other')">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">Ordem aleatória</span>
                <label class="switch">
                    <input type="checkbox" ${block.randomize ? 'checked' : ''} onchange="window.toggleSettingParam('randomize')">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">Múltipla escolha</span>
                <label class="switch">
                    <input type="checkbox" ${block.type === 'choice-multi' ? 'checked' : ''} onchange="window.toggleSettingParam('multi')">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">Cores nas opções</span>
                <label class="switch">
                    <input type="checkbox" ${block.hasColorCode ? 'checked' : ''} onchange="window.toggleSettingParam('color')">
                    <span class="slider"></span>
                </label>
            </div>
            ${block.hasColorCode ? `
                <div class="settings-row" style="margin-top: 4px; padding-left: 8px;">
                    <span class="settings-label" style="font-size: 11px;">Cor Padrão das Pílulas</span>
                    <input type="color" value="${block.pillColor || '#22c55e'}" onchange="window.setBlockPillColor(this.value)" style="width: 32px; height: 24px; border: none; cursor: pointer; background: transparent;">
                </div>
            ` : ''}
            <div class="settings-row" style="flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 6px;">
                <span class="settings-label">Alinhamento</span>
                <div class="align-buttons" style="display: flex; gap: 8px; width: 100%;">
                    <button type="button" class="builder-btn ${block.alignment === 'horizontal' ? 'primary' : ''}" style="flex: 1;" onclick="window.setBlockAlignment('horizontal')"><i class="ph ph-arrows-left-right"></i> Horizontal</button>
                    <button type="button" class="builder-btn ${block.alignment === 'vertical' ? 'primary' : ''}" style="flex: 1;" onclick="window.setBlockAlignment('vertical')"><i class="ph ph-arrows-down-up"></i> Vertical</button>
                </div>
            </div>
        `;
    }

    if (block.type === 'counter') {
        html += `
            <div class="settings-row">
                <span class="settings-label">Cores nas pílulas</span>
                <label class="switch">
                    <input type="checkbox" ${block.hasColorCode ? 'checked' : ''} onchange="window.toggleSettingParam('color')">
                    <span class="slider"></span>
                </label>
            </div>
            ${block.hasColorCode ? `
                <div class="settings-row" style="margin-top: 4px; padding-left: 8px;">
                    <span class="settings-label" style="font-size: 11px;">Cor Padrão das Pílulas</span>
                    <input type="color" value="${block.pillColor || '#ef4444'}" onchange="window.setBlockPillColor(this.value)" style="width: 32px; height: 24px; border: none; cursor: pointer; background: transparent;">
                </div>
            ` : ''}
        `;
    }

    html += `
        </div>
        <div class="popover-footer" style="display: flex; justify-content: space-between; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.08);">
            <button type="button" class="builder-btn danger" onclick="window.deleteActiveSettingsBlock()"><i class="ph ph-trash"></i> Eliminar</button>
            <button type="button" class="builder-btn" onclick="window.duplicateActiveSettingsBlock()"><i class="ph ph-copy"></i> Duplicar</button>
        </div>
    `;

    popover.innerHTML = html;
    popover.classList.remove('hidden');

    if (event && event.clientY) {
        const topPos = Math.min(window.innerHeight - 380, Math.max(80, event.clientY - 100));
        popover.style.top = topPos + 'px';
        popover.style.right = '420px';
    } else {
        popover.style.top = '100px';
        popover.style.right = '420px';
    }
};

window.closeBlockSettings = function() {
    const popover = document.getElementById('block-settings-popover');
    if (popover) popover.classList.add('hidden');
    activeSettingsBlockIdx = null;
};

window.toggleSettingParam = function(param) {
    if (activeSettingsBlockIdx === null) return;
    const block = window.editorSchema[activeSettingsBlockIdx];
    if (!block) return;

    if (param === 'required') {
        block.required = !block.required;
    } else if (param === 'description') {
        block.hasDescription = !block.hasDescription;
        if (block.hasDescription && !block.description) block.description = 'Descrição opcional...';
    } else if (param === 'other') {
        block.hasOther = !block.hasOther;
    } else if (param === 'randomize') {
        block.randomize = !block.randomize;
    } else if (param === 'multi') {
        block.type = (block.type === 'choice-single') ? 'choice-multi' : 'choice-single';
    } else if (param === 'color') {
        if (!block.hasColorCode) {
            block.hasColorCode = true;
            block.pillColor = block.pillColor || (block.type === 'counter' ? '#ef4444' : '#22c55e');
        } else {
            block.hasColorCode = false;
            delete block.pillColor;
        }
    }

    window.renderCanvas();
    window.saveDebounce();

    const popover = document.getElementById('block-settings-popover');
    if (popover && !popover.classList.contains('hidden')) {
        window.openBlockSettings(null, activeSettingsBlockIdx);
    }
};

window.setBlockPillColor = function(val) {
    if (activeSettingsBlockIdx === null) return;
    const block = window.editorSchema[activeSettingsBlockIdx];
    if (!block) return;
    block.pillColor = val;
    window.renderCanvas();
    window.saveDebounce();
};

window.setBlockPlaceholder = function(val) {
    if (activeSettingsBlockIdx === null) return;
    const block = window.editorSchema[activeSettingsBlockIdx];
    if (!block) return;
    block.placeholder = val;
    window.renderCanvas();
    window.saveDebounce();
};

window.setBlockAlignment = function(align) {
    if (activeSettingsBlockIdx === null) return;
    const block = window.editorSchema[activeSettingsBlockIdx];
    if (!block || !Array.isArray(block.options)) return;

    block.alignment = align;
    const raw = optionRows(block.options);
    const allOptions = raw.flat();

    if (align === 'horizontal') {
        block.options = [allOptions];
    } else if (align === 'vertical') {
        block.options = allOptions.map(opt => [opt]);
    }
    window.renderCanvas();
    window.saveDebounce();
};

window.deleteActiveSettingsBlock = function() {
    if (activeSettingsBlockIdx === null) return;
    window.deleteBlock(activeSettingsBlockIdx);
    window.closeBlockSettings();
};

window.duplicateActiveSettingsBlock = function() {
    if (activeSettingsBlockIdx === null) return;
    window.duplicateBlockDirect(activeSettingsBlockIdx);
    window.closeBlockSettings();
};

// ==========================================================================
// 8. PILL VISIBILITY HANDLER
// ==========================================================================

window.togglePillVisibility = function(e, blockIdx, rowIdx, colIdx) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!toggleOptionDisabled(window.editorSchema, blockIdx, rowIdx, colIdx, auth.currentUser)) {
        return;
    }
    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 9. PILL SIZING ENGINE (GLOBAL VS INDIVIDUAL, FIXED VS DYNAMIC)
// ==========================================================================

export function getPillConfig() {
    return window.currentFormConfig.pillSizing || {
        scope: 'global',
        type: 'dynamic',
        sharedWidth: 160,
        sharedHeight: 48,
        fontMode: 'dynamic',
        fontSize: 16,
        fontPreset: 'normal'
    };
}

window.adjustPillWidths = function () {
    const config = getPillConfig();
    const mode = config.scope || 'global';
    const sizingType = config.type || 'dynamic';
    const sharedWidth = config.sharedWidth || 160;
    const sharedHeight = config.sharedHeight || 48;

    const shells = document.querySelectorAll('.pill-visual-shell');

    shells.forEach(shell => {
        const bIdx = parseInt(shell.dataset.blockidx);
        const rIdx = parseInt(shell.dataset.rowidx);
        const cIdx = parseInt(shell.dataset.colidx);
        const block = window.editorSchema[bIdx];
        const opt = (block && block.options && block.options[rIdx]) ? block.options[rIdx][cIdx] : null;

        const h = (mode === 'individual' && opt && opt.height) ? opt.height : sharedHeight;
        shell.style.height = `${h}px`;
    });

    if (sizingType === 'fixed') {
        if (mode === 'global') {
            shells.forEach(shell => {
                shell.style.width = `${sharedWidth}px`;
            });
        } else {
            shells.forEach(shell => {
                const bIdx = parseInt(shell.dataset.blockidx);
                const rIdx = parseInt(shell.dataset.rowidx);
                const cIdx = parseInt(shell.dataset.colidx);
                const block = window.editorSchema[bIdx];
                const opt = (block && block.options && block.options[rIdx]) ? block.options[rIdx][cIdx] : null;
                const w = (opt && opt.width) ? opt.width : sharedWidth;
                shell.style.width = `${w}px`;
            });
        }
    } else {
        let dummy = document.getElementById('pill-width-tester');
        if (!dummy) {
            dummy = document.createElement('div');
            dummy.id = 'pill-width-tester';
            dummy.style.cssText = 'position:absolute; visibility:hidden; height:auto; width:auto; white-space:nowrap; font-family:inherit; font-weight:600;';
            document.body.appendChild(dummy);
        }

        if (mode === 'global') {
            let maxVal = 0;
            shells.forEach(shell => {
                const input = shell.querySelector('.pill-name-input');
                const text = input ? input.value : '';
                const hasQt = !!shell.querySelector('.pill-qt-zone');
                dummy.style.fontSize = input ? window.getComputedStyle(input).fontSize : '16px';
                dummy.innerText = text;
                const textWidth = dummy.offsetWidth;
                const extra = hasQt ? 74 : 32;
                const naturalWidth = textWidth + extra;
                if (naturalWidth > maxVal) maxVal = naturalWidth;
            });
            const finalWidth = Math.min(310, Math.max(120, maxVal));
            shells.forEach(shell => {
                shell.style.width = `${finalWidth}px`;
            });
        } else {
            shells.forEach(shell => {
                const input = shell.querySelector('.pill-name-input');
                const text = input ? input.value : '';
                const hasQt = !!shell.querySelector('.pill-qt-zone');
                dummy.style.fontSize = input ? window.getComputedStyle(input).fontSize : '16px';
                dummy.innerText = text;
                const textWidth = dummy.offsetWidth;
                const extra = hasQt ? 74 : 32;
                const finalWidth = Math.min(310, Math.max(120, textWidth + extra));
                shell.style.width = `${finalWidth}px`;
            });
        }
    }
};

// ==========================================================================
// 10. FONT ENGINE (STATIC VS DYNAMIC COM PASSOS DE 0.5PX)
// ==========================================================================

export function fitText(el, baseFontSize, fontMode) {
    if (!el) return;
    const parent = el.closest('.pill-visual-shell');
    if (!parent) return;

    if (fontMode === 'static') {
        el.style.fontSize = `${Math.min(24, Math.max(9, baseFontSize))}px`;
        return;
    }

    let size = Math.min(24, Math.max(9, baseFontSize));
    el.style.fontSize = `${size}px`;

    const hasQt = !!parent.querySelector('.pill-qt-zone');
    const availableWidth = parent.clientWidth - (hasQt ? 70 : 24);

    while (el.scrollWidth > availableWidth && size > 9) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
    }
}
window.fitText = fitText;

window.fitAllPillText = function () {
    const config = getPillConfig();
    const fontMode = config.fontMode || 'dynamic';
    const fontSize = config.fontSize || 16;

    document.querySelectorAll('.pill-name-input').forEach(input => {
        fitText(input, fontSize, fontMode);
    });
};

window.applyPillFontPreset = function (val) {
    const config = getPillConfig();
    const presetMap = {
        'compact': 14,
        'normal': 16,
        'large': 18,
        'maximum': 20
    };

    if (presetMap[val]) {
        config.fontPreset = val;
        config.fontSize = presetMap[val];
    } else {
        config.fontPreset = 'custom';
    }

    const slider = document.getElementById('pill-font-size-slider');
    const valSpan = document.getElementById('font-size-val');
    if (slider) slider.value = config.fontSize;
    if (valSpan) valSpan.textContent = `${config.fontSize}px`;

    window.currentFormConfig.pillSizing = config;
    window.fitAllPillText();
    window.adjustPillWidths();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.updatePillFontSize = function (val) {
    const config = getPillConfig();
    config.fontSize = parseFloat(val) || 16;
    config.fontPreset = 'custom';

    const sel = document.getElementById('pill-font-preset');
    if (sel) sel.value = 'custom';

    const valSpan = document.getElementById('font-size-val');
    if (valSpan) valSpan.textContent = `${config.fontSize}px`;

    window.currentFormConfig.pillSizing = config;
    window.fitAllPillText();
    window.adjustPillWidths();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.changeFontSizingMode = function (mode) {
    const config = getPillConfig();
    config.fontMode = mode;

    document.querySelectorAll('#tab-font-dynamic, #tab-font-static').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-font-${mode}`);
    if (activeBtn) activeBtn.classList.add('active');

    window.currentFormConfig.pillSizing = config;
    window.fitAllPillText();
    window.adjustPillWidths();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.changeSizingScope = function (scope) {
    const config = getPillConfig();
    config.scope = scope;

    document.querySelectorAll('#tab-scope-global, #tab-scope-individual').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-scope-${scope}`);
    if (activeBtn) activeBtn.classList.add('active');

    window.currentFormConfig.pillSizing = config;
    window.renderSidebarSettings();
    window.adjustPillWidths();
    window.fitAllPillText();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.changeSizingType = function (type) {
    const config = getPillConfig();
    config.type = type;

    document.querySelectorAll('#tab-type-dynamic, #tab-type-fixed').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-type-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    window.currentFormConfig.pillSizing = config;
    window.renderSidebarSettings();
    window.adjustPillWidths();
    window.fitAllPillText();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.updateGlobalWidth = function (val) {
    const config = getPillConfig();
    config.sharedWidth = parseInt(val) || 160;
    const valSpan = document.getElementById('global-width-val');
    if (valSpan) valSpan.textContent = `${config.sharedWidth}px`;

    window.currentFormConfig.pillSizing = config;
    window.adjustPillWidths();
    window.fitAllPillText();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.updateGlobalHeight = function (val) {
    const config = getPillConfig();
    config.sharedHeight = parseInt(val) || 48;
    const valSpan = document.getElementById('global-height-val');
    if (valSpan) valSpan.textContent = `${config.sharedHeight}px`;

    window.currentFormConfig.pillSizing = config;
    window.adjustPillWidths();
    window.fitAllPillText();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.updateIndividualWidth = function (bIdx, rIdx, cIdx, val) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options || !block.options[rIdx]) return;
    const opt = block.options[rIdx][cIdx];
    if (typeof opt === 'object' && opt !== null) {
        opt.width = parseInt(val) || 160;
    } else {
        block.options[rIdx][cIdx] = { text: String(opt || ''), width: parseInt(val) || 160 };
    }
    const valSpan = document.getElementById(`ind-w-val-${bIdx}-${rIdx}-${cIdx}`);
    if (valSpan) valSpan.textContent = `${val}px`;

    window.adjustPillWidths();
    window.fitAllPillText();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.updateIndividualHeight = function (bIdx, rIdx, cIdx, val) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options || !block.options[rIdx]) return;
    const opt = block.options[rIdx][cIdx];
    if (typeof opt === 'object' && opt !== null) {
        opt.height = parseInt(val) || 48;
    } else {
        block.options[rIdx][cIdx] = { text: String(opt || ''), height: parseInt(val) || 48 };
    }
    const valSpan = document.getElementById(`ind-h-val-${bIdx}-${rIdx}-${cIdx}`);
    if (valSpan) valSpan.textContent = `${val}px`;

    window.adjustPillWidths();
    window.fitAllPillText();
    window.checkAndSplitRows();
    window.saveDebounce();
};

window.resetPillSizingDefaults = function () {
    window.currentFormConfig.pillSizing = {
        scope: 'global',
        type: 'dynamic',
        sharedWidth: 160,
        sharedHeight: 48,
        fontMode: 'dynamic',
        fontSize: 16,
        fontPreset: 'normal'
    };

    window.syncSidebarInputs();
    window.renderSidebarSettings();
    window.renderCanvas();
    window.saveDebounce();
};

window.syncSidebarInputs = function () {
    const config = getPillConfig();

    document.querySelectorAll('#tab-scope-global, #tab-scope-individual').forEach(b => b.classList.remove('active'));
    const scopeBtn = document.getElementById(`tab-scope-${config.scope || 'global'}`);
    if (scopeBtn) scopeBtn.classList.add('active');

    document.querySelectorAll('#tab-type-dynamic, #tab-type-fixed').forEach(b => b.classList.remove('active'));
    const typeBtn = document.getElementById(`tab-type-${config.type || 'dynamic'}`);
    if (typeBtn) typeBtn.classList.add('active');

    document.querySelectorAll('#tab-font-dynamic, #tab-font-static').forEach(b => b.classList.remove('active'));
    const fontBtn = document.getElementById(`tab-font-${config.fontMode || 'dynamic'}`);
    if (fontBtn) fontBtn.classList.add('active');

    const wSlider = document.getElementById('global-width-slider');
    const wVal = document.getElementById('global-width-val');
    if (wSlider) wSlider.value = config.sharedWidth || 160;
    if (wVal) wVal.textContent = `${config.sharedWidth || 160}px`;

    const hSlider = document.getElementById('global-height-slider');
    const hVal = document.getElementById('global-height-val');
    if (hSlider) hSlider.value = config.sharedHeight || 48;
    if (hVal) hVal.textContent = `${config.sharedHeight || 48}px`;

    const fSlider = document.getElementById('pill-font-size-slider');
    const fVal = document.getElementById('font-size-val');
    if (fSlider) fSlider.value = config.fontSize || 16;
    if (fVal) fVal.textContent = `${config.fontSize || 16}px`;

    const fPreset = document.getElementById('pill-font-preset');
    if (fPreset) fPreset.value = config.fontPreset || 'normal';
};

window.renderSidebarSettings = function () {
    window.syncSidebarInputs();
    const config = getPillConfig();
    const indContainer = document.getElementById('individual-sliders-container');
    const indList = document.getElementById('individual-sliders-list');
    const globalControls = document.getElementById('global-sliders-container');

    if (!indContainer || !indList) return;

    if (config.scope === 'individual' && config.type === 'fixed') {
        indContainer.style.display = 'block';
        if (globalControls) globalControls.style.display = 'none';

        let html = '';
        (window.editorSchema || []).forEach((block, bIdx) => {
            if (!block.options || !['choice-single', 'choice-multi', 'counter'].includes(block.type)) return;
            const rows = optionRows(block.options);
            rows.forEach((row, rIdx) => {
                row.forEach((opt, cIdx) => {
                    const text = (typeof opt === 'object' && opt !== null) ? (opt.text || `Item ${cIdx + 1}`) : String(opt || `Item ${cIdx + 1}`);
                    const w = (typeof opt === 'object' && opt !== null && opt.width) ? opt.width : (config.sharedWidth || 160);
                    const h = (typeof opt === 'object' && opt !== null && opt.height) ? opt.height : (config.sharedHeight || 48);

                    html += `
                        <div class="individual-pill-card">
                            <div class="individual-pill-card-title">${text}</div>
                            <div class="individual-control-row">
                                <span>Largura:</span>
                                <input type="range" min="120" max="310" value="${w}" oninput="window.updateIndividualWidth(${bIdx}, ${rIdx}, ${cIdx}, this.value)">
                                <span class="val" id="ind-w-val-${bIdx}-${rIdx}-${cIdx}">${w}px</span>
                            </div>
                            <div class="individual-control-row">
                                <span>Altura:</span>
                                <input type="range" min="36" max="80" value="${h}" oninput="window.updateIndividualHeight(${bIdx}, ${rIdx}, ${cIdx}, this.value)">
                                <span class="val" id="ind-h-val-${bIdx}-${rIdx}-${cIdx}">${h}px</span>
                            </div>
                        </div>
                    `;
                });
            });
        });

        indList.innerHTML = html || '<p class="sidebar-empty-hint">Nenhum item encontrado.</p>';
    } else {
        indContainer.style.display = 'none';
        if (globalControls) globalControls.style.display = 'block';
    }
};

// ==========================================================================
// 11. MOTOR DE ROWS (CHECK AND SPLIT ROWS SEM SUBTRAÇÃO DE 84PX)
// ==========================================================================

window.checkAndSplitRows = function () {
    const containers = document.querySelectorAll('.pill-options-container');

    containers.forEach(container => {
        const bIdx = parseInt(container.dataset.blockidx);
        const block = window.editorSchema[bIdx];
        if (!block || !Array.isArray(block.options)) return;

        const maxContainerWidth = container.clientWidth - 40;
        if (maxContainerWidth <= 150) return;

        let modified = false;
        const newRows = [];

        block.options.forEach(row => {
            let currentRow = [];
            let currentWidth = 0;

            row.forEach(opt => {
                const config = getPillConfig();
                let pillW = config.sharedWidth || 160;
                if (typeof opt === 'object' && opt !== null && opt.width) {
                    pillW = opt.width;
                }
                const totalItemW = pillW + 12;

                if (currentRow.length > 0 && (currentWidth + totalItemW) > maxContainerWidth) {
                    newRows.push(currentRow);
                    currentRow = [opt];
                    currentWidth = totalItemW;
                    modified = true;
                } else {
                    currentRow.push(opt);
                    currentWidth += totalItemW;
                }
            });

            if (currentRow.length > 0) {
                newRows.push(currentRow);
            }
        });

        if (modified) {
            block.options = newRows;
            window.renderCanvas();
        }
    });
};

// ==========================================================================
// 12. DRAG AND DROP (PILLS E ROWS COM AJUSTE DE ÍNDICE)
// ==========================================================================

window.handlePillDragStart = function (e, bIdx, rIdx, cIdx) {
    e.stopPropagation();
    draggedPill = { blockIdx: bIdx, rowIdx: rIdx, colIdx: cIdx };
    e.dataTransfer.effectAllowed = 'move';
    const cell = e.currentTarget.closest('.pill-cell-wrapper');
    if (cell) cell.style.opacity = '0.4';
};

window.handlePillRowDragOver = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const cell = e.target.closest('.pill-cell-wrapper');
    if (!cell) return;

    const rect = cell.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRight = x > (rect.width / 2);

    document.querySelectorAll('.pill-cell-wrapper').forEach(c => c.classList.remove('drop-left', 'drop-right'));
    if (isRight) {
        cell.classList.add('drop-right');
        currentDropZone = 'right';
    } else {
        cell.classList.add('drop-left');
        currentDropZone = 'left';
    }
    currentDropTarget = cell;
};

window.handlePillRowDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();

    const targetEl = currentDropTarget;
    const action = currentDropZone;

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
        const block = window.editorSchema[tBlockIdx];
        const options = block.options;
        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

        // 1. Remove from original position
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

        // 3. Insert according to action
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
    if (target) {
        target.classList.remove('drag-over');
    }

    if (!draggedPill) return;

    const tBlockIdx = blockIdx !== undefined ? blockIdx : parseInt(target.dataset.blockidx);

    if (draggedPill.blockIdx === tBlockIdx) {
        const block = window.editorSchema[draggedPill.blockIdx];
        const options = block.options;
        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];

        // 1. Remove from original position
        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
        let adjustedTargetRow = targetRowIdx !== undefined ? targetRowIdx : options.length;

        // 2. Se a row de origem ficou vazia, remover a row e decrementar adjustedTargetRow se a origem estava antes do destino
        if (options[draggedPill.rowIdx].length === 0) {
            options.splice(draggedPill.rowIdx, 1);
            if (draggedPill.rowIdx < adjustedTargetRow) adjustedTargetRow--;
        }

        // 3. Inserir como nova row no índice ajustado
        adjustedTargetRow = Math.max(0, Math.min(adjustedTargetRow, options.length));
        options.splice(adjustedTargetRow, 0, [draggedItem]);

        window.renderCanvas();
        window.saveDebounce();
    }
    draggedPill = null;
};

window.handlePillDragEnd = function (e) {
    document.querySelectorAll('.pill-cell-wrapper').forEach(c => {
        c.style.opacity = '1';
        c.classList.remove('drop-left', 'drop-right');
    });
    draggedPill = null;
    currentDropTarget = null;
    currentDropZone = null;
};

// ==========================================================================
// 13. BLOCK DRAG (MIDPOINT VERTICAL COM DROP INDICATORS)
// ==========================================================================

window.handleBlockDragStart = function(e, index) {
    window.draggedBlockIdx = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    const blockEl = document.getElementById(`block-${index}`);
    if (blockEl) blockEl.classList.add('dragging');
};

window.handleBlockDragOver = function(e, index) {
    e.preventDefault();
    e.stopPropagation();
    if (window.draggedBlockIdx === null || window.draggedBlockIdx === undefined) return;
    e.dataTransfer.dropEffect = 'move';

    const blockEl = document.getElementById(`block-${index}`);
    if (!blockEl) return;

    const rect = blockEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isBelow = e.clientY > midY;

    document.querySelectorAll('.canvas-block').forEach(el => {
        if (el !== blockEl) el.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
    });

    if (isBelow) {
        blockEl.classList.remove('drop-indicator-top');
        blockEl.classList.add('drop-indicator-bottom');
        window.draggedBlockPosition = 'bottom';
    } else {
        blockEl.classList.remove('drop-indicator-bottom');
        blockEl.classList.add('drop-indicator-top');
        window.draggedBlockPosition = 'top';
    }
};

window.handleBlockDragLeave = function(e) {
    const blockEl = e.currentTarget;
    if (blockEl) {
        blockEl.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
    }
};

window.handleBlockDrop = function(e, targetIndex) {
    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll('.canvas-block').forEach(el => {
        el.classList.remove('drop-indicator-top', 'drop-indicator-bottom', 'dragging');
    });

    const fromIdx = window.draggedBlockIdx;
    if (fromIdx === null || fromIdx === undefined || fromIdx === targetIndex) {
        window.draggedBlockIdx = null;
        window.draggedBlockPosition = null;
        return;
    }

    const position = window.draggedBlockPosition || 'top';

    // 1. Remove from original position
    const item = window.editorSchema.splice(fromIdx, 1)[0];

    // 2. Adjust target index
    let insertIdx = targetIndex;
    if (fromIdx < targetIndex) {
        insertIdx--;
    }
    if (position === 'bottom') {
        insertIdx++;
    }

    insertIdx = Math.max(0, Math.min(insertIdx, window.editorSchema.length));
    window.editorSchema.splice(insertIdx, 0, item);

    window.draggedBlockIdx = null;
    window.draggedBlockPosition = null;

    window.renderCanvas();
    window.saveDebounce();
};

window.handleBlockDragEnd = function(e) {
    document.querySelectorAll('.canvas-block').forEach(el => {
        el.classList.remove('drop-indicator-top', 'drop-indicator-bottom', 'dragging');
    });
    window.draggedBlockIdx = null;
    window.draggedBlockPosition = null;
};

// ==========================================================================
// 14. OPERAÇÕES COM BLOCOS (INSERT, DUPLICATE, DELETE)
// ==========================================================================

window.insertBlock = function (type, targetIdx) {
    const slashMenu = document.getElementById('slash-menu');
    if (slashMenu) slashMenu.classList.add('hidden');

    let actualType = type;
    let blockSize = 'large';
    let initialContent = '';
    let initialQuestion = '';

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
        blockSize = 'medium';
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

    if (targetIdx !== undefined && targetIdx !== null && targetIdx >= 0) {
        window.editorSchema.splice(targetIdx + 1, 0, newBlock);
    } else {
        window.editorSchema.push(newBlock);
    }

    window.renderCanvas();
    window.saveDebounce();
};

window.duplicateBlockDirect = function (index) {
    const block = window.editorSchema[index];
    if (!block) return;
    const cloned = JSON.parse(JSON.stringify(block));
    window.editorSchema.splice(index + 1, 0, cloned);
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
// 15. GESTÃO DE ITENS / OPÇÕES DENTRO DE BLOCOS
// ==========================================================================

window.addOptionToRow = function (bIdx, rIdx) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options) return;
    const isCounter = block.type === 'counter';
    const count = (block.options[rIdx] || []).length + 1;
    const newItem = isCounter ? { text: `Item ${count}`, target: 0 } : { text: `Opção ${count}` };
    block.options[rIdx].push(newItem);
    window.renderCanvas();
    window.saveDebounce();
};

window.addOption = function (bIdx) {
    const block = window.editorSchema[bIdx];
    if (!block) return;
    if (!Array.isArray(block.options)) block.options = [];
    const isCounter = block.type === 'counter';
    const newItem = isCounter ? { text: 'Novo Item', target: 0 } : { text: 'Nova Opção' };
    block.options.push([newItem]);
    window.renderCanvas();
    window.saveDebounce();
};

window.duplicateOption = function (bIdx, rIdx, cIdx) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options) return;
    const opt = block.options[rIdx][cIdx];
    const cloned = JSON.parse(JSON.stringify(opt));
    block.options[rIdx].splice(cIdx + 1, 0, cloned);
    window.renderCanvas();
    window.saveDebounce();
};

window.removeOption = function (bIdx, rIdx, cIdx) {
    const block = window.editorSchema[bIdx];
    if (!block || !block.options) return;
    block.options[rIdx].splice(cIdx, 1);
    if (block.options[rIdx].length === 0) {
        block.options.splice(rIdx, 1);
    }
    window.renderCanvas();
    window.saveDebounce();
};

window.setPillTarget = function (e, bIdx, rIdx, cIdx) {
    e.stopPropagation();
    const block = window.editorSchema[bIdx];
    if (!block || !block.options) return;
    const opt = block.options[rIdx][cIdx];
    const currentTarget = (typeof opt === 'object' && opt !== null && opt.target !== undefined) ? opt.target : 0;
    const val = prompt("Defina a quantidade alvo (QT) para este item:", currentTarget);
    if (val === null) return;
    const parsed = parseInt(val) || 0;

    if (typeof opt === 'object' && opt !== null) {
        opt.target = parsed;
    } else {
        block.options[rIdx][cIdx] = { text: String(opt || ''), target: parsed };
    }
    window.renderCanvas();
    window.saveDebounce();
};

// ==========================================================================
// 16. IMAGENS NOS BLOCOS (DRAG, DROP, PASTE, RESIZE, FLOW, Z-INDEX)
// ==========================================================================

let activeImageBlockIdx = null;

function createImageModalHtml() {
    let modal = document.getElementById('image-upload-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'image-upload-modal';
    modal.className = 'builder-modal-overlay hidden';
    modal.innerHTML = `
        <div class="builder-modal-card" style="max-width: 480px;">
            <div class="builder-modal-header">
                <h3>Inserir Imagem no Bloco</h3>
                <button type="button" class="builder-modal-close" onclick="window.closeImageModal()"><i class="ph ph-x"></i></button>
            </div>
            <div class="builder-modal-body">
                <div class="image-drop-zone" id="image-drop-zone" onclick="document.getElementById('image-file-input').click()">
                    <i class="ph ph-cloud-arrow-up" style="font-size: 40px; color: #38bdf8; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-weight: 600; color: #f8fafc;">Clique ou arraste um ficheiro de imagem</p>
                    <span style="font-size: 12px; color: #64748b;">PNG, JPG, WebP ou GIF (ou cole com Ctrl+V)</span>
                    <input type="file" id="image-file-input" accept="image/*" style="display: none;">
                </div>

                <div style="display: flex; align-items: center; gap: 12px; margin: 16px 0;">
                    <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">Ou via Link / URL</span>
                    <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="url" id="image-url-input" class="builder-input" placeholder="https://exemplo.com/imagem.png">
                    <button type="button" class="builder-btn primary" onclick="window.applyImageUrl()" style="align-self: flex-end;"><i class="ph ph-check"></i> Aplicar Link</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const dropZone = document.getElementById('image-drop-zone');
    dropZone.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drag-over'); };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            window.processImageFile(file);
        }
    };

    const fileInput = document.getElementById('image-file-input');
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) window.processImageFile(file);
    };

    modal.onpaste = (e) => {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) window.processImageFile(file);
            }
        }
    };

    return modal;
}

window.triggerBlockImage = function (e, index) {
    if (e) e.stopPropagation();
    activeImageBlockIdx = index;
    const modal = createImageModalHtml();
    modal.classList.remove('hidden');
};

window.closeImageModal = function () {
    const modal = document.getElementById('image-upload-modal');
    if (modal) modal.classList.add('hidden');
    activeImageBlockIdx = null;
};

window.applyImageUrl = function () {
    const input = document.getElementById('image-url-input');
    if (!input || !input.value.trim() || activeImageBlockIdx === null) return;
    const block = window.editorSchema[activeImageBlockIdx];
    if (!block) return;
    block.image = input.value.trim();
    block.imageWidth = block.imageWidth || 200;
    block.imageHeight = block.imageHeight || 150;
    block.imageX = block.imageX || 0;
    block.imageY = block.imageY || 0;
    block.imageInFlow = false;
    block.imageZ = 'front';
    input.value = '';
    window.closeImageModal();
    window.renderCanvas();
    window.saveDebounce();
};

window.processImageFile = async function (file) {
    if (!file || activeImageBlockIdx === null) return;
    const block = window.editorSchema[activeImageBlockIdx];
    if (!block) return;

    try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: { 'Authorization': 'Client-ID 546c25a59c58ad7' },
            body: formData
        });
        const data = await res.json();
        if (data.success && data.data && data.data.link) {
            block.image = data.data.link;
            block.imageWidth = 200;
            block.imageHeight = 150;
            block.imageX = 0;
            block.imageY = 0;
            block.imageInFlow = false;
            block.imageZ = 'front';
            window.closeImageModal();
            window.renderCanvas();
            window.saveDebounce();
        } else {
            throw new Error(data.data?.error || "Falha no upload");
        }
    } catch (e) {
        console.error("Erro no upload de imagem:", e);
        alert("Não foi possível carregar a imagem: " + e.message);
    }
};

window.removeBlockImage = function (e, index) {
    if (e) e.stopPropagation();
    const block = window.editorSchema[index];
    if (!block) return;
    delete block.image;
    delete block.imageWidth;
    delete block.imageHeight;
    delete block.imageX;
    delete block.imageY;
    delete block.imageInFlow;
    delete block.imageZ;
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleImageFlow = function(e, index) {
    if (e) e.stopPropagation();
    const block = window.editorSchema[index];
    if (!block) return;
    block.imageInFlow = !block.imageInFlow;
    window.renderCanvas();
    window.saveDebounce();
};

window.toggleImageZ = function(e, index) {
    if (e) e.stopPropagation();
    const block = window.editorSchema[index];
    if (!block) return;
    block.imageZ = (block.imageZ === 'back') ? 'front' : 'back';
    window.renderCanvas();
    window.saveDebounce();
};

window.adjustBlockHeightForImage = function (blockEl, block) {
    if (!blockEl) return;
    if (!block || !block.image || block.imageInFlow) {
        blockEl.style.minHeight = '';
        return;
    }
    const y = parseInt(block.imageY) || 0;
    const h = parseInt(block.imageHeight) || 150;
    const bottom = y + h;
    blockEl.style.minHeight = Math.max(50, bottom + 16) + 'px';
};

window.startImageDrag = function (e, index) {
    if (e.button !== 0 || e.target.classList.contains('image-resize-handle') || e.target.closest('.image-delete-btn') || e.target.closest('.image-flow-btn') || e.target.closest('.image-z-btn')) return;

    e.preventDefault();
    e.stopPropagation();

    const block = window.editorSchema[index];
    const wrapper = document.getElementById(`image-wrapper-${index}`);
    if (!wrapper || !block) return;
    const blockEl = wrapper.closest('.canvas-block') || wrapper.closest('#builder-h0-container');

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = parseInt(block.imageX) || 0;
    const startTop = parseInt(block.imageY) || 0;

    function onMouseMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newLeft = Math.max(-50, Math.min(startLeft + dx, 800));
        let newTop = Math.max(-20, Math.min(startTop + dy, 600));

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
    if (!wrapper || !block) return;
    const blockEl = wrapper.closest('.canvas-block') || wrapper.closest('#builder-h0-container');

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

// ==========================================================================
// 17. GESTÃO DA CAPA (STRING URL EXCLUSIVA)
// ==========================================================================

export function renderCoverImage() {
    const container = document.getElementById('builder-cover-container');
    if (!container) return;

    let coverUrl = '';
    if (window.currentFormConfig.theme && window.currentFormConfig.theme.coverImage) {
        if (typeof window.currentFormConfig.theme.coverImage === 'string') {
            coverUrl = window.currentFormConfig.theme.coverImage;
        } else if (typeof window.currentFormConfig.theme.coverImage === 'object' && window.currentFormConfig.theme.coverImage.url) {
            coverUrl = window.currentFormConfig.theme.coverImage.url;
        }
    }

    if (!coverUrl) {
        container.innerHTML = `
            <div class="builder-cover-placeholder" onclick="document.getElementById('cover-file-input').click()">
                <i class="ph ph-image"></i>
                <span>Adicionar Imagem de Capa</span>
            </div>
            <input type="file" id="cover-file-input" accept="image/*" style="display: none;">
        `;
    } else {
        container.innerHTML = `
            <div class="builder-cover-display" style="background-image: url('${coverUrl}')">
                <div class="cover-overlay-controls">
                    <button type="button" class="cover-btn" onclick="document.getElementById('cover-file-input').click()"><i class="ph ph-pencil-simple"></i> Alterar Capa</button>
                    <button type="button" class="cover-btn danger" onclick="window.removeCoverImage()"><i class="ph ph-trash"></i> Remover</button>
                </div>
            </div>
            <input type="file" id="cover-file-input" accept="image/*" style="display: none;">
        `;
    }

    const fileInput = document.getElementById('cover-file-input');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) processCoverFile(file);
        };
    }
}

async function processCoverFile(file) {
    if (!file) return;
    try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: { 'Authorization': 'Client-ID 546c25a59c58ad7' },
            body: formData
        });
        const data = await res.json();
        if (data.success && data.data && data.data.link) {
            if (!window.currentFormConfig.theme) window.currentFormConfig.theme = {};
            window.currentFormConfig.theme.coverImage = data.data.link;
            renderCoverImage();
            window.saveDebounce();
        } else {
            throw new Error(data.data?.error || "Falha no upload");
        }
    } catch (e) {
        console.error("Erro no upload de capa:", e);
        alert("Não foi possível carregar a imagem de capa: " + e.message);
    }
}

window.removeCoverImage = function () {
    if (!window.currentFormConfig.theme) return;
    delete window.currentFormConfig.theme.coverImage;
    renderCoverImage();
    window.saveDebounce();
};

// ==========================================================================
// 18. PREVIEW ROBUSTO (PRÉ-POPULAÇÃO DE LOCALSTORAGE)
// ==========================================================================

export function openPreview() {
    if (!window.currentFormId) return;

    const previewSchema = (window.editorSchema || []).map(block => {
        const b = { ...block };
        if (typeof b.options === 'string') {
            try { b.options = JSON.parse(b.options); } catch (e) { b.options = []; }
        }
        return b;
    });

    localStorage.setItem('lp_preview_schema', JSON.stringify(previewSchema));
    localStorage.setItem('lp_preview_config', JSON.stringify({
        theme: window.currentFormConfig.theme || {},
        showReplenishment: window.currentFormConfig.showReplenishment !== false,
        showMainTitle: window.currentFormConfig.showMainTitle !== false,
        replenishmentTitle: window.currentFormConfig.replenishmentTitle || 'Itens para Reposição'
    }));

    window.open(`inventory_view.html?id=${window.currentFormId}&preview=true`, '_blank');
}
window.openPreview = openPreview;

// ==========================================================================
// 19. COLOR PICKERS GLOBAIS
// ==========================================================================

let activePickerTarget = null;

window.openBlockFullPicker = function(event, index) {
    if (event) event.stopPropagation();
    activePickerTarget = { type: 'block', index };
    showColorPopover(event);
};

window.openColorPicker = function(event, type, bIdx, rIdx, cIdx) {
    if (event) event.stopPropagation();
    activePickerTarget = { type, bIdx, rIdx, cIdx };
    showColorPopover(event);
};

function showColorPopover(event) {
    let popover = document.getElementById('color-picker-popover');
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'color-picker-popover';
        popover.className = 'color-picker-popover';
        document.body.appendChild(popover);
    }

    let html = '<div class="color-presets-grid">';
    PRESET_COLORS.forEach(c => {
        html += `<div class="color-swatch" style="background-color: ${c};" onclick="window.applyChosenColor('${c}')"></div>`;
    });
    html += `
        </div>
        <div class="color-picker-custom">
            <input type="color" id="custom-color-input" onchange="window.applyChosenColor(this.value)">
            <button type="button" class="builder-btn danger small" onclick="window.applyChosenColor(null)"><i class="ph ph-prohibit"></i> Sem Cor</button>
        </div>
    `;

    popover.innerHTML = html;
    popover.classList.remove('hidden');

    if (event && event.clientY) {
        const topPos = Math.min(window.innerHeight - 200, Math.max(80, event.clientY - 40));
        popover.style.top = topPos + 'px';
        popover.style.left = (event.clientX + 10) + 'px';
    }
}

window.applyChosenColor = function(color) {
    if (!activePickerTarget) return;

    if (activePickerTarget.type === 'block') {
        const block = window.editorSchema[activePickerTarget.index];
        if (block) {
            block.blockColor = color;
        }
    } else if (activePickerTarget.type === 'pill') {
        const { bIdx, rIdx, cIdx } = activePickerTarget;
        const block = window.editorSchema[bIdx];
        if (block && block.options && block.options[rIdx]) {
            const opt = block.options[rIdx][cIdx];
            if (typeof opt === 'object' && opt !== null) {
                if (color) opt.color = color;
                else delete opt.color;
            } else {
                block.options[rIdx][cIdx] = { text: String(opt || ''), color: color || undefined };
            }
        }
    }

    const popover = document.getElementById('color-picker-popover');
    if (popover) popover.classList.add('hidden');
    activePickerTarget = null;

    window.renderCanvas();
    window.saveDebounce();
};

window.openSlashMenu = function(event, targetIdx) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('slash-menu');
    if (!menu) return;

    menu.classList.remove('hidden');
    menu.setAttribute('data-targetidx', targetIdx !== undefined ? targetIdx : '');

    if (event && event.clientY) {
        const topPos = Math.min(window.innerHeight - 300, Math.max(80, event.clientY + 10));
        menu.style.top = topPos + 'px';
        menu.style.left = (event.clientX - 60) + 'px';
    }
};

window.toggleSettingsSidebar = function() {
    const sidebar = document.getElementById('settings-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('active');
};

// ==========================================================================
// 20. INICIALIZAÇÃO DO BUILDER AO CARREGAR DOCUMENTO
// ==========================================================================

async function initInventoryBuilder() {
    const urlParams = new URLSearchParams(window.location.search);
    window.currentFormId = urlParams.get('id') || '9LtmhbAdkb9ZcCEX6TEv';

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                await signInAnonymously(auth);
            } catch (e) {
                console.error("Erro na autenticação anónima:", e);
            }
        }

        try {
            const snap = await getDoc(doc(db, "forms", window.currentFormId));
            if (!snap.exists()) {
                alert("Formulário não encontrado no Firestore!");
                return;
            }
            const data = snap.data();
            window.currentFormConfig = data;

            let schema = data.schema || [];
            if (typeof schema === 'string') {
                try { schema = JSON.parse(schema); } catch (e) { schema = []; }
            }
            schema.forEach(block => {
                if (typeof block.options === 'string') {
                    try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
                }
                block.options = optionRows(block.options || []);
            });
            window.currentFormConfig.schema = schema;

            window.useLocations = !!data.useLocations;
            window.locations = Array.isArray(data.locations) ? data.locations : [];
            window.currentFormConfig.useLocations = window.useLocations;
            window.currentFormConfig.locations = window.locations;

            window.locations.forEach(loc => {
                if (loc.schema) {
                    if (typeof loc.schema === 'string') {
                        try { loc.schema = JSON.parse(loc.schema); } catch (e) { loc.schema = []; }
                    }
                    loc.schema.forEach(block => {
                        if (typeof block.options === 'string') {
                            try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
                        }
                        block.options = optionRows(block.options || []);
                    });
                }
            });

            window.activeLocationId = '__base__';
            window.editorSchema = window.currentFormConfig.schema;

            renderCoverImage();
            window.renderSidebarLocations();
            window.renderCanvasLocationsBar();
            window.renderSidebarSettings();
            window.renderCanvas();

            const navTitle = document.querySelector('.nav-title');
            if (navTitle) navTitle.textContent = data.title || 'Check List - Material';

        } catch (err) {
            console.error("Erro ao carregar dados do formulário:", err);
            alert("Erro ao carregar formulário: " + err.message);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#slash-menu') && !e.target.closest('.ph-plus')) {
            const sm = document.getElementById('slash-menu');
            if (sm) sm.classList.add('hidden');
        }
        if (!e.target.closest('#block-settings-popover') && !e.target.closest('.settings-btn')) {
            window.closeBlockSettings();
        }
        if (!e.target.closest('#color-picker-popover') && !e.target.closest('.ph-palette')) {
            const cp = document.getElementById('color-picker-popover');
            if (cp) cp.classList.add('hidden');
        }
    });

    window.addEventListener('resize', () => {
        window.adjustPillWidths();
        window.fitAllPillText();
        window.checkAndSplitRows();
    });
}

document.addEventListener('DOMContentLoaded', initInventoryBuilder);

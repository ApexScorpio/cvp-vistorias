# DIFF REPORT — INVENTORY BUILDER REBUILD
Data: 2026-09-11 18:05:00
Ficheiros Modificados:
- inventario.html
- inventario.js
- inventory-pills.css

```diff
diff --git a/inventario.html b/inventario.html
index 9d9894e..5cb7815 100644
--- a/inventario.html
+++ b/inventario.html
@@ -17,6 +17,8 @@
     <link rel="stylesheet" href="style.css?v=1781536000">
     <link rel="stylesheet" href="editor.css?v=1788725166887">
     <link rel="stylesheet" href="inventory-pills.css?v=1788725166887">
+
+
 </head>
 
 <body class="lp-editor-mode inventory-mode">
@@ -53,6 +55,19 @@
     <main class="editor-canvas" id="editor-canvas">
         <div class="editor-page">
 
+            <!-- Canvas Locations Header Bar (when useLocations is active) -->
+            <div id="builder-locations-container" class="builder-locations-container" style="display: none;">
+                <div class="active-schema-banner" id="active-schema-banner">
+                    <span style="display: flex; align-items: center; gap: 6px;"><i class="ph ph-git-branch" style="color: #38bdf8; font-size: 16px;"></i> Estrutura em edição:</span>
+                    <strong id="active-schema-title">Modelo Base</strong>
+                    <span id="active-schema-badge" class="active-schema-badge">Padrão</span>
+                </div>
+                <div id="builder-locations-bar" class="builder-locations-bar">
+                    <!-- Location tabs rendered dynamically -->
+                </div>
+            </div>
+
+
             <!-- Cover area editable -->
             <div class="editor-cover-section">
                 <input type="file" id="cover-upload-input" accept="image/png, image/jpeg, image/webp"
@@ -226,6 +241,32 @@
             <button class="close-sidebar-btn" onclick="window.toggleSettingsSidebar()"><i class="ph ph-x"></i></button>
         </div>
         <div class="sidebar-content">
+
+            <!-- Locations Section in Sidebar -->
+            <div class="sidebar-section" id="sidebar-locations-section" style="border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px; margin-bottom: 16px;">
+                <p class="sidebar-section-title" style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
+                    <i class="ph ph-map-pin" style="color: #38bdf8;"></i> Localizações / Viaturas
+                </p>
+                <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
+                    <span style="font-size: 13px; color: #cbd5e1;">Ativar Múltiplas Localizações</span>
+                    <label class="switch">
+                        <input type="checkbox" id="setting-use-locations" onchange="window.toggleUseLocations(this.checked)">
+                        <span class="slider round"></span>
+                    </label>
+                </div>
+                <div id="locations-controls-container" style="display: none; margin-top: 10px;">
+                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
+                        <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Viaturas Registadas</span>
+                        <button type="button" class="builder-btn secondary" onclick="window.addNewLocation()" style="padding: 3px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
+                            <i class="ph ph-plus"></i> Adicionar
+                        </button>
+                    </div>
+                    <div id="sidebar-locations-list" class="sidebar-locations-list">
+                        <!-- Location cards rendered dynamically -->
+                    </div>
+                </div>
+            </div>
+
             <!-- Section 1: Scope -->
             <div class="sidebar-section">
                 <p class="sidebar-section-title">Aplica-se a:</p>
@@ -255,6 +296,42 @@
                 </div>
             </div>
 
+            <!-- CVP_PILL_FONT_CONTROLS_V2 -->
+            <div id="control-pill-font" class="sidebar-section">
+                <p class="sidebar-section-title">Texto das pills:</p>
+
+                <div class="sizing-tabs" style="margin-bottom: 12px;">
+                    <button id="tab-font-dynamic" class="sizing-tab-btn active" onclick="window.changeFontSizingMode('dynamic')">Dinâmico</button>
+                    <button id="tab-font-static" class="sizing-tab-btn" onclick="window.changeFontSizingMode('static')">Estático</button>
+                </div>
+
+                <div class="slider-control-group">
+                    <div class="slider-label-row">
+                        <span id="pill-font-size-label">Tamanho máximo</span>
+                    </div>
+
+                    <div class="control-input-row">
+                        <input type="range" id="input-font-size" class="sidebar-range-input" min="9" max="24" step="0.5" value="18" oninput="window.updatePillFontSize(this.value)">
+                        <input type="number" id="input-font-size-num" class="sidebar-number-input" min="9" max="24" step="0.5" value="18" onchange="window.updatePillFontSize(this.value)">
+                    </div>
+                </div>
+
+                <div style="margin-top: 12px;">
+                    <div class="slider-label-row" style="margin-bottom: 6px;">
+                        <span>Predefinição</span>
+                    </div>
+
+                    <select id="input-font-preset" onchange="window.applyPillFontPreset(this.value)" style="width:100%;background:#0f172a;color:#e2e8f0;border:1px solid rgba(255,255,255,0.14);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;">
+                        <option value="compact">Compacto · 14 px</option>
+                        <option value="normal">Normal · 16 px</option>
+                        <option value="large" selected>Grande · 18 px</option>
+                        <option value="maximum">Máximo · 20 px</option>
+                        <option value="custom">Personalizado</option>
+                    </select>
+                </div>
+
+                <p style="font-size:12px;color:#64748b;line-height:1.4;margin:10px 0 0 0;">Dinâmico tenta usar o maior tamanho possível e reduz apenas quando o texto não cabe. Estático aplica exatamente o tamanho escolhido a todas as pills.</p>
+            </div>
             <!-- Controls for Global + Fixed -->
             <div id="control-global-fixed" class="sidebar-section" style="display: none;">
                 <div class="slider-control-group">
@@ -303,7 +380,9 @@
     </div>
 
     <!-- Script to handle WYSIWYG Editor logic -->
-    <script type="module" src="inventario.js?v=1788725166887"></script>
+    <script type="module" src="inventario.js?v=1789123825479"></script>
+
+
 </body>
 
 </html>
\ No newline at end of file
diff --git a/inventario.js b/inventario.js
index 3656289..fc729dd 100644
--- a/inventario.js
+++ b/inventario.js
@@ -1,3515 +1,1854 @@
+/**
+ * INVENTÁRIO BUILDER ENGINE — ARQUITETURA NATIVA RECONSTRUÍDA
+ * CVP Vistorias / LPX
+ * 
+ * Dono absoluto do editor de inventário.
+ * Integração estrita de Toolbar, Settings Popover, Block Drag,
+ * Novo DOM de Pills (Isolamento Visual Shell vs Tools), QT/Counters,
+ * Capa, Localizações Copy-on-Write, Resting Layout e Pipeline Única de Persistência.
+ */
+
+import { auth, db, onAuthStateChanged, signInAnonymously, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
+import { canManagePillVisibility, optionRows, toggleOptionDisabled } from './form-recovery.js?v=20260909-miguel-original-v3';
+
+// ==========================================================================
+// 1. HELPERS DE CONTRASTE, CORES E SANITIZAÇÃO
+// ==========================================================================
+
+export function getContrastYIQ(hexcolor) {
+    if (!hexcolor) return '#ffffff';
+    let hex = hexcolor.replace("#", "");
+    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
+    if (hex.length !== 6) return '#ffffff';
+    const r = parseInt(hex.substr(0, 2), 16);
+    const g = parseInt(hex.substr(2, 2), 16);
+    const b = parseInt(hex.substr(4, 2), 16);
+    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
+    return (yiq >= 128) ? '#0f172a' : '#ffffff';
+}
+window.getContrastYIQ = getContrastYIQ;
+
+export function hslToHex(h, s, l) {
+    l /= 100;
+    const a = s * Math.min(l, 1 - l) / 100;
+    const f = n => {
+        const k = (n + h / 30) % 12;
+        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
+        return Math.round(255 * color).toString(16).padStart(2, '0');
+    };
+    return `#${f(0)}${f(8)}${f(4)}`;
+}
 
 window.sanitizeForFirestore = function sanitizeForFirestore(obj, insideArray = false) {
     if (obj === undefined) return null;
-    if (obj === null || typeof obj !== 'object') return obj;
+    if (obj === null) return null;
+    if (typeof obj !== 'object') return obj;
+
     if (Array.isArray(obj)) {
-        if (insideArray) return JSON.stringify(obj);
         return obj.map(item => sanitizeForFirestore(item, true));
     }
+
     const clean = {};
     Object.keys(obj).forEach(key => {
         const val = obj[key];
-        if (val !== undefined) {
-            if (Array.isArray(val) && insideArray) {
-                clean[key] = JSON.stringify(val);
-            } else {
-                clean[key] = sanitizeForFirestore(val, insideArray);
-            }
+        if (val === undefined) {
+            clean[key] = null;
+        } else if (typeof val === 'function') {
+            // Ignorar funções
+        } else if (Array.isArray(val)) {
+            clean[key] = val.map(item => sanitizeForFirestore(item, true));
+        } else if (typeof val === 'object' && val !== null) {
+            clean[key] = sanitizeForFirestore(val, false);
+        } else {
+            clean[key] = val;
         }
     });
     return clean;
 };
-/**
-
- * INVENTÁRIO BUILDER ENGINE - FINAL STABLE VERSION
-
- */
-
-import { auth, db, onAuthStateChanged, signInAnonymously, collection, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';
-// import './color-picker.js';
-
-// Helper script for YIQ contrast
-
-function getContrastYIQ(hexcolor) {
 
-    if (!hexcolor) return '#ffffff';
-
-    hexcolor = hexcolor.replace("#", "");
-
-    if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
-
-    if (hexcolor.length !== 6) return '#ffffff';
+// ==========================================================================
+// 2. ESTADO GLOBAL DO EDITOR
+// ==========================================================================
 
-    var r = parseInt(hexcolor.substr(0, 2), 16), g = parseInt(hexcolor.substr(2, 2), 16), b = parseInt(hexcolor.substr(4, 2), 16);
-
-    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
-
-    return (yiq >= 128) ? '#0f172a' : '#ffffff';
+const urlParams = new URLSearchParams(window.location.search);
+const currentFormId = urlParams.get('id');
 
-}
+let currentFormConfig = null;
+let editorSchema = [];
+let activeSettingsIndex = null;
+let saveTimer = null;
+let hasUnsavedChanges = false;
+let activePickerTarget = null; // { type, b, r, c }
 
-// Bind to window to allow color-picker.js to read/write these variables
-let openPaletteOption = null;
-Object.defineProperty(window, 'openPaletteOption', {
-    get() { return openPaletteOption; },
-    set(v) { openPaletteOption = v; }
-});
-window.setOpenPaletteOption = (v) => { openPaletteOption = v; };
+// Variáveis de estado de Localizações
+window.useLocations = false;
+window.locations = [];
+window.activeLocationId = '__base__';
 
-let openPaletteTitleIdx = null;
-Object.defineProperty(window, 'openPaletteTitleIdx', {
-    get() { return openPaletteTitleIdx; },
-    set(v) { openPaletteTitleIdx = v; }
-});
-window.setOpenPaletteTitleIdx = (v) => { openPaletteTitleIdx = v; };
+// Configuração de Pill Sizing
+window.pillSizingConfig = {
+    mode: 'global',
+    type: 'dynamic',
+    sharedWidth: 200,
+    sharedHeight: 42,
+    fontMode: 'dynamic',
+    fontSize: 18
+};
 
-let currentHoveredBlockForTools = null; // Sticky reference for toolbar
+window.editorSchema = editorSchema;
+window.currentFormConfig = currentFormConfig;
+window.activeSettingsIndex = null;
 
-let lastInternalRender = 0;
+// ==========================================================================
+// 3. PERSISTÊNCIA CENTRALIZADA & SERIALIZADOR ÚNICO
+// ==========================================================================
 
-let ignoreNextClick = false;
+window.serializeInventoryEditorState = function () {
+    if (!currentFormConfig) currentFormConfig = {};
 
+    // 1. Sincronizar o schema ativo na sua localização ou no modelo base
+    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
+        currentFormConfig.schema = editorSchema;
+    } else {
+        const activeLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
+        if (activeLoc && activeLoc.schema) {
+            activeLoc.schema = editorSchema;
+        }
+    }
 
+    // 2. Determinar título a partir do bloco de título no modelo base
+    const baseSchema = currentFormConfig.schema || editorSchema || [];
+    const titleBlock = baseSchema.find(b => b.type === 'title');
+    const formTitle = titleBlock ? (titleBlock.content || 'Novo Inventário') : (currentFormConfig.title || 'Novo Inventário');
 
-window.applyColorToDOM = function (type, b, r, c, color) {
+    // 3. Formatar schema com options serializadas (conforme padrão Firestore do CVP)
+    const prepareSchema = (raw) => {
+        if (!Array.isArray(raw)) return [];
+        const safe = JSON.parse(JSON.stringify(raw));
+        safe.forEach(block => {
+            if (block.options && Array.isArray(block.options)) {
+                block.options = JSON.stringify(block.options);
+            }
+        });
+        return safe;
+    };
 
-    const blockEl = document.querySelector(`.tally-block[data-index="${b}"]`);
+    const safeBaseSchema = prepareSchema(currentFormConfig.schema || editorSchema);
 
-    if (!blockEl) return;
+    // 4. Formatar array de localizações
+    const safeLocations = (window.locations || []).map(loc => {
+        const clean = { ...loc };
+        if (clean.schema) {
+            clean.schema = prepareSchema(clean.schema);
+        }
+        return clean;
+    });
 
-    const textColor = getContrastYIQ(color);
+    // 5. Tema e Capa
+    const coverBlock = document.getElementById('cover-block');
+    const coverUrl = coverBlock && coverBlock.style.backgroundImage
+        ? coverBlock.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '')
+        : (currentFormConfig.theme?.coverImage || null);
 
-    if (type === 'title') {
+    const theme = {
+        ...(currentFormConfig.theme || {}),
+        coverImage: coverUrl
+    };
 
-        const h1 = blockEl.querySelector('h1, h2, .section-title, .block-title, .block-section-heading, .block-title-large, .block-question, .block-desc');
+    // 6. Payload unificado preservando campos Firestore existentes
+    const payload = {
+        ...currentFormConfig,
+        title: formTitle,
+        schema: safeBaseSchema,
+        theme: theme,
+        pillSizing: window.pillSizingConfig,
+        useLocations: !!window.useLocations,
+        locations: safeLocations,
+        isInventory: true,
+        updatedAt: serverTimestamp()
+    };
 
-        if (h1) {
+    return payload;
+};
 
-            if (window.editorSchema[b].blockStyle === 'border') {
+window.saveDebounce = function () {
+    hasUnsavedChanges = true;
+    const saveStatus = document.getElementById('save-status');
+    if (saveStatus) saveStatus.textContent = "A guardar...";
 
-                h1.style.setProperty('--marker-color', color);
+    clearTimeout(saveTimer);
+    saveTimer = setTimeout(async () => {
+        try {
+            const formRef = doc(db, "forms", currentFormId);
+            const payload = window.serializeInventoryEditorState();
+            await setDoc(formRef, payload, { merge: true });
+            if (saveStatus) saveStatus.textContent = "Guardado na nuvem";
+            hasUnsavedChanges = false;
+        } catch (e) {
+            console.error("Erro ao guardar formulário:", e);
+            if (saveStatus) saveStatus.textContent = "Erro ao guardar!";
+        }
+    }, 1200);
+};
 
-                h1.style.backgroundColor = '';
+window.publishForm = async function (btn) {
+    const originalContent = btn ? btn.innerHTML : '';
+    if (btn) {
+        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A Publicar...';
+        btn.disabled = true;
+    }
+    clearTimeout(saveTimer);
+    try {
+        const formRef = doc(db, "forms", currentFormId);
+        const payload = window.serializeInventoryEditorState();
+        await setDoc(formRef, payload, { merge: true });
+        window.location.href = "dashboard.html";
+    } catch (e) {
+        console.error("Erro ao publicar:", e);
+        alert("Erro ao publicar o formulário: " + (e.message || e));
+        if (btn) {
+            btn.innerHTML = originalContent;
+            btn.disabled = false;
+        }
+    }
+};
 
-                h1.style.color = '#f8fafc';
+// ==========================================================================
+// 4. MOTOR DE LOCALIZAÇÕES (CANVAS BAR, SIDEBAR & COPY-ON-WRITE)
+// ==========================================================================
 
-            } else {
+window.renderCanvasLocationsBar = function () {
+    const container = document.getElementById('builder-locations-container');
+    const bar = document.getElementById('builder-locations-bar');
+    const bannerTitle = document.getElementById('active-schema-title');
+    const bannerBadge = document.getElementById('active-schema-badge');
+    if (!container || !bar) return;
 
-                h1.style.removeProperty('--marker-color');
+    if (!window.useLocations) {
+        container.style.display = 'none';
+        return;
+    }
 
-                const bStyle = window.editorSchema[b].blockStyle || 'full';
+    container.style.display = 'block';
 
-                const displayStyle = bStyle === 'inline' ? 'inline-block' : 'block';
+    // Atualizar banner informativo do schema ativo
+    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
+        if (bannerTitle) bannerTitle.textContent = "Modelo Base (Padrão)";
+        if (bannerBadge) {
+            bannerBadge.textContent = "Base";
+            bannerBadge.className = "active-schema-badge";
+        }
+    } else {
+        const loc = (window.locations || []).find(l => l.id === window.activeLocationId);
+        const isCustom = !!(loc && loc.schema);
+        if (bannerTitle) bannerTitle.textContent = loc ? `${loc.icon || '🚑'} ${loc.name}` : "Localização";
+        if (bannerBadge) {
+            bannerBadge.textContent = isCustom ? "Personalizada" : "Herda Modelo Base";
+            bannerBadge.className = `active-schema-badge ${isCustom ? 'custom' : ''}`;
+        }
+    }
 
-                h1.style.display = displayStyle;
+    // Renderizar botões de seleção de localização
+    let html = `
+        <button type="button" class="loc-tab-btn ${window.activeLocationId === '__base__' ? 'active' : ''}" onclick="window.switchActiveLocation('__base__')">
+            <span>📋</span>
+            <span>Modelo Base</span>
+        </button>
+    `;
 
-                h1.style.width = bStyle === 'inline' ? 'fit-content' : '100%';
+    (window.locations || []).forEach(loc => {
+        const isActive = loc.id === window.activeLocationId;
+        const isCustom = !!loc.schema;
+        html += `
+            <button type="button" class="loc-tab-btn ${isActive ? 'active' : ''}" onclick="window.switchActiveLocation('${loc.id}')">
+                <span>${loc.icon || '🚑'}</span>
+                <span>${loc.name}</span>
+                <span class="loc-tab-status">${isCustom ? 'Pers.' : 'Base'}</span>
+            </button>
+        `;
+    });
 
-                h1.style.backgroundColor = color || '';
+    bar.innerHTML = html;
+};
 
-                h1.style.color = color ? textColor : '#f8fafc';
+window.switchActiveLocation = function (locId) {
+    // 1. Persistir schema atual em memória antes de trocar
+    if (window.activeLocationId === '__base__' || !window.activeLocationId) {
+        if (currentFormConfig) currentFormConfig.schema = editorSchema;
+    } else {
+        const prevLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
+        if (prevLoc && prevLoc.schema) {
+            prevLoc.schema = editorSchema;
+        }
+    }
 
-            }
+    // 2. Alternar para a nova localização
+    window.activeLocationId = locId;
 
+    if (locId === '__base__') {
+        editorSchema = currentFormConfig.schema || [];
+    } else {
+        const targetLoc = (window.locations || []).find(l => l.id === locId);
+        if (targetLoc && targetLoc.schema) {
+            editorSchema = targetLoc.schema;
+        } else {
+            // Herda modelo base
+            editorSchema = currentFormConfig.schema || [];
         }
+    }
+    window.editorSchema = editorSchema;
 
-    } else if (type === 'pill') {
-
-        const pillWrapper = blockEl.querySelector(`.pill-cell-wrapper[data-rowidx="${r}"][data-colidx="${c}"] .pill-edit-wrapper`);
+    window.renderCanvasLocationsBar();
+    window.renderSidebarLocations();
+    window.renderCanvas();
+};
 
-        if (pillWrapper) {
+window.toggleUseLocations = function (checked) {
+    window.useLocations = !!checked;
+    const controls = document.getElementById('locations-controls-container');
+    if (controls) controls.style.display = window.useLocations ? 'block' : 'none';
 
-            if (color) {
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
+};
 
-                pillWrapper.style.backgroundColor = color;
+window.addNewLocation = function () {
+    const count = (window.locations || []).length + 1;
+    const newLoc = {
+        id: `loc_${Date.now()}`,
+        name: `Ambulância ${count < 10 ? '0' + count : count}`,
+        icon: '🚑'
+    };
+    if (!window.locations) window.locations = [];
+    window.locations.push(newLoc);
 
-                pillWrapper.style.color = textColor;
+    window.renderSidebarLocations();
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
+};
 
-            } else {
+window.updateLocationName = function (idx, name) {
+    if (!window.locations[idx]) return;
+    window.locations[idx].name = name.trim() || 'Sem nome';
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
+};
 
-                pillWrapper.style.background = 'rgba(255, 255, 255, 0.05)';
+window.updateLocationIcon = function (idx, icon) {
+    if (!window.locations[idx]) return;
+    window.locations[idx].icon = icon.trim() || '🚑';
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
+};
 
-                pillWrapper.style.color = 'inherit';
+window.moveLocationUp = function (idx) {
+    if (idx <= 0 || !window.locations[idx]) return;
+    const temp = window.locations[idx];
+    window.locations[idx] = window.locations[idx - 1];
+    window.locations[idx - 1] = temp;
+    window.renderSidebarLocations();
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
+};
 
-            }
+window.moveLocationDown = function (idx) {
+    if (idx >= window.locations.length - 1 || !window.locations[idx]) return;
+    const temp = window.locations[idx];
+    window.locations[idx] = window.locations[idx + 1];
+    window.locations[idx + 1] = temp;
+    window.renderSidebarLocations();
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
+};
 
-        }
+window.deleteLocation = function (idx) {
+    if (!window.locations[idx]) return;
+    const loc = window.locations[idx];
+    if (!confirm(`Tem a certeza que deseja eliminar "${loc.name}"?`)) return;
 
+    if (window.activeLocationId === loc.id) {
+        window.switchActiveLocation('__base__');
     }
-
+    window.locations.splice(idx, 1);
+    window.renderSidebarLocations();
+    window.renderCanvasLocationsBar();
+    window.saveDebounce();
 };
 
+// Copy-on-Write: Clona a estrutura do template para esta localização
+window.personalizeLocationSchema = function (idx) {
+    if (!window.locations[idx]) return;
+    const loc = window.locations[idx];
+    const templateSchema = currentFormConfig.schema || [];
+    loc.schema = JSON.parse(JSON.stringify(templateSchema));
+    window.switchActiveLocation(loc.id);
+    window.saveDebounce();
+};
 
-// Color slot functions moved to color-picker.js;
-
+// Reverte localização para usar o modelo base (remove loc.schema)
+window.revertLocationToBaseSchema = function (idx) {
+    if (!window.locations[idx]) return;
+    const loc = window.locations[idx];
+    if (!confirm(`Tem a certeza que deseja repor o Modelo Base em "${loc.name}"? Todas as alterações específicas desta viatura serão removidas.`)) return;
 
+    delete loc.schema;
+    window.switchActiveLocation(loc.id);
+    window.saveDebounce();
+};
 
+window.renderSidebarLocations = function () {
+    const listContainer = document.getElementById('sidebar-locations-list');
+    const useLocationsCheckbox = document.getElementById('setting-use-locations');
+    const controlsContainer = document.getElementById('locations-controls-container');
+    if (useLocationsCheckbox) useLocationsCheckbox.checked = !!window.useLocations;
+    if (controlsContainer) controlsContainer.style.display = window.useLocations ? 'block' : 'none';
+    if (!listContainer) return;
 
+    if (!window.locations || window.locations.length === 0) {
+        listContainer.innerHTML = '<p style="font-size:12px;color:#64748b;margin:4px 0;">Nenhuma localização adicionada ainda.</p>';
+        return;
+    }
 
+    let html = '';
+    window.locations.forEach((loc, idx) => {
+        const isActive = loc.id === window.activeLocationId;
+        const isCustom = !!loc.schema;
+        html += `
+            <div class="sidebar-loc-card ${isActive ? 'is-active' : ''}">
+                <div class="sidebar-loc-header">
+                    <input type="text" class="sidebar-loc-icon-input" value="${loc.icon || '🚑'}" maxlength="4" onchange="window.updateLocationIcon(${idx}, this.value)" title="Ícone / Emoji">
+                    <input type="text" class="sidebar-loc-name-input" value="${loc.name}" onchange="window.updateLocationName(${idx}, this.value)" placeholder="Nome da viatura">
+                    <div class="sidebar-loc-btns">
+                        <button type="button" class="sidebar-loc-btn" onclick="window.moveLocationUp(${idx})" title="Subir" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}><i class="ph ph-arrow-up"></i></button>
+                        <button type="button" class="sidebar-loc-btn" onclick="window.moveLocationDown(${idx})" title="Descer" ${idx === window.locations.length - 1 ? 'disabled style="opacity:0.3;"' : ''}><i class="ph ph-arrow-down"></i></button>
+                        <button type="button" class="sidebar-loc-btn danger" onclick="window.deleteLocation(${idx})" title="Eliminar"><i class="ph ph-trash"></i></button>
+                    </div>
+                </div>
+                <div class="sidebar-loc-actions">
+                    <span class="sidebar-loc-status ${isCustom ? 'custom' : ''}">
+                        ${isCustom ? '★ Personalizada' : 'Herda Base'}
+                    </span>
+                    <div>
+                        ${isCustom ? `
+                            <button type="button" class="sidebar-loc-btn" onclick="window.revertLocationToBaseSchema(${idx})" title="Repor estrutura do modelo base">Repor Base</button>
+                        ` : `
+                            <button type="button" class="sidebar-loc-btn primary" onclick="window.personalizeLocationSchema(${idx})" title="Criar cópia independente para esta viatura">Personalizar</button>
+                        `}
+                    </div>
+                </div>
+            </div>
+        `;
+    });
+    listContainer.innerHTML = html;
+};
 
+// ==========================================================================
+// 5. COLOR PICKER GLOBAL
+// ==========================================================================
 
 const globalColorPicker = document.createElement('input');
-
 globalColorPicker.type = 'color';
-
-globalColorPicker.style.position = 'fixed';
-
-globalColorPicker.style.opacity = '0';
-
-globalColorPicker.style.pointerEvents = 'none';
-
+globalColorPicker.style.display = 'none';
 document.body.appendChild(globalColorPicker);
 
-
-
-let activePickerTarget = null; // { type: 'pill'|'title', b, r, c }
-
-
-
 globalColorPicker.addEventListener('input', (e) => {
-
     if (!activePickerTarget) return;
-
     const { type, b, r, c } = activePickerTarget;
-
     const color = e.target.value;
 
     if (type === 'pill') {
+        window.setPillColor(b, r, c, color);
+    } else if (type === 'title') {
+        window.setTitleColor(b, color);
+    } else if (type === 'block') {
+        window.setBlockColor(color);
+    }
+});
 
-        window.editorSchema[b].options[r][c].color = color;
-
-    } else {
+globalColorPicker.addEventListener('change', () => {
+    activePickerTarget = null;
+    window.saveDebounce();
+});
 
-        window.editorSchema[b].blockColor = color;
+window.openColorPicker = function (e, type, b, r, c) {
+    if (e) e.stopPropagation();
+    activePickerTarget = { type, b, r, c };
 
+    let initialColor = '#3b82f6';
+    if (type === 'pill') {
+        const opt = editorSchema[b]?.options?.[r]?.[c];
+        initialColor = (typeof opt === 'object' && opt?.color) ? opt.color : (editorSchema[b]?.pillColor || '#3b82f6');
+    } else if (type === 'title') {
+        initialColor = editorSchema[b]?.blockColor || '#ffffff';
+    } else if (type === 'block') {
+        initialColor = editorSchema[window.activeSettingsIndex]?.pillColor || '#22c55e';
     }
 
-    window.renderCanvas();
+    globalColorPicker.value = initialColor.startsWith('#') && initialColor.length === 7 ? initialColor : '#3b82f6';
+    globalColorPicker.click();
+};
 
-});
+window.openBlockFullPicker = function (e) {
+    if (window.activeSettingsIndex !== null) {
+        window.openColorPicker(e, 'block', window.activeSettingsIndex);
+    }
+};
 
+window.setBlockColor = function (color) {
+    if (window.activeSettingsIndex !== null) {
+        if (color) {
+            editorSchema[window.activeSettingsIndex].pillColor = color;
+            editorSchema[window.activeSettingsIndex].hasColorCode = true;
+        } else {
+            delete editorSchema[window.activeSettingsIndex].pillColor;
+            editorSchema[window.activeSettingsIndex].hasColorCode = false;
+        }
+        const hexInput = document.getElementById('block-hex-input');
+        if (hexInput) hexInput.value = color || '';
+        renderCanvas();
+        window.saveDebounce();
+    }
+};
 
+window.setPillColor = function (blockIdx, rowIdx, colIdx, color) {
+    const block = editorSchema[blockIdx];
+    if (!block || !block.options || !block.options[rowIdx]) return;
+    let opt = block.options[rowIdx][colIdx];
+    if (typeof opt !== 'object' || opt === null) {
+        opt = { text: String(opt || '') };
+        block.options[rowIdx][colIdx] = opt;
+    }
+    opt.color = color;
+    renderCanvas();
+    window.saveDebounce();
+};
 
-globalColorPicker.addEventListener('change', (e) => {
+window.setTitleColor = function (blockIdx, color) {
+    if (!editorSchema[blockIdx]) return;
+    editorSchema[blockIdx].blockColor = color;
+    renderCanvas();
+    window.saveDebounce();
+};
 
-    if (e.target.value) { /* no auto-save */ }
+window.toggleTitleStyle = function (e, blockIdx) {
+    if (e) e.stopPropagation();
+    const block = editorSchema[blockIdx];
+    if (!block) return;
+    const styles = ['full', 'inline', 'border'];
+    const current = block.blockStyle || 'full';
+    let nextIdx = (styles.indexOf(current) + 1) % styles.length;
+    block.blockStyle = styles[nextIdx];
+    renderCanvas();
+    window.saveDebounce();
+};
 
+window.toggleTitleSize = function (e, blockIdx) {
+    if (e) e.stopPropagation();
+    const block = editorSchema[blockIdx];
+    if (!block) return;
+    const sizes = ['small', 'medium', 'large'];
+    const current = block.blockSize || 'large';
+    let nextIdx = (sizes.indexOf(current) + 1) % sizes.length;
+    block.blockSize = sizes[nextIdx];
+    renderCanvas();
     window.saveDebounce();
+};
 
-    activePickerTarget = null;
+window.toggleBlockSticky = function (e, blockIdx) {
+    if (e) e.stopPropagation();
+    const block = editorSchema[blockIdx];
+    if (!block) return;
+    block.isSticky = block.isSticky === false ? true : false;
+    renderCanvas();
+    window.saveDebounce();
+};
 
-});
+// ==========================================================================
+// 6. RENDERIZAÇÃO DO CANVAS DO BUILDER
+// ==========================================================================
 
+export function renderCanvas() {
+    const container = document.getElementById('blocks-container');
+    if (!container) return;
+    container.innerHTML = '';
 
+    // Se estiver em modo localização, garantir que o schema ativo está consistente
+    if (window.activeLocationId && window.activeLocationId !== '__base__') {
+        const activeLoc = (window.locations || []).find(l => l.id === window.activeLocationId);
+        if (activeLoc && activeLoc.schema) {
+            editorSchema = activeLoc.schema;
+        } else {
+            editorSchema = currentFormConfig.schema || [];
+        }
+        window.editorSchema = editorSchema;
+    }
 
+    const sizingScope = window.pillSizingConfig.mode || 'global';
+    const sizingType = window.pillSizingConfig.type || 'dynamic';
+    const sharedWidth = window.pillSizingConfig.sharedWidth || 200;
+    const sharedHeight = window.pillSizingConfig.sharedHeight || 42;
+    const canManageVisibility = canManagePillVisibility(auth.currentUser);
 
+    editorSchema.forEach((block, index) => {
+        const blockEl = document.createElement('div');
+        blockEl.dataset.index = index;
 
+        // Classificação semântica fiel a inventory_view.html
+        const isL1 = (['title', 'title-h1'].includes(block.type) && (block.blockSize === 'large' || !block.blockSize) && block.blockStyle !== 'inline');
+        const isL2 = block.type !== 'counter' && (block.type === 'title-h2' || block.type === 'section' || (block.type === 'title' && (block.blockSize === 'medium' || block.blockStyle === 'inline')));
+        const isCounter = block.type === 'counter';
+
+        let semanticClass = 'inventory-content';
+        if (isL1) semanticClass = 'inventory-level-1';
+        else if (isL2) semanticClass = 'inventory-level-2';
+        else if (isCounter) semanticClass = 'inventory-level-3';
+
+        // Análise de transição para o próximo bloco
+        const nextBlock = editorSchema[index + 1];
+        let gapClass = '';
+        if (isL1 && nextBlock && !(['title-h2', 'section'].includes(nextBlock.type) || (nextBlock.type === 'title' && (nextBlock.blockSize === 'medium' || nextBlock.blockStyle === 'inline')))) {
+            gapClass = 'gap-section';
+        } else if (isL2 && nextBlock && nextBlock.type !== 'counter') {
+            gapClass = 'gap-section';
+        }
 
+        blockEl.className = `tally-block block-${block.type} ${semanticClass} ${gapClass}`.trim();
 
+        // Toolbar dos Blocos
+        const isHeaderBlock = ['title', 'section'].includes(block.type);
+        const isSticky = block.isSticky !== false;
 
+        let extraHeaderTools = '';
+        if (isHeaderBlock) {
+            extraHeaderTools = `
+                <div class="tool-btn color-trigger" onclick="window.openColorPicker(event, 'title', ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>
+                <div class="tool-btn style-trigger" onclick="window.toggleTitleStyle(event, ${index})" title="Mudar Estilo (Texto / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>
+                <div class="tool-btn size-trigger" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho"><i class="ph ph-text-aa"></i></div>
+                <div class="tool-btn sticky-trigger" onclick="window.toggleBlockSticky(event, ${index})" title="Fixar Cabeçalho (Sticky)" style="cursor: pointer; ${isSticky ? 'color: #3b82f6;' : 'color: #cbd5e1;'}">
+                    <i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i>
+                </div>
+            `;
+        }
 
-const urlParams = new URLSearchParams(window.location.search);
+        const toolsHtml = `
+            <div class="block-tools-inline">
+                ${extraHeaderTools}
+                <div class="tool-btn image-trigger" onclick="window.triggerBlockImage(event, ${index})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
+                <div class="tool-btn drag-handle" title="Arrastar para mover bloco"><i class="ph ph-dots-six-vertical"></i></div>
+                <div class="tool-btn duplicate-btn" onclick="window.duplicateBlockDirect(event, ${index})" title="Duplicar Bloco"><i class="ph ph-copy"></i></div>
+                <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
+                <div class="tool-btn settings-btn" title="Definições do Bloco"><i class="ph ph-gear"></i></div>
+                <div class="tool-btn delete-btn" title="Eliminar Bloco"><i class="ph ph-trash"></i></div>
+            </div>
+        `;
 
-let currentFormId = urlParams.get('id') || localStorage.getItem('cvpCurrentFormId');
+        let contentHtml = '';
 
+        if (block.type === 'title') {
+            const bColor = block.blockColor || '';
+            const bStyle = block.blockStyle || 'full';
+            const bSize = block.blockSize || 'large';
+            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
+            const fontSize = sizeMap[bSize] || '33px';
 
+            let titleStyle = `font-size: ${fontSize}; line-height: 1.2; font-weight: 700;`;
+            let titleClass = 'block-title';
 
-if (!currentFormId) {
+            if (bColor) {
+                const textColor = getContrastYIQ(bColor);
+                if (bStyle === 'border') {
+                    titleStyle += ` --marker-color: ${bColor}; color: #f8fafc; padding-left: 18px;`;
+                    titleClass += ' style-marker';
+                } else if (bStyle === 'inline') {
+                    titleStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: inline-block; width: fit-content;`;
+                } else {
+                    titleStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: block; width: 100%; box-sizing: border-box;`;
+                }
+            }
 
-    window.location.href = 'dashboard.html';
+            contentHtml = `
+                <div style="display: flex; align-items: center; width: 100%; margin-bottom: 4px;">
+                    <h1 class="${titleClass}" contenteditable="true" data-field="content" style="${titleStyle} flex: 1; margin: 0; outline: none;">${block.content || ''}</h1>
+                </div>
+            `;
+        } else if (block.type === 'section') {
+            const bColor = block.blockColor || '';
+            const bStyle = block.blockStyle || 'full';
+            const bSize = block.blockSize || 'medium';
+            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
+            const fontSize = sizeMap[bSize] || '25px';
 
-} else {
+            let secStyle = `font-size: ${fontSize}; line-height: 1.2; font-weight: 600;`;
+            let secClass = 'section-title';
 
-    localStorage.setItem('cvpCurrentFormId', currentFormId);
+            if (bColor) {
+                const textColor = getContrastYIQ(bColor);
+                if (bStyle === 'border') {
+                    secStyle += ` --marker-color: ${bColor}; color: #f8fafc; padding-left: 18px;`;
+                    secClass += ' style-marker';
+                } else if (bStyle === 'inline') {
+                    secStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: inline-block; width: fit-content;`;
+                } else {
+                    secStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: block; width: 100%; box-sizing: border-box;`;
+                }
+            }
 
-}
+            contentHtml = `
+                <div style="display: flex; align-items: center; width: 100%; margin-bottom: 4px;">
+                    <div class="${secClass}" contenteditable="true" data-field="question" style="${secStyle} flex: 1; margin: 0; outline: none;">${block.question || ''}</div>
+                </div>
+            `;
+        } else if (block.type === 'divider') {
+            contentHtml = `<div class="block-divider-line"></div>`;
+        } else if (['choice-single', 'choice-multi', 'counter'].includes(block.type)) {
+            // Normalizar matriz de opções 2D
+            block.options = optionRows(block.options);
+            if (block.options.length === 0) block.options = [[{ text: 'Opção' }]];
+
+            const isBlockCounter = block.type === 'counter';
+            const bColor = block.blockColor || '';
+            const bStyle = block.blockStyle || 'full';
+            const bSize = block.blockSize || 'medium';
+            const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };
+            const qFontSize = sizeMap[bSize] || '25px';
 
+            let qStyle = `font-size: ${qFontSize}; font-weight: 600; line-height: 1.2;`;
+            let qClass = 'block-question';
+            if (bColor) {
+                const textColor = getContrastYIQ(bColor);
+                if (bStyle === 'border') {
+                    qStyle += ` --marker-color: ${bColor}; color: #f8fafc; padding-left: 18px;`;
+                    qClass += ' style-marker';
+                } else if (bStyle === 'inline') {
+                    qStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: inline-block; width: fit-content;`;
+                } else {
+                    qStyle += ` background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; display: block; width: 100%; box-sizing: border-box;`;
+                }
+            }
 
+            contentHtml = `
+                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
+                    <div class="${qClass}" contenteditable="true" data-field="question" style="${qStyle} flex: 1; outline: none;">${block.question || (isBlockCounter ? 'Novo Item de Inventário' : 'Nova Pergunta')}</div>
+                    ${block.required ? '<span class="required-indicator" style="color: #ef4444; font-weight: 700;">*</span>' : ''}
+                </div>
+            `;
 
-window.editorSchema = [];
+            if (block.hasDescription) {
+                contentHtml += `
+                    <div class="block-description" contenteditable="true" data-field="description" style="font-size: 13px; color: #94a3b8; margin-bottom: 8px; outline: none;">${block.description || 'Descrição opcional...'}</div>
+                `;
+            }
 
-window.pillSizingConfig = {
-    mode: 'global',
-    type: 'dynamic',
-    sharedWidth: 200
-};
+            // Renderizar linhas de Pílulas com Novo DOM Desacoplado
+            block.options.forEach((row, rowIdx) => {
+                contentHtml += `<div class="pill-row" data-blockidx="${index}" data-rowidx="${rowIdx}">`;
 
-let currentForm = null;
+                row.forEach((opt, colIdx) => {
+                    const optText = typeof opt === 'object' ? (opt.text || '') : String(opt || '');
+                    const optTarget = typeof opt === 'object' ? (opt.target || 0) : 0;
+                    const isDisabled = typeof opt === 'object' && opt.disabled === true;
 
-let hasUnsavedChanges = false;
+                    // Resolução de Cor: opt.color -> block.pillColor -> block.blockColor -> default
+                    const pillColor = (typeof opt === 'object' && opt.color)
+                        ? opt.color
+                        : (block.pillColor || (isBlockCounter ? '' : block.blockColor) || '#1e293b');
 
-let saveTimer = null;
+                    const textColor = getContrastYIQ(pillColor);
 
+                    // Dimensionamento configurado
+                    let pWidth = sharedWidth;
+                    let pHeight = sharedHeight;
 
+                    if (sizingScope === 'individual' && typeof opt === 'object') {
+                        if (opt.width) pWidth = opt.width;
+                        if (opt.height) pHeight = opt.height;
+                    }
 
-// Global exports for HTML event handlers
+                    const isFixed = sizingType === 'fixed';
+                    const shellStyle = `
+                        ${isFixed ? `width: ${pWidth}px;` : 'min-width: 140px;'}
+                        height: ${pHeight}px;
+                        background-color: ${pillColor};
+                    `.trim();
+
+                    const pillNameStyle = `
+                        color: ${textColor};
+                        font-size: ${window.pillSizingConfig.fontSize || 14}px;
+                    `.trim();
+
+                    contentHtml += `
+                        <div class="pill-cell-wrapper ${isDisabled ? 'is-disabled' : ''}" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}">
+                            <div class="pill-visual-shell" style="${shellStyle}">
+                                <input type="text" class="pill-name-input" value="${optText}" placeholder="Nome" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="${pillNameStyle}">
+                                ${isBlockCounter ? `
+                                    <div class="pill-qt-zone">
+                                        <span>QT</span>
+                                        <input type="number" class="pill-target-input" value="${optTarget}" min="0" onchange="window.setPillTarget(${index}, ${rowIdx}, ${colIdx}, this.value)">
+                                    </div>
+                                ` : ''}
+                            </div>
+                            <div class="pill-editor-tools">
+                                <div class="pill-drag-handle" title="Arrastar para reordenar"><i class="ph ph-dots-six-vertical"></i></div>
+                                ${canManageVisibility ? `
+                                <button type="button" class="pill-visibility-btn ${isDisabled ? 'is-disabled' : ''}" title="${isDisabled ? 'Reativar opção' : 'Desativar opção'}" onclick="window.togglePillVisibility(event, ${index}, ${rowIdx}, ${colIdx})">
+                                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
+                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
+                                        <circle cx="12" cy="12" r="3"/>
+                                        ${isDisabled ? '<path d="m3 3 18 18"/>' : ''}
+                                    </svg>
+                                </button>` : ''}
+                                <button type="button" class="pill-clone-btn" title="Clonar opção" onclick="window.duplicateOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-copy"></i></button>
+                                <button type="button" class="pill-color-trigger" title="Cor da opção" onclick="window.openColorPicker(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-palette"></i></button>
+                                <button type="button" class="pill-delete-btn" title="Remover opção" onclick="window.removeOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-x"></i></button>
+                            </div>
+                        </div>
+                    `;
+                });
 
-window.renderCanvas = function () {
+                contentHtml += `<button type="button" class="add-pill-btn" title="Adicionar pílula nesta linha" onclick="window.addOptionToRow(${index}, ${rowIdx})"><i class="ph ph-plus"></i></button>`;
+                contentHtml += `</div>`; // .pill-row
+            });
 
-    const blocksContainer = document.getElementById('blocks-container');
+            // Opção "Outra" se ativa
+            if (block.hasOther) {
+                const otherLabel = block.otherText || 'Outra';
+                contentHtml += `
+                    <div class="pill-row" style="margin-top: 6px;">
+                        <div class="pill-visual-shell" style="width: auto; min-width: 130px; height: 38px; border: 1px dashed rgba(255,255,255,0.3); padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; opacity: 0.85;">
+                            <i class="ph ph-pencil-simple" style="color: #94a3b8;"></i>
+                            <input type="text" class="pill-other-input" value="${otherLabel}" data-blockidx="${index}" style="background:transparent;border:none;color:white;font-size:13px;width:100%;outline:none;">
+                        </div>
+                    </div>
+                `;
+            }
 
-    if (!blocksContainer) return;
+            contentHtml += `
+                <button type="button" class="add-row-btn" onclick="window.addOption(${index})" style="margin-top: 8px; font-size: 12px; color: #38bdf8; background: transparent; border: 1px dashed rgba(56,189,248,0.3); padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
+                    <i class="ph ph-plus"></i> Adicionar Nova Linha de Itens
+                </button>
+            `;
+        } else {
+            // Textos normais
+            contentHtml = `<div class="block-text" contenteditable="true" data-field="content" style="outline:none;">${block.content || ''}</div>`;
+        }
 
-    blocksContainer.innerHTML = '';
+        // Wrapper de imagem se o bloco tiver imagem
+        let imageHtml = '';
+        if (block.image) {
+            const zMode = block.imageZ || 'front';
+            const zIndexVal = zMode === 'back' ? 0 : 10;
+            const inFlow = block.imageInFlow === true;
+            const imgStyle = inFlow
+                ? `position: relative; margin: 12px 0; width: ${block.imageWidth || 200}px; height: ${block.imageHeight || 'auto'}px; z-index: ${zIndexVal};`
+                : `position: absolute; left: ${block.imageX || 0}px; top: ${block.imageY || 0}px; width: ${block.imageWidth || 200}px; height: ${block.imageHeight || 'auto'}px; z-index: ${zIndexVal};`;
+
+            imageHtml = `
+                <div class="block-image-wrapper" style="${imgStyle}" data-blockidx="${index}">
+                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain;">
+                    <div class="image-resize-handle" title="Redimensionar Imagem"></div>
+                    <div class="image-delete-btn" onclick="window.removeBlockImage(${index})" title="Remover Imagem"><i class="ph ph-x"></i></div>
+                </div>
+            `;
+        }
 
-    lastInternalRender = Date.now();
+        blockEl.innerHTML = toolsHtml + contentHtml + imageHtml;
+        container.appendChild(blockEl);
 
+        // Bindings de drag do bloco (APENAS na drag-handle!)
+        const dragHandle = blockEl.querySelector('.block-tools-inline .drag-handle');
+        if (dragHandle) {
+            dragHandle.addEventListener('mousedown', () => {
+                blockEl.setAttribute('draggable', 'true');
+            });
+        }
 
-
-    window.editorSchema.forEach((block, index) => {
-
-        const blockEl = document.createElement('div');
-
-        blockEl.className = `tally-block block-${block.type}`;
-
-        blockEl.dataset.index = index;
-
-
-
-        const bColor = block.blockColor || '';
-
-        const bStyle = block.blockStyle || 'full';
-
-        const bSize = block.blockSize || 'medium';
-
-        const sizeMap = { 'small': '14px', 'medium': '18px', 'large': '24px' };
-
-        const qFontSize = sizeMap[bSize] || '18px';
-
-        let qStyle = '';
-
-        let qClass = '';
-
-        if (bColor) {
-
-            const textColor = getContrastYIQ(bColor);
-
-            if (bStyle === 'border') {
-
-                qStyle = `--marker-color: ${bColor}; font-size: ${qFontSize}; color: #f8fafc;`;
-
-                qClass = 'style-marker';
-
-            } else {
-
-                const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
-
-                qStyle = `background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${qFontSize}; ${displayStyle}`;
-
-            }
-
-        }
-
-
-
-        let html = '';
-
-        if (block.type === 'title') {
-
-            const bColor = block.blockColor || '';
-
-            const bStyle = block.blockStyle || 'full'; // 'full', 'inline', 'border'
-
-            const bSize = block.blockSize || 'large'; // 'small', 'medium', 'large'
-
-
-
-            const sizeMap = { 'small': '18px', 'medium': '26px', 'large': '36px' };
-
-            const fontSize = sizeMap[bSize] || '36px';
-
-
-
-            let styleAttr = `style="font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2;"`;
-
-            let classAttr = `class="block-title"`;
-
-
-
-            if (bColor) {
-
-                const textColor = getContrastYIQ(bColor);
-
-                if (bStyle === 'border') {
-
-                    styleAttr = `style="--marker-color: ${bColor}; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; color: #f8fafc;"`;
-
-                    classAttr = `class="block-title style-marker"`;
-
-                } else {
-
-                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
-
-                    styleAttr = `style="background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; ${displayStyle}"`;
-
-                }
-
-            }
-
-
-
-            const isSticky = block.isSticky !== false;
-
-            const pinHtml = `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 24px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
-
-            const cleanStyle = styleAttr.replace('style="', '').slice(0, -1);
-
-            const wrapperStyle = bStyle === 'inline' && bColor
-
-                ? 'display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px; max-width: 100%;'
-
-                : 'display: flex; align-items: center; gap: 4px; width: 100%; margin-bottom: 8px;';
-
-            const innerFlex = bStyle === 'inline' && bColor ? '' : 'flex: 1;';
-
-
-
-            html = `
-
-                <div style="${wrapperStyle}">
-
-                    ${pinHtml}
-
-                    <h1 ${classAttr} contenteditable="true" data-field="content" style="${cleanStyle}; ${innerFlex} margin: 0;">${block.content || ''}</h1>
-
-                </div>
-
-            `;
-
-        } else if (block.type === 'section') {
-
-            const bColor = block.blockColor || '';
-
-            const bStyle = block.blockStyle || 'full'; // 'full', 'inline', 'border'
-
-            const bSize = block.blockSize || 'medium'; // 'small', 'medium', 'large'
-
-
-
-            const sizeMap = { 'small': '14px', 'medium': '18px', 'large': '24px' };
-
-            const fontSize = sizeMap[bSize] || '18px';
-
-
-
-            let styleAttr = `style="font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2;"`;
-
-            let classAttr = `class="section-title"`;
-
-
-
-            if (bColor) {
-
-                const textColor = getContrastYIQ(bColor);
-
-                if (bStyle === 'border') {
-
-                    styleAttr = `style="--marker-color: ${bColor}; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; color: #f8fafc;"`;
-
-                    classAttr = `class="section-title style-marker"`;
-
-                } else {
-
-                    const displayStyle = bStyle === 'inline' ? 'display: inline-block; width: fit-content;' : 'display: block; width: 100%;';
-
-                    styleAttr = `style="background-color: ${bColor}; color: ${textColor}; padding: 4px 12px; border-radius: 6px; font-size: ${fontSize}; margin-bottom: 8px; line-height: 1.2; ${displayStyle}"`;
-
-                }
-
-            }
-
-
-
-            const isSticky = block.isSticky !== false;
-
-            const pinHtml = `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 18px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
-
-            const cleanStyle = styleAttr.replace('style="', '').slice(0, -1);
-
-            const wrapperStyle = bStyle === 'inline' && bColor
-
-                ? 'display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px; max-width: 100%;'
-
-                : 'display: flex; align-items: center; gap: 4px; width: 100%; margin-bottom: 8px;';
-
-            const innerFlex = bStyle === 'inline' && bColor ? '' : 'flex: 1;';
-
-
-
-            html = `
-
-                <div style="${wrapperStyle}">
-
-                    ${pinHtml}
-
-                    <div ${classAttr} contenteditable="true" data-field="question" style="${cleanStyle}; ${innerFlex} margin: 0;">${block.question || ''}</div>
-
-                </div>
-
-            `;
-
-        } else if (block.type === 'counter' || block.type === 'choice-single' || block.type === 'choice-multi') {
-
-            const options = block.options || [[]];
-
-            const blockColor = block.pillColor || '';
-
-            const isCounter = block.type === 'counter';
-
-
-
-            let pinHtml = '';
-
-            if (isCounter) {
-
-                const isSticky = block.isSticky !== false;
-
-                pinHtml = `<span class="canvas-sticky-pin" contenteditable="false" onclick="window.toggleBlockSticky(event, ${index})" onmouseover="this.style.opacity='1'; this.style.color='#3b82f6';" onmouseout="this.style.opacity='${isSticky ? '1' : '0.4'}'; this.style.color='${isSticky ? '#3b82f6' : '#cbd5e1'}';" style="cursor: pointer; color: ${isSticky ? '#3b82f6' : '#cbd5e1'}; opacity: ${isSticky ? '1' : '0.4'}; font-size: 18px; display: inline-flex; align-items: center; user-select: none; transition: all 0.2s; margin-right: 8px;" title="Fixar Cabeçalho (Sticky)"><i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i></span>`;
-
-            }
-
-
-
-            html = `
-
-                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
-
-                    ${pinHtml}
-
-                    <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="${qStyle}">${block.question || (isCounter ? 'Novo Item' : 'Nova Pergunta')}</div>
-
-                    ${isCounter ? `<button class="required-star-btn" onclick="window.toggleBlockRequired(event, ${index})" title="${block.required ? 'Clique para remover obrigatoriedade' : 'Clique para tornar obrigatório'}" style="cursor: pointer; background: transparent; border: none; font-size: 24px; font-weight: 700; color: ${block.required ? '#ef4444' : '#cbd5e1'}; transition: color 0.2s; padding: 0; line-height: 1;">*</button>` : ''}
-
-                </div>
-
-            `;
-
-
-
-            // Auto-clean any empty arrays that might have been saved incorrectly
-
-            for (let i = options.length - 1; i >= 0; i--) {
-
-                if (!options[i] || options[i].length === 0) {
-
-                    options.splice(i, 1);
-
-                }
-
-            }
-
-
-
-            options.forEach((row, rowIdx) => {
-
-                html += `<div class="pill-row" data-blockidx="${index}" data-rowidx="${rowIdx}" ondragover="window.handlePillRowDragOver(event)" ondrop="window.handlePillRowDrop(event, ${index}, ${rowIdx})">`;
-
-                row.forEach((opt, colIdx) => {
-
-                    const optText = typeof opt === 'object' ? opt.text : opt;
-
-                    const optColor = (typeof opt === 'object' && opt.color) ? opt.color : blockColor;
-
-                    const optTarget = (typeof opt === 'object' && opt.target !== undefined) ? opt.target : 0;
-
-
-
-                    const styleAttr = optColor ? `background-color: ${optColor}; color: ${getContrastYIQ(optColor)};` : `background: rgba(255, 255, 255, 0.05); color: inherit;`;
-                    const sharedHeight = (window.pillSizingConfig && window.pillSizingConfig.sharedHeight) || 42;
-
-
-                    // Sizing calculations
-                    const sizingScope = (window.pillSizingConfig && window.pillSizingConfig.mode) || 'global';
-                    const sizingType = (window.pillSizingConfig && window.pillSizingConfig.type) || 'dynamic';
-                    const sharedWidth = (window.pillSizingConfig && window.pillSizingConfig.sharedWidth) || 200;
-
-                    let optHeight = sharedHeight;
-                    if (sizingScope === 'individual') {
-                        optHeight = (typeof opt === 'object' && opt.height !== undefined) ? opt.height : sharedHeight;
-                    }
-
-                    let wrapperStyle = '';
-                    if (sizingScope === 'global') {
-                        if (sizingType === 'fixed') {
-                            wrapperStyle = `width: ${sharedWidth}px; max-width: none;`;
-                        } else {
-                            // global + dynamic: auto-calculated after rendering by adjustGlobalDynamicWidths
-                            wrapperStyle = `width: auto; max-width: 310px;`;
-                        }
-                    } else { // individual
-                        if (sizingType === 'fixed') {
-                            const individualWidth = (typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
-                            wrapperStyle = `width: ${individualWidth}px; max-width: none;`;
-                        } else { // individual + dynamic
-                            wrapperStyle = `width: auto; max-width: 310px;`;
-                        }
-                    }
-
-                    html += `
-
-                        <div class="pill-cell-wrapper" draggable="true" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" ondragstart="window.handlePillDragStart(event)" ondragover="window.handlePillDragOver(event)" ondragleave="window.handlePillDragLeave(event)" ondrop="window.handlePillDrop(event)" ondragend="window.handlePillDragEnd(event)" style="${wrapperStyle}">
-
-                            <div class="pill-edit-wrapper" style="${styleAttr} min-height: ${optHeight}px !important; height: auto !important; max-height: 80px !important;">
-
-                                <div class="pill-drag-handle">
-
-                                    <i class="ph ph-dots-six-vertical"></i>
-
-                                </div>
-
-                                <span class="pill-input" contenteditable="true" data-placeholder="Nome" data-blockidx="${index}" data-rowidx="${rowIdx}" data-colidx="${colIdx}" style="color: inherit;">${optText}</span>
-
-                                ${isCounter ? `<div class="pill-inventory-target"><span>QT</span><input type="number" class="pill-target-input" value="${optTarget}" onchange="window.setPillTarget(${index}, ${rowIdx}, ${colIdx}, this.value)"></div>` : ''}
-
-                                <button class="pill-clone-btn" title="Duplicar Opção" onclick="window.duplicateOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-copy"></i></button>
-
-                                <button class="pill-color-trigger" onclick="window.openColorPicker(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-palette"></i></button>
-
-                                <button class="pill-delete-btn" onclick="window.removeOption(${index}, ${rowIdx}, ${colIdx})"><i class="ph ph-x"></i></button>
-
-                            </div>
-
-                        </div>
-
-                    `;
-
-                });
-
-                html += `<button class="add-pill-btn" onclick="window.addOptionToRow(${index}, ${rowIdx})"><i class="ph ph-plus"></i></button></div>`;
-
-            });
-
-
-
-            // Gap zone com botão de + para adicionar linha abaixo
-
-            html += `
-
-                <div class="pill-row-gap pill-row-gap--end" data-blockidx="${index}" data-insertidx="${options.length}" ondragover="window.handleRowDragOver(event)" ondragleave="window.handleRowDragLeave(event)" ondrop="window.handleRowDrop(event, ${index}, ${options.length})">
-
-                    <button class="tally-dashed-add" title="Adicionar nova linha" onclick="window.addOption(${index})"><i class="ph ph-plus"></i></button>
-
-                </div>
-
-            `;
-
-        } else if (block.type === 'text-short' || block.type === 'text-long') {
-
-            const placeholder = block.placeholder || 'Resposta...';
-
-            const height = block.type === 'text-long' ? 'min-height: 100px;' : '';
-
-            html = `
-
-                <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="margin-bottom: 8px; ${qStyle}">${block.question || 'Nova Pergunta'}</div>
-
-                <div class="fake-input" style="${height}">${placeholder}</div>
-
-            `;
-
-        } else if (block.type === 'date') {
-
-            const today = new Date().toISOString().split('T')[0];
-
-            html = `
-
-                <div class="block-question ${qClass}" contenteditable="true" data-field="question" style="margin-bottom: 8px; ${qStyle}">${block.question || 'Data'}</div>
-
-                <input type="date" class="fake-input" style="padding: 10px; margin-top: 4px; font-family: inherit; font-size: 15px; width: fit-content; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #f8fafc; color-scheme: dark;" value="${today}" disabled>
-
-            `;
-
-        } else {
-
-            // Outros tipos de blocos simplificados...
-
-            html = `<div class="block-text" contenteditable="true" data-field="content">${block.content || ''}</div>`;
-
-        }
-
-
-
-
-
-
-
-        const isSticky = block.isSticky !== false;
-
-
-
-        let toolsHtml = `<div class="block-tools-inline">`;
-
-        toolsHtml += `
-
-            <div class="tool-btn color-trigger" onclick="window.openColorPicker(event, 'title', ${index})" title="Cor de Fundo"><i class="ph ph-palette"></i></div>
-
-            <div class="tool-btn style-trigger" onclick="window.toggleTitleStyle(event, ${index})" title="Mudar Estilo (Texto / Barra)"><i class="ph ph-arrows-out-line-horizontal"></i></div>
-
-            <div class="tool-btn size-trigger" onclick="window.toggleTitleSize(event, ${index})" title="Mudar Tamanho"><i class="ph ph-text-aa"></i></div>
-
-            <div class="tool-btn sticky-trigger" onclick="window.toggleBlockSticky(event, ${index})" title="Fixar Cabeçalho (Sticky)" style="cursor: pointer; transition: color 0.2s; ${isSticky ? 'color: #3b82f6;' : 'color: #cbd5e1;'}">
-
-                <i class="${isSticky ? 'ph-fill' : 'ph'} ph-push-pin"></i>
-
-            </div>
-
-        `;
-
-
-
-
-
-        // Render the image absolute wrapper if this block contains an image
-
-        if (block.image) {
-
-            html += `
-
-                <div class="block-image-wrapper" 
-
-                     id="image-wrapper-${index}"
-
-                     style="left: ${block.imageX}px; top: ${block.imageY}px; width: ${block.imageWidth}px; height: ${block.imageHeight}px;"
-
-                     onmousedown="window.startImageDrag(event, ${index})">
-
-                    <img src="${block.image}" style="width: 100%; height: 100%; object-fit: contain;">
-
-                    <div class="image-resize-handle" onmousedown="window.startImageResize(event, ${index})"></div>
-
-                    <div class="image-delete-btn" onclick="window.removeBlockImage(event, ${index})" title="Eliminar imagem"><i class="ph ph-trash"></i></div>
-
-                </div>
-
-            `;
-
-        }
-
-        
-
-
-
-        toolsHtml += `
-
-            <div class="tool-btn image-trigger" onclick="window.triggerBlockImage(event, ${index})" title="Inserir Imagem"><i class="ph ph-image"></i></div>
-
-            <div class="tool-btn drag-handle"><i class="ph ph-dots-six-vertical"></i></div>
-
-            <div class="tool-btn duplicate-btn" onclick="window.duplicateBlockDirect(event, ${index})" title="Duplicar Bloco"><i class="ph ph-copy"></i></div>
-
-            <div class="tool-btn add-below" title="Adicionar Bloco Abaixo"><i class="ph ph-plus"></i></div>
-
-            <div class="tool-btn delete-btn"><i class="ph ph-trash"></i></div>
-
-        </div>`;
-
-
-
-        blockEl.innerHTML = toolsHtml + html;
-
-
-
-        // Force relative coordinates and adjust dynamic height to fit image bounding box
-
-        blockEl.style.position = 'relative';
-
-        window.adjustBlockHeightForImage(blockEl, block);
-
-
-
-        blockEl.addEventListener('mousemove', (e) => {
-
-            if (e.target.closest('.block-tools-inline')) return;
-
-            const tools = blockEl.querySelector('.block-tools-inline');
-
-            if (!tools) return;
-
-            const rect = blockEl.getBoundingClientRect();
-
-            const toolsHeight = tools.offsetHeight || 160;
-
-
-
-            if (rect.height > toolsHeight + 12) {
-
-                const mouseY = e.clientY - rect.top;
-
-                let targetTop = mouseY - toolsHeight / 2;
-
-                const minTop = 6;
-
-                const maxTop = rect.height - toolsHeight - 6;
-
-                targetTop = Math.max(minTop, Math.min(targetTop, maxTop));
-
-                tools.style.top = `${targetTop}px`;
-
-            } else {
-
-                tools.style.top = '6px';
-
-            }
-
-        });
-
-
-
-        // Toolbar: JS-driven show/hide so clicking a tool doesn't dismiss the bar
-
-        let toolbarHideTimer = null;
-
-        const showTools = () => {
-
-            currentHoveredBlockForTools = index;
-
-            if (toolbarHideTimer) { clearTimeout(toolbarHideTimer); toolbarHideTimer = null; }
-
-            const tools = blockEl.querySelector('.block-tools-inline');
-
-            
-
-            document.querySelectorAll('.block-tools-inline').forEach(t => {
-
-                if (t !== tools) {
-
-                    t.style.opacity = '0';
-
-                    t.style.visibility = 'hidden';
-
-                    t.style.pointerEvents = 'none';
-
-                    t.style.transitionDelay = '0s';
-
-                }
-
-            });
-
-
-
-            if (tools) {
-
-                tools.style.opacity = '1';
-
-                tools.style.visibility = 'visible';
-
-                tools.style.pointerEvents = 'auto';
-
-                tools.style.transitionDelay = '0s';
-
-            }
-
-        };
-
-        const hideTools = () => {
-
-            if (!document.contains(blockEl)) return;
-
-            if (currentHoveredBlockForTools === index) currentHoveredBlockForTools = null;
-
-            toolbarHideTimer = setTimeout(() => {
-
-                const tools = blockEl.querySelector('.block-tools-inline');
-
-                if (tools && currentHoveredBlockForTools !== index) {
-
-                    tools.style.opacity = '0';
-
-                    tools.style.visibility = 'hidden';
-
-                    tools.style.pointerEvents = 'none';
-
-                    tools.style.transitionDelay = '0.2s';
-
-                }
-
-            }, 100);
-
-        };
-
-        blockEl.addEventListener('mouseenter', showTools);
-
-        blockEl.addEventListener('mouseleave', hideTools);
-
-        const toolsEl = blockEl.querySelector('.block-tools-inline');
-
-        if (toolsEl) {
-
-            toolsEl.addEventListener('mouseenter', showTools);
-
-            toolsEl.addEventListener('mouseleave', hideTools);
-
-        }
-
-        
-
-        if (currentHoveredBlockForTools === index) {
-
-            showTools();
-
-        }
-
-
-
-        blockEl.querySelector('.delete-btn').addEventListener('click', () => {
-
-            window.editorSchema.splice(index, 1);
-
-            window.renderCanvas();
-
-            window.saveDebounce();
-
-        });
-
-
-
-        blockEl.querySelector('.add-below').addEventListener('click', (e) => {
-
-            console.log("Add below clicked for block index:", index);
-
-            e.stopPropagation();
-
-            const rect = blockEl.querySelector('.add-below').getBoundingClientRect();
-
-            const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
-
-            window.hoverBlockIndex = index;
-
-            slashMenu.classList.remove('hidden');
-
-            slashMenu.style.top = `${rect.top - editorPageRect.top + 30}px`;
-
-            slashMenu.style.left = `${rect.left - editorPageRect.left + 30}px`;
-
-        });
-
-
-
-        // Block Drag and Drop events
-
-        blockEl.draggable = true;
-
-        blockEl.addEventListener('dragstart', (e) => window.handleBlockDragStart(e, index));
-
-        blockEl.addEventListener('dragover', window.handleBlockDragOver);
-
-        blockEl.addEventListener('dragleave', window.handleBlockDragLeave);
-
-        blockEl.addEventListener('drop', (e) => window.handleBlockDrop(e, index));
-
-        blockEl.addEventListener('dragend', window.handleBlockDragEnd);
-
-
-
-        // Attach listeners for contenteditable elements
-
-        const editables = blockEl.querySelectorAll('[contenteditable="true"]');
-
-        editables.forEach(ed => {
-
-            ed.addEventListener('blur', (e) => {
-
-                const field = ed.dataset.field;
-
-                window.editorSchema[index][field] = e.target.textContent;
-
-                window.saveDebounce();
-
-            });
-
-        });
-
-
-
-        // Attach listeners for pill inputs
-        const pillInputs = blockEl.querySelectorAll('.pill-input');
-        pillInputs.forEach(input => {
-            input.addEventListener('keydown', (e) => {
-                if (e.key === 'Enter') {
-                    e.preventDefault();
-                    input.blur();
-                }
-            });
-
-            input.addEventListener('blur', (e) => {
-                const r = parseInt(input.dataset.rowidx);
-                const c = parseInt(input.dataset.colidx);
-                const val = (e.target.value !== undefined ? e.target.value : e.target.innerText).trim();
-                if (typeof window.editorSchema[index].options[r][c] === 'object') {
-                    window.editorSchema[index].options[r][c].text = val;
-                } else {
-                    window.editorSchema[index].options[r][c] = val;
-                }
-                window.saveDebounce();
-            });
-
-            input.addEventListener('input', (e) => {
-                const r = parseInt(input.dataset.rowidx);
-                const c = parseInt(input.dataset.colidx);
-                const val = (e.target.value !== undefined ? e.target.value : e.target.innerText).trim();
-                if (typeof window.editorSchema[index].options[r][c] === 'object') {
-                    window.editorSchema[index].options[r][c].text = val;
-                } else {
-                    window.editorSchema[index].options[r][c] = val;
-                }
-                window.checkAndSplitRows();
-                window.adjustGlobalDynamicWidths();
-                window.fitText(e.target);
-            });
-        });
-
-        blocksContainer.appendChild(blockEl);
-
-    });
-
-
-
-    // Trigger auto-split
-
-    setTimeout(() => {
-        window.checkAndSplitRows();
-        window.adjustGlobalDynamicWidths();
-    }, 300);
-
-    // Calculate global dynamic widths if active
-    window.adjustGlobalDynamicWidths();
-
-    // Auto-fit all pill input texts
-    document.querySelectorAll('.pill-input').forEach(el => window.fitText(el));
-
-    // Refresh sidebar settings if open
-    window.renderSidebarSettings();
-
-};
-
-
-
-window.saveDebounce = function () {
-
-    hasUnsavedChanges = true;
-
-    const saveStatus = document.getElementById('save-status');
-
-    if (saveStatus) saveStatus.textContent = "A guardar...";
-
-    clearTimeout(saveTimer);
-
-    saveTimer = setTimeout(async () => {
-
-        try {
-
-            const formRef = doc(db, "forms", currentFormId);
-
-            const safeSchema = JSON.parse(JSON.stringify(window.editorSchema));
-
-            safeSchema.forEach(block => { if (block.options) block.options = JSON.stringify(block.options); });
-
-            await setDoc(formRef, { 
-                schema: safeSchema, 
-                pillSizing: window.pillSizingConfig,
-                updatedAt: serverTimestamp() 
-            }, { merge: true });
-
-            if (saveStatus) saveStatus.textContent = "Guardado";
-
-            hasUnsavedChanges = false;
-
-        } catch (e) { console.error(e); }
-
-    }, 1500);
-
-};
-
-
-
-window.checkAndSplitRows = function () {
-
-    let needsReRender = false;
-
-    let focusedPill = null;
-
-    
-
-    // Guardar foco e seleção de texto antes de re-renderizar
-
-    const activeEl = document.activeElement;
-
-    if (activeEl && activeEl.classList.contains('pill-input')) {
-
-        focusedPill = {
-
-            blockIdx: parseInt(activeEl.dataset.blockidx),
-
-            rowIdx: parseInt(activeEl.dataset.rowidx),
-
-            colIdx: parseInt(activeEl.dataset.colidx),
-
-            selectionStart: activeEl.selectionStart,
-
-            selectionEnd: activeEl.selectionEnd
-
-        };
-
-    }
-
-
-
-    document.querySelectorAll('.pill-row').forEach(rowEl => {
-
-        const blockIdx = parseInt(rowEl.dataset.blockidx);
-
-        const rowIdx = parseInt(rowEl.dataset.rowidx);
-
-        const pills = Array.from(rowEl.querySelectorAll('.pill-cell-wrapper'));
-
-        if (pills.length <= 1) return;
-
-        
-
-        let currentWidth = 0;
-
-        let splitIndex = -1;
-
-        
-
-        const editorPage = document.querySelector('.editor-page');
-
-        const availableWidth = editorPage ? (editorPage.clientWidth - 80) : 720;
-
-        
-
-        pills.forEach((p, i) => {
-
-            let w = p.getBoundingClientRect().width;
-
-            const editWrapper = p.querySelector('.pill-edit-wrapper');
-
-            if (editWrapper && editWrapper.matches(':hover')) {
-
-                w -= 84; // Ignora o tamanho extra dos botões de hover
-
-            }
-
-            
-
-            currentWidth += w;
-
-            if (i > 0) {
-
-                currentWidth += 8; // gap
-
-            }
-
-            
-
-            if (currentWidth > availableWidth && splitIndex === -1 && i > 0) {
-
-                splitIndex = i;
-
-            }
-
-        });
-
-        
-
-        if (splitIndex !== -1) {
-
-            const block = window.editorSchema[blockIdx];
-
-            const newRow = block.options[rowIdx].splice(splitIndex);
-
-            block.options.splice(rowIdx + 1, 0, newRow);
-
-            
-
-            // Ajustar coordenadas do input focado se tiver sido movido para a nova linha
-
-            if (focusedPill && focusedPill.blockIdx === blockIdx && focusedPill.rowIdx === rowIdx && focusedPill.colIdx >= splitIndex) {
-
-                focusedPill.rowIdx = rowIdx + 1;
-
-                focusedPill.colIdx -= splitIndex;
-
-            }
-
-            
-
-            needsReRender = true;
-
-        }
-
-    });
-
-    
-
-    if (needsReRender) {
-
-        window.renderCanvas();
-
-        
-
-        // Restaurar foco e cursor
-
-        if (focusedPill) {
-
-            setTimeout(() => {
-
-                const targetInput = document.querySelector(
-
-                    `.pill-input[data-blockidx="${focusedPill.blockIdx}"][data-rowidx="${focusedPill.rowIdx}"][data-colidx="${focusedPill.colIdx}"]`
-
-                );
-
-                if (targetInput) {
-                    targetInput.focus();
-                    if (typeof targetInput.setSelectionRange === 'function') {
-                        targetInput.setSelectionRange(focusedPill.selectionStart, focusedPill.selectionEnd);
-                    } else {
-                        const range = document.createRange();
-                        const sel = window.getSelection();
-                        range.selectNodeContents(targetInput);
-                        range.collapse(false);
-                        sel.removeAllRanges();
-                        sel.addRange(range);
-                    }
-                }
-
-            }, 50);
-
-        }
-
-    }
-
-};
-
-
-
-window.toggleBlockRequired = function (e, index) {
-
-    e.stopPropagation();
-
-    window.editorSchema[index].required = !window.editorSchema[index].required;
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-
-
-window.addOptionToRow = function (b, r) {
-
-    const block = window.editorSchema[b];
-
-    if (!block.options[r]) block.options[r] = [];
-
-    block.options[r].push(block.type === 'counter' ? { text: 'Novo Item', target: 0 } : { text: 'Opção' });
-
-    window.renderCanvas(); window.saveDebounce();
-
-};
-
-
-
-window.addOption = function (b) {
-
-    const block = window.editorSchema[b];
-
-    if (!block.options) block.options = [];
-
-    block.options.push([block.type === 'counter' ? { text: 'Novo Item', target: 0 } : { text: 'Opção' }]);
-
-    window.renderCanvas(); window.saveDebounce();
-
-};
-
-
-
-window.removeOption = function (b, r, c) {
-
-    window.editorSchema[b].options[r].splice(c, 1);
-
-    if (window.editorSchema[b].options[r].length === 0) {
-
-        window.editorSchema[b].options.splice(r, 1);
-
-    }
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-window.duplicateOption = function (b, r, c) { const copy = JSON.parse(JSON.stringify(window.editorSchema[b].options[r][c])); window.editorSchema[b].options.splice(r + 1, 0, [copy]); window.renderCanvas(); window.saveDebounce(); };
-
-window.setPillTarget = function (b, r, c, v) { window.editorSchema[b].options[r][c].target = parseInt(v) || 0; window.saveDebounce(); };
-
-window.setPillColor = function (b, r, c, color) {
-
-    let opt = window.editorSchema[b].options[r][c];
-
-    if (typeof opt !== 'object' || opt === null) {
-
-        opt = { text: String(opt) };
-
-        window.editorSchema[b].options[r][c] = opt;
-
-    }
-
-    opt.color = color;
-
-    openPaletteOption = opt;
-
-    openPaletteTitleIdx = null;
-
-    window.applyColorToDOM('pill', b, r, c, color);
-
-    window.saveDebounce();
-
-};
-
-// Local palette togglers replaced by global openColorPicker
-
-window.setTitleColor = function (b, color) {
-
-    window.editorSchema[b].blockColor = color;
-
-    openPaletteTitleIdx = b;
-
-    openPaletteOption = null;
-
-    window.applyColorToDOM('title', b, undefined, undefined, color);
-
-    window.saveDebounce();
-
-};
-
-window.toggleTitleStyle = function (e, b) {
-
-    e.stopPropagation();
-
-    const styles = ['full', 'inline', 'border'];
-
-    const current = window.editorSchema[b].blockStyle || 'full';
-
-    const nextIdx = (styles.indexOf(current) + 1) % styles.length;
-
-    window.editorSchema[b].blockStyle = styles[nextIdx];
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-window.toggleTitleSize = function (e, b) {
-
-    e.stopPropagation();
-
-    const sizes = ['small', 'medium', 'large'];
-
-    const current = window.editorSchema[b].blockSize || 'large';
-
-    const nextIdx = (sizes.indexOf(current) + 1) % sizes.length;
-
-    window.editorSchema[b].blockSize = sizes[nextIdx];
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-window.toggleBlockSticky = function (e, b) {
-
-    e.stopPropagation();
-
-    const block = window.editorSchema[b];
-
-    block.isSticky = !(block.isSticky !== false);
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-window.duplicateBlockDirect = function (e, index) {
-
-    if (e) e.stopPropagation();
-
-    const blockToDuplicate = JSON.parse(JSON.stringify(window.editorSchema[index]));
-
-    window.editorSchema.splice(index + 1, 0, blockToDuplicate);
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-
-
-// Spectrum functions moved to color-picker.js
-
-
-
-
-
-
-
-onAuthStateChanged(auth, async (user) => {
-
-    if (!user) {
-        try { await signInAnonymously(auth); } catch(e) {}
-    }
-
-    const formSnap = await getDoc(doc(db, "forms", currentFormId));
-
-    if (formSnap.exists()) {
-
-        const data = formSnap.data();
-
-        window.editorSchema = data.schema || [];
-
-        window.editorSchema.forEach(block => { if (typeof block.options === 'string') block.options = JSON.parse(block.options); });
-
-
-        // Load pill sizing config
-        if (data.pillSizing) {
-            window.pillSizingConfig = data.pillSizing;
-            if (!window.pillSizingConfig.mode) window.pillSizingConfig.mode = 'global';
-            if (!window.pillSizingConfig.type) window.pillSizingConfig.type = 'dynamic';
-            if (!window.pillSizingConfig.sharedWidth) window.pillSizingConfig.sharedWidth = 200;
-            if (!window.pillSizingConfig.sharedHeight) window.pillSizingConfig.sharedHeight = 42;
-        } else {
-            window.pillSizingConfig = {
-                mode: 'global',
-                type: 'dynamic',
-                sharedWidth: 200,
-                sharedHeight: 42
-            };
-        }
-
-        // Sync sidebar inputs to match loaded settings
-        window.syncSidebarInputs();
-
-        window.renderCanvas();
-
-    }
-
-});
-
-
-
-// ==========================================
-
-// ADDING BLOCKS (Slash Menu / Plus Button)
-
-// ==========================================
-
-const addBlockEndBtn = document.getElementById('add-block-end');
-
-const slashMenu = document.getElementById('slash-menu');
-
-window.hoverBlockIndex = null;
-
-
-
-if (addBlockEndBtn && slashMenu) {
-
-    addBlockEndBtn.addEventListener('click', (e) => {
-
-        e.stopPropagation();
-
-        window.hoverBlockIndex = null;
-
-        const rect = addBlockEndBtn.getBoundingClientRect();
-
-        const editorPageRect = document.querySelector('.editor-page').getBoundingClientRect();
-
-        slashMenu.classList.remove('hidden');
-
-        slashMenu.style.top = `${rect.bottom - editorPageRect.top + 10}px`;
-
-        slashMenu.style.left = `${rect.left - editorPageRect.left}px`;
-
-    });
-
-
-
-    document.addEventListener('click', (e) => {
-
-        if (ignoreNextClick) {
-
-            ignoreNextClick = false;
-
-            return;
-
-        }
-
-
-
-        if (Date.now() - lastInternalRender < 300) return;
-
-
-
-        if (!e.target.closest('.pill-palette') && !e.target.closest('.color-trigger') && !e.target.closest('.pill-edit-wrapper') && !e.target.closest('.tool-btn')) {
-
-            document.querySelectorAll('.pill-palette').forEach(p => p.classList.add('hidden'));
-
-            openPaletteOption = null;
-
-            openPaletteTitleIdx = null;
-
-        }
-
-
-
-        if (!slashMenu.classList.contains('hidden') && !e.target.closest('#slash-menu') && !e.target.closest('#add-block-end')) {
-
-            slashMenu.classList.add('hidden');
-
-            const hoverLine = document.getElementById('hover-insert-line');
-
-            if (hoverLine) hoverLine.classList.remove('visible');
-
-        }
-
-    });
-
-
-
-    const slashItems = document.querySelectorAll('.slash-item');
-
-    slashItems.forEach(item => {
-
-        item.addEventListener('click', () => {
-
-            const type = item.dataset.type;
-
-            window.appendNewBlock(type);
-
-            slashMenu.classList.add('hidden');
-
-            const hoverLine = document.getElementById('hover-insert-line');
-
-            if (hoverLine) hoverLine.classList.remove('visible');
-
-        });
-
-    });
-
-}
-
-
-
-window.appendNewBlock = function (type) {
-
-    let actualType = type;
-
-    let blockSize = 'large';
-
-    let initialContent = '';
-
-
-
-    if (type === 'title-h1') {
-
-        actualType = 'title';
-
-        blockSize = 'large';
-
-        initialContent = 'Título Principal';
-
-    } else if (type === 'title-h2') {
-
-        actualType = 'title';
-
-        blockSize = 'medium';
-
-        initialContent = 'Título Médio';
-
-    } else if (type === 'title-h3') {
-
-        actualType = 'title';
-
-        blockSize = 'small';
-
-        initialContent = 'Título Pequeno';
-
-    }
-
-
-
-    const newBlock = { type: actualType, question: '', content: initialContent, blockSize: blockSize };
-
-    if (actualType === 'choice-single' || actualType === 'choice-multi') {
-
-        newBlock.options = [[{ text: 'Opção 1' }]];
-
-    }
-
-    if (actualType === 'counter') {
-
-        newBlock.target = 0;
-
-        newBlock.question = 'Novo Item de Inventário';
-
-        newBlock.options = [[{ text: 'Novo Item', target: 0 }]];
-
-    }
-
-
-
-    if (window.hoverBlockIndex !== null && window.hoverBlockIndex !== undefined) {
-
-        window.editorSchema.splice(window.hoverBlockIndex + 1, 0, newBlock);
-
-    } else {
-
-        window.editorSchema.push(newBlock);
-
-    }
-
-    window.hoverBlockIndex = null;
-
-
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-
-
-// ==========================================
-
-// PILL DRAG AND DROP LOGIC (2D GRID)
-
-// ==========================================
-
-let draggedPill = null; // { blockIdx, rowIdx, colIdx, width, height }
-
-let currentDropTarget = null; // The element being hovered
-
-let currentDropZone = null; // 'left', 'right', 'top', 'bottom'
-
-
-
-window.handlePillDragStart = function (e) {
-
-    e.stopPropagation();
-
-    const el = e.currentTarget;
-
-    draggedPill = {
-
-        blockIdx: parseInt(el.dataset.blockidx),
-
-        rowIdx: parseInt(el.dataset.rowidx),
-
-        colIdx: parseInt(el.dataset.colidx),
-
-        width: el.offsetWidth,
-
-        height: el.offsetHeight
-
-    };
-
-    e.dataTransfer.effectAllowed = 'move';
-
-    e.dataTransfer.setData('text/plain', 'pill');
-
-    setTimeout(() => { el.style.opacity = '0.3'; }, 0);
-
-};
-
-
-
-window.handlePillDragOver = function (e) {
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-
-
-    const target = e.currentTarget; // pill-cell-wrapper
-
-    const pillEditWrapper = target.querySelector('.pill-edit-wrapper');
-
-    const row = target.closest('.pill-row');
-
-    if (!row || !pillEditWrapper) return;
-
-
-
-    const rect = pillEditWrapper.getBoundingClientRect();
-
-    const x = e.clientX - rect.left;
-
-    const y = e.clientY - rect.top;
-
-
-
-    let zone;
-
-    if (y < 5) zone = 'drop-top';
-
-    else if (y > rect.height - 5) zone = 'drop-bottom';
-
-    else if (x < rect.width / 2) zone = 'drop-left';
-
-    else zone = 'drop-right';
-
-
-
-    if (currentDropTarget === pillEditWrapper && currentDropZone === zone) return;
-
-
-
-    if (currentDropTarget) {
-
-        currentDropTarget.classList.remove('drop-left', 'drop-right', 'drop-top', 'drop-bottom');
-
-    }
-
-
-
-    currentDropTarget = pillEditWrapper;
-
-    currentDropZone = zone;
-
-    pillEditWrapper.classList.add(zone);
-
-
-
-    document.getElementById('pill-drag-ghost')?.remove();
-
-
-
-    if (zone === 'drop-left' || zone === 'drop-right') {
-
-        const ghost = document.createElement('div');
-
-        ghost.id = 'pill-drag-ghost';
-
-        ghost.style.pointerEvents = 'none';
-
-        ghost.style.width = (draggedPill?.width || 100) + 'px';
-
-        ghost.style.height = (draggedPill?.height || 38) + 'px';
-
-        ghost.style.borderRadius = '999px';
-
-        ghost.style.background = 'rgba(59,130,246,0.15)';
-
-        ghost.style.border = '2px dashed #3b82f6';
-
-        ghost.style.flexShrink = '0';
-
-        ghost.style.display = 'inline-flex';
-
-        ghost.style.alignItems = 'center';
-
-        ghost.style.justifyContent = 'center';
-
-        ghost.style.fontSize = '13px';
-
-        ghost.style.color = 'rgba(59,130,246,0.6)';
-
-        if (zone === 'drop-left') {
-
-            row.insertBefore(ghost, target);
-
-        } else {
-
-            target.after(ghost);
-
-        }
-
-    }
-
-};
-
-
-
-window.handlePillDragLeave = function (e) { };
-
-
-
-window.handlePillDrop = function (e) {
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-
-
-    const action = currentDropZone?.replace('drop-', '');
-
-    const targetEl = currentDropTarget ? currentDropTarget.closest('.pill-cell-wrapper') : null;
-
-
-
-    document.getElementById('pill-drag-ghost')?.remove();
-
-    if (currentDropTarget) {
-
-        currentDropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
-
-    }
-
-
-
-    if (!draggedPill || !targetEl || !action) {
-
-        console.warn("handlePillDrop aborted: missing draggedPill, targetEl, or action");
-
-        draggedPill = null;
-
-        currentDropTarget = null;
-
-        currentDropZone = null;
-
-        return;
-
-    }
-
-
-
-    const tBlockIdx = parseInt(targetEl.dataset.blockidx);
-
-    const tRowIdx = parseInt(targetEl.dataset.rowidx);
-
-    const tColIdx = parseInt(targetEl.dataset.colidx);
-
-
-
-    if (draggedPill.blockIdx === tBlockIdx) {
-
-        const options = window.editorSchema[tBlockIdx].options;
-
-        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];
-
-
-
-        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
-
-        let adjustedRowIdx = tRowIdx;
-
-        let adjustedColIdx = tColIdx;
-
-
-
-        if (options[draggedPill.rowIdx].length === 0) {
-
-            options.splice(draggedPill.rowIdx, 1);
-
-            if (draggedPill.rowIdx < adjustedRowIdx) adjustedRowIdx--;
-
-        } else if (draggedPill.rowIdx === adjustedRowIdx && draggedPill.colIdx < adjustedColIdx) {
-
-            adjustedColIdx--;
-
-        }
-
-
-
-        if (action === 'left') {
-
-            options[adjustedRowIdx].splice(adjustedColIdx, 0, draggedItem);
-
-        } else if (action === 'right') {
-
-            options[adjustedRowIdx].splice(adjustedColIdx + 1, 0, draggedItem);
-
-        } else if (action === 'top') {
-
-            options.splice(adjustedRowIdx, 0, [draggedItem]);
-
-        } else if (action === 'bottom') {
-
-            options.splice(adjustedRowIdx + 1, 0, [draggedItem]);
-
-        }
-
-
-
-        window.renderCanvas();
-
-        window.saveDebounce();
-
-    }
-
-
-
-    draggedPill = null;
-
-    currentDropTarget = null;
-
-    currentDropZone = null;
-
-};
-
-
-
-window.handlePillDragEnd = function (e) {
-
-    e.currentTarget.style.opacity = '1';
-
-    document.getElementById('pill-drag-ghost')?.remove();
-
-    setTimeout(() => {
-
-        if (currentDropTarget) {
-
-            currentDropTarget.classList.remove('drop-top', 'drop-bottom', 'drop-left', 'drop-right');
-
-        }
-
-        currentDropTarget = null;
-
-        currentDropZone = null;
-
-        draggedPill = null;
-
-    }, 50);
-
-};
-
-
-
-window.handlePillRowDragOver = function (e) {
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-    if (draggedPill) e.dataTransfer.dropEffect = 'move';
-
-};
-
-
-
-window.handlePillRowDrop = function (e, blockIdx, rowIdx) {
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-
-
-    // If we have a tracked drop target from the last pill dragover, do the pill-level insertion
-
-    if (draggedPill && currentDropTarget && currentDropZone) {
-
-        window.handlePillDrop(e);
-
-    }
-
-};
-
-
-
-window.handleRowDragOver = function (e) {
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-    if (!draggedPill) return;
-
-    e.currentTarget.classList.add('drag-over');
-
-    e.dataTransfer.dropEffect = 'move';
-
-};
-
-
-
-window.handleRowDragLeave = function (e) {
-
-    e.currentTarget.classList.remove('drag-over');
-
-};
-
-
-
-window.handleRowDrop = function (e, blockIdx, targetRowIdx) {
-
-    e.stopPropagation();
-
-    e.preventDefault();
-
-
-
-    const target = e.currentTarget;
-
-    target.style.borderColor = 'transparent';
-
-    target.style.background = 'transparent';
-
-    target.classList.remove('drag-over');
-
-    document.getElementById('pill-drag-ghost')?.remove();
-
-
-
-    if (!draggedPill) return;
-
-
-
-    const tBlockIdx = blockIdx !== undefined ? blockIdx : parseInt(target.dataset.blockidx);
-
-
-
-    if (draggedPill.blockIdx === tBlockIdx) {
-
-        const options = window.editorSchema[draggedPill.blockIdx].options;
-
-        const draggedItem = options[draggedPill.rowIdx][draggedPill.colIdx];
-
-
-
-        options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
-
-        let adjustedTargetRow = targetRowIdx !== undefined ? targetRowIdx : options.length;
-
-
-
-        if (options[draggedPill.rowIdx].length === 0) {
-
-            options.splice(draggedPill.rowIdx, 1);
-
-            if (draggedPill.rowIdx < adjustedTargetRow) adjustedTargetRow--;
-
-        }
-
-
-
-        options.splice(adjustedTargetRow, 0, [draggedItem]);
-
-
-
-        window.renderCanvas();
-
-        window.saveDebounce();
-
-    }
-
-    draggedPill = null;
-
-    currentDropTarget = null;
-
-    currentDropZone = null;
-
-};
-
-
-
-// ==========================================
-
-// BLOCK DRAG AND DROP
-
-// ==========================================
-
-window.draggedBlockIndex = null;
-
-
-
-window.handleBlockDragStart = function (e, index) {
-
-    window.draggedBlockIndex = index;
-
-    e.dataTransfer.effectAllowed = 'move';
-
-    e.dataTransfer.setData('text/plain', index);
-
-    setTimeout(() => e.target.classList.add('dragging'), 0);
-
-};
-
-
-
-window.handleBlockDragOver = function (e) {
-
-    e.preventDefault();
-
-    e.dataTransfer.dropEffect = 'move';
-
-    e.currentTarget.classList.add('drag-over');
-
-};
-
-
-
-window.handleBlockDragLeave = function (e) {
-
-    e.currentTarget.classList.remove('drag-over');
-
-};
-
-
-
-window.handleBlockDrop = function (e, targetIndex) {
-
-    e.stopPropagation();
-
-    e.currentTarget.classList.remove('drag-over');
-
-
-
-    if (window.draggedBlockIndex !== null && window.draggedBlockIndex !== targetIndex) {
-
-        const item = window.editorSchema.splice(window.draggedBlockIndex, 1)[0];
-
-        window.editorSchema.splice(targetIndex, 0, item);
-
-        window.renderCanvas();
-
-        window.saveDebounce();
-
-    }
-
-};
-
-
-
-window.handleBlockDragEnd = function (e) {
-
-    e.currentTarget.classList.remove('dragging');
-
-    const blocks = document.querySelectorAll('.tally-block');
-
-    blocks.forEach(b => b.classList.remove('drag-over'));
-
-    window.draggedBlockIndex = null;
-
-};
-
-
-
-window.publishForm = async function (btn) {
-
-    const originalContent = btn.innerHTML;
-
-    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A Publicar...';
-
-    btn.disabled = true;
-
-
-
-    clearTimeout(saveTimer);
-
-    try {
-
-        let titleBlock = window.editorSchema.find(b => b.type === 'title');
-
-        let formTitle = titleBlock ? (titleBlock.content || 'Novo Inventário') : 'Novo Inventário';
-
-
-
-        const formRef = doc(db, "forms", currentFormId);
-
-
-
-        const safeSchema = JSON.parse(JSON.stringify(window.editorSchema));
-
-        safeSchema.forEach(block => {
-
-            if (block.options && Array.isArray(block.options)) {
-
-                block.options = JSON.stringify(block.options);
-
-            }
-
-        });
-
-
-
-        await setDoc(formRef, {
-
-            schema: safeSchema,
-
-            title: formTitle,
-
-            updatedAt: serverTimestamp()
-
-        }, { merge: true });
-
-
-
-        window.location.href = "dashboard.html";
-
-    } catch (e) {
-
-        console.error("Error publishing form:", e);
-
-        alert("Erro ao publicar o formulário. Veja a consola.");
-
-        btn.innerHTML = originalContent;
-
-        btn.disabled = false;
-
-    }
-
-};
-
-
-
-document.addEventListener('DOMContentLoaded', () => {
-
-    const btnPreview = document.getElementById('btn-preview');
-
-    if (btnPreview) {
-
-        btnPreview.addEventListener('click', () => {
-
-            if (!currentFormId) return;
-
-            window.open(`inventory_view.html?id=${currentFormId}&preview=true`, '_blank');
-
-        });
-
-    }
-
-});
-
-
-
-// --- BLOCK IMAGE ENGINE (DRAG, RESIZE, CLIPBOARD, DRAG & DROP) ---
-
-let activeImageBlockIdx = null;
-
-
-
-function injectImageModal() {
-
-    if (document.getElementById('image-upload-modal')) return;
-
-    const modalDiv = document.createElement('div');
-
-    modalDiv.id = 'image-upload-modal';
-
-    modalDiv.className = 'image-modal hidden';
-
-    modalDiv.onclick = (e) => window.closeImageModal(e);
-
-    modalDiv.innerHTML = `
-
-        <div class="image-modal-content" onclick="event.stopPropagation()">
-
-            <div class="image-modal-header">
-
-                <h3><i class="ph ph-image"></i> Introduzir Imagem</h3>
-
-                <button class="image-modal-close" onclick="window.closeImageModal()"><i class="ph ph-x"></i></button>
-
-            </div>
-
-            <div class="image-modal-body">
-
-                <div class="image-tab-bar">
-
-                    <button class="image-tab-btn active" id="btn-tab-upload" onclick="window.switchImageTab('upload')"><i class="ph ph-upload-simple"></i> Ficheiro / Clipboard</button>
-
-                    <button class="image-tab-btn" id="btn-tab-url" onclick="window.switchImageTab('url')"><i class="ph ph-link"></i> Endereço Web (URL)</button>
-
-                </div>
-
-                
-
-                <div class="image-tab-content" id="image-tab-upload">
-
-                    <div class="image-drop-zone" id="image-drop-zone">
-
-                        <i class="ph ph-cloud-arrow-up" style="font-size: 48px; color: #6366f1; margin-bottom: 12px;"></i>
-
-                        <p style="font-weight: 500; margin-bottom: 4px;">Arraste e solte uma imagem aqui</p>
-
-                        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">ou cole do clipboard (Ctrl+V) ou procure no PC</p>
-
-                        <button class="builder-btn primary" type="button" onclick="document.getElementById('image-file-input').click()"><i class="ph ph-folder-open"></i> Escolher Ficheiro</button>
-
-                        <input type="file" id="image-file-input" accept="image/*" style="display: none;">
-
-                    </div>
-
-                </div>
-
-                
-
-                <div class="image-tab-content hidden" id="image-tab-url">
-
-                    <div style="display: flex; flex-direction: column; gap: 8px;">
-
-                        <label style="font-size: 13px; color: #94a3b8; font-weight: 500;">Link da Imagem</label>
-
-                        <input type="text" id="image-url-input" class="settings-text-input" placeholder="https://exemplo.com/imagem.png" style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 8px 12px; border-radius: 6px;">
-
-                        <button class="builder-btn primary" type="button" onclick="window.applyImageUrl()" style="margin-top: 8px; width: fit-content; align-self: flex-end;"><i class="ph ph-check"></i> Aplicar Link</button>
-
-                    </div>
-
-                </div>
-
-            </div>
-
-        </div>
-
-    `;
-
-    document.body.appendChild(modalDiv);
-
-    
-
-    // Bind Drag & Drop Events
-
-    const dropZone = document.getElementById('image-drop-zone');
-
-    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
-
-    dropZone.ondragleave = () => { dropZone.classList.remove('drag-over'); };
-
-    dropZone.ondrop = (e) => {
-
-        e.preventDefault();
-
-        dropZone.classList.remove('drag-over');
-
-        const file = e.dataTransfer.files[0];
-
-        if (file && file.type.startsWith('image/')) {
-
-            window.processImageFile(file);
-
-        }
-
-    };
-
-    
-
-    // Bind File Input Change
-
-    document.getElementById('image-file-input').onchange = (e) => {
-
-        const file = e.target.files[0];
-
-        if (file) window.processImageFile(file);
-
-    };
-
-    
-
-    // Bind Global Paste Event Inside Modal
-
-    document.getElementById('image-upload-modal').onpaste = (e) => {
-
-        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
-
-        for (const item of items) {
-
-            if (item.type.indexOf('image') !== -1) {
-
-                const file = item.getAsFile();
-
-                window.processImageFile(file);
-
-            }
-
-        }
-
-    };
-
-}
-
-
-
-window.triggerBlockImage = function (e, index) {
-
-    e.stopPropagation();
-
-    activeImageBlockIdx = index;
-
-    injectImageModal();
-
-    
-
-    // Clear url field
-
-    const urlInput = document.getElementById('image-url-input');
-
-    if (urlInput) urlInput.value = '';
-
-    
-
-    // Open Modal
-
-    document.getElementById('image-upload-modal').classList.remove('hidden');
-
-    window.switchImageTab('upload');
-
-};
-
-
-
-window.closeImageModal = function (e) {
-
-    if (e && e.target !== e.currentTarget && e.target.className !== 'image-modal-close' && !e.target.closest('.image-modal-close')) return;
-
-    const modal = document.getElementById('image-upload-modal');
-
-    if (modal) modal.classList.add('hidden');
-
-    activeImageBlockIdx = null;
-
-};
-
-
-
-window.switchImageTab = function (tab) {
-
-    const btnUpload = document.getElementById('btn-tab-upload');
-
-    const btnUrl = document.getElementById('btn-tab-url');
-
-    const contentUpload = document.getElementById('image-tab-upload');
-
-    const contentUrl = document.getElementById('image-tab-url');
-
-    
-
-    if (tab === 'upload') {
-
-        btnUpload.classList.add('active');
-
-        btnUrl.classList.remove('active');
-
-        contentUpload.classList.remove('hidden');
-
-        contentUrl.classList.add('hidden');
-
-    } else {
-
-        btnUpload.classList.remove('active');
-
-        btnUrl.classList.add('active');
-
-        contentUpload.classList.add('hidden');
-
-        contentUrl.classList.remove('hidden');
-
-    }
-
-};
-
-
-
-window.processImageFile = function (file) {
-
-    const reader = new FileReader();
-
-    reader.onload = (e) => {
-
-        window.setBlockImage(activeImageBlockIdx, e.target.result);
-
-        window.closeImageModal();
-
-    };
-
-    reader.readAsDataURL(file);
-
-};
-
-
-
-window.applyImageUrl = function () {
-
-    const url = document.getElementById('image-url-input').value.trim();
-
-    if (url) {
-
-        window.setBlockImage(activeImageBlockIdx, url);
-
-        window.closeImageModal();
-
-    }
-
-};
-
-
-
-window.setBlockImage = function (index, imageSrc) {
-
-    const block = window.editorSchema[index];
-
-    if (!block) return;
-
-    
-
-    block.image = imageSrc;
-
-    block.imageX = block.imageX ?? 10;
-
-    block.imageY = block.imageY ?? 10;
-
-    block.imageWidth = block.imageWidth ?? 200;
-
-    block.imageHeight = block.imageHeight ?? 150;
-
-    
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-
-
-window.removeBlockImage = function (e, index) {
-
-    if (e) e.stopPropagation();
-
-    const block = window.editorSchema[index];
-
-    if (!block) return;
-
-    
-
-    delete block.image;
-
-    delete block.imageX;
-
-    delete block.imageY;
-
-    delete block.imageWidth;
-
-    delete block.imageHeight;
-
-    
-
-    window.renderCanvas();
-
-    window.saveDebounce();
-
-};
-
-
-
-window.adjustBlockHeightForImage = function (blockEl, block) {
-
-    if (!block || !block.image) {
-
-        blockEl.style.minHeight = '';
-
-        return;
-
-    }
-
-    const y = block.imageY || 0;
-
-    const h = parseInt(block.imageHeight) || 150;
-
-    const bottom = y + h;
-
-    blockEl.style.minHeight = Math.max(50, bottom + 16) + 'px';
-
-};
-
-
-
-window.startImageDrag = function (e, index) {
-
-    if (e.button !== 0 || e.target.classList.contains('image-resize-handle') || e.target.closest('.image-delete-btn')) return;
-
-    
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-    
-
-    const block = window.editorSchema[index];
-
-    const wrapper = document.getElementById(`image-wrapper-${index}`);
-
-    const blockEl = wrapper.closest('.tally-block');
-
-    
-
-    const startX = e.clientX;
-
-    const startY = e.clientY;
-
-    const startLeft = block.imageX || 0;
-
-    const startTop = block.imageY || 0;
-
-    
-
-    function onMouseMove(moveEvent) {
-
-        const dx = moveEvent.clientX - startX;
-
-        const dy = moveEvent.clientY - startY;
-
-        
-
-        let newLeft = startLeft + dx;
-
-        let newTop = startTop + dy;
-
-        
-
-        newLeft = Math.max(-50, Math.min(newLeft, 800));
-
-        newTop = Math.max(-20, Math.min(newTop, 600));
-
-        
-
-        wrapper.style.left = newLeft + 'px';
-
-        wrapper.style.top = newTop + 'px';
-
-        
-
-        block.imageX = newLeft;
-
-        block.imageY = newTop;
-
-        
-
-        window.adjustBlockHeightForImage(blockEl, block);
-
-    }
-
-    
-
-    function onMouseUp() {
-
-        window.removeEventListener('mousemove', onMouseMove);
-
-        window.removeEventListener('mouseup', onMouseUp);
-
-        window.saveDebounce();
-
-    }
-
-    
-
-    window.addEventListener('mousemove', onMouseMove);
-
-    window.addEventListener('mouseup', onMouseUp);
-
-};
-
-
-
-window.startImageResize = function (e, index) {
-
-    if (e.button !== 0) return;
-
-    
-
-    e.preventDefault();
-
-    e.stopPropagation();
-
-    
-
-    const block = window.editorSchema[index];
-
-    const wrapper = document.getElementById(`image-wrapper-${index}`);
-
-    const blockEl = wrapper.closest('.tally-block');
-
-    
-
-    wrapper.classList.add('resizing');
-
-    
-
-    const startX = e.clientX;
-
-    const startY = e.clientY;
-
-    const startWidth = wrapper.offsetWidth;
-
-    const startHeight = wrapper.offsetHeight;
-
-    
-
-    function onMouseMove(moveEvent) {
-
-        const dx = moveEvent.clientX - startX;
-
-        const dy = moveEvent.clientY - startY;
-
-        
-
-        const newWidth = Math.max(50, startWidth + dx);
-
-        const newHeight = Math.max(40, startHeight + dy);
-
-        
-
-        wrapper.style.width = newWidth + 'px';
-
-        wrapper.style.height = newHeight + 'px';
-
-        
-
-        block.imageWidth = newWidth;
-
-        block.imageHeight = newHeight;
-
-        
-
-        window.adjustBlockHeightForImage(blockEl, block);
-
-    }
-
-    
-
-    function onMouseUp() {
-
-        wrapper.classList.remove('resizing');
-
-        window.removeEventListener('mousemove', onMouseMove);
-
-        window.removeEventListener('mouseup', onMouseUp);
-
-        window.saveDebounce();
-
-    }
-
-    
-
-    window.addEventListener('mousemove', onMouseMove);
-
-    window.addEventListener('mouseup', onMouseUp);
-
-};
-
-
-
-
-
-// --- Hover Insertion Line Logic between blocks (Notion-style) ---
-
-// Draws a single unified SVG shape: thin line → smooth organic curve → circle with + sign
-
-function initHoverInsertLine() {
-
-    const hoverLine = document.getElementById('hover-insert-line');
-
-    const blocksContainer = document.getElementById('blocks-container');
-
-    const editorPage = document.querySelector('.editor-page');
-
-
-
-    if (!blocksContainer || !hoverLine || !editorPage) return;
-
-
-
-    function buildAndRender() {
-
-        const W = hoverLine.offsetWidth || 700;
-
-        const H = 28;
-
-        const cx = W / 2;
-
-        const cy = H / 2;
-
-        const r = 13;
-
-        const lw = 1;
-
-        const spread = 52;
-
-
-
-        const x1 = cx - r - spread;
-
-        const x2 = cx + r + spread;
-
-        const cTop = cy - lw;
-
-        const cBot = cy + lw;
-
-        const cTop2 = cy - r;
-
-        const cBot2 = cy + r;
-
-        const d = spread * 0.82;
-
-
-
-        const path = [
-
-            `M 0,${cTop}`,
-
-            `L ${x1},${cTop}`,
-
-            `C ${x1 + d},${cTop} ${cx - d},${cTop2} ${cx},${cTop2}`,
-
-            `C ${cx + d},${cTop2} ${x2 - d},${cTop} ${x2},${cTop}`,
-
-            `L ${W},${cTop}`,
-
-            `L ${W},${cBot}`,
-
-            `L ${x2},${cBot}`,
-
-            `C ${x2 - d},${cBot} ${cx + d},${cBot2} ${cx},${cBot2}`,
-
-            `C ${cx - d},${cBot2} ${x1 + d},${cBot} ${x1},${cBot}`,
-
-            `L 0,${cBot} Z`
-
-        ].join(' ');
-
-
-
-        const gid = `hlg_inv_${W}`;
-
-        const ps = 5.5;
-
-
-
-        hoverLine.innerHTML = `
-
-            <svg xmlns="http://www.w3.org/2000/svg"
-
-                 width="${W}" height="${H}"
-
-                 class="hover-line-svg"
-
-                 style="position:absolute;left:0;top:0;pointer-events:none;overflow:visible;">
-
-                <defs>
-
-                    <linearGradient id="${gid}" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
-
-                        <stop offset="0"         stop-color="#3b82f6" stop-opacity="0"/>
-
-                        <stop offset="${W*0.09}" stop-color="#3b82f6" stop-opacity="0.6"/>
-
-                        <stop offset="${W*0.91}" stop-color="#3b82f6" stop-opacity="0.6"/>
-
-                        <stop offset="${W}"      stop-color="#3b82f6" stop-opacity="0"/>
-
-                    </linearGradient>
-
-                </defs>
-
-                <path d="${path}" fill="url(#${gid})" class="hover-line-path"
-
-                      style="transition: filter 0.18s ease;"/>
-
-                <line x1="${cx - ps}" y1="${cy}" x2="${cx + ps}" y2="${cy}"
-
-                      stroke="white" stroke-width="1.8" stroke-linecap="round" pointer-events="none"/>
-
-                <line x1="${cx}" y1="${cy - ps}" x2="${cx}" y2="${cy + ps}"
-
-                      stroke="white" stroke-width="1.8" stroke-linecap="round" pointer-events="none"/>
-
-            </svg>
-
-            <button class="hover-insert-line-btn" title="Adicionar Bloco"></button>
-
-        `;
-
-
-
-        const btn = hoverLine.querySelector('.hover-insert-line-btn');
-
-
-
-        btn.addEventListener('mouseenter', () => {
-
-            const p = hoverLine.querySelector('.hover-line-path');
-
-            if (p) p.style.filter = 'brightness(1.4)';
-
+        blockEl.addEventListener('dragstart', (e) => window.handleBlockDragStart(e, index));
+        blockEl.addEventListener('dragover', (e) => window.handleBlockDragOver(e, index));
+        blockEl.addEventListener('dragleave', (e) => window.handleBlockDragLeave(e, index));
+        blockEl.addEventListener('drop', (e) => window.handleBlockDrop(e, index));
+        blockEl.addEventListener('dragend', (e) => {
+            blockEl.removeAttribute('draggable');
+            window.handleBlockDragEnd(e);
         });
 
-        btn.addEventListener('mouseleave', () => {
-
-            const p = hoverLine.querySelector('.hover-line-path');
-
-            if (p) p.style.filter = '';
-
-            if (!slashMenu.classList.contains('hidden')) return;
-
-            hoverLine.classList.remove('visible');
-
+        // Bindings de edição inline de texto
+        blockEl.querySelectorAll('[contenteditable="true"]').forEach(editable => {
+            editable.addEventListener('blur', (e) => {
+                const field = e.target.dataset.field;
+                const val = e.target.innerText.trim();
+                if (field && editorSchema[index]) {
+                    editorSchema[index][field] = val;
+                    window.saveDebounce();
+                }
+            });
         });
 
-        btn.addEventListener('click', (e) => {
-
-            e.stopPropagation();
-
-            window.hoverBlockIndex = parseInt(hoverLine.dataset.insertAfterIndex);
-
-            const editorPageRect = editorPage.getBoundingClientRect();
-
-            const lineRect = hoverLine.getBoundingClientRect();
-
-            slashMenu.classList.remove('hidden');
-
-            slashMenu.style.top  = `${lineRect.bottom - editorPageRect.top + 8}px`;
-
-            slashMenu.style.left = `${lineRect.left + lineRect.width / 2 - editorPageRect.left - 100}px`;
-
+        // Bindings de inputs de pílulas
+        blockEl.querySelectorAll('.pill-name-input').forEach(input => {
+            input.addEventListener('change', (e) => {
+                const b = parseInt(e.target.dataset.blockidx);
+                const r = parseInt(e.target.dataset.rowidx);
+                const c = parseInt(e.target.dataset.colidx);
+                if (editorSchema[b]?.options?.[r]?.[c]) {
+                    if (typeof editorSchema[b].options[r][c] === 'object') {
+                        editorSchema[b].options[r][c].text = e.target.value;
+                    } else {
+                        editorSchema[b].options[r][c] = { text: e.target.value };
+                    }
+                    window.saveDebounce();
+                }
+            });
         });
 
-    }
-
-
-
-    buildAndRender();
-
-    window.addEventListener('resize', buildAndRender);
-
-
-
-    blocksContainer.addEventListener('mousemove', (e) => {
-
-        if (document.querySelector('.dragging')) {
-
-            hoverLine.classList.remove('visible');
-
-            return;
-
+        // Bindings dos botões da toolbar
+        const settingsBtn = blockEl.querySelector('.block-tools-inline .settings-btn');
+        if (settingsBtn) {
+            settingsBtn.addEventListener('click', (e) => {
+                e.stopPropagation();
+                window.openBlockSettings(index, e.currentTarget);
+            });
         }
 
-        if (!slashMenu.classList.contains('hidden')) return;
-
-
-
-        const blocks = Array.from(blocksContainer.querySelectorAll('.tally-block'));
-
-        if (blocks.length === 0) { hoverLine.classList.remove('visible'); return; }
+        const addBelowBtn = blockEl.querySelector('.block-tools-inline .add-below');
+        if (addBelowBtn) {
+            addBelowBtn.addEventListener('click', (e) => {
+                e.stopPropagation();
+                window.openSlashMenu(e, index);
+            });
+        }
 
+        const deleteBtn = blockEl.querySelector('.block-tools-inline .delete-btn');
+        if (deleteBtn) {
+            deleteBtn.addEventListener('click', (e) => {
+                e.stopPropagation();
+                if (confirm("Eliminar este bloco?")) {
+                    editorSchema.splice(index, 1);
+                    renderCanvas();
+                    window.saveDebounce();
+                }
+            });
+        }
 
+        // Drag handles de pílulas: ativa draggable apenas no mousedown do .pill-drag-handle
+        blockEl.querySelectorAll('.pill-editor-tools .pill-drag-handle').forEach(handle => {
+            handle.addEventListener('mousedown', (e) => {
+                const wrapper = handle.closest('.pill-cell-wrapper');
+                if (wrapper) wrapper.setAttribute('draggable', 'true');
+            });
+        });
 
-        const pageRect = editorPage.getBoundingClientRect();
+        // Pill drag events
+        blockEl.querySelectorAll('.pill-cell-wrapper').forEach(wrapper => {
+            wrapper.addEventListener('dragstart', (e) => {
+                e.stopPropagation();
+                const b = parseInt(wrapper.dataset.blockidx);
+                const r = parseInt(wrapper.dataset.rowidx);
+                const c = parseInt(wrapper.dataset.colidx);
+                e.dataTransfer.setData('text/plain', JSON.stringify({ b, r, c }));
+                wrapper.classList.add('dragging');
+            });
 
-        const mouseY = e.clientY;
+            wrapper.addEventListener('dragend', () => {
+                wrapper.removeAttribute('draggable');
+                wrapper.classList.remove('dragging');
+            });
 
-        const mouseX = e.clientX;
+            wrapper.addEventListener('dragover', (e) => {
+                e.preventDefault();
+                e.stopPropagation();
+            });
 
+            wrapper.addEventListener('drop', (e) => {
+                e.preventDefault();
+                e.stopPropagation();
+                try {
+                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
+                    const targetB = parseInt(wrapper.dataset.blockidx);
+                    const targetR = parseInt(wrapper.dataset.rowidx);
+                    const targetC = parseInt(wrapper.dataset.colidx);
+
+                    if (data.b === targetB) {
+                        const block = editorSchema[targetB];
+                        const item = block.options[data.r].splice(data.c, 1)[0];
+                        block.options[targetR].splice(targetC, 0, item);
+                        renderCanvas();
+                        window.saveDebounce();
+                    }
+                } catch (err) {
+                    console.error("Erro no drop de pílula:", err);
+                }
+            });
+        });
 
+        // Redimensionamento de imagens no bloco
+        const imgResizeHandle = blockEl.querySelector('.image-resize-handle');
+        if (imgResizeHandle) {
+            imgResizeHandle.addEventListener('mousedown', (e) => {
+                window.startImageResize(e, index);
+            });
+        }
+    });
 
-        if (mouseX < pageRect.left || mouseX > pageRect.right) {
+    // Ajustar larguras dinâmicas após render
+    window.adjustGlobalDynamicWidths();
+}
+window.renderCanvas = renderCanvas;
+
+// ==========================================================================
+// 7. SETTINGS POPOVER (WIRING COMPLETO DOS 11 CONTROLOS)
+// ==========================================================================
+
+const settingsPopover = document.getElementById('settings-popover');
+const rowSettingRequired = document.getElementById('row-setting-required');
+const rowSettingDescription = document.getElementById('row-setting-description');
+const rowSettingOther = document.getElementById('row-setting-other');
+const rowSettingRandomize = document.getElementById('row-setting-randomize');
+const rowSettingMulti = document.getElementById('row-setting-multi');
+const rowSettingColor = document.getElementById('row-setting-color');
+const rowSettingAlignment = document.getElementById('row-setting-alignment');
+const rowSettingPalette = document.getElementById('row-setting-palette');
+const rowSettingPlaceholder = document.getElementById('row-setting-placeholder');
+
+const settingRequired = document.getElementById('setting-required');
+const settingDescription = document.getElementById('setting-description');
+const settingOther = document.getElementById('setting-other');
+const settingRandomize = document.getElementById('setting-randomize');
+const settingMulti = document.getElementById('setting-multi');
+const settingColor = document.getElementById('setting-color');
+const btnAlignHorizontal = document.getElementById('btn-align-horizontal');
+const btnAlignVertical = document.getElementById('btn-align-vertical');
+const settingPlaceholder = document.getElementById('setting-placeholder');
+const btnDuplicateBlock = document.getElementById('btn-duplicate-block');
+const btnDeleteBlock = document.getElementById('btn-delete-block');
+
+window.openBlockSettings = function (index, triggerEl) {
+    const block = editorSchema[index];
+    if (!block) return;
 
-            hoverLine.classList.remove('visible');
+    if (['title', 'desc'].includes(block.type)) {
+        alert("Este bloco não possui configurações avançadas adicionais.");
+        return;
+    }
 
-            return;
+    window.activeSettingsIndex = index;
+
+    // Mostrar/ocultar controlos por tipo de bloco
+    const isChoice = ['choice-single', 'choice-multi'].includes(block.type);
+    const isCounter = block.type === 'counter';
+
+    if (rowSettingRequired) rowSettingRequired.style.display = 'flex';
+    if (rowSettingDescription) rowSettingDescription.style.display = 'flex';
+    if (rowSettingOther) rowSettingOther.style.display = isChoice ? 'flex' : 'none';
+    if (rowSettingRandomize) rowSettingRandomize.style.display = isChoice ? 'flex' : 'none';
+    if (rowSettingMulti) rowSettingMulti.style.display = isChoice ? 'flex' : 'none';
+    if (rowSettingColor) rowSettingColor.style.display = (isChoice || isCounter) ? 'flex' : 'none';
+    if (rowSettingAlignment) rowSettingAlignment.style.display = isChoice ? 'flex' : 'none';
+    if (rowSettingPalette) rowSettingPalette.style.display = (block.hasColorCode || block.pillColor) ? 'flex' : 'none';
+    if (rowSettingPlaceholder) rowSettingPlaceholder.style.display = (!isChoice && !isCounter) ? 'flex' : 'none';
+
+    // Popular valores
+    if (settingRequired) settingRequired.checked = !!block.required;
+    if (settingDescription) settingDescription.checked = !!block.hasDescription;
+    if (settingOther) settingOther.checked = !!block.hasOther;
+    if (settingRandomize) settingRandomize.checked = !!block.randomize;
+    if (settingMulti) settingMulti.checked = block.type === 'choice-multi';
+    if (settingColor) settingColor.checked = !!(block.hasColorCode || block.pillColor);
+    if (settingPlaceholder) settingPlaceholder.value = block.placeholder || '';
+
+    const hexInput = document.getElementById('block-hex-input');
+    if (hexInput) hexInput.value = block.pillColor || '';
+
+    // Posicionar popover
+    if (settingsPopover && triggerEl) {
+        const rect = triggerEl.getBoundingClientRect();
+        const pageRect = document.querySelector('.editor-page').getBoundingClientRect();
+        settingsPopover.classList.remove('hidden');
+        settingsPopover.style.top = `${rect.top - pageRect.top}px`;
+        settingsPopover.style.left = `${rect.right - pageRect.left + 15}px`;
+    }
+};
 
+// Bindings dos controlos do Popover
+if (settingRequired) {
+    settingRequired.addEventListener('change', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].required = e.target.checked;
+            renderCanvas();
+            window.saveDebounce();
         }
+    });
+}
 
+if (settingDescription) {
+    settingDescription.addEventListener('change', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].hasDescription = e.target.checked;
+            if (e.target.checked && !editorSchema[window.activeSettingsIndex].description) {
+                editorSchema[window.activeSettingsIndex].description = "Descrição opcional...";
+            }
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
+if (settingOther) {
+    settingOther.addEventListener('change', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].hasOther = e.target.checked;
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
-        let found = false;
-
-        for (let i = 0; i < blocks.length - 1; i++) {
-
-            const r1 = blocks[i].getBoundingClientRect();
+if (settingRandomize) {
+    settingRandomize.addEventListener('change', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].randomize = e.target.checked;
+            window.saveDebounce();
+        }
+    });
+}
 
-            const r2 = blocks[i + 1].getBoundingClientRect();
+if (settingMulti) {
+    settingMulti.addEventListener('change', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].type = e.target.checked ? 'choice-multi' : 'choice-single';
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
-            const boundaryY = (r1.bottom + r2.top) / 2;
+if (settingColor) {
+    settingColor.addEventListener('change', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].hasColorCode = e.target.checked;
+            if (rowSettingPalette) rowSettingPalette.style.display = e.target.checked ? 'flex' : 'none';
+            if (e.target.checked) {
+                editorSchema[window.activeSettingsIndex].pillColor = editorSchema[window.activeSettingsIndex].pillColor || '#22c55e';
+            } else {
+                delete editorSchema[window.activeSettingsIndex].pillColor;
+            }
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
+if (btnAlignHorizontal) {
+    btnAlignHorizontal.addEventListener('click', () => {
+        if (window.activeSettingsIndex !== null) {
+            const block = editorSchema[window.activeSettingsIndex];
+            if (!block.options || !block.options.length) return;
+            const all = block.options.flat();
+            if (all.length === 0) return;
+            block.options = [all];
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
+if (btnAlignVertical) {
+    btnAlignVertical.addEventListener('click', () => {
+        if (window.activeSettingsIndex !== null) {
+            const block = editorSchema[window.activeSettingsIndex];
+            if (!block.options || !block.options.length) return;
+            const all = block.options.flat();
+            if (all.length === 0) return;
+            block.options = all.map(opt => [opt]);
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
-            if (Math.abs(mouseY - boundaryY) < 14) {
+if (settingPlaceholder) {
+    settingPlaceholder.addEventListener('blur', (e) => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema[window.activeSettingsIndex].placeholder = e.target.value;
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
-                hoverLine.style.top = `${boundaryY - pageRect.top}px`;
+if (btnDuplicateBlock) {
+    btnDuplicateBlock.addEventListener('click', () => {
+        if (window.activeSettingsIndex !== null) {
+            const copy = JSON.parse(JSON.stringify(editorSchema[window.activeSettingsIndex]));
+            editorSchema.splice(window.activeSettingsIndex + 1, 0, copy);
+            if (settingsPopover) settingsPopover.classList.add('hidden');
+            window.activeSettingsIndex = null;
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
-                hoverLine.classList.add('visible');
+if (btnDeleteBlock) {
+    btnDeleteBlock.addEventListener('click', () => {
+        if (window.activeSettingsIndex !== null) {
+            editorSchema.splice(window.activeSettingsIndex, 1);
+            if (settingsPopover) settingsPopover.classList.add('hidden');
+            window.activeSettingsIndex = null;
+            renderCanvas();
+            window.saveDebounce();
+        }
+    });
+}
 
-                hoverLine.dataset.insertAfterIndex = parseInt(blocks[i].dataset.index);
+// Fechar popovers ao clicar fora
+document.addEventListener('click', (e) => {
+    const slashMenu = document.getElementById('slash-menu');
+    if (slashMenu && !slashMenu.classList.contains('hidden') && !e.target.closest('#slash-menu') && !e.target.closest('.add-below') && !e.target.closest('#add-block-end')) {
+        slashMenu.classList.add('hidden');
+    }
+    if (settingsPopover && !settingsPopover.classList.contains('hidden') && !e.target.closest('#settings-popover') && !e.target.closest('.settings-btn')) {
+        settingsPopover.classList.add('hidden');
+        window.activeSettingsIndex = null;
+    }
+});
 
-                found = true;
+// ==========================================================================
+// 8. MANIPULAÇÃO DE PÍLULAS (CLONE ADJACENTE, DELETE, ADD, VISIBILITY, TARGET)
+// ==========================================================================
 
-                break;
+window.duplicateOption = function (blockIdx, rowIdx, colIdx) {
+    const block = editorSchema[blockIdx];
+    if (!block || !block.options || !block.options[rowIdx]) return;
+    const original = block.options[rowIdx][colIdx];
+    const clone = JSON.parse(JSON.stringify(original));
+    if (typeof clone === 'object' && clone.id) clone.id = crypto.randomUUID();
 
-            }
+    // Clona adjacente na MESMA linha!
+    block.options[rowIdx].splice(colIdx + 1, 0, clone);
+    renderCanvas();
+    window.saveDebounce();
 
+    setTimeout(() => {
+        const input = document.querySelector(`.pill-name-input[data-blockidx="${blockIdx}"][data-rowidx="${rowIdx}"][data-colidx="${colIdx + 1}"]`);
+        if (input) {
+            input.focus();
+            if (typeof input.select === 'function') input.select();
         }
+    }, 50);
+};
 
-        if (!found) hoverLine.classList.remove('visible');
-
-    });
+window.removeOption = function (blockIdx, rowIdx, colIdx) {
+    const block = editorSchema[blockIdx];
+    if (!block || !block.options || !block.options[rowIdx]) return;
+    block.options[rowIdx].splice(colIdx, 1);
+    if (block.options[rowIdx].length === 0) {
+        block.options.splice(rowIdx, 1);
+    }
+    renderCanvas();
+    window.saveDebounce();
+};
 
+window.addOptionToRow = function (blockIdx, rowIdx) {
+    const block = editorSchema[blockIdx];
+    if (!block || !block.options || !block.options[rowIdx]) return;
+    const newOpt = { text: 'Nova Opção', target: 1 };
+    block.options[rowIdx].push(newOpt);
+    renderCanvas();
+    window.saveDebounce();
+};
 
+window.addOption = function (blockIdx) {
+    const block = editorSchema[blockIdx];
+    if (!block) return;
+    if (!block.options) block.options = [];
+    block.options.push([{ text: 'Nova Opção', target: 1 }]);
+    renderCanvas();
+    window.saveDebounce();
+};
 
-    blocksContainer.addEventListener('mouseleave', () => {
+window.togglePillVisibility = function (event, blockIdx, rowIdx, colIdx) {
+    if (event) {
+        event.preventDefault();
+        event.stopPropagation();
+    }
+    if (!toggleOptionDisabled(editorSchema, blockIdx, rowIdx, colIdx, auth.currentUser)) return;
+    renderCanvas();
+    window.saveDebounce();
+};
 
-        if (!slashMenu.classList.contains('hidden')) return;
+window.setPillTarget = function (blockIdx, rowIdx, colIdx, val) {
+    const block = editorSchema[blockIdx];
+    if (!block?.options?.[rowIdx]?.[colIdx]) return;
+    let opt = block.options[rowIdx][colIdx];
+    if (typeof opt !== 'object' || opt === null) {
+        opt = { text: String(opt || '') };
+        block.options[rowIdx][colIdx] = opt;
+    }
+    opt.target = parseInt(val) || 0;
+    window.saveDebounce();
+};
 
-        setTimeout(() => {
+// ==========================================================================
+// 9. DRAG & DROP DE BLOCOS
+// ==========================================================================
 
-            if (!hoverLine.matches(':hover') && slashMenu.classList.contains('hidden')) {
+let draggedBlockIndex = null;
 
-                hoverLine.classList.remove('visible');
+window.handleBlockDragStart = function (e, index) {
+    draggedBlockIndex = index;
+    e.dataTransfer.effectAllowed = 'move';
+    e.dataTransfer.setData('text/plain', index);
+    setTimeout(() => {
+        const el = document.querySelector(`.tally-block[data-index="${index}"]`);
+        if (el) el.classList.add('dragging');
+    }, 0);
+};
 
-            }
+window.handleBlockDragOver = function (e, index) {
+    e.preventDefault();
+    e.dataTransfer.dropEffect = 'move';
+    const targetEl = document.querySelector(`.tally-block[data-index="${index}"]`);
+    if (!targetEl || index === draggedBlockIndex) return;
 
-        }, 120);
+    const rect = targetEl.getBoundingClientRect();
+    const midY = rect.top + rect.height / 2;
 
-    });
+    targetEl.classList.remove('drag-over-top', 'drag-over-bottom');
+    if (e.clientY < midY) {
+        targetEl.classList.add('drag-over-top');
+    } else {
+        targetEl.classList.add('drag-over-bottom');
+    }
+};
 
+window.handleBlockDragLeave = function (e, index) {
+    const targetEl = document.querySelector(`.tally-block[data-index="${index}"]`);
+    if (targetEl) targetEl.classList.remove('drag-over-top', 'drag-over-bottom');
+};
 
+window.handleBlockDrop = function (e, targetIndex) {
+    e.preventDefault();
+    if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) return;
 
-    hoverLine.addEventListener('mouseleave', () => {
+    const item = editorSchema.splice(draggedBlockIndex, 1)[0];
+    const targetEl = document.querySelector(`.tally-block[data-index="${targetIndex}"]`);
+    let insertIndex = targetIndex;
 
-        if (!slashMenu.classList.contains('hidden')) return;
+    if (targetEl && targetEl.classList.contains('drag-over-bottom')) {
+        insertIndex = draggedBlockIndex < targetIndex ? targetIndex : targetIndex + 1;
+    } else {
+        insertIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;
+    }
 
-        hoverLine.classList.remove('visible');
+    editorSchema.splice(Math.max(0, insertIndex), 0, item);
+    draggedBlockIndex = null;
+    renderCanvas();
+    window.saveDebounce();
+};
 
+window.handleBlockDragEnd = function (e) {
+    draggedBlockIndex = null;
+    document.querySelectorAll('.tally-block').forEach(el => {
+        el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
+        el.removeAttribute('draggable');
     });
+};
 
-}
-
-initHoverInsertLine();
-
+window.duplicateBlockDirect = function (e, index) {
+    if (e) e.stopPropagation();
+    const copy = JSON.parse(JSON.stringify(editorSchema[index]));
+    editorSchema.splice(index + 1, 0, copy);
+    renderCanvas();
+    window.saveDebounce();
+};
 
+// ==========================================================================
+// 10. LÓGICA DE SIZING & FONT ENGINE
+// ==========================================================================
 
+window.changeSizingScope = function (scope) {
+    window.pillSizingConfig.mode = scope;
+    window.syncSidebarInputs();
+    renderCanvas();
+    window.saveDebounce();
+};
 
+window.changeSizingType = function (type) {
+    window.pillSizingConfig.type = type;
+    window.syncSidebarInputs();
+    renderCanvas();
+    window.saveDebounce();
+};
 
-window.togglePillPaletteBulk = function(e, b) {
+window.updateGlobalWidth = function (val, src) {
+    const num = parseInt(val) || 200;
+    window.pillSizingConfig.sharedWidth = num;
+    const slider = document.getElementById('input-global-width');
+    const numInput = document.getElementById('input-global-width-num');
+    if (slider && src !== 'slider') slider.value = num;
+    if (numInput && src !== 'number') numInput.value = num;
+    renderCanvas();
+    window.saveDebounce();
+};
 
-    e.stopPropagation();
+window.updateGlobalHeight = function (val, src) {
+    const num = parseInt(val) || 42;
+    window.pillSizingConfig.sharedHeight = num;
+    const slider = document.getElementById('input-global-height');
+    const numInput = document.getElementById('input-global-height-num');
+    if (slider && src !== 'slider') slider.value = num;
+    if (numInput && src !== 'number') numInput.value = num;
+    renderCanvas();
+    window.saveDebounce();
+};
 
-    openPaletteTitleIdx = null;
+window.updateIndividualWidth = function (b, r, c, val) {
+    if (editorSchema[b]?.options?.[r]?.[c]) {
+        if (typeof editorSchema[b].options[r][c] !== 'object') {
+            editorSchema[b].options[r][c] = { text: String(editorSchema[b].options[r][c]) };
+        }
+        editorSchema[b].options[r][c].width = parseInt(val) || 200;
+        renderCanvas();
+        window.saveDebounce();
+    }
+};
 
-    openPaletteOption = null;
+window.updateIndividualHeight = function (b, r, c, val) {
+    if (editorSchema[b]?.options?.[r]?.[c]) {
+        if (typeof editorSchema[b].options[r][c] !== 'object') {
+            editorSchema[b].options[r][c] = { text: String(editorSchema[b].options[r][c]) };
+        }
+        editorSchema[b].options[r][c].height = parseInt(val) || 42;
+        renderCanvas();
+        window.saveDebounce();
+    }
+};
 
-    window.startSpectrum(e, 'pill-bulk', b, null, null);
+window.changeFontSizingMode = function (mode) {
+    window.pillSizingConfig.fontMode = mode;
+    window.syncSidebarInputs();
+    renderCanvas();
+    window.saveDebounce();
+};
 
+window.updatePillFontSize = function (val) {
+    const num = parseFloat(val) || 16;
+    window.pillSizingConfig.fontSize = num;
+    window.pillSizingConfig.fontMode = 'static';
+    window.syncSidebarInputs();
+    renderCanvas();
+    window.saveDebounce();
 };
 
+window.applyPillFontPreset = function (size) {
+    window.updatePillFontSize(size);
+};
 
-/* ==========================================================================
-   SETTINGS SIDEBAR FOR PILL SIZING
-   ========================================================================== */
+window.syncSidebarInputs = function () {
+    const cfg = window.pillSizingConfig;
+    const btnScopeGlobal = document.getElementById('btn-scope-global');
+    const btnScopeIndividual = document.getElementById('btn-scope-individual');
+    const btnTypeDynamic = document.getElementById('btn-type-dynamic');
+    const btnTypeFixed = document.getElementById('btn-type-fixed');
+
+    if (btnScopeGlobal && btnScopeIndividual) {
+        btnScopeGlobal.classList.toggle('active', cfg.mode === 'global');
+        btnScopeIndividual.classList.toggle('active', cfg.mode === 'individual');
+    }
+    if (btnTypeDynamic && btnTypeFixed) {
+        btnTypeDynamic.classList.toggle('active', cfg.type === 'dynamic');
+        btnTypeFixed.classList.toggle('active', cfg.type === 'fixed');
+    }
 
-// Initialize default config if not loaded yet
-if (!window.pillSizingConfig) {
-    window.pillSizingConfig = {
-        mode: 'global',
-        type: 'dynamic',
-        sharedWidth: 200,
-        sharedHeight: 42
-    };
-}
+    const ctrlGlobalFixed = document.getElementById('control-global-fixed');
+    const ctrlIndivFixed = document.getElementById('control-individual-fixed');
+    const descDynGlobal = document.getElementById('desc-dynamic-global');
+    const descDynIndiv = document.getElementById('desc-dynamic-individual');
+
+    if (ctrlGlobalFixed) ctrlGlobalFixed.style.display = (cfg.mode === 'global' && cfg.type === 'fixed') ? 'block' : 'none';
+    if (ctrlIndivFixed) ctrlIndivFixed.style.display = (cfg.mode === 'individual' && cfg.type === 'fixed') ? 'block' : 'none';
+    if (descDynGlobal) descDynGlobal.style.display = (cfg.mode === 'global' && cfg.type === 'dynamic') ? 'block' : 'none';
+    if (descDynIndiv) descDynIndiv.style.display = (cfg.mode === 'individual' && cfg.type === 'dynamic') ? 'block' : 'none';
+
+    const sWidth = document.getElementById('input-global-width');
+    const nWidth = document.getElementById('input-global-width-num');
+    if (sWidth) sWidth.value = cfg.sharedWidth || 200;
+    if (nWidth) nWidth.value = cfg.sharedWidth || 200;
+
+    const sHeight = document.getElementById('input-global-height');
+    const nHeight = document.getElementById('input-global-height-num');
+    if (sHeight) sHeight.value = cfg.sharedHeight || 42;
+    if (nHeight) nHeight.value = cfg.sharedHeight || 42;
+
+    const sFont = document.getElementById('input-font-size');
+    const nFont = document.getElementById('input-font-size-num');
+    if (sFont) sFont.value = cfg.fontSize || 16;
+    if (nFont) nFont.value = cfg.fontSize || 16;
+};
 
-window.adjustGlobalDynamicWidths = function () {
-    const sizingScope = (window.pillSizingConfig && window.pillSizingConfig.mode) || 'global';
-    const sizingType = (window.pillSizingConfig && window.pillSizingConfig.type) || 'dynamic';
+window.renderSidebarSettings = function () {
+    window.syncSidebarInputs();
+    window.renderSidebarLocations();
+};
 
-    if (sizingType !== 'dynamic') return;
+window.toggleSettingsSidebar = function () {
+    const sidebar = document.getElementById('settings-sidebar');
+    if (sidebar) sidebar.classList.toggle('open');
+};
 
-    // Helper to measure text width using Canvas
-    const getTextWidth = (text, font) => {
-        const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
-        const context = canvas.getContext("2d");
-        context.font = font;
-        return context.measureText(text).width;
-    };
+// Medição e quebra de linhas para cálculo dinâmico de pílulas
+window.adjustGlobalDynamicWidths = function () {
+    if (window.pillSizingConfig.type !== 'dynamic') return;
 
-    const font = "500 14px Outfit, sans-serif";
-
-    if (sizingScope === 'global') {
-        // Find the maximum natural width among all pills
-        let maxVal = 0;
-        document.querySelectorAll('.pill-cell-wrapper').forEach(w => {
-            const input = w.querySelector('.pill-input');
-            if (!input) return;
-            const text = (input.value !== undefined ? input.value : input.innerText) || '';
-            const textWidth = getTextWidth(text, font);
-            const isCounter = w.closest('.tally-block').classList.contains('block-counter');
-            // Counter has drag handle (16px) + QT section (45px) + paddings/borders
-            const extra = isCounter ? 85 : 45;
-            const naturalWidth = textWidth + extra;
-            if (naturalWidth > maxVal) {
-                maxVal = naturalWidth;
+    document.querySelectorAll('.pill-row').forEach(rowEl => {
+        let maxTextW = 0;
+        const shells = rowEl.querySelectorAll('.pill-visual-shell');
+
+        shells.forEach(shell => {
+            const input = shell.querySelector('.pill-name-input');
+            const qtZone = shell.querySelector('.pill-qt-zone');
+            if (input) {
+                const textW = window.getTextWidth(input.value || 'Opção', '14px Outfit, sans-serif');
+                const qtW = qtZone ? qtZone.offsetWidth : 0;
+                const totalW = textW + qtW + 36;
+                if (totalW > maxTextW) maxTextW = totalW;
             }
         });
 
-        // Clamp to min 20px, max 200px
-        const finalWidth = Math.min(310, Math.max(120, maxVal));
-
-        // Apply to all
-        document.querySelectorAll('.pill-cell-wrapper').forEach(w => {
-            w.style.width = `${finalWidth}px`;
-            w.style.maxWidth = 'none';
-        });
-    } else {
-        // Individual dynamic sizing: set each pill to its own text width up to 180px
-        document.querySelectorAll('.pill-cell-wrapper').forEach(w => {
-            const input = w.querySelector('.pill-input');
-            if (!input) return;
-            const text = (input.value !== undefined ? input.value : input.innerText) || '';
-            const textWidth = getTextWidth(text, font);
-            const isCounter = w.closest('.tally-block').classList.contains('block-counter');
-            const extra = isCounter ? 85 : 45;
-            const naturalWidth = textWidth + extra;
-            const finalWidth = Math.min(310, Math.max(120, naturalWidth));
-            w.style.width = `${finalWidth}px`;
-            w.style.maxWidth = 'none';
-        });
-    }
+        if (maxTextW > 0) {
+            shells.forEach(shell => {
+                shell.style.width = `${Math.max(120, maxTextW)}px`;
+            });
+        }
+    });
 };
 
-window.fitText = function (el) {
-    if (!el) return;
-    const parentWrapper = el.closest('.pill-edit-wrapper') || el.closest('.inv-pill');
-    const actualHeight = parentWrapper ? parentWrapper.offsetHeight : 42;
-    let size = 14;
-    el.style.fontSize = size + 'px';
-    let maxH = actualHeight - 8;
-    if (maxH < 20) maxH = 34;
-    while (size > 9 && el.scrollHeight > maxH + 1) {
-        size -= 0.5;
-        el.style.fontSize = size + 'px';
-    }
+window.getTextWidth = function (text, font) {
+    const canvas = window.getTextWidth.canvas || (window.getTextWidth.canvas = document.createElement('canvas'));
+    const context = canvas.getContext('2d');
+    context.font = font || '14px sans-serif';
+    return context.measureText(text).width;
 };
 
-window.toggleSettingsSidebar = function () {
-    const sidebar = document.getElementById('settings-sidebar');
-    if (!sidebar) return;
-    
-    sidebar.classList.toggle('open');
-    if (sidebar.classList.contains('open')) {
-        window.syncSidebarInputs();
-        window.renderSidebarSettings();
-    }
-};
+// ==========================================================================
+// 11. SLASH MENU (ADICIONAR BLOCOS)
+// ==========================================================================
 
-window.closeSettingsSidebar = function () {
-    const sidebar = document.getElementById('settings-sidebar');
-    if (sidebar) {
-        sidebar.classList.remove('open');
-    }
+let slashInsertIndex = -1;
+
+window.openSlashMenu = function (e, index) {
+    e.stopPropagation();
+    slashInsertIndex = index;
+    const slashMenu = document.getElementById('slash-menu');
+    if (!slashMenu) return;
+
+    const rect = e.currentTarget.getBoundingClientRect();
+    slashMenu.classList.remove('hidden');
+    slashMenu.style.top = `${rect.bottom + window.scrollY + 6}px`;
+    slashMenu.style.left = `${rect.left + window.scrollX}px`;
 };
 
-window.syncSidebarInputs = function () {
-    const config = window.pillSizingConfig;
-    if (!config) return;
-
-    // 1. Sync Scope Tabs ("global" vs "individual")
-    document.querySelectorAll('#tab-scope-global, #tab-scope-individual').forEach(btn => btn.classList.remove('active'));
-    const activeScopeTab = document.getElementById(`tab-scope-${config.mode}`);
-    if (activeScopeTab) activeScopeTab.classList.add('active');
-
-    // 2. Sync Type Tabs ("dynamic" vs "fixed")
-    document.querySelectorAll('#tab-type-dynamic, #tab-type-fixed').forEach(btn => btn.classList.remove('active'));
-    const activeTypeTab = document.getElementById(`tab-type-${config.type}`);
-    if (activeTypeTab) activeTypeTab.classList.add('active');
-
-    // 3. Section visibility
-    const controlGlobalFixed = document.getElementById('control-global-fixed');
-    const controlIndividualFixed = document.getElementById('control-individual-fixed');
-    const controlGlobalHeight = document.getElementById('control-global-height');
-    const descDynamicGlobal = document.getElementById('desc-dynamic-global');
-    const descDynamicIndividual = document.getElementById('desc-dynamic-individual');
-
-    const showGlobalFixed = (config.mode === 'global' && config.type === 'fixed');
-    const showIndividualPanel = (config.mode === 'individual');
-    const showDynamicGlobal = (config.mode === 'global' && config.type === 'dynamic');
-    const showDynamicIndividual = (config.mode === 'individual' && config.type === 'dynamic');
-    const showGlobalHeight = (config.mode === 'global');
-
-    if (controlGlobalFixed) controlGlobalFixed.style.display = showGlobalFixed ? 'block' : 'none';
-    if (controlIndividualFixed) controlIndividualFixed.style.display = showIndividualPanel ? 'block' : 'none';
-    if (controlGlobalHeight) controlGlobalHeight.style.display = showGlobalHeight ? 'block' : 'none';
-    if (descDynamicGlobal) descDynamicGlobal.style.display = showDynamicGlobal ? 'block' : 'none';
-    if (descDynamicIndividual) descDynamicIndividual.style.display = showDynamicIndividual ? 'block' : 'none';
-
-    // 4. Update global size input controls values
-    const inputGlobal = document.getElementById('input-global-width');
-    const inputGlobalNum = document.getElementById('input-global-width-num');
-    if (inputGlobal && inputGlobalNum) {
-        const val = config.sharedWidth || 200;
-        inputGlobal.value = val;
-        inputGlobalNum.value = val;
-    }
+window.insertBlock = function (type) {
+    const newBlock = {
+        type: type,
+        id: crypto.randomUUID()
+    };
 
-    // 5. Update global height input controls values
-    const inputHeight = document.getElementById('input-global-height');
-    const inputHeightNum = document.getElementById('input-global-height-num');
-    if (inputHeight && inputHeightNum) {
-        const hVal = config.sharedHeight || 42;
-        inputHeight.value = hVal;
-        inputHeightNum.value = hVal;
+    if (type === 'title') {
+        newBlock.content = "Novo Título";
+        newBlock.blockSize = "large";
+    } else if (type === 'section') {
+        newBlock.question = "Nova Secção";
+        newBlock.blockSize = "medium";
+    } else if (type === 'counter') {
+        newBlock.question = "Novo Item de Inventário";
+        newBlock.options = [[{ text: "Item 1", target: 5 }]];
+    } else if (['choice-single', 'choice-multi'].includes(type)) {
+        newBlock.question = "Nova Pergunta";
+        newBlock.options = [[{ text: "Opção 1" }, { text: "Opção 2" }]];
+    } else if (type === 'divider') {
+        // Apenas divisor
     }
-};
 
-window.changeSizingScope = function (mode) {
-    if (!window.pillSizingConfig) return;
-    window.pillSizingConfig.mode = mode;
-    
-    if (mode === 'individual') {
-        const sharedWidth = window.pillSizingConfig.sharedWidth || 200;
-        const sharedHeight = window.pillSizingConfig.sharedHeight || 42;
-        window.editorSchema.forEach(block => {
-            if (block.options && Array.isArray(block.options)) {
-                block.options.forEach((row, rIdx) => {
-                    row.forEach((opt, cIdx) => {
-                        if (typeof opt === 'object') {
-                            if (opt.width === undefined) {
-                                opt.width = sharedWidth;
-                            }
-                            if (opt.height === undefined) {
-                                opt.height = sharedHeight;
-                            }
-                        } else {
-                            row[cIdx] = {
-                                text: opt,
-                                target: 0,
-                                width: sharedWidth,
-                                height: sharedHeight
-                            };
-                        }
-                    });
-                });
-            }
-        });
+    if (slashInsertIndex === -1 || slashInsertIndex === undefined) {
+        editorSchema.push(newBlock);
+    } else {
+        editorSchema.splice(slashInsertIndex + 1, 0, newBlock);
     }
 
-    window.syncSidebarInputs();
-    window.renderCanvas();
-    if (mode === 'individual') {
-        window.renderSidebarSettings();
-    }
-    window.saveDebounce();
-};
+    const slashMenu = document.getElementById('slash-menu');
+    if (slashMenu) slashMenu.classList.add('hidden');
 
-window.changeSizingType = function (type) {
-    if (!window.pillSizingConfig) return;
-    window.pillSizingConfig.type = type;
-    window.syncSidebarInputs();
-    window.renderCanvas();
-    if (window.pillSizingConfig.mode === 'individual') {
-        window.renderSidebarSettings();
-    }
+    renderCanvas();
     window.saveDebounce();
 };
 
-window.updateGlobalWidth = function (val, source) {
-    if (!window.pillSizingConfig) return;
-    
-    let intVal = parseInt(val);
-    if (isNaN(intVal)) return;
+document.getElementById('add-block-end')?.addEventListener('click', (e) => {
+    window.openSlashMenu(e, editorSchema.length - 1);
+});
 
-    // Clamp value between 120 and 350
-    intVal = Math.max(120, Math.min(350, intVal));
+document.querySelectorAll('#slash-menu .slash-item').forEach(item => {
+    item.addEventListener('click', () => {
+        const type = item.dataset.type;
+        if (type) window.insertBlock(type);
+    });
+});
 
-    window.pillSizingConfig.sharedWidth = intVal;
+// ==========================================================================
+// 12. CAPA (PORTADA DO EDITOR NORMAL)
+// ==========================================================================
 
-    // Synchronize both slider and number inputs
-    const inputGlobal = document.getElementById('input-global-width');
-    const inputGlobalNum = document.getElementById('input-global-width-num');
-    if (inputGlobal) inputGlobal.value = intVal;
-    if (inputGlobalNum) inputGlobalNum.value = intVal;
+function initCoverLogic() {
+    const btnChangeCover = document.querySelector('.change-cover-btn');
+    const coverUploadInput = document.getElementById('cover-upload-input');
+    const coverBlock = document.getElementById('cover-block');
 
-    window.renderCanvas();
-    window.saveDebounce();
-};
+    if (btnChangeCover && coverUploadInput && coverBlock) {
+        btnChangeCover.addEventListener('click', () => {
+            coverUploadInput.click();
+        });
 
-window.updateGlobalHeight = function (val, source) {
-    if (!window.pillSizingConfig) return;
-    
-    let intVal = parseInt(val);
-    if (isNaN(intVal)) return;
+        coverUploadInput.addEventListener('change', async (e) => {
+            const file = e.target.files[0];
+            if (!file) return;
 
-    // Clamp value between 32 and 80
-    intVal = Math.max(32, Math.min(80, intVal));
+            if (file.size > 5 * 1024 * 1024) {
+                alert('A imagem não pode exceder 5MB.');
+                return;
+            }
+            if (!file.type.match('image.*')) {
+                alert('Por favor selecione um ficheiro de imagem válido.');
+                return;
+            }
 
-    window.pillSizingConfig.sharedHeight = intVal;
+            const originalText = btnChangeCover.innerHTML;
+            btnChangeCover.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A carregar imagem...';
+            btnChangeCover.disabled = true;
+
+            try {
+                // Tenta carregar via Imgur; se falhar usa base64 DataURL
+                const clientId = '546c25a59c58ad7';
+                const formData = new FormData();
+                formData.append('image', file);
+
+                let downloadURL = null;
+                try {
+                    const response = await fetch('https://api.imgur.com/3/image', {
+                        method: 'POST',
+                        headers: { 'Authorization': `Client-ID ${clientId}` },
+                        body: formData
+                    });
+                    const data = await response.json();
+                    if (data.success && data.data?.link) {
+                        downloadURL = data.data.link;
+                    }
+                } catch (fetchErr) {
+                    console.warn("Imgur fetch indisponível, usando DataURL local:", fetchErr);
+                }
 
-    // Synchronize both slider and number inputs
-    const inputHeight = document.getElementById('input-global-height');
-    const inputHeightNum = document.getElementById('input-global-height-num');
-    if (inputHeight) inputHeight.value = intVal;
-    if (inputHeightNum) inputHeightNum.value = intVal;
+                if (!downloadURL) {
+                    downloadURL = await new Promise((resolve) => {
+                        const reader = new FileReader();
+                        reader.onload = () => resolve(reader.result);
+                        reader.readAsDataURL(file);
+                    });
+                }
 
-    window.renderCanvas();
-    window.saveDebounce();
-};
+                coverBlock.style.backgroundImage = `url('${downloadURL}')`;
+                if (!currentFormConfig.theme) currentFormConfig.theme = {};
+                currentFormConfig.theme.coverImage = downloadURL;
+                window.saveDebounce();
+            } catch (err) {
+                console.error("Erro durante o upload da capa:", err);
+                alert("Erro ao processar imagem da capa.");
+            } finally {
+                btnChangeCover.innerHTML = originalText;
+                btnChangeCover.disabled = false;
+                coverUploadInput.value = '';
+            }
+        });
+    }
+}
 
-window.updateIndividualWidth = function (blockIdx, rowIdx, colIdx, val, source) {
-    const block = window.editorSchema[blockIdx];
-    if (block && block.options && block.options[rowIdx] && block.options[rowIdx][colIdx]) {
-        const opt = block.options[rowIdx][colIdx];
-        
-        let intVal = parseInt(val);
-        if (isNaN(intVal)) return;
+// ==========================================================================
+// 13. MOTOR DE IMAGENS NOS BLOCOS
+// ==========================================================================
 
-        // Clamp value between 120 and 350
-        intVal = Math.max(120, Math.min(350, intVal));
+const blockImageInput = document.createElement('input');
+blockImageInput.type = 'file';
+blockImageInput.accept = 'image/*';
+blockImageInput.style.display = 'none';
+document.body.appendChild(blockImageInput);
 
-        if (typeof opt === 'object') {
-            opt.width = intVal;
-        } else {
-            // Convert simple string to object option if not already object
-            block.options[rowIdx][colIdx] = {
-                text: opt,
-                target: 0,
-                width: intVal
-            };
+let targetImageBlockIndex = null;
+
+window.triggerBlockImage = function (e, index) {
+    if (e) e.stopPropagation();
+    targetImageBlockIndex = index;
+    blockImageInput.click();
+};
+
+blockImageInput.addEventListener('change', async (e) => {
+    const file = e.target.files[0];
+    if (!file || targetImageBlockIndex === null) return;
+
+    const reader = new FileReader();
+    reader.onload = (evt) => {
+        const block = editorSchema[targetImageBlockIndex];
+        if (block) {
+            block.image = evt.target.result;
+            block.imageWidth = 220;
+            block.imageHeight = 160;
+            block.imageX = 0;
+            block.imageY = 0;
+            block.imageInFlow = true;
+            renderCanvas();
+            window.saveDebounce();
         }
-        
-        // Sync slider and number inputs for this individual item in the sidebar
-        const rangeInput = document.getElementById(`slider-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
-        const numberInput = document.getElementById(`number-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
-        if (rangeInput) rangeInput.value = intVal;
-        if (numberInput) numberInput.value = intVal;
-        
-        window.renderCanvas();
+    };
+    reader.readAsDataURL(file);
+    blockImageInput.value = '';
+});
+
+window.removeBlockImage = function (index) {
+    const block = editorSchema[index];
+    if (block) {
+        delete block.image;
+        delete block.imageWidth;
+        delete block.imageHeight;
+        renderCanvas();
         window.saveDebounce();
     }
 };
 
-window.updateIndividualHeight = function (blockIdx, rowIdx, colIdx, val, source) {
-    const block = window.editorSchema[blockIdx];
-    if (block && block.options && block.options[rowIdx] && block.options[rowIdx][colIdx]) {
-        const opt = block.options[rowIdx][colIdx];
-        
-        let intVal = parseInt(val);
-        if (isNaN(intVal)) return;
+window.startImageResize = function (e, index) {
+    e.preventDefault();
+    e.stopPropagation();
+    const wrapper = e.target.closest('.block-image-wrapper');
+    const block = editorSchema[index];
+    if (!wrapper || !block) return;
 
-        // Clamp value between 32 and 80
-        intVal = Math.max(32, Math.min(80, intVal));
+    const startX = e.clientX;
+    const startY = e.clientY;
+    const startWidth = wrapper.offsetWidth;
+    const startHeight = wrapper.offsetHeight;
 
-        if (typeof opt === 'object') {
-            opt.height = intVal;
-        } else {
-            const sharedWidth = (window.pillSizingConfig && window.pillSizingConfig.sharedWidth) || 200;
-            block.options[rowIdx][colIdx] = {
-                text: opt,
-                target: 0,
-                width: sharedWidth,
-                height: intVal
-            };
-        }
+    function onMouseMove(me) {
+        const newWidth = Math.max(50, startWidth + (me.clientX - startX));
+        const newHeight = Math.max(40, startHeight + (me.clientY - startY));
+        wrapper.style.width = `${newWidth}px`;
+        wrapper.style.height = `${newHeight}px`;
+        block.imageWidth = newWidth;
+        block.imageHeight = newHeight;
+    }
 
-        // Sync slider and number inputs for this individual item in the sidebar
-        const rangeInput = document.getElementById(`slider-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
-        const numberInput = document.getElementById(`number-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
-        if (rangeInput) rangeInput.value = intVal;
-        if (numberInput) numberInput.value = intVal;
-        
-        window.renderCanvas();
+    function onMouseUp() {
+        window.removeEventListener('mousemove', onMouseMove);
+        window.removeEventListener('mouseup', onMouseUp);
         window.saveDebounce();
     }
-};
-
-window.resetPillSizingDefaults = function () {
-    if (!window.pillSizingConfig) return;
-    
-    window.pillSizingConfig.mode = 'global';
-    window.pillSizingConfig.type = 'dynamic';
-    window.pillSizingConfig.sharedWidth = 200;
-    window.pillSizingConfig.sharedHeight = 42;
-
-    window.editorSchema.forEach(block => {
-        if (block.options && Array.isArray(block.options)) {
-            block.options.forEach((row, rIdx) => {
-                row.forEach((opt, cIdx) => {
-                    if (typeof opt === 'object') {
-                        delete opt.width;
-                        delete opt.height;
-                    }
-                });
-            });
-        }
-    });
 
-    window.syncSidebarInputs();
-    window.renderCanvas();
-    window.saveDebounce();
+    window.addEventListener('mousemove', onMouseMove);
+    window.addEventListener('mouseup', onMouseUp);
 };
 
-window.renderSidebarSettings = function () {
-    const sidebar = document.getElementById('settings-sidebar');
-    if (!sidebar || !sidebar.classList.contains('open') || window.pillSizingConfig.mode !== 'individual') return;
-
-    const listContainer = document.getElementById('individual-sliders-list');
-    if (!listContainer) return;
+// ==========================================================================
+// 14. INICIALIZAÇÃO DO RUNTIME E AUTENTICAÇÃO
+// ==========================================================================
 
-    // Preserve focus and dragging state by only updating values in place if user is currently interacting with the sidebar controls
-    const activeEl = document.activeElement;
-    if (activeEl && listContainer.contains(activeEl)) {
-        window.editorSchema.forEach((block, blockIdx) => {
-            if (block.type !== 'counter') return;
-            const options = block.options || [];
-            options.forEach((row, rowIdx) => {
-                row.forEach((opt, colIdx) => {
-                    const optWidth = (typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
-                    const optHeight = (typeof opt === 'object' && opt.height !== undefined) ? opt.height : (window.pillSizingConfig.sharedHeight || 42);
-
-                    const rangeInput = document.getElementById(`slider-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
-                    const numberInput = document.getElementById(`number-indiv-${blockIdx}-${rowIdx}-${colIdx}`);
-                    if (rangeInput && rangeInput !== activeEl) rangeInput.value = optWidth;
-                    if (numberInput && numberInput !== activeEl) numberInput.value = optWidth;
-
-                    const rangeInputH = document.getElementById(`slider-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
-                    const numberInputH = document.getElementById(`number-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`);
-                    if (rangeInputH && rangeInputH !== activeEl) rangeInputH.value = optHeight;
-                    if (numberInputH && numberInputH !== activeEl) numberInputH.value = optHeight;
-                });
-            });
-        });
-        return;
+onAuthStateChanged(auth, async (user) => {
+    if (!user) {
+        try { await signInAnonymously(auth); } catch (e) { console.warn(e); }
     }
 
-    listContainer.innerHTML = '';
-
-    let hasCounterBlocks = false;
-
-    window.editorSchema.forEach((block, blockIdx) => {
-        if (block.type !== 'counter') return;
-        hasCounterBlocks = true;
-
-        const groupDiv = document.createElement('div');
-        groupDiv.className = 'individual-block-group';
-
-        const blockTitleText = block.question || 'Módulo sem título';
-        const header = document.createElement('div');
-        header.className = 'individual-block-header';
-        header.textContent = blockTitleText;
-        groupDiv.appendChild(header);
-
-        const options = block.options || [];
-        options.forEach((row, rowIdx) => {
-            row.forEach((opt, colIdx) => {
-                const optText = typeof opt === 'object' ? opt.text : opt;
-                const optWidth = (typeof opt === 'object' && opt.width !== undefined) ? opt.width : 200;
-                const optHeight = (typeof opt === 'object' && opt.height !== undefined) ? opt.height : (window.pillSizingConfig.sharedHeight || 42);
-
-                const itemDiv = document.createElement('div');
-                itemDiv.className = 'individual-pill-item';
-                itemDiv.style.marginBottom = '12px';
-                itemDiv.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
-                itemDiv.style.paddingBottom = '8px';
-
-                const labelRow = document.createElement('div');
-                labelRow.className = 'slider-label-row';
-                
-                const spanName = document.createElement('span');
-                spanName.style.fontSize = '12px';
-                spanName.style.whiteSpace = 'nowrap';
-                spanName.style.overflow = 'hidden';
-                spanName.style.textOverflow = 'ellipsis';
-                spanName.style.maxWidth = '200px';
-                spanName.textContent = optText || `Item ${rowIdx + 1}-${colIdx + 1}`;
-
-                labelRow.appendChild(spanName);
-                itemDiv.appendChild(labelRow);
-
-                // Width controls (only if Sizing Type is Fixed)
-                if (window.pillSizingConfig.type === 'fixed') {
-                    const widthLabel = document.createElement('div');
-                    widthLabel.style.fontSize = '10px';
-                    widthLabel.style.color = '#94a3b8';
-                    widthLabel.style.marginTop = '4px';
-                    widthLabel.textContent = 'Largura:';
-                    itemDiv.appendChild(widthLabel);
-
-                    const controlRow = document.createElement('div');
-                    controlRow.className = 'control-input-row';
-
-                    const rangeInput = document.createElement('input');
-                    rangeInput.type = 'range';
-                    rangeInput.id = `slider-indiv-${blockIdx}-${rowIdx}-${colIdx}`;
-                    rangeInput.className = 'sidebar-range-input';
-                    rangeInput.min = '120';
-                    rangeInput.max = '350';
-                    rangeInput.step = '5';
-                    rangeInput.value = optWidth;
-                    rangeInput.oninput = function () {
-                        window.updateIndividualWidth(blockIdx, rowIdx, colIdx, this.value, 'slider');
-                    };
-
-                    const numberInput = document.createElement('input');
-                    numberInput.type = 'number';
-                    numberInput.id = `number-indiv-${blockIdx}-${rowIdx}-${colIdx}`;
-                    numberInput.className = 'sidebar-number-input';
-                    numberInput.min = '120';
-                    numberInput.max = '350';
-                    numberInput.value = optWidth;
-                    numberInput.onchange = function () {
-                        window.updateIndividualWidth(blockIdx, rowIdx, colIdx, this.value, 'number');
-                    };
-
-                    controlRow.appendChild(rangeInput);
-                    controlRow.appendChild(numberInput);
-                    itemDiv.appendChild(controlRow);
-                }
+    try {
+        const formSnap = await getDoc(doc(db, "forms", currentFormId));
+        if (formSnap.exists()) {
+            currentFormConfig = formSnap.data();
+
+            // Sincronizar título
+            if (currentFormConfig.title) {
+                const navTitle = document.querySelector('.nav-title');
+                if (navTitle) navTitle.textContent = currentFormConfig.title;
+            }
 
-                // Height controls (always shown in individual mode)
-                const heightLabel = document.createElement('div');
-                heightLabel.style.fontSize = '10px';
-                heightLabel.style.color = '#94a3b8';
-                heightLabel.style.marginTop = '4px';
-                heightLabel.textContent = 'Altura:';
-                itemDiv.appendChild(heightLabel);
-
-                const heightControlRow = document.createElement('div');
-                heightControlRow.className = 'control-input-row';
-
-                const heightRangeInput = document.createElement('input');
-                heightRangeInput.type = 'range';
-                heightRangeInput.id = `slider-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`;
-                heightRangeInput.className = 'sidebar-range-input';
-                heightRangeInput.min = '32';
-                heightRangeInput.max = '80';
-                heightRangeInput.step = '2';
-                heightRangeInput.value = optHeight;
-                heightRangeInput.oninput = function () {
-                    window.updateIndividualHeight(blockIdx, rowIdx, colIdx, this.value, 'slider');
-                };
+            // Carregar tema / capa
+            if (currentFormConfig.theme?.coverImage) {
+                const coverBlock = document.getElementById('cover-block');
+                if (coverBlock) coverBlock.style.backgroundImage = `url('${currentFormConfig.theme.coverImage}')`;
+            }
 
-                const heightNumberInput = document.createElement('input');
-                heightNumberInput.type = 'number';
-                heightNumberInput.id = `number-indiv-h-${blockIdx}-${rowIdx}-${colIdx}`;
-                heightNumberInput.className = 'sidebar-number-input';
-                heightNumberInput.min = '32';
-                heightNumberInput.max = '80';
-                heightNumberInput.value = optHeight;
-                heightNumberInput.onchange = function () {
-                    window.updateIndividualHeight(blockIdx, rowIdx, colIdx, this.value, 'number');
+            // Carregar Pill Sizing
+            if (currentFormConfig.pillSizing) {
+                window.pillSizingConfig = {
+                    mode: currentFormConfig.pillSizing.mode || 'global',
+                    type: currentFormConfig.pillSizing.type || 'dynamic',
+                    sharedWidth: currentFormConfig.pillSizing.sharedWidth || 200,
+                    sharedHeight: currentFormConfig.pillSizing.sharedHeight || 42,
+                    fontMode: currentFormConfig.pillSizing.fontMode || 'dynamic',
+                    fontSize: currentFormConfig.pillSizing.fontSize || 18
                 };
+            }
 
-                heightControlRow.appendChild(heightRangeInput);
-                heightControlRow.appendChild(heightNumberInput);
-                itemDiv.appendChild(heightControlRow);
+            // Carregar Localizações
+            window.useLocations = !!currentFormConfig.useLocations;
+            window.locations = currentFormConfig.locations || [];
 
-                groupDiv.appendChild(itemDiv);
+            // Normalizar schemas de localizações (deserializar options stringified se necessário)
+            window.locations.forEach(loc => {
+                if (typeof loc.schema === 'string') {
+                    try { loc.schema = JSON.parse(loc.schema); } catch (e) { loc.schema = null; }
+                }
+                if (Array.isArray(loc.schema)) {
+                    loc.schema.forEach(block => {
+                        if (typeof block.options === 'string') {
+                            try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
+                        }
+                    });
+                }
             });
-        });
-
-        listContainer.appendChild(groupDiv);
-    });
 
-    if (!hasCounterBlocks) {
-        listContainer.innerHTML = '<p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 10px;">Adicione um bloco de contador/inventário para configurar os tamanhos.</p>';
+            // Normalizar schema base
+            let baseSchema = currentFormConfig.schema || [];
+            if (typeof baseSchema === 'string') {
+                try { baseSchema = JSON.parse(baseSchema); } catch (e) { baseSchema = []; }
+            }
+            baseSchema.forEach(block => {
+                if (typeof block.options === 'string') {
+                    try { block.options = JSON.parse(block.options); } catch (e) { block.options = []; }
+                }
+            });
+            currentFormConfig.schema = baseSchema;
+
+            // Iniciar com Modelo Base
+            window.activeLocationId = '__base__';
+            editorSchema = baseSchema;
+            window.editorSchema = editorSchema;
+
+            // Renderizar componentes
+            window.syncSidebarInputs();
+            window.renderSidebarLocations();
+            window.renderCanvasLocationsBar();
+            renderCanvas();
+        } else {
+            alert("Formulário não encontrado.");
+            window.location.href = 'dashboard.html';
+        }
+    } catch (err) {
+        console.error("Erro a carregar formulário:", err);
+        alert("Erro de comunicação com a base de dados: " + (err.message || err));
     }
-};
+});
 
+document.addEventListener('DOMContentLoaded', () => {
+    initCoverLogic();
 
+    // Preview
+    const btnPreview = document.getElementById('btn-preview');
+    if (btnPreview) {
+        btnPreview.addEventListener('click', () => {
+            if (!currentFormId) return;
+            window.open(`inventory_view.html?id=${currentFormId}&preview=true`, '_blank');
+        });
+    }
+});
diff --git a/inventory-pills.css b/inventory-pills.css
index f5f0a8c..5384ccc 100644
--- a/inventory-pills.css
+++ b/inventory-pills.css
@@ -482,4 +482,381 @@
 .sidebar-number-input[type=number] {
     -moz-appearance: textfield;
     appearance: textfield;
-}
\ No newline at end of file
+}
+
+/* ==========================================================================
+   RECONSTRUÇÃO ROBUSTA DAS PILLS — ISOLAMENTO VISUAL SHELL VS EDITOR TOOLS
+   ========================================================================== */
+
+/* Wrapper da Célula da Pílula */
+.pill-cell-wrapper {
+    position: relative;
+    display: inline-flex;
+    align-items: center;
+    vertical-align: middle;
+    margin: 3px 4px;
+    box-sizing: border-box;
+    transition: opacity 0.2s ease;
+}
+
+.pill-cell-wrapper.is-disabled {
+    opacity: 0.45 !important;
+    filter: grayscale(0.5);
+}
+
+/* Shell Visual Puro da Pílula (A largura configurada pertence exclusivamente a este shell) */
+.pill-visual-shell {
+    position: relative;
+    display: inline-flex;
+    align-items: center;
+    border-radius: 8px;
+    overflow: hidden;
+    box-sizing: border-box;
+    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
+    transition: box-shadow 0.2s ease, border-color 0.2s ease;
+    border: 1px solid rgba(255, 255, 255, 0.12);
+    height: 42px;
+}
+
+.pill-visual-shell:focus-within {
+    border-color: #38bdf8;
+    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3);
+}
+
+/* Input do Nome da Pílula */
+.pill-name-input {
+    flex: 1 1 0%;
+    min-width: 0;
+    width: 100%;
+    height: 100%;
+    padding: 0 12px;
+    border: none;
+    outline: none;
+    background: transparent;
+    font-family: inherit;
+    font-size: 14px;
+    font-weight: 600;
+    line-height: 1.2;
+    white-space: nowrap;
+    overflow: hidden;
+    text-overflow: ellipsis;
+    box-sizing: border-box;
+    cursor: text;
+}
+
+/* Zona QT do Counter (Fundo escuro estrito, não herda a cor da pílula) */
+.pill-qt-zone {
+    flex-shrink: 0;
+    display: inline-flex;
+    align-items: center;
+    gap: 4px;
+    padding: 0 10px;
+    height: 100%;
+    background-color: rgba(15, 23, 42, 0.92) !important;
+    color: #94a3b8;
+    font-size: 11px;
+    font-weight: 700;
+    letter-spacing: 0.5px;
+    border-left: 1px solid rgba(255, 255, 255, 0.1);
+    user-select: none;
+    box-sizing: border-box;
+}
+
+.pill-target-input {
+    width: 32px;
+    background: transparent;
+    border: none;
+    outline: none;
+    color: #f8fafc;
+    font-size: 13px;
+    font-weight: 700;
+    text-align: center;
+    cursor: text;
+    -moz-appearance: textfield;
+}
+.pill-target-input::-webkit-inner-spin-button,
+.pill-target-input::-webkit-outer-spin-button {
+    -webkit-appearance: none;
+    margin: 0;
+}
+
+/* Ferramentas de Edição da Pílula (EXTERNAS ao shell visual - NÃO roubam largura ao nome) */
+.pill-editor-tools {
+    position: absolute;
+    left: 100%;
+    top: 50%;
+    transform: translateY(-50%);
+    display: inline-flex;
+    align-items: center;
+    gap: 3px;
+    padding: 2px 5px;
+    background: rgba(15, 23, 42, 0.96);
+    border: 1px solid rgba(255, 255, 255, 0.15);
+    border-radius: 6px;
+    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
+    opacity: 0;
+    pointer-events: none;
+    margin-left: 6px;
+    z-index: 50;
+    white-space: nowrap;
+    transition: opacity 0.18s ease-in-out, transform 0.18s ease-in-out;
+}
+
+.pill-cell-wrapper:hover .pill-editor-tools,
+.pill-cell-wrapper:focus-within .pill-editor-tools {
+    opacity: 1;
+    pointer-events: auto;
+    transform: translateY(-50%) translateX(0);
+}
+
+.pill-editor-tools button,
+.pill-editor-tools .pill-drag-handle {
+    display: inline-flex;
+    align-items: center;
+    justify-content: center;
+    width: 24px;
+    height: 24px;
+    padding: 0;
+    border: none;
+    background: transparent;
+    color: #94a3b8;
+    border-radius: 4px;
+    cursor: pointer;
+    font-size: 13px;
+    transition: background 0.15s, color 0.15s;
+}
+
+.pill-editor-tools button:hover,
+.pill-editor-tools .pill-drag-handle:hover {
+    background: rgba(255, 255, 255, 0.12);
+    color: #f8fafc;
+}
+
+.pill-editor-tools .pill-delete-btn:hover {
+    background: rgba(239, 68, 68, 0.2);
+    color: #ef4444;
+}
+
+.pill-editor-tools .pill-visibility-btn.is-disabled {
+    color: #f59e0b;
+}
+
+/* ==========================================================================
+   ESPAÇAMENTO SEMÂNTICO (RESTING LAYOUT FIEL A INVENTORY_VIEW.HTML)
+   ========================================================================== */
+.inventory-level-1 {
+    margin-bottom: 12px !important;
+}
+.inventory-level-2 {
+    margin-bottom: 12px !important;
+}
+.inventory-level-3 {
+    margin-bottom: 6px !important;
+}
+.inventory-content {
+    margin-bottom: 24px !important;
+}
+.gap-section {
+    margin-bottom: 24px !important;
+}
+
+/* ==========================================================================
+   UI DE LOCALIZAÇÕES NO CANVAS & SIDEBAR
+   ========================================================================== */
+.builder-locations-container {
+    background: rgba(15, 23, 42, 0.85);
+    border: 1px solid rgba(255, 255, 255, 0.1);
+    border-radius: 10px;
+    padding: 10px 14px;
+    margin-bottom: 16px;
+    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
+}
+
+.active-schema-banner {
+    display: flex;
+    align-items: center;
+    gap: 8px;
+    font-size: 13px;
+    color: #94a3b8;
+    margin-bottom: 8px;
+    padding-bottom: 6px;
+    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
+}
+
+.active-schema-banner strong {
+    color: #f8fafc;
+}
+
+.active-schema-badge {
+    display: inline-flex;
+    align-items: center;
+    padding: 1px 8px;
+    border-radius: 12px;
+    font-size: 11px;
+    font-weight: 600;
+    background: rgba(56, 189, 248, 0.15);
+    color: #38bdf8;
+    border: 1px solid rgba(56, 189, 248, 0.3);
+}
+
+.active-schema-badge.custom {
+    background: rgba(168, 85, 247, 0.15);
+    color: #c084fc;
+    border-color: rgba(168, 85, 247, 0.3);
+}
+
+.builder-locations-bar {
+    display: flex;
+    align-items: center;
+    gap: 8px;
+    overflow-x: auto;
+    padding: 2px 0;
+}
+
+.loc-tab-btn {
+    display: inline-flex;
+    align-items: center;
+    gap: 6px;
+    padding: 6px 14px;
+    border-radius: 8px;
+    background: rgba(30, 41, 59, 0.6);
+    border: 1px solid rgba(255, 255, 255, 0.1);
+    color: #cbd5e1;
+    font-size: 13px;
+    font-weight: 500;
+    cursor: pointer;
+    transition: all 0.15s ease;
+    white-space: nowrap;
+}
+
+.loc-tab-btn:hover {
+    background: rgba(51, 65, 85, 0.8);
+    color: #ffffff;
+    border-color: rgba(255, 255, 255, 0.2);
+}
+
+.loc-tab-btn.active {
+    background: #0284c7;
+    border-color: #38bdf8;
+    color: #ffffff;
+    font-weight: 600;
+    box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
+}
+
+.loc-tab-btn .loc-tab-status {
+    font-size: 10px;
+    opacity: 0.75;
+    padding: 1px 5px;
+    border-radius: 4px;
+    background: rgba(0, 0, 0, 0.25);
+}
+
+/* Cards de Localização no Sidebar */
+.sidebar-loc-card {
+    background: rgba(15, 23, 42, 0.7);
+    border: 1px solid rgba(255, 255, 255, 0.08);
+    border-radius: 8px;
+    padding: 8px 10px;
+    margin-bottom: 8px;
+    transition: border-color 0.15s ease;
+}
+
+.sidebar-loc-card:hover {
+    border-color: rgba(255, 255, 255, 0.15);
+}
+
+.sidebar-loc-card.is-active {
+    border-color: #38bdf8;
+    background: rgba(14, 116, 144, 0.15);
+}
+
+.sidebar-loc-header {
+    display: flex;
+    align-items: center;
+    gap: 6px;
+    margin-bottom: 6px;
+}
+
+.sidebar-loc-icon-input {
+    width: 32px;
+    height: 28px;
+    background: rgba(0, 0, 0, 0.3);
+    border: 1px solid rgba(255, 255, 255, 0.1);
+    border-radius: 4px;
+    text-align: center;
+    font-size: 14px;
+    color: #f8fafc;
+    outline: none;
+}
+
+.sidebar-loc-name-input {
+    flex: 1;
+    height: 28px;
+    background: rgba(0, 0, 0, 0.3);
+    border: 1px solid rgba(255, 255, 255, 0.1);
+    border-radius: 4px;
+    padding: 0 8px;
+    font-size: 12px;
+    color: #f8fafc;
+    outline: none;
+}
+
+.sidebar-loc-name-input:focus,
+.sidebar-loc-icon-input:focus {
+    border-color: #38bdf8;
+}
+
+.sidebar-loc-actions {
+    display: flex;
+    align-items: center;
+    justify-content: space-between;
+    font-size: 11px;
+    padding-top: 4px;
+    border-top: 1px solid rgba(255, 255, 255, 0.05);
+}
+
+.sidebar-loc-status {
+    color: #64748b;
+    font-size: 11px;
+}
+
+.sidebar-loc-status.custom {
+    color: #c084fc;
+    font-weight: 600;
+}
+
+.sidebar-loc-btns {
+    display: flex;
+    gap: 4px;
+}
+
+.sidebar-loc-btn {
+    background: rgba(255, 255, 255, 0.05);
+    border: 1px solid rgba(255, 255, 255, 0.1);
+    color: #cbd5e1;
+    border-radius: 4px;
+    padding: 3px 6px;
+    font-size: 11px;
+    cursor: pointer;
+    transition: all 0.15s ease;
+}
+
+.sidebar-loc-btn:hover {
+    background: rgba(255, 255, 255, 0.12);
+    color: #ffffff;
+}
+
+.sidebar-loc-btn.danger:hover {
+    background: rgba(239, 68, 68, 0.2);
+    border-color: #ef4444;
+    color: #ef4444;
+}
+
+.sidebar-loc-btn.primary {
+    background: rgba(56, 189, 248, 0.15);
+    border-color: rgba(56, 189, 248, 0.3);
+    color: #38bdf8;
+}
+.sidebar-loc-btn.primary:hover {
+    background: rgba(56, 189, 248, 0.25);
+}

```

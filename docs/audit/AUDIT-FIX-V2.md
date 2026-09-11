# RELATÓRIO DE CORREÇÃO E AUDITORIA DO INVENTORY BUILDER — V2

**Data:** 2026-09-11  
**Timestamp:** 20260911-201500  
**Repositório:** `ApexScorpio/cvp-vistorias`  
**Branch de Auditoria:** `testbench/inventory-builder-corrected-v2-clean-20260911`  
**Commit Auditado Anterior (V1):** `205aad04d2c351d7856dd2cf88f9dcce4ba3d1c2`  

---

## 1. ESTADO DOS FICHEIROS E INTEGRIDADE DE HASHES (SHA-256)

| Ficheiro | SHA-256 | Estado |
|---|---|---|
| `inventario.html` | `09a8e90bd6ad0da9aec0e8b83cd39daf14f7e925a806cd5ceb1c1e22e26ba661` | OK |
| `public_html/inventario.html` | `09a8e90bd6ad0da9aec0e8b83cd39daf14f7e925a806cd5ceb1c1e22e26ba661` | 100% Idêntico ao Root |
| `inventario.js` | `1911b7bcfe88a99152daa2d8b880893246fae2817ab22b23d8a438879831e386` | `node --check`: OK |
| `public_html/inventario.js` | `1911b7bcfe88a99152daa2d8b880893246fae2817ab22b23d8a438879831e386` | 100% Idêntico ao Root |
| `inventory-pills.css` | `07cc03b1895a1bae3ccdd7315ffb2586e325ba69844cd148cbebb7be8d5ff510` | OK |
| `public_html/inventory-pills.css` | `07cc03b1895a1bae3ccdd7315ffb2586e325ba69844cd148cbebb7be8d5ff510` | 100% Idêntico ao Root |
| `inventory_view.html` (Protegido) | `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b` | 100% INTOCADO |
| `public_html/inventory_view.html` (Protegido) | `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b` | 100% INTOCADO |

- **Handlers HTML Resolvidos:** `UNRESOLVED_APP_HANDLERS = 0` (Verificado automaticamente).

---

## 2. DETALHE DAS CORREÇÕES EFETUADAS (PONTOS 1 A 15)

### 1. Pill Visibility — Permissões e Validação Canónica
- **Origem do Problema:** `canManagePillVisibility` recebia erroneamente `block.type` em vez de `auth.currentUser`, e não utilizava `toggleOptionDisabled`.
- **Correção Aplicada:**
  - Importado `toggleOptionDisabled` de `form-recovery.js`.
  - No renderizador: botão de visibilidade só é emitido se `!isCounter && canManagePillVisibility(auth.currentUser) && ['choice-single', 'choice-multi'].includes(block.type)`. Nunca em counter.
  - No handler `window.togglePillVisibility`:
    ```javascript
    if (!toggleOptionDisabled(window.editorSchema, blockIdx, rowIdx, colIdx, auth.currentUser)) return;
    renderCanvas();
    saveDebounce();
    ```
  - **Classificação Preservada:** `PILL_VISIBILITY_FINAL_CLIENT=NAO_SUPORTADO` (pois `inventory_view.html` protegido não filtra disabled).
- **Status:** CONFORME.

### 2. Cor das Pills — Hierarquia Canónica
- **Origem do Problema:** `renderPillsContainerHtml` só avaliava `opt.color`.
- **Correção Aplicada:**
  - Implementada a hierarquia real do cliente:
    ```javascript
    const blockLevelColor = block.pillColor || block.blockColor || '';
    const optColor = (typeof opt === 'object' && opt !== null && opt.color) ? opt.color : blockLevelColor;
    ```
  - Para `counter`: o NOME da pílula recebe `optColor` (`nameInputStyle = background-color: ${optColor}; color: ${getContrastYIQ(optColor)};`), enquanto a zona `.pill-qt-zone` permanece ESTRITAMENTE escura com `rgba(15, 23, 42, 0.92) !important`.
  - Para blocos de escolha (`choice-single`, `choice-multi`): o `.pill-visual-shell` recebe `optColor`.
- **Status:** CONFORME.

### 3. Toggle "Cores nas Opções"
- **Origem do Problema:** `toggleSettingParam('color')` apenas alternava `hasColorCode` sem definir `block.pillColor`.
- **Correção Aplicada:**
  - **ON:** `block.hasColorCode = true; block.pillColor = block.pillColor || '#22c55e' (ou '#ef4444' em counter)`.
  - **OFF:** `block.hasColorCode = false; delete block.pillColor;`.
  - Adicionado controlo interativo de cor em tempo real no settings popover (`window.setBlockPillColor`).
  - As pílulas herdam a cor global devido à hierarquia restaurada no Ponto 2.
- **Status:** CONFORME.

### 4. Alinhamento Horizontal / Vertical Real
- **Origem do Problema:** `setBlockAlignment()` apenas gravava `block.alignment` como metadado inerte.
- **Correção Aplicada:**
  - Portada a transformação de opções do editor normal:
    - **HORIZONTAL:** `const allOptions = raw.flat(); block.options = [allOptions];`
    - **VERTICAL:** `const allOptions = raw.flat(); block.options = allOptions.map(opt => [opt]);`
  - Re-render imediato no canvas com `renderCanvas()` e salvamento com `saveDebounce()`.
- **Status:** CONFORME.

### 5. Restaurar Block Style "Border"
- **Origem do Problema:** `toggleTitleStyle()` apenas alternava entre `full` e `inline`.
- **Correção Aplicada:**
  - Ciclo de 3 estados: `full -> inline -> border -> full`.
  - Suporte completo em `title`, `section` e `counter`.
  - Adicionadas regras CSS `.style-marker` e `.style-marker::before` com `var(--marker-color)` em `inventory-pills.css`.
  - No renderizador, `blockStyle === 'border'` aplica classe `style-marker` e `--marker-color: ${blockColor}` SEM background cheio.
- **Status:** CONFORME.

### 6. Copy-on-Write — Personalizar Localização Ativa
- **Origem do Problema:** Se a localização selecionada estivesse a herdar a base, `switchActiveLocation(locId)` retornava antecipadamente sem apontar `editorSchema` para o novo `loc.schema`.
- **Correção Aplicada:**
  - Em `window.personalizeLocationSchema(locId)`:
    ```javascript
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
    ```
- **Status:** CONFORME.

### 7. Desativar Localizações
- **Origem do Problema:** Desativar localizações podia deixar o canvas apontado para o schema customizado de uma viatura.
- **Correção Aplicada:**
  - Em `window.toggleUseLocations(false)`:
    1. Se `activeLocationId !== '__base__'`, sincroniza `currentLoc.schema = window.editorSchema`.
    2. Define `activeLocationId = '__base__'`.
    3. Define `editorSchema = window.currentFormConfig.schema`.
    4. Invoca `renderCanvas()`.
    5. Oculta os controlos de localização no sidebar e no canvas.
- **Status:** CONFORME.

### 8. Image Engine — Handlers Reais
- **Origem do Problema:** O modal não ligava listeners reais de `dragover`, `drop` e `paste`.
- **Correção Aplicada:**
  - `dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };`
  - `dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) window.processImageFile(file); };`
  - `modal.onpaste = (e) => { const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || []; for (const item of items) { if (item.type.indexOf('image') !== -1) { const file = item.getAsFile(); if (file) window.processImageFile(file); } } };`
  - Input tipo file e inserção via link URL mantidos 100% funcionais.
- **Status:** CONFORME.

### 9. imageInFlow / imageZ / Altura de Bloco
- **Origem do Problema:** Propriedades ignoradas no DOM do builder e ausência de ajuste de altura.
- **Correção Aplicada:**
  - `imageInFlow === true`: `position: relative; margin: 12px 0; display: block;`
  - `imageInFlow !== true`: `position: absolute;`
  - `imageZ === 'back'`: `z-index: 1;` | `front`: `z-index: 20;`
  - Restaurada função `window.adjustBlockHeightForImage(blockEl, block)` para evitar sobreposição em imagens absolutas.
  - Inseridos botões visuais na moldura da imagem (`.image-flow-btn`, `.image-z-btn`) para alternar fluxo e profundidade em tempo real.
- **Status:** CONFORME.

### 10. H0 WYSIWYG Real
- **Origem do Problema:** H0 estava hardcoded em 28px sem refletir as propriedades do primeiro título.
- **Correção Aplicada:**
  - H0 extrai e aplica diretamente: `blockColor`, `blockStyle` (`border`, `inline`, `full`), e `blockSize` (`small: 20px`, `medium: 25px`, `large: 33px`).
  - H0 renderiza a imagem associada ao primeiro título com suporte a drag, resize, delete, flow e z-index.
  - Toolbar flutuante do H0 disponível no hover.
- **Status:** CONFORME.

### 11. H1 / H2 / Counter — Escala Real do Cliente
- **Origem do Problema:** Uso de tamanhos divergentes (18/22/28 e 18/20/22).
- **Correção Aplicada:**
  - Adotada rigorosamente a escala de `inventory_view.html` (linhas 1568, 1779, 1816, 1905):
    `const sizeMap = { 'small': '20px', 'medium': '25px', 'large': '33px' };`
  - H1 (`title-h1` / `title` grande): `33px`.
  - H2 (`title-h2` / `section` média): `25px`.
  - H3 / Pequeno (`title-h3` / `section` pequena): `20px`.
  - Counter: `sizeMap[blockSize]` (default `medium` = `25px`, ajustável para `20px` ou `33px`).
- **Status:** CONFORME.

### 12. Row Drag — Correção de Índices
- **Origem do Problema:** Índices de destino ficavam desfasados quando a linha de origem era esvaziada e eliminada.
- **Correção Aplicada:**
  - Portada a lógica testada do `editor.js`:
    ```javascript
    options[draggedPill.rowIdx].splice(draggedPill.colIdx, 1);
    let adjustedTargetRow = targetRowIdx !== undefined ? targetRowIdx : options.length;
    if (options[draggedPill.rowIdx].length === 0) {
        options.splice(draggedPill.rowIdx, 1);
        if (draggedPill.rowIdx < adjustedTargetRow) adjustedTargetRow--;
    }
    options.splice(adjustedTargetRow, 0, [draggedItem]);
    ```
- **Status:** CONFORME.

### 13. Block Drag Robusto com Midpoint Vertical
- **Origem do Problema:** O arrasto não distinguia se o drop ocorria na metade superior ou inferior do bloco de destino.
- **Correção Aplicada:**
  - `handleBlockDragOver`: calcula `midY = rect.top + rect.height / 2`.
  - Feedback visual dinâmico com `.drop-indicator-top` ou `.drop-indicator-bottom`.
  - `handleBlockDrop`: remove item da origem, ajusta índice caso `fromIdx < targetIndex`, incrementa índice se `position === 'bottom'`, e insere no local correto.
- **Status:** CONFORME.

### 14. Documentação de Preview
- **Limitações Documentadas:**
  - `PREVIEW_PILL_SIZING=NAO_SUPORTADO_PELO_CLIENT_PREVIEW` (o cliente protegido não lê `previewCfg.pillSizing`).
  - `PREVIEW_LOCATIONS=NAO_SUPORTADO_PELO_CLIENT_PREVIEW` (o cliente protegido força `useLocations=false` no modo preview).
- **Status:** CONFORME (Documentado).

### 15. Documentação de "Outra" e Randomize
- **Limitações Documentadas:**
  - `OTHER_FINAL_CLIENT=NAO_SUPORTADO`
  - `RANDOMIZE_FINAL_CLIENT=NAO_SUPORTADO`
- **Status:** CONFORME (Documentado).

---

## 3. VALIDAÇÃO AUTOMATIZADA EM RUNTIME (BROWSER TESTBENCH)

Executado teste end-to-end em sessão ativa do browser subagent sobre o formulário real `9LtmhbAdkb9ZcCEX6TEv`:

1. **H0:** `toggleTitleStyle(0)` alternou entre `full`, `inline` e `border` (verificada classe `.style-marker` e CSS var `--marker-color: #475569`).
2. **Counter Header:** Bloco 5 (*"Porta Luvas"*) alternou entre `full`, `inline` e `border` com `--marker-color: #ef4444`. Tamanho de fonte computado em `20px` (small).
3. **Cores das Pílulas e QT:**
   - Ao aplicar `pillColor = '#3b82f6'`, os inputs das pílulas passaram para azul (`rgb(59, 130, 246)`).
   - `.pill-qt-zone` manteve inalterado o fundo escuro (`rgba(15, 23, 42, 0.92)`).
   - Ao aplicar cor individual (`opt.color = '#ef4444'`), a pílula específica recebeu vermelho (`rgb(239, 68, 68)`).
4. **Alinhamento:**
   - `setBlockAlignment('horizontal')` gerou 1 única linha com 8 itens.
   - `setBlockAlignment('vertical')` dividiu em 8 linhas individuais.
5. **Copy-on-Write:**
   - Com `loc_1` ativa, `personalizeLocationSchema('loc_1')` gerou `loc.schema` clonado e atribuiu `editorSchema === loc.schema` (independente do base).
   - `toggleUseLocations(false)` restaurou `activeLocationId = '__base__'` e `editorSchema === currentFormConfig.schema`.
6. **Image Engine:** Handlers de `ondragover`, `ondrop`, `onpaste` ativos. Alternância de `imageInFlow` (flow vs absolute) e `imageZ` (front vs back) comprovadas.
7. **Drags:** Reordenação de blocos com indicador midpoint vertical e inserção de pílulas com ajuste de índice validadas.

---

## 4. POLÍTICAS DE SEGURANÇA E DEPLOY
- `ALTERACOES_LOCAIS=SIM`
- `DEPLOY=NAO`
- `PUSH_PRODUCAO=NAO`
- Ramo orphan exclusivo criado: `testbench/inventory-builder-corrected-v2-clean-20260911`
- Varredura de segredos: 0 credenciais/chaves Brevo.

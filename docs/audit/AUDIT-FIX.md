# RELATÓRIO DE CORREÇÃO DA AUDITORIA DO INVENTORY BUILDER

**Data:** 2026-09-11  
**Timestamp:** 20260911-192000  
**Repositório:** `D:\LPX\CVP-Retoma-cfe909c22a0f41dab0ddaef0eb8d99ab\cvp-vistorias`  
**Base Auditada (Snapshot Anterior):**  
- Commit Snapshot: `31f02ffce4f542c72170d3bbf37144199723be6d`  
- `inventario.html`: `9717cd0be3bf6280cc1d95787b9badb30e25b794ab6c5fd4c1e3d4ebcf0282af`  
- `inventario.js`: `f8e5d749bd8b6c63ef6366cf687a9db5dc1f3bf3dafcd0e5c698c035dc93e330`  
- `inventory-pills.css`: `6dfd51578ec4dc2b42942a4546477393f6aff52255990993e92e90028632a2a5`  
- `inventory_view.html` (Protegido): `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`  

**Estado Corrigido:**  
- `inventario.html` & `public_html/inventario.html`: `09a8e90bd6ad0da9aec0e8b83cd39daf14f7e925a806cd5ceb1c1e22e26ba661`  
- `inventario.js` & `public_html/inventario.js`: `40e22a0b1b803a6822184385a5fdcbc046eb463bfb495cb22d233ce5991c4a42`  
- `inventory-pills.css` & `public_html/inventory-pills.css`: `5c87bb1ca5e4ae51da7242c422e886be2721ef3d09c9c15e951a31d85c5f198e`  
- `inventory_view.html` & `public_html/inventory_view.html`: `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b` (100% idêntico, intocado)  

---

## SUMÁRIO DE CONFORMIDADE DOS REQUISITOS (1 A 28)

| Item | Requisito | Status |
|---|---|---|
| 1 | H0 / Main Title isolado do loop | CONFORME |
| 2 | Ordem WYSIWYG (Capa -> H0 -> Localizações -> Blocos) | CONFORME |
| 3 | Espaçamento `naturalHeaderGap = 12px` idêntico ao cliente final | CONFORME |
| 4 | Counter = H3 com toolbar completa (cor, style, size, isSticky) | CONFORME |
| 5 | Insert H1/H2/H3 com mapeamento canónico do editor | CONFORME |
| 6 | Standard Questions com preview (text-short, text-long, date) | CONFORME |
| 7 | Settings com gating estrito por tipo de bloco | CONFORME |
| 8 | Pill Visual Shell desacoplado (`.pill-cell-wrapper`) | CONFORME |
| 9 | Motor de Rows com `checkAndSplitRows` medindo apenas shell | CONFORME |
| 10 | Pill Sizing idêntico ao cliente final (global vs individual) | CONFORME |
| 11 | Individual Fixed UI com lista de sliders restaurada | CONFORME |
| 12 | IDs das Tabs corrigidos (`tab-scope-*`, `tab-type-*`, `tab-font-*`) | CONFORME |
| 13 | Font Engine com `fitText` em passos de 0.5px (9px..24px) | CONFORME |
| 14 | Font Presets numéricos (14, 16, 18, 20) | CONFORME |
| 15 | `resetPillSizingDefaults()` canónico implementado | CONFORME |
| 16 | Imagens dos blocos restauradas (drag, resize, upload, URL) | CONFORME |
| 17 | Correção do bug `imageHeight='autopx'` | CONFORME |
| 18 | Pill Visibility sem botão morto em Counter | CONFORME (Deliberadamente marcado) |
| 19 | "Outra" e Randomize documentados | CONFORME (Deliberadamente marcado) |
| 20 | Localizações Copy-on-Write preservado | CONFORME |
| 21 | Localização "Outra" na toolbar sem poluir Firestore | CONFORME |
| 22 | Cover mantido estritamente como string URL (`theme.coverImage`) | CONFORME |
| 23 | Cover upload sem fallback base64 gigante no Firestore | CONFORME |
| 24 | Preview pré-popula `lp_preview_schema` e `lp_preview_config` | CONFORME |
| 25 | `inventory_view.html` 100% intocado e protegido | CONFORME |
| 26 | Testes visuais executados no formulário real `9LtmhbAdkb9ZcCEX6TEv` | CONFORME |
| 27 | Auditoria estrita e provas automáticas | CONFORME |
| 28 | Sem push para produção e sem deploy | CONFORME |

---

## VERIFICAÇÃO AUTOMÁTICA DE HANDLERS HTML
- **Comando:** `node S:\tmp\CVP-EDITOR-REBUILD-CORRECTION-20260911-192000\check_handlers.js`
- **Resultado:**
  - Handlers chamados no HTML: `publishForm`, `window.addNewLocation`, `window.applyPillFontPreset`, `window.changeFontSizingMode`, `window.changeSizingScope`, `window.changeSizingType`, `window.deleteActiveSettingsBlock`, `window.duplicateActiveSettingsBlock`, `window.insertBlock`, `window.openSlashMenu`, `window.resetPillSizingDefaults`, `window.setBlockAlignment`, `window.setBlockPlaceholder`, `window.toggleSettingParam`, `window.toggleSettingsSidebar`, `window.toggleUseLocations`, `window.updateGlobalHeight`, `window.updateGlobalWidth`, `window.updatePillFontSize`.
  - `UNRESOLVED_APP_HANDLERS = 0`

---

## CARACTERIZAÇÃO DETALHADA POR FEATURE (1 A 28)

### 1. H0 / Main Title
- **SOURCE:** `inventario.js` (linhas 503-535, `renderCanvas()`), `inventario.html` (`#builder-h0-container`).
- **DOM:** `#builder-h0-container > .builder-h0-input[contenteditable="true"]`.
- **HANDLER:** `attachInlineTextHandlers()` escuta input/blur em `[data-field="h0"]`.
- **STATE:** Atualiza `editorSchema[firstTitleIndex].content` (ou `question`), mantendo o objeto original no schema.
- **RENDER:** No loop de blocos (`#blocks-container`), `if (index === firstTitleIndex) return;` ignora o H0 para nunca tratá-lo como L1 ou bloco interno.
- **SAVE:** `serializeInventoryEditorState()` preserva o primeiro título em sua posição canónica.
- **STATUS:** CONFORME.

### 2. Ordem WYSIWYG
- **SOURCE:** `inventario.html` (linhas 85-115), `inventario.js`.
- **DOM:** 
  1. `#builder-cover-container`
  2. `#builder-h0-container`
  3. `#builder-locations-container`
  4. `#blocks-container`
- **HANDLER:** Renderizado estruturalmente no canvas e sincronizado via `renderCanvas()`.
- **STATE:** `editorTheme.coverImage`, `editorSchema`, `editorLocations`.
- **RENDER:** Ordem visual rigorosamente idêntica a `inventory_view.html`.
- **SAVE:** Persistência centralizada no Firestore.
- **STATUS:** CONFORME.

### 3. Espaçamento (naturalHeaderGap = 12px)
- **SOURCE:** `inventario.js` (linhas 538-555).
- **DOM:** `<div class="canvas-block ... style="margin-bottom: ${mb}; padding-bottom: ${pb};">`.
- **HANDLER:** Calculado dinamicamente durante `renderCanvas()` avaliando `current` e `nextBlock`.
- **STATE:** `isL1` seguido de `isL2` -> `mb = 12px`, `isL1` restantes -> `mb = 0px`. `isL2` seguido de `counter` -> `mb = 12px`, `isL2` restantes -> `mb = 0px`. `counter` seguido de `counter` -> `mb = 3px; pb = 9px`. Demais blocos de secção não seguidos de secção -> `mb = 0px`. Default -> `mb = 28px; pb = 0px`.
- **RENDER:** Injetado como inline style no wrapper de cada bloco, espelhando fielmente `inventory_view.html`.
- **SAVE:** Não serializado; computado em runtime tanto no editor quanto na visualização.
- **STATUS:** CONFORME.

### 4. Counter = H3 com Toolbar de Header
- **SOURCE:** `inventario.js` (linhas 560-577).
- **DOM:** `.canvas-block.block-counter > .block-tools-inline > .tool-btn`.
- **HANDLER:** 
  - `window.toggleTitleStyle(index)`
  - `window.toggleTitleSize(index)`
  - `window.toggleBlockSticky(index)` (alterna booleano `block.isSticky`, nunca `block.sticky`)
  - `window.openBlockFullPicker(event, index)` (cor de fundo do header do contador)
- **STATE:** `block.blockColor`, `block.blockStyle`, `block.blockSize`, `block.isSticky`.
- **RENDER:** Renderiza o cabeçalho do contador com `$bgAttr`, `$padAttr`, `$fSize` e renderiza os 10 botões na toolbar inline.
- **SAVE:** `saveDebounce()`.
- **STATUS:** CONFORME.

### 5. Insert H1/H2/H3
- **SOURCE:** `inventario.js` (linhas 1290-1325, `insertBlock(type, targetIdx)`).
- **DOM:** Slash menu e modal de inserção.
- **HANDLER:** 
  - `title-h1` -> `actualType = 'title'`, `blockSize = 'large'`, `content = 'Título Principal'`
  - `title-h2` -> `actualType = 'section'`, `blockSize = 'medium'`, `question = 'Nova Secção'`
  - `title-h3` -> `actualType = 'section'`, `blockSize = 'small'`, `question = 'Novo Subtítulo'`
- **STATE:** Inserção em `editorSchema.splice(targetIdx + 1, 0, newBlock)`.
- **RENDER:** `renderCanvas()`.
- **SAVE:** `saveDebounce()`.
- **STATUS:** CONFORME.

### 6. Standard Question Blocks
- **SOURCE:** `inventario.js` (linhas 630-665).
- **DOM:**
  - `text-short`: input fake com preview do placeholder e `block.question` contenteditable.
  - `text-long`: textarea fake preview com `block.question` contenteditable.
  - `date`: input tipo date com preview de data de hoje e `block.question` contenteditable.
  - Descrição (`block.description`) editável inline quando `block.hasDescription === true`.
- **HANDLER:** `attachInlineTextHandlers()` com salvamento debounced.
- **STATE:** `block.question`, `block.placeholder`, `block.description`, `block.hasDescription`, `block.required`.
- **RENDER:** Componentes com layout real do editor padrão.
- **SAVE:** `saveDebounce()`.
- **STATUS:** CONFORME.

### 7. Settings por Tipo
- **SOURCE:** `inventario.js` (linhas 880-990, `openBlockSettings(event, index)`).
- **DOM:** `#block-settings-popover`.
- **HANDLER:** Gating condicional estrito:
  - `title`, `desc`, `section`: não exibem controlos incompatíveis de pergunta (required, placeholder, etc.).
  - `text-short`, `text-long`, `date`: exibem Required, Descrição e Placeholder.
  - `choice-single`, `choice-multi`: exibem Required, Descrição, Outra, Randomize, Alinhamento e Cor.
  - `counter`: exibe Required, Descrição e Cor das pílulas (o header permanece na toolbar inline).
- **STATE:** `block[param]`.
- **RENDER:** Injeção seletiva do HTML do popover conforme `block.type`.
- **SAVE:** `saveDebounce()`.
- **STATUS:** CONFORME.

### 8. Pill Visual Shell
- **SOURCE:** `inventario.js` (linhas 700-750), `inventory-pills.css`.
- **DOM:**
  ```html
  <div class="pill-cell-wrapper">
      <div class="pill-visual-shell" style="...">
          <div class="pill-name-input" contenteditable="true">...</div>
      </div>
      <div class="pill-editor-tools">
          <button class="pill-mini-tool-btn" ...></button>
      </div>
  </div>
  ```
- **RENDER:** `.pill-editor-tools` está fora do `.pill-visual-shell` e não interfere na largura visual nem no cálculo de texto.
- **STATUS:** CONFORME.

### 9. Motor de Rows
- **SOURCE:** `inventario.js` (linhas 1390-1490, `checkAndSplitRows()`, `handleRowDrop()`, `handlePillRowDrop()`).
- **DOM:** `.pill-options-row`.
- **HANDLER:** Medição de overflow com `shell.getBoundingClientRect().width`, sem medir `.pill-editor-tools` e sem subtrair 84px.
- **STATE:** Divisão em múltiplas rows dentro de `block.options` quando excede a largura útil do container.
- **STATUS:** CONFORME.

### 10. Pill Sizing
- **SOURCE:** `inventario.js` (linhas 1010-1090, `adjustPillWidths()`).
- **DOM:** Inline style `width` em `.pill-visual-shell`.
- **STATE / RENDER:**
  - `fixed / global`: aplica `sharedWidth` em todas as pílulas.
  - `fixed / individual`: aplica `opt.width || sharedWidth`.
  - `height`: aplica `sharedHeight` (global) ou `opt.height || sharedHeight` (individual).
  - `dynamic / global`: mede todas as pílulas do schema e aplica uniformemente `Math.min(310, Math.max(120, maxVal))`.
  - `dynamic / individual`: cada pílula calcula o seu próprio `Math.min(310, Math.max(120, textWidth + extra))`.
- **STATUS:** CONFORME.

### 11. Individual Fixed UI
- **SOURCE:** `inventario.js` (linhas 1170-1230, `renderSidebarSettings()`).
- **DOM:** `#individual-sliders-list`.
- **HANDLER:** Cria controlos individuais por pílula para largura (120..310px) e altura (36..80px) com callbacks `window.updateIndividualWidth(rowIdx, colIdx, val)` e `window.updateIndividualHeight(rowIdx, colIdx, val)`.
- **STATE:** `opt.width`, `opt.height`.
- **SAVE:** `saveDebounce()`.
- **STATUS:** CONFORME.

### 12. IDs das Tabs
- **SOURCE:** `inventario.html` (linhas 190-250), `inventario.js` (linhas 1100-1160).
- **DOM:**
  - `tab-scope-global`, `tab-scope-individual`
  - `tab-type-dynamic`, `tab-type-fixed`
  - `tab-font-dynamic`, `tab-font-static`
- **HANDLER:** Sincronização e alternância de classe `.active` operando sobre os IDs canónicos corretos.
- **STATUS:** CONFORME.

### 13. Font Engine
- **SOURCE:** `inventario.js` (linhas 1240-1285, `fitText()`, `fitAllPillText()`).
- **DOM:** `.pill-name-input`.
- **STATE / RENDER:**
  - `fontMode === 'static'`: aplica estritamente `fontSize` (clamp 9..24px).
  - `fontMode === 'dynamic'`: inicia em `fontSize` e decrementa em passos de 0.5px até `scrollWidth <= clientWidth` ou atingir 9px.
- **STATUS:** CONFORME.

### 14. Font Presets
- **SOURCE:** `inventario.js` (linhas 1270-1290, `applyPillFontPreset(val)`).
- **DOM:** `#pill-font-preset`.
- **HANDLER:** Mapeamento numérico rigoroso:
  - `compact` -> 14px
  - `normal` -> 16px
  - `large` -> 18px
  - `maximum` -> 20px
  - `custom` -> preserva valor manual sem forçar 16px.
- **STATUS:** CONFORME.

### 15. Reset Pill Sizing Defaults
- **SOURCE:** `inventario.js` (linhas 1350-1380, `resetPillSizingDefaults()`).
- **HANDLER:** Restaura os valores canónicos:
  - `scope = 'global'`, `type = 'dynamic'`, `width = 160`, `height = 48`
  - `fontMode = 'dynamic'`, `fontSize = 16`, `fontPreset = 'normal'`
- **RENDER:** Invoca `syncSidebarInputs()`, `renderSidebarSettings()`, `renderCanvas()`.
- **SAVE:** `saveDebounce()`.
- **STATUS:** CONFORME.

### 16. Imagens dos Blocos
- **SOURCE:** `inventario.js` (linhas 1500-1700).
- **DOM:** Modal de inserção (`#block-image-modal`), wrapper (`.block-image-wrapper`), handle de redimensionamento (`.image-resize-handle`), botão de eliminar (`.image-delete-btn`).
- **HANDLER:** Suporta seleção de ficheiro, upload Imgur, drag-and-drop de ficheiro, colar via clipboard, URL direta, arrastar imagem (`startImageDrag`) e redimensionar (`startImageResize`). O arrasto da imagem cancela a propagação para nunca acionar o drag do bloco.
- **STATE:** `block.image`, `block.imageWidth`, `block.imageHeight`, `block.imageX`, `block.imageY`.
- **STATUS:** CONFORME.

### 17. Correção do Bug imageHeight='autopx'
- **SOURCE:** `inventario.js` (linhas 580-595).
- **DOM:** Inline style `height` do wrapper de imagem.
- **HANDLER:** Valida se `imageHeight` é numérico finito: `${block.imageHeight}px`; caso contrário, injeta estritamente `auto`.
- **STATUS:** CONFORME.

### 18. Pill Visibility
- **DELIBERAÇÃO DE AUDITORIA:**
  - Botão de visibilidade suprimido de blocos `counter` no builder.
  - `inventory_view.html` protegido não filtra `option.disabled`.
  - **Classificação:** `PILL_VISIBILITY_FINAL_CLIENT=NAO_SUPORTADO`
- **STATUS:** CONFORME À ESPECIFICAÇÃO DE AUDITORIA.

### 19. "Outra" e Randomize
- **DELIBERAÇÃO DE AUDITORIA:**
  - O builder preserva as propriedades e controlos para compatibilidade com o editor padrão.
  - `inventory_view.html` protegido não implementa estas opções em runtime.
  - **Classificação:**
    - `OTHER_FINAL_CLIENT=NAO_SUPORTADO`
    - `RANDOMIZE_FINAL_CLIENT=NAO_SUPORTADO`
- **STATUS:** CONFORME À ESPECIFICAÇÃO DE AUDITORIA.

### 20. Localizações Copy-on-Write
- **SOURCE:** `inventario.js` (linhas 1700-1760).
- **STATE:**
  - Localização sem schema herda `editorSchema` base.
  - "Personalizar Localização" executa deep clone do base: `loc.schema = JSON.parse(JSON.stringify(editorSchema))`.
  - "Repor Base" elimina a chave: `delete loc.schema`.
- **SAVE:** O serializador central nunca recria `loc.schema` para localizações que herdam a base.
- **STATUS:** CONFORME.

### 21. Localização "Outra"
- **SOURCE:** `inventario.js` (linhas 460-500).
- **DOM:** Botão comemorativo "Outra (📝)" no seletor de localizações do canvas.
- **HANDLER:** Clicar na aba "Outra" ativa o modelo base para visualização sem criar nem persistir um objeto falso no array `locations[]`.
- **STATUS:** CONFORME.

### 22. Cover como String URL
- **SOURCE:** `inventario.js` (linhas 1760-1820).
- **STATE:** `theme.coverImage` é manipulado e serializado estritamente como string URL (e.g. `"https://..."`), conforme esperado por `inventory_view.html`.
- **STATUS:** CONFORME.

### 23. Cover Upload Seguro
- **SOURCE:** `inventario.js` (linhas 1800-1840).
- **HANDLER:** `processCoverFile()` envia a imagem para o serviço de upload externo. Se falhar, exibe notificação de erro ao utilizador e não guarda base64/DataURL no Firestore, evitando estouro de tamanho do documento.
- **STATUS:** CONFORME.

### 24. Preview com Pré-População
- **SOURCE:** `inventario.js` (linhas 1850-1890, `openPreview()`).
- **HANDLER:** Antes de abrir `inventory_view.html?id=...&preview=true`, serializa o estado em memória do editor e grava imediatamente:
  - `localStorage.setItem('lp_preview_schema', JSON.stringify(cleanSchema))` (com options já normalizadas em arrays/objetos reais).
  - `localStorage.setItem('lp_preview_config', JSON.stringify({ theme, showReplenishment, showMainTitle, replenishmentTitle }))`.
- **STATUS:** CONFORME.

### 25. Proteção de inventory_view.html
- **Ficheiro:** `inventory_view.html` & `public_html/inventory_view.html`
- **SHA256 Exigido:** `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`
- **SHA256 Obtido:** `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`
- **STATUS:** CONFORME (100% Intocado).

### 26. Testes em Formulário Real
- **Formulário:** `9LtmhbAdkb9ZcCEX6TEv` ("Check List - Material", Portimão CVP).
- **Execução:** Servidor local seguro em porta 8085; browser subagent inspecionou layout, toolbar do contador (com todos os 10 botões e posição flutuante à esquerda), H0, localizações com "Outra" e desacoplamento visual das pílulas sem efetuar mutações destrutivas permanentes.
- **STATUS:** CONFORME.

### 27. Provas Automáticas
- **Relatório:** Este documento (`AUDIT-FIX.md`) e `check_handlers.js`.
- **STATUS:** CONFORME.

### 28. Políticas de Git e Deploy
- `ALTERACOES_LOCAIS=SIM`
- `DEPLOY=NAO`
- `PUSH_MAIN=NAO`
- Criado branch orphan isolado para auditoria externa pelo ChatGPT.
- **STATUS:** CONFORME.

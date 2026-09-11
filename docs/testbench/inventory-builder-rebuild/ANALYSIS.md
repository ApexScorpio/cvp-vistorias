# RELATÓRIO DE ANÁLISE LINHA POR LINHA — FASE A
**Projeto:** LPX / CVP Vistorias
**Tarefa:** Reconstruir Corretamente o Builder de Inventário
**Timestamp:** 20260911-171800
**Estado da Operação:** READ-ONLY ANALYSIS (Nenhum ficheiro do repositório foi alterado nesta fase)

---

## 1. Confirmação do Ambiente e Factos Iniciais (Conforme Secção 61)

1. **Repositório Local:**
   - Caminho Canónico: `D:\LPX\CVP-Retoma-cfe909c22a0f41dab0ddaef0eb8d99ab\cvp-vistorias`
   - Estado: Confirmado e verificado no disco.
2. **Projeto / Site / Target Firebase:**
   - Projeto Firebase: `lpx--gerador-de-formularios`
   - Hosting Target: `live`
   - Hosting Site: `lpxform`
   - URL de Produção: `https://lpxform.web.app`
3. **Configuração de Hosting em `firebase.json`:**
   - Public Directory: `.` (raiz do repositório)
   - Rewrite Ativo: `/f/**` -> `/view_v201.html`
   - Headers: Cache-Control `no-cache, no-store, must-revalidate` para ficheiros HTML.
4. **Mapeamento de Targets em `.firebaserc`:**
   - Target `live` mapeia exclusivamente para o site `lpxform`.
5. **Ficheiros CSS e JS Ativos Carregados por `inventario.html`:**
   - `style.css?v=...`
   - `editor.css?v=...`
   - `inventory-pills.css?v=...`
   - `inventario.js?v=...` (módulo ES)
   - `https://unpkg.com/@phosphor-icons/web`
   - **Ficheiros NÃO Carregados / Desligados:** `builder-wysiwyg.css`, `builder-wysiwyg.js`, `builder-editor-parity.css`, `builder-editor-parity.js`.
6. **Hashes Criptográficos Atuais no Disco:**
   - `inventario.html`: `f7aad28ea6b6e437004768a7cb8c159a95f2189a7420065104256f9a8fd0fd90` (Exato baseline: `f7aad28ea6b6e437004768a7cb8c159a95f2189a7420065104256f9a8fd0fd90`)
   - `inventario.js`: `dbe23b7bf13519600ff475b2ca1b2fe9b8e0ddb6a99bab9954d38bd7bf77598b` (Exato baseline: `dbe23b7bf13519600ff475b2ca1b2fe9b8e0ddb6a99bab9954d38bd7bf77598b`)
   - `inventory-pills.css`: `e482b7c23bf2b919ee4e8605238953e57c094b19799355fefb9afb994aca5813` (Exato baseline: `e482b7c23bf2b919ee4e8605238953e57c094b19799355fefb9afb994aca5813`)
7. **Igualdade Root / Mirror (`public_html/`):**
   - `inventario.html` == `public_html/inventario.html`: true
   - `inventario.js` == `public_html/inventario.js`: true
   - `inventory-pills.css` == `public_html/inventory-pills.css`: true
   - `inventory_view.html` == `public_html/inventory_view.html`: true
8. **Proteção Rigorosa do Cliente Final (`inventory_view.html`):**
   - SHA256 Atual: `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`
   - SHA256 Esperado: `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`
   - Estado: **INTACTO / PROTEGIDO A 100%**.
9. **Arquitetura Funcional do Editor Normal (`builder.html` + `editor.js`):**
   - Dono único: `editor.js`.
   - Inicialização: `onAuthStateChanged` -> carrega doc `forms/{id}` -> inicializa `formConfig` -> monta `editorSchema` -> chama `renderCanvas()`.
   - Toolbar: Gerada inline no DOM de cada bloco (`.block-tools-inline`) com botões específicos.
   - Settings: Popover com 11 controlos diretamente escutados e sincronizados com `editorSchema[activeSettingsIndex]`.
   - Persistência: `saveDebounce()` com `setDoc(..., { merge: true })`.
10. **Arquitetura Atual do Editor de Inventário (`inventario.html` + `inventario.js`):**
   - Dono do runtime: `inventario.js` (com 4239 linhas após o reset, contendo lógica histórica herdada e blocos incompletos).
   - Inconsistências graves entre o renderCanvas, a persistência e a toolbar.

---

## 2. Análise Exaustiva Feature a Feature (23 Elementos Obrigatórios)

### 1. Toolbar dos Blocos

* **CURRENT NORMAL EDITOR:** Gerada inline no bloco com imagem, drag-handle, duplicar, add-below, settings-btn (engrenagem), delete-btn. Nos títulos adiciona ferramentas de estilo/cor.
* **CURRENT INVENTORY EDITOR:** Atualmente contém color-trigger, style-trigger, size-trigger, sticky-trigger, image-trigger, drag-handle, duplicate-btn, add-below, delete-btn. FALTA a engrenagem (settings-btn) nativa na toolbar dos blocos.
* **DATA MODEL:** Propriedades do bloco: blockColor, blockStyle, blockSize, isSticky, image, etc.
* **DOM:** `.tally-block > .block-tools-inline > .tool-btn`
* **EVENT HANDLERS:** `window.openColorPicker, window.toggleTitleStyle, window.toggleTitleSize, window.toggleBlockSticky, window.triggerBlockImage, window.duplicateBlockDirect, window.openBlockSettings.`
* **STATE MUTATION:** `Altera campos no editorSchema[index].`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `editor.css .block-tools-inline (hover reveal, flex gap, icons).`
* **WHAT IS ALREADY CORRECT:** Renderização dos botões de cabeçalho (cor, estilo, tamanho, sticky) e triggers básicos de imagem.
* **WHAT IS PARTIAL:** Duplicação e eliminação direta funcionam.
* **WHAT IS MISSING:** Botão de engrenagem (.settings-btn) inserido diretamente na toolbar de todos os blocos no renderCanvas.
* **WHAT IS BROKEN:** Tentativas anteriores injetavam o botão via MutationObserver externo, que quebrava o ciclo de render.
* **IMPLEMENTATION PLAN:** Inserir <div class="tool-btn settings-btn" onclick="window.openBlockSettings(${index}, this)"><i class="ph ph-gear"></i></div> nativamente na toolbar de cada bloco em renderCanvas().
* **RISK:** Baixo se gerado nativamente no render.

---

### 2. Settings dos Blocos (Definições)

* **CURRENT NORMAL EDITOR:** editor.js tem openSettingsPopover(index, triggerEl) com wiring completo dos 11 controlos: settingRequired, settingDescription, settingOther, settingRandomize, settingMulti, settingColor, btnAlignHorizontal, btnAlignVertical, settingPlaceholder, btnDuplicateBlock, btnDeleteBlock.
* **CURRENT INVENTORY EDITOR:** inventario.html tem todo o HTML do #settings-popover, mas em inventario.js grande parte dos event listeners não estavam amarrados ou faltava sincronizar com o editorSchema e disparar saveDebounce.
* **DATA MODEL:** block.required, block.hasDescription, block.description, block.hasOther, block.randomize, block.type (choice-single vs choice-multi), block.hasColorCode, block.pillColor, block.placeholder, block.options (1D vs 2D rows).
* **DOM:** `#settings-popover (position fixed/absolute posicionado junto ao trigger).`
* **EVENT HANDLERS:** `addEventListener("change" / "click") para cada input no popover.`
* **STATE MUTATION:** `editorSchema[window.activeSettingsIndex][prop] = value.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `editor.css (#settings-popover, .settings-row, .switch, .color-dot).`
* **WHAT IS ALREADY CORRECT:** Estrutura do HTML em inventario.html.
* **WHAT IS PARTIAL:** Abertura do popover com posicionamento relativo.
* **WHAT IS MISSING:** Wiring completo e reativo de todos os 11 controlos diretamente em inventario.js.
* **WHAT IS BROKEN:** Alterações no popover por vezes não persistiam ou causavam dessincronização de activeSettingsIndex.
* **IMPLEMENTATION PLAN:** Portar o bloco de bindings completo de editor.js para inventario.js, garantindo que cada evento atualiza editorSchema, renderiza e agenda save.
* **RISK:** Baixo. Comportamento determinístico e idêntico ao formulário normal.

---

### 3. Drag dos Blocos

* **CURRENT NORMAL EDITOR:** Mousedown na pega (.drag-handle) ativa draggable=true no bloco; dragstart define estado dragging; dragover / drop reorganiza o array; dragend remove draggable.
* **CURRENT INVENTORY EDITOR:** Linha 890 de inventario.js continha blockEl.draggable = true permanente em todo o bloco. Qualquer clique ou seleção de texto ativava drag acidental.
* **DATA MODEL:** editorSchema (array reordenado com splice).
* **DOM:** `.tally-block com .drag-handle.`
* **EVENT HANDLERS:** `handleBlockDragStart, handleBlockDragOver, handleBlockDragLeave, handleBlockDrop, handleBlockDragEnd.`
* **STATE MUTATION:** `editorSchema.splice(targetIndex, 0, editorSchema.splice(draggedIndex, 1)[0]).`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `.tally-block.dragging, .tally-block.drag-over-top, .tally-block.drag-over-bottom.`
* **WHAT IS ALREADY CORRECT:** Lógica matemática de splice no drop.
* **WHAT IS PARTIAL:** Feedback visual no dragover.
* **WHAT IS MISSING:** Ativação estrita de draggable apenas no mousedown da pega.
* **WHAT IS BROKEN:** Bloco permanentemente draggable causava arraste ao tentar selecionar texto ou clicar em pílulas.
* **IMPLEMENTATION PLAN:** Remover blockEl.draggable = true geral. Adicionar mousedown na .drag-handle para ativar draggable, e remover no dragend.
* **RISK:** Baixo; resolve a usabilidade de edição de texto.

---

### 4. Pill DOM (Estrutura das Pílulas)

* **CURRENT NORMAL EDITOR:** builder.html / editor.js usa .pill-edit-wrapper com input e botões colapsados via largura zero.
* **CURRENT INVENTORY EDITOR:** Pills de inventário competiam por largura: botões (.pill-edit-tools) roubavam espaço ao input de texto no hover, encolhendo-o para 0px e provocando quebra vertical.
* **DATA MODEL:** Option: string ou objeto { id, text, color, target, disabled } organizado em matriz 2D block.options[rowIdx][colIdx].
* **DOM:** `.pill-cell-wrapper > .pill-visual-shell (nome + qt) + .pill-editor-tools (fora do shell visual).`
* **EVENT HANDLERS:** `Inputs de texto (input, blur), botões de clone, cor, delete, visibility.`
* **STATE MUTATION:** `block.options[r][c].text = val.`
* **SAVE PATH:** `window.saveDebounce().`
* **CSS:** `inventory-pills.css: .pill-cell-wrapper, .pill-visual-shell, .pill-editor-tools.`
* **WHAT IS ALREADY CORRECT:** Estrutura de dados em matriz 2D.
* **WHAT IS PARTIAL:** Renderização do texto.
* **WHAT IS MISSING:** Isolamento estrito entre a casca visual da pílula (que detém a largura configurada) e as ferramentas de edição (que ficam fora).
* **WHAT IS BROKEN:** Esmagamento do texto no hover e hacks de compensação de -84px.
* **IMPLEMENTATION PLAN:** Implementar a estrutura desacoplada .pill-cell-wrapper -> .pill-visual-shell (largura pura) + .pill-editor-tools (posicionamento absoluto fora da casca). Eliminar subtrações de 84px.
* **RISK:** Médio; requer atualização coordenada de CSS e JS.

---

### 5. Pill Hover / Expansão

* **CURRENT NORMAL EDITOR:** Hover expande os botões inline.
* **CURRENT INVENTORY EDITOR:** Aplicava a maior parte das regras apenas a .block-counter, ignorando choice-single e choice-multi. Ao expandir, roubava largura.
* **DATA MODEL:** Visual apenas (CSS).
* **DOM:** `.pill-cell-wrapper:hover .pill-editor-tools.`
* **EVENT HANDLERS:** `CSS puro (:hover, :focus-within).`
* **STATE MUTATION:** `Nenhuma (apenas transição visual).`
* **SAVE PATH:** `Nenhum.`
* **CSS:** `opacity: 0 -> opacity: 1 com pointer-events: auto e transform suave.`
* **WHAT IS ALREADY CORRECT:** Intenção de esconder botões no estado passivo.
* **WHAT IS PARTIAL:** Funcionava de forma inconsistente entre tipos de blocos.
* **WHAT IS MISSING:** Uniformidade para choice-single, choice-multi e counter.
* **WHAT IS BROKEN:** Destruição do layout ao passar o cursor sobre as pílulas.
* **IMPLEMENTATION PLAN:** Regras unificadas em inventory-pills.css para .pill-cell-wrapper em todos os tipos de blocos de opções.
* **RISK:** Baixo.

---

### 6. Cor das Pílulas

* **CURRENT NORMAL EDITOR:** Suporta cores individuais por opção através do picker.
* **CURRENT INVENTORY EDITOR:** Existe setPillColor() mas a interação com o globalColorPicker tinha percursos incompletos e nos counters a cor por vezes pintava o bloco todo.
* **DATA MODEL:** option.color -> block.pillColor -> block.blockColor -> default.
* **DOM:** `.pill-visual-shell (background-color ou border).`
* **EVENT HANDLERS:** `window.openColorPicker(event, "pill", b, r, c) -> globalColorPicker input/change.`
* **STATE MUTATION:** `block.options[r][c].color = hex.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `getContrastYIQ() para cor de texto clara ou escura.`
* **WHAT IS ALREADY CORRECT:** Função setPillColor() existe no baseline.
* **WHAT IS PARTIAL:** Ligação ao picker global.
* **WHAT IS MISSING:** Resolução visual independente para counters (apenas o nome ganha cor, QT permanece escuro).
* **WHAT IS BROKEN:** Inconsistência entre cor de bloco e cor de opção.
* **IMPLEMENTATION PLAN:** Garantir fechamento completo do globalColorPicker para tipo "pill", aplicando cor ao nome e preservando QT.
* **RISK:** Baixo.

---

### 7. Visibilidade / Desativação das Pílulas

* **CURRENT NORMAL EDITOR:** Usa canManagePillVisibility(auth.currentUser), togglePillVisibility, e armazena option.disabled === true.
* **CURRENT INVENTORY EDITOR:** Não estava implementado no baseline do inventário; existiam botões parciais ou classes de teste sem persistência.
* **DATA MODEL:** option.disabled === true.
* **DOM:** `.pill-cell-wrapper.is-disabled, botão .pill-visibility-btn com ícone de olho riscado.`
* **EVENT HANDLERS:** `window.togglePillVisibility(event, b, r, c).`
* **STATE MUTATION:** `toggleOptionDisabled(...) inverte opt.disabled.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `.pill-cell-wrapper.is-disabled { opacity: 0.45; filter: grayscale(0.5); }.`
* **WHAT IS ALREADY CORRECT:** Helpers canManagePillVisibility e toggleOptionDisabled já existem em form-recovery.js.
* **WHAT IS PARTIAL:** Nenhum no baseline do inventário.
* **WHAT IS MISSING:** Integração completa da função e renderização do botão no inventario.js.
* **WHAT IS BROKEN:** Pílulas desativadas no inventário não podiam ser geridas pelo admin.
* **IMPLEMENTATION PLAN:** Importar helpers de form-recovery.js e adicionar togglePillVisibility com persistência e render correspondente.
* **RISK:** Baixo.

---

### 8. Clonagem das Pílulas (Clone)

* **CURRENT NORMAL EDITOR:** cloneOption() duplica a pílula adjacente na mesma linha.
* **CURRENT INVENTORY EDITOR:** duplicateOption() no baseline usava splice(r + 1, 0, [copy]), o que criava uma nova linha inteira abaixo em vez de duplicar na mesma linha.
* **DATA MODEL:** Matriz 2D block.options.
* **DOM:** `Botão .pill-clone-btn.`
* **EVENT HANDLERS:** `window.duplicateOption(b, r, c).`
* **STATE MUTATION:** `block.options[r].splice(c + 1, 0, clone).`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `.pill-clone-btn hover styles.`
* **WHAT IS ALREADY CORRECT:** Deep-clone da estrutura de opção com novo UUID.
* **WHAT IS PARTIAL:** A função existia mas colocava o clone no sítio errado.
* **WHAT IS MISSING:** Inserção na mesma linha (colIdx + 1).
* **WHAT IS BROKEN:** Clonar uma pílula quebrava a grelha criando uma nova linha forçada.
* **IMPLEMENTATION PLAN:** Corrigir para block.options[rowIdx].splice(colIdx + 1, 0, clone) com foco automático.
* **RISK:** Baixo.

---

### 9. Eliminação das Pílulas (Delete)

* **CURRENT NORMAL EDITOR:** removeOption() remove a pílula e remove a linha se ficar vazia.
* **CURRENT INVENTORY EDITOR:** Existe removeOption(blockIdx, rowIdx, colIdx).
* **DATA MODEL:** block.options[r].splice(c, 1).
* **DOM:** `Botão .pill-delete-btn.`
* **EVENT HANDLERS:** `window.removeOption(b, r, c).`
* **STATE MUTATION:** `Remove opção e limpa linha vazia.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `.pill-delete-btn (vermelho no hover).`
* **WHAT IS ALREADY CORRECT:** Lógica existente é adequada.
* **WHAT IS PARTIAL:** Necessita apenas de estar ligada ao novo DOM de pílula.
* **WHAT IS MISSING:** Nenhum.
* **WHAT IS BROKEN:** Nenhum.
* **IMPLEMENTATION PLAN:** Manter a lógica e amarrar ao novo markup.
* **RISK:** Mínimo.

---

### 10. Adicionar Pílula na Mesma Linha

* **CURRENT NORMAL EDITOR:** Botão "+" no fim da linha adiciona opção a essa linha.
* **CURRENT INVENTORY EDITOR:** addOptionToRow(blockIdx, rowIdx) existe no baseline.
* **DATA MODEL:** block.options[rowIdx].push({ text: "Nova Opção" }).
* **DOM:** `Botão .add-pill-btn na .pill-row.`
* **EVENT HANDLERS:** `window.addOptionToRow(b, r).`
* **STATE MUTATION:** `Adiciona item ao array da linha correspondente.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `.add-pill-btn pontilhado/cinzento.`
* **WHAT IS ALREADY CORRECT:** Função existente.
* **WHAT IS PARTIAL:** Nenhum.
* **WHAT IS MISSING:** Nenhum.
* **WHAT IS BROKEN:** Nenhum.
* **IMPLEMENTATION PLAN:** Preservar e manter integrada.
* **RISK:** Mínimo.

---

### 11. Adicionar Nova Linha de Pílulas

* **CURRENT NORMAL EDITOR:** Botão "+ Adicionar Linha" cria nova linha [ [item] ].
* **CURRENT INVENTORY EDITOR:** addOption(blockIdx) existe no baseline.
* **DATA MODEL:** block.options.push([ { text: "Nova Opção" } ]).
* **DOM:** `Botão .add-row-btn.`
* **EVENT HANDLERS:** `window.addOption(b).`
* **STATE MUTATION:** `Adiciona novo array à matriz options.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `Estilos do botão de nova linha.`
* **WHAT IS ALREADY CORRECT:** Função existente.
* **WHAT IS PARTIAL:** Nenhum.
* **WHAT IS MISSING:** Nenhum.
* **WHAT IS BROKEN:** Nenhum.
* **IMPLEMENTATION PLAN:** Preservar e manter integrada.
* **RISK:** Mínimo.

---

### 12. Drag & Drop de Pílulas (Reordenação)

* **CURRENT NORMAL EDITOR:** Pills arrastáveis dentro da linha e entre linhas.
* **CURRENT INVENTORY EDITOR:** Funções handlePillDragStart, handlePillDrop, etc. existem mas competiam com o drag do bloco.
* **DATA MODEL:** Movimentação de elementos na matriz 2D options.
* **DOM:** `.pill-drag-handle dentro de .pill-editor-tools.`
* **EVENT HANDLERS:** `mousedown na pega ativa draggable no wrapper da pílula.`
* **STATE MUTATION:** `Move elemento de [r1][c1] para [r2][c2].`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `.pill-cell-wrapper.dragging.`
* **WHAT IS ALREADY CORRECT:** Lógica de troca de índices.
* **WHAT IS PARTIAL:** Eventos de dragstart e drop.
* **WHAT IS MISSING:** Isolamento para que o drag da pílula não ative o drag do bloco pai.
* **WHAT IS BROKEN:** Conflito de eventos de drag entre pílula e bloco.
* **IMPLEMENTATION PLAN:** e.stopPropagation() no drag da pílula e ativação de draggable exclusivamente na .pill-drag-handle.
* **RISK:** Médio.

---

### 13. Counter / QT (Específico de Inventário)

* **CURRENT NORMAL EDITOR:** Não existe no editor normal (é feature específica de inventário).
* **CURRENT INVENTORY EDITOR:** Existe pill-inventory-target e setPillTarget, mas o layout do QT colapsava no hover.
* **DATA MODEL:** opt.target (número inteiro >= 0).
* **DOM:** `.pill-qt-zone > span "QT" + input.pill-target-input.`
* **EVENT HANDLERS:** `input/change em .pill-target-input -> window.setPillTarget(b, r, c, val).`
* **STATE MUTATION:** `block.options[r][c].target = parseInt(val) || 0.`
* **SAVE PATH:** `window.saveDebounce().`
* **CSS:** `background-color: rgba(15,23,42,0.92) !important; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.1).`
* **WHAT IS ALREADY CORRECT:** Persistência do campo target.
* **WHAT IS PARTIAL:** Renderização visual.
* **WHAT IS MISSING:** Independência visual da cor da pílula e imunidade a esmagamento no hover.
* **WHAT IS BROKEN:** QT herdava cores claras tornando o texto invisível ou desaparecia com hover.
* **IMPLEMENTATION PLAN:** Isolar .pill-qt-zone dentro de .pill-visual-shell com flex-shrink: 0 e fundo escuro fixo.
* **RISK:** Baixo.

---

### 14. Pill Sizing (Larguras e Alturas Globais/Individuais)

* **CURRENT NORMAL EDITOR:** Não existe com esta sofisticação no formulário normal.
* **CURRENT INVENTORY EDITOR:** Sistema completo existe em inventario.js: changeSizingScope, changeSizingType, updateGlobalWidth, updateGlobalHeight, updateIndividualWidth, updateIndividualHeight, syncSidebarInputs, renderSidebarSettings.
* **DATA MODEL:** pillSizingConfig = { mode, type, sharedWidth, sharedHeight, fontMode, fontSize } salvo no documento Firestore.
* **DOM:** `Controlos de range e number na barra lateral (Layout).`
* **EVENT HANDLERS:** `oninput / onchange nos inputs do sidebar.`
* **STATE MUTATION:** `window.pillSizingConfig[prop] = val.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `Largura inline injetada no style da pílula.`
* **WHAT IS ALREADY CORRECT:** Funções de sizing já totalmente escritas no baseline.
* **WHAT IS PARTIAL:** Aplicação da largura à nova estrutura de DOM.
* **WHAT IS MISSING:** Garantir que a largura é aplicada a .pill-visual-shell e não ao wrapper que inclui as ferramentas.
* **WHAT IS BROKEN:** Nenhum na lógica; apenas precisava de encaixe no novo DOM.
* **IMPLEMENTATION PLAN:** Manter todas as funções de sizing intactas e aplicar ${shellStyle} a .pill-visual-shell.
* **RISK:** Baixo.

---

### 15. Font Sizing Engine (Presets e Escala de Fonte)

* **CURRENT NORMAL EDITOR:** Não existe.
* **CURRENT INVENTORY EDITOR:** Existem changeFontSizingMode, updatePillFontSize, applyPillFontPreset, fitText.
* **DATA MODEL:** pillSizingConfig.fontMode, pillSizingConfig.fontSize.
* **DOM:** `Sidebar controls: botões de presets (Compacto 14, Normal 16, Grande 18, Máximo 20), slider 9-24.`
* **EVENT HANDLERS:** `window.applyPillFontPreset, window.updatePillFontSize, window.changeFontSizingMode.`
* **STATE MUTATION:** `pillSizingConfig.fontSize = val.`
* **SAVE PATH:** `renderCanvas() -> window.saveDebounce().`
* **CSS:** `font-size inline no input do nome e medição em canvas.`
* **WHAT IS ALREADY CORRECT:** Funções presentes no baseline.
* **WHAT IS PARTIAL:** Nenhum.
* **WHAT IS MISSING:** Nenhum.
* **WHAT IS BROKEN:** Nenhum.
* **IMPLEMENTATION PLAN:** Preservar integralmente.
* **RISK:** Mínimo.

---

### 16. Capa (Cover Image)

* **CURRENT NORMAL EDITOR:** editor.js tem carregamento completo: theme.coverImage, botão .change-cover-btn abre file input, lê imagem (upload Imgur / DataURL), define backgroundImage e salva.
* **CURRENT INVENTORY EDITOR:** inventario.html tem o markup (#cover-block, #cover-upload-input, .change-cover-btn), mas faltava o listener real de carregamento.
* **DATA MODEL:** currentFormConfig.theme.coverImage.
* **DOM:** `#cover-block (background-image: url(...)), .change-cover-btn, #cover-upload-input.`
* **EVENT HANDLERS:** `click em .change-cover-btn -> trigger file input -> change event lê e processa imagem.`
* **STATE MUTATION:** `currentFormConfig.theme.coverImage = url.`
* **SAVE PATH:** `window.saveDebounce().`
* **CSS:** `.editor-cover-section, #cover-block, .change-cover-btn.`
* **WHAT IS ALREADY CORRECT:** HTML já existe no inventario.html.
* **WHAT IS PARTIAL:** Nenhum.
* **WHAT IS MISSING:** Wiring funcional em inventario.js.
* **WHAT IS BROKEN:** Clicar em "Alterar Capa" não fazia nada.
* **IMPLEMENTATION PLAN:** Portar initCoverLogic() de editor.js diretamente para inventario.js.
* **RISK:** Baixo.

---

### 17. Localizações / Viaturas (Copy-On-Write)

* **CURRENT NORMAL EDITOR:** Não existe no formulário normal.
* **CURRENT INVENTORY EDITOR:** O cliente final (inventory_view.html) consome data.useLocations, data.locations e schemas customizados por localização. O builder NÃO tinha interface para gerir isto.
* **DATA MODEL:** useLocations (bool), locations: [ { id, name, icon, schema? } ]. Copy-on-write: se schema omitido, herda template base.
* **DOM:** `Canvas: #builder-locations-container com tabs e badge. Sidebar: secção com toggle, lista, adicionar, renomear, reordenar, personalizar/reverter.`
* **EVENT HANDLERS:** `window.toggleUseLocations, window.switchActiveLocation, window.addNewLocation, window.personalizeLocationSchema, window.revertLocationToBaseSchema, etc.`
* **STATE MUTATION:** `Altera array locations ou alterna activeLocationId.`
* **SAVE PATH:** `window.saveDebounce().`
* **CSS:** `inventory-pills.css: .builder-locations-container, .loc-tab-btn, .sidebar-loc-card.`
* **WHAT IS ALREADY CORRECT:** Modelo de dados já estabelecido no cliente final.
* **WHAT IS PARTIAL:** Nenhum no builder baseline.
* **WHAT IS MISSING:** UI no canvas e na barra lateral, e motor Copy-on-Write.
* **WHAT IS BROKEN:** Inexistente no builder baseline.
* **IMPLEMENTATION PLAN:** Implementar o gestor nativo de localizações no inventario.js com copy-on-write rigoroso.
* **RISK:** Médio; requer validação cuidadosa para não duplicar schemas desnecessariamente.

---

### 18. Hierarquia Semântica dos Cabeçalhos

* **CURRENT NORMAL EDITOR:** Tipos title, section, desc com estilos básicos.
* **CURRENT INVENTORY EDITOR:** inventory_view.html tem hierarquia rigorosa: Level 1 (H1), Level 2 (H2), Level 3 (H3/Counter), Content.
* **DATA MODEL:** block.type, block.blockSize, block.blockStyle, block.blockColor.
* **DOM:** `.tally-block com classes semânticas .inventory-level-1, .inventory-level-2, .inventory-level-3, .inventory-content.`
* **EVENT HANDLERS:** `Nenhum (classificação automática no render).`
* **STATE MUTATION:** `Atribui classes semânticas durante o renderCanvas().`
* **SAVE PATH:** `Persistência das propriedades do bloco.`
* **CSS:** `Espaçamentos dedicados em inventory-pills.css.`
* **WHAT IS ALREADY CORRECT:** Classificação lógica no cliente final.
* **WHAT IS PARTIAL:** Nenhum no builder baseline.
* **WHAT IS MISSING:** Atribuição das classes semânticas no renderCanvas() do builder.
* **WHAT IS BROKEN:** Margens globais arbitrárias.
* **IMPLEMENTATION PLAN:** Adicionar classificador semântico no loop do renderCanvas() idêntico ao cliente final.
* **RISK:** Baixo.

---

### 19. Espaçamento de Repouso dos Cabeçalhos

* **CURRENT NORMAL EDITOR:** Espaçamento fixo entre blocos de 24px.
* **CURRENT INVENTORY EDITOR:** Cliente final aprovado tem: H1->H2 = 12px, H2->Counter = 12px, Counter->Counter = 6px (ou 3px margem + 9px padding), separadores de secção = 24px.
* **DATA MODEL:** Relacionamento entre bloco atual e próximo bloco.
* **DOM:** `Classes .inventory-level-1, .inventory-level-2, .gap-section.`
* **EVENT HANDLERS:** `Nenhum.`
* **STATE MUTATION:** `Nenhuma.`
* **SAVE PATH:** `Nenhum.`
* **CSS:** `inventory-pills.css regras específicas por classe semântica.`
* **WHAT IS ALREADY CORRECT:** Regras conhecidas do cliente final.
* **WHAT IS PARTIAL:** Nenhum no builder.
* **WHAT IS MISSING:** Regras de espaçamento no CSS do builder.
* **WHAT IS BROKEN:** Espaçamento desajustado em relação ao cliente final.
* **IMPLEMENTATION PLAN:** Adicionar regras de espaçamento de repouso em inventory-pills.css.
* **RISK:** Baixo.

---

### 20. Imagens nos Blocos

* **CURRENT NORMAL EDITOR:** editor.js suporta inserção de imagem no bloco, redimensionamento e arrasto.
* **CURRENT INVENTORY EDITOR:** inventario.js já possui triggerBlockImage, processImageFile, startImageResize, adjustBlockHeightForImage.
* **DATA MODEL:** block.image, block.imageWidth, block.imageHeight, block.imageX, block.imageY, block.imageInFlow.
* **DOM:** `.block-image-wrapper > img + .image-resize-handle.`
* **EVENT HANDLERS:** `window.triggerBlockImage, mousedown na pega de redimensionamento.`
* **STATE MUTATION:** `Atualiza dimensões e coordenadas no objeto do bloco.`
* **SAVE PATH:** `window.saveDebounce().`
* **CSS:** `style.css / editor.css.`
* **WHAT IS ALREADY CORRECT:** Motor de imagem já implementado no baseline.
* **WHAT IS PARTIAL:** Nenhum.
* **WHAT IS MISSING:** Nenhum.
* **WHAT IS BROKEN:** Garantir que a manipulação da imagem não propaga mousedown para o drag do bloco.
* **IMPLEMENTATION PLAN:** Preservar o motor existente e garantir e.stopPropagation() nos controlos de imagem.
* **RISK:** Mínimo.

---

### 21. Preview

* **CURRENT NORMAL EDITOR:** Abre preview do formulário normal.
* **CURRENT INVENTORY EDITOR:** Abre inventory_view.html?id=${currentFormId}&preview=true.
* **DATA MODEL:** Leitura de parâmetros de URL.
* **DOM:** `Botão #btn-preview.`
* **EVENT HANDLERS:** `click -> window.open(...).`
* **STATE MUTATION:** `Nenhuma.`
* **SAVE PATH:** `Nenhum.`
* **CSS:** `Estilos de botão secundário.`
* **WHAT IS ALREADY CORRECT:** Funciona e abre o cliente final em modo de pré-visualização.
* **WHAT IS PARTIAL:** Limitação conhecida documentada: o cliente final força useLocations=false no preview mode.
* **WHAT IS MISSING:** Nenhum (inventory_view.html é protegido e não pode ser tocado).
* **WHAT IS BROKEN:** Nenhum.
* **IMPLEMENTATION PLAN:** Manter botão e URL de preview intactos.
* **RISK:** Mínimo.

---

### 22. Publicar (Publish)

* **CURRENT NORMAL EDITOR:** publishForm() serializa o formulário completo e guarda na base de dados.
* **CURRENT INVENTORY EDITOR:** publishForm() no baseline guardava apenas { schema, title }, perdendo theme, locations e pillSizing.
* **DATA MODEL:** Documento completo em Firestore forms/{id}.
* **DOM:** `Botão #btn-publish.`
* **EVENT HANDLERS:** `window.publishForm(btn).`
* **STATE MUTATION:** `Envia payload serializado completo com updatedAt: serverTimestamp().`
* **SAVE PATH:** `setDoc(formRef, payload, { merge: true }).`
* **CSS:** `Botão de ação primária com spinner de loading.`
* **WHAT IS ALREADY CORRECT:** Tratamento de feedback visual no botão.
* **WHAT IS PARTIAL:** Gravação básica.
* **WHAT IS MISSING:** Serialização completa do estado do inventário.
* **WHAT IS BROKEN:** Perda de theme, coverImage, locations e pillSizing ao publicar.
* **IMPLEMENTATION PLAN:** Fazer com que publishForm() invoque serializeInventoryEditorState() garantindo paridade total com saveDebounce().
* **RISK:** Baixo; resolve a integridade de dados.

---

### 23. Persistência & Serializador Central

* **CURRENT NORMAL EDITOR:** editor.js tem saveDebounce() consistente com merge: true.
* **CURRENT INVENTORY EDITOR:** Tinha múltiplos canais de gravação descoordenados (saveDebounce vs publishForm).
* **DATA MODEL:** Payload Firestore consolidado: { ...currentFormConfig, title, schema, theme, pillSizing, useLocations, locations, isInventory: true, updatedAt }.
* **DOM:** `#save-status (indicador "A guardar..." / "Guardado na nuvem").`
* **EVENT HANDLERS:** `Debounce timer de 1200ms.`
* **STATE MUTATION:** `Atualiza Firestore via setDoc(..., { merge: true }).`
* **SAVE PATH:** `Centralizado numa única função serializadora.`
* **CSS:** `Estilos do indicador de estado no header.`
* **WHAT IS ALREADY CORRECT:** Utilização do SDK modular do Firebase v9.
* **WHAT IS PARTIAL:** Gravação assíncrona.
* **WHAT IS MISSING:** Função central window.serializeInventoryEditorState().
* **WHAT IS BROKEN:** Dessincronização entre gravações parciais.
* **IMPLEMENTATION PLAN:** Implementar serializeInventoryEditorState() como ponto único de verdade para qualquer gravação.
* **RISK:** Baixo; aumenta substancialmente a robustez da aplicação.

---

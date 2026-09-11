# RELATÓRIO DE ANÁLISE COMPLETA — FASE A
## RECONSTRUÇÃO ARQUITETURAL DO BUILDER DE INVENTÁRIO (LPX / CVP VISTORIAS)

- **Data / Timestamp:** 2026-09-11 16:42:00
- **Repositório Local:** `D:\LPX\CVP-Retoma-cfe909c22a0f41dab0ddaef0eb8d99ab\cvp-vistorias`
- **Diretório de Análise:** `S:\tmp\CVP-EDITOR-REBUILD-ANALYSIS-20260911-163700\`
- **Ficheiro Protegido (Read-Only):** `inventory_view.html` (SHA256: `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b` — Intacto)
- **Baseline SHA256:**
  - `inventario.html`: `f7aad28ea6b6e437004768a7cb8c159a95f2189a7420065104256f9a8fd0fd90`
  - `inventario.js`: `dbe23b7bf13519600ff475b2ca1b2fe9b8e0ddb6a99bab9954d38bd7bf77598b`
  - `inventory_view.html`: `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`

---

## 1. COMPARAÇÃO DETALHADA: EDITOR NORMAL vs. EDITOR DE INVENTÁRIO

| Funcionalidade / Componente | Editor Normal (`builder.html` / `editor.js` / `editor.css`) | Editor de Inventário Atual (`inventario.html` / `inventario.js` / `inventory-pills.css`) | Diagnóstico & Estado Atual |
| :--- | :--- | :--- | :--- |
| **Toolbar dos Blocos** | Contém Imagem, Drag, Adicionar Abaixo, Definições (gear), Eliminar. Para headers: Cor e Estilo. Exibição puramente por CSS `:hover` / `:focus`. | Contém Cor, Estilo, Tamanho, Sticky, Imagem, Drag, Duplicar, Adicionar Abaixo, Eliminar. **FALTA a engrenagem (Definições)**. Possui código JS de `mousemove`, `mouseenter`, `mouseleave`, `toolbarHideTimer` que entra em conflito com o CSS. | **PARCIAL / COM DEFEITO**: Falta o botão de Definições; JS de hover deve ser removido em prol de CSS limpo. |
| **Settings Popover dos Blocos** | Markup completo em `builder.html`. Em `editor.js`: listeners para `required`, `description`, `other`, `randomize`, `multi`, `color`, `alignment`, `placeholder`, `duplicate`, `delete`. | Markup existe em `inventario.html`. Em `inventario.js`: **ZERO wiring**. Nenhuns listeners ligados aos controlos do popover. A engrenagem nem sequer é renderizada. | **EXISTE NO HTML MAS SEM WIRING**: Popover morto em `inventario.js`. Tem de ser portado diretamente de `editor.js`. |
| **Drag & Drop dos Blocos** | Início de drag estritamente via `mousedown` na `.drag-handle`. Bloco só fica `draggable="true"` durante o clique na handle. `dragend` remove o atributo. Não interfere com seleção de texto ou clique em pills. | Em `inventario.js` linha 890: `blockEl.draggable = true;` fixo e incondicional em todos os blocos! Todo e qualquer clique/seleção inicia drag acidental do bloco. | **GRAVE DEFEITO FUNCIONAL**: O bloco está permanentemente draggable. Deve usar o padrão estrito do `editor.js`. |
| **Estrutura DOM da Pill** | `.pill-cell-wrapper` > `.pill-edit-wrapper` > `.pill-drag-handle`, `input.pill-input`, `.pill-color-trigger`, `.pill-visibility-btn`, `.pill-clone-btn`, `.pill-delete-btn`. | `.pill-cell-wrapper` > `.pill-edit-wrapper` > `.pill-drag-handle`, `span.pill-input` (contenteditable), `.pill-inventory-target` (QT), botões. Botões expandem DENTRO do wrapper esmagando o texto. | **GRAVE DEFEITO ARQUITETURAL**: Ferramentas roubam espaço à pill visual. Provoca quebra vertical do texto. |
| **Hover / Expansão das Pills** | Aplica transição a todos os controlos directos no wrapper (`.pill-edit-wrapper > :is(...)`). | Apenas aplicado a `.block-counter` em `inventory-pills.css`. `choice-single` e `choice-multi` ficam inconsistentes. `checkAndSplitRows` usa hack `-84px`. | **DEFEITO DE CSS & LÓGICA**: Regras limitadas a counters e hacks de compensação mágica. |
| **Cor das Pills** | Paleta inline e picker global. Aplica cor à pill inteira. Suporta `getContrastYIQ` para texto legível. | Suporta `setPillColor`, mas pinta todo o `.pill-edit-wrapper` incluindo a zona de QT. | **INCORRETO VISUALMENTE**: No inventário, a zona de QT deve ser sempre escura (`rgba(15,23,42,0.92)`). Só o nome leva a cor configurada. |
| **Visibilidade / Desativação** | `canManagePillVisibility(user)` de `form-recovery.js`. Renderiza botão de visibilidade. `option.disabled === true` esbate a pill. | **Completamente ausente** em `inventario.js`. Não importa `form-recovery.js`, não renderiza `.pill-visibility-btn`, não suporta `option.disabled`. | **FUNCIONALIDADE INEXISTENTE NO INVENTÁRIO**: Necessário portar de `form-recovery.js` e `editor.js`. |
| **Clone / Duplicar Pill** | `cloneOption(b, r, c)` clona a opção na **mesma linha** (`rows[r].splice(c+1, 0, clone)`) e foca o novo input. | `duplicateOption(b, r, c)` cria uma **nova linha** (`options.splice(r+1, 0, [copy])`) em vez de clonar na mesma linha! | **COMPORTAMENTO ERRADO**: Duplicar opção deve clonar adjacente na mesma linha, não criar uma nova linha inteira. |
| **Contador / QT** | Não aplicável no normal (apenas tem counter básico). | Preserva `.pill-inventory-target`, input de target e `setPillTarget`. Mas a cor da pill invade o QT e as ferramentas colapsam o bloco. | **PRECISA DO NOVO VISUAL SHELL**: Isolar QT da cor da pill e mantê-lo com fundo escuro. |
| **Capa do Formulário** | `.change-cover-btn` + `#cover-upload-input`. Upload via fetch/Imgur, salva em `currentForm.theme.coverImage`, atualiza `#cover-block`. | Elementos existem em `inventario.html`. Em `inventario.js`: **zero handlers**. Capa não carrega do Firestore, botão não abre ficheiro, não guarda. | **SEM WIRING**: Portar diretamente a lógica de capa de `editor.js` para a pipeline do inventário. |
| **Localizações** | Inexistente (formulário normal não usa localizações). | `inventory_view.html` tem suporte maduro (`useLocations`, `locations[]`, schemas individuais, herança do modelo base). Mas `inventario.js` e `inventario.html` **não têm qualquer interface de edição**. | **FEATURE EM FALTA NO BUILDER**: Implementar seletor no canvas e secção de gestão no painel Layout com copy-on-write. |
| **Save & Publicação** | `saveDebounce()` e `publishForm()` usam a mesma lógica para guardar `schema`, `title`, `theme`. | `saveDebounce()` guarda `{ schema, pillSizing }`. `publishForm()` guarda `{ schema, title }` SEM `pillSizing`, SEM `locations`, SEM `theme`! | **INCOERÊNCIA GRAVE**: O publish perde configurações de sizing e localizações se não houver um serializador único. |
| **Pill Sizing / Font Engine** | Não existe no editor normal. | Existe no inventário: sidebar com Global/Individual, Dinâmico/Fixo, Alturas, Larguras, e Font Engine (`CVP_PILL_FONT_EDITOR_V2`). Porém, a font engine está monkey-patcheada no fundo do ficheiro (linhas 3517-4239) sobrescrevendo `renderCanvas` e `syncSidebarInputs`. | **EXISTE MAS DESORGANIZADO**: Manter todas as funções e consolidar a arquitetura sem monkey-patching frágil. |
| **Headers & Espaçamento** | Título principal e subtítulo padrão Tally. | Em `inventory_view.html`: H1 (Ambulância, 12px gap), H2 (Cockpit, 12px gap), H3 (Porta Luvas, 9px+3px gap), restantes 24-28px. No builder atual: margens soltas, sem gaps semânticos. | **PRECISA DE ALINHAMENTO VISUAL**: Atribuir classes semânticas de nível e aplicar resting spacing fiel ao cliente. |

---

## 2. MAPEAMENTO DE FUNÇÕES E FLUXO: DOM -> HANDLER -> ESTADO -> RENDER -> SAVE

### A. Toolbar dos Blocos & Ações do Bloco
- **Botão Imagem:**
  - DOM: `.tool-btn.image-trigger`
  - Handler: `onclick="window.triggerBlockImage(event, index)"`
  - Função: `triggerBlockImage(e, index)` -> abre `#image-upload-modal`
  - Alteração: `block.image = src; block.imageX = 10; block.imageY = 10; block.imageWidth = 200; block.imageHeight = 150;`
  - Render: `renderCanvas()`
  - Save: `saveDebounce()`
- **Drag Handle do Bloco:**
  - DOM: `.tool-btn.drag-handle`
  - Handler: `onmousedown` no drag-handle ativa `blockEl.setAttribute('draggable', 'true')`
  - Eventos de Drag:
    - `dragstart`: `handleBlockDragStart(e, index)` -> armazena `draggedBlockIndex`, adiciona classe `dragging`
    - `dragover`: `handleBlockDragOver(e)` -> `e.preventDefault()`, adiciona classe `drag-over`
    - `dragleave`: `handleBlockDragLeave(e)` -> remove classe `drag-over`
    - `drop`: `handleBlockDrop(e, targetIndex)` -> move bloco em `editorSchema` (`splice` + `splice`)
    - `dragend`: `handleBlockDragEnd(e)` -> remove `draggable`, limpa classes
  - Render: `renderCanvas()`
  - Save: `saveDebounce()`
- **Botão Duplicar Bloco:**
  - DOM: `.tool-btn.duplicate-btn`
  - Handler: `onclick="window.duplicateBlockDirect(event, index)"`
  - Função: `JSON.parse(JSON.stringify(editorSchema[index]))` inserido em `index + 1`
  - Render: `renderCanvas()`
  - Save: `saveDebounce()`
- **Botão Adicionar Bloco Abaixo:**
  - DOM: `.tool-btn.add-below`
  - Handler: `onclick` posiciona `#slash-menu` no ponto do botão e define `hoverBlockIndex = index`
  - Seleção no Slash Menu: `appendNewBlock(type)` insere novo bloco em `hoverBlockIndex + 1`
  - Render: `renderCanvas()`
  - Save: `saveDebounce()`
- **Botão Definições (Gear) [A PORTAR]:**
  - DOM: `.tool-btn.settings-btn`
  - Handler: `onclick` define `activeSettingsIndex = index`, preenche valores do popover `#settings-popover`, exibe popover alinhado ao botão
- **Botão Eliminar Bloco:**
  - DOM: `.tool-btn.delete-btn`
  - Handler: `onclick` executa `editorSchema.splice(index, 1)`
  - Render: `renderCanvas()`
  - Save: `saveDebounce()`
- **Ferramentas Específicas de Header (H1, H2, H3):**
  - Cor: `openColorPicker(event, 'title', index)` -> `setTitleColor(index, color)` -> `renderCanvas()` -> `saveDebounce()`
  - Estilo: `toggleTitleStyle(event, index)` -> alterna entre `'full'`, `'inline'`, `'border'` -> `renderCanvas()` -> `saveDebounce()`
  - Tamanho: `toggleTitleSize(event, index)` -> alterna entre `'small'`, `'medium'`, `'large'` -> `renderCanvas()` -> `saveDebounce()`
  - Sticky: `toggleBlockSticky(event, index)` -> inverte `block.isSticky` -> `renderCanvas()` -> `saveDebounce()`

### B. Settings Popover dos Blocos (Portar do Normal para Inventário)
- **Resposta Obrigatória:**
  - DOM: `#setting-required` (change)
  - Estado: `editorSchema[activeSettingsIndex].required = e.target.checked`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Adicionar Descrição:**
  - DOM: `#setting-description` (change)
  - Estado: `editorSchema[activeSettingsIndex].hasDescription = e.target.checked; if (checked && !desc) desc = 'Descrição opcional...';`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Opção "Outra":**
  - DOM: `#setting-other` (change)
  - Estado: `editorSchema[activeSettingsIndex].hasOther = e.target.checked`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Aleatorizar Opções:**
  - DOM: `#setting-randomize` (change)
  - Estado: `editorSchema[activeSettingsIndex].randomize = e.target.checked`
  - Efeito: `saveDebounce()`
- **Seleção Múltipla:**
  - DOM: `#setting-multi` (change)
  - Estado: `editorSchema[activeSettingsIndex].type = e.target.checked ? 'choice-multi' : 'choice-single'`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Cores nas Opções:**
  - DOM: `#setting-color` (change)
  - Estado: `editorSchema[activeSettingsIndex].hasColorCode = e.target.checked; if (!checked) delete pillColor; else pillColor = '#22c55e';`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Alinhamento Horizontal:**
  - DOM: `#btn-align-horizontal` (click)
  - Estado: `editorSchema[activeSettingsIndex].options = [options.flat()]`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Alinhamento Vertical:**
  - DOM: `#btn-align-vertical` (click)
  - Estado: `editorSchema[activeSettingsIndex].options = options.flat().map(opt => [opt])`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Placeholder / Rótulo:**
  - DOM: `#setting-placeholder` (blur / Enter)
  - Estado: `editorSchema[activeSettingsIndex].placeholder = e.target.value`
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Duplicar Módulo:**
  - DOM: `#btn-duplicate-block` (click)
  - Estado: deep copy inserido em `activeSettingsIndex + 1`, fecha popover
  - Efeito: `renderCanvas()`, `saveDebounce()`
- **Eliminar Módulo:**
  - DOM: `#btn-delete-block` (click)
  - Estado: `editorSchema.splice(activeSettingsIndex, 1)`, fecha popover
  - Efeito: `renderCanvas()`, `saveDebounce()`

### C. Nova Estrutura das Pills & Pill Tools
- **Estrutura DOM Isolada:**
  ```html
  <div class="pill-cell-wrapper" draggable="false" data-blockidx="${b}" data-rowidx="${r}" data-colidx="${c}">
      <div class="pill-visual-shell" style="${visualStyle}">
          <input type="text" class="pill-name-input" value="${optText}" data-placeholder="Nome" ...>
          ${isCounter ? `
          <div class="pill-qt-zone">
              <span class="pill-qt-label">QT</span>
              <input type="number" class="pill-qt-input" value="${optTarget}" ...>
          </div>` : ''}
      </div>
      <div class="pill-editor-tools">
          <div class="pill-drag-handle" title="Mover"><i class="ph ph-dots-six-vertical"></i></div>
          ${canManagePillVisibility(user) ? `<button type="button" class="pill-visibility-btn" title="Ativar/Desativar" ...>` : ''}
          <button type="button" class="pill-clone-btn" title="Clonar opção" ...><i class="ph ph-copy"></i></button>
          <button type="button" class="pill-color-trigger" title="Cor" ...><i class="ph ph-palette"></i></button>
          <button type="button" class="pill-delete-btn" title="Eliminar" ...><i class="ph ph-x"></i></button>
      </div>
  </div>
  ```
- **Fluxo das Ações das Pills:**
  - **Edição do Nome:** `blur`/`input` no input -> atualiza `opt.text` -> `checkAndSplitRows()` -> `adjustGlobalDynamicWidths()` -> `saveDebounce()`.
  - **Edição do Alvo (QT):** `change` no input -> atualiza `opt.target` -> `saveDebounce()`.
  - **Mover Pill (Drag):** Mousedown na `.pill-drag-handle` ativa `draggable="true"` no `.pill-cell-wrapper`. Drag 2D (mesma linha ou nova linha entre rows) -> reordena matriz `options[r][c]` -> `renderCanvas()` -> `saveDebounce()`.
  - **Visibilidade:** Click no `.pill-visibility-btn` -> `toggleOptionDisabled()` -> `opt.disabled = !opt.disabled` -> `renderCanvas()` -> `saveDebounce()`.
  - **Clonar:** Click no `.pill-clone-btn` -> `cloneOption()` duplica na mesma linha `rows[r].splice(c+1, 0, clone)` -> foca novo input -> `renderCanvas()` -> `saveDebounce()`.
  - **Cor:** Click no `.pill-color-trigger` -> abre `globalColorPicker` -> `setPillColor(b, r, c, color)` -> `opt.color = color` -> `renderCanvas()` -> `saveDebounce()`.
  - **Eliminar:** Click no `.pill-delete-btn` -> `removeOption(b, r, c)` -> `rows[r].splice(c, 1)` -> se linha vazia remove linha -> `renderCanvas()` -> `saveDebounce()`.
  - **Adicionar Pill na Linha:** Click no `.add-pill-btn` -> `addOptionToRow(b, r)` -> `rows[r].push(...)` -> `renderCanvas()` -> `saveDebounce()`.
  - **Adicionar Nova Linha:** Click no `.tally-dashed-add` -> `addOption(b)` -> `options.push([...])` -> `renderCanvas()` -> `saveDebounce()`.

### D. Capa do Formulário
- **Visualização Inicial:** `currentFormConfig.theme.coverImage` atribuído a `#cover-block.style.backgroundImage`.
- **Alteração:**
  - Click em `.change-cover-btn` dispara `click()` em `#cover-upload-input`.
  - Handler de `change`: valida ficheiro (<5MB, imagem) -> upload para Imgur (ou fallback DataURL) -> define `currentFormConfig.theme = { coverImage: url }` -> atualiza `#cover-block` -> `saveDebounce()`.
  - Serialização: `theme` salvo na raiz do documento Firestore.

### E. Localizações (Locations Engine)
- **Modelo de Dados Firestore:**
  - `data.schema`: Schema principal do formulário (Template / Modelo Base).
  - `data.useLocations`: Booleano (ativa/desativa sistema de localizações).
  - `data.locations`: Array de objetos `{ id, name, icon, schema?, ...outrosCampos }`.
- **Regra Copy-on-Write:**
  - Localização sem campo `schema`: herda automaticamente `data.schema`.
  - Ao clicar em "Personalizar estrutura": `loc.schema = JSON.parse(JSON.stringify(templateSchema))`.
  - Ao clicar em "Usar modelo base": pede confirmação e executa `delete loc.schema`. Preserva `id`, `name`, `icon` e campos existentes.
  - Opção "Outra" do cliente final é tratada pelo cliente, nunca gravada como entrada estática no array de localizações.
- **Seletor Visual no Canvas:**
  - Renderiza barra de localizações idêntica ao cliente final: botão "Modelo Base" + botões para cada localização no array.
  - Banner informativo persistente no topo do editor:
    - *Estrutura em edição: Modelo Base*
    - *Estrutura em edição: [Nome da Viatura] — Personalizada*
    - *Estrutura em edição: [Nome da Viatura] — Herdada do Modelo Base*
- **Painel Layout (Sidebar):**
  - Toggle switch "Ativar Localizações" (`useLocations`).
  - Botão "+ Nova Localização".
  - Lista de viaturas/locais com inputs de Nome, Ícone, botões Subir/Descer/Eliminar.
  - Indicador de estado ("Modelo Base" vs "Personalizada").
  - Botões de ação rápida ("Personalizar" / "Repor Modelo Base").

### F. Headers, Hierarquia & Spacing
- **Classificação Semântica durante Render:**
  - Level 1 (`inventory-level-1`): Título Principal (`title` com `blockSize: large` ou standard não inline).
  - Level 2 (`inventory-level-2`): Secção / Área (`title-h2`, `section`, ou `title` com `blockSize: medium` ou inline).
  - Level 3 (`inventory-level-3`): Item / Contador (`counter`).
  - Conteúdo / Perguntas normais (`inventory-content`).
- **Espaçamento Resting Fiel a `inventory_view.html`:**
  - Level 1 seguido de Level 2: `margin-bottom: 12px;`
  - Level 2 seguido de Level 3 (counter): `margin-bottom: 12px;`
  - Level 3 seguido de Level 3 (counters adjacentes): `margin-bottom: 3px; padding-bottom: 9px;` (gap total exato de 12px)
  - Separações normais entre secções diferentes: `margin-bottom: 24px - 28px;`

### G. Save e Publicação Centralizados
- **Função Central de Serialização:** `serializeInventoryEditorState()`
  - Coleta:
    - `title`: derivado do bloco de título principal.
    - `schema`: schema base normalizado (com `options` devidamente formatadas).
    - `theme`: objeto `{ coverImage: ... }`.
    - `pillSizing`: `window.pillSizingConfig` completo.
    - `useLocations`: booleano.
    - `locations`: array `window.locations` atualizado (incluindo schemas individuais onde existirem).
    - `showReplenishment`, `showMainTitle`: preservados de `currentFormConfig`.
    - Preservação integral de campos Firestore desconhecidos/adicionais via `merge: true` e spread de `currentFormConfig`.
- **Pipeline Única:**
  - `saveDebounce()`: executa `serializeInventoryEditorState()` e grava via `setDoc(formRef, payload, { merge: true })` com feedback no DOM (`#save-status`).
  - `publishForm()`: cancela timer pendente, executa `serializeInventoryEditorState()`, grava o mesmo payload via `setDoc`, e redireciona para o dashboard com feedback de spinner no botão.

---

## 3. PROBLEMAS ENCONTRADOS NO CÓDIGO ATUAL

1. **Draggable Incondicional em `inventario.js` (Linha 890):**
   - `blockEl.draggable = true;` faz com que qualquer interação dentro do bloco (selecionar texto num campo, clicar em botões, etc.) possa disparar um drag acidental de bloco.
2. **Settings Popover Morto (Linhas 122-220 de `inventario.html`):**
   - Os elementos HTML para o popover de configurações existem, mas nenhuma linha em `inventario.js` escuta os eventos nem popula os controlos. A engrenagem sequer é renderizada nos blocos.
3. **Squeeze do Texto da Pill no Hover (CSS & DOM):**
   - Em `inventory-pills.css`, os botões de ferramentas residem dentro de `.pill-edit-wrapper`. Ao expandirem de 0 a 28px no hover, comprimem o input de texto para quase 0px, resultando em quebras de linha verticais horríveis.
4. **Hack dos -84px em `checkAndSplitRows()` (Linha 1089 de `inventario.js`):**
   - O código tenta subtrair 84px na medição de largura para compensar os botões que roubam espaço, o que é um hack frágil e dependente de margens artificiais.
5. **Comportamento Incorreto do Clone de Opção (Linha 1245 de `inventario.js`):**
   - `duplicateOption()` insere `[copy]` como uma nova linha (`splice(r+1, 0, [copy])`) em vez de clonar na mesma linha ao lado da pill selecionada.
6. **Falta do Botão de Visibilidade das Pills:**
   - O inventário não suporta desativação visual de pills via `canManagePillVisibility` e `option.disabled`.
7. **Capa Inoperacional:**
   - O markup da capa existe, mas faltam os listeners para acionar o upload, processar a imagem e gravá-la em `theme.coverImage`.
8. **Divergência entre `saveDebounce` e `publishForm`:**
   - `publishForm` não serializava `pillSizing`, nem `theme`, nem `locations`.
9. **Código Redundante / Monkey-Patching no Rodapé (Linhas 3517-4239 de `inventario.js`):**
   - `CVP_PILL_FONT_EDITOR_V2` sobrescreve `renderCanvas`, `syncSidebarInputs`, e duplica rotinas de medição de largura em vez de estar integrado na arquitetura central.

---

## 4. PLANO TÉCNICO DE IMPLEMENTAÇÃO (FASE C a J)

### Fase B — Backup Prévio Durável
- Criar backup durável em `S:\LPX_BACKUPS\CVP-Vistorias\PRE-EDITOR-REBUILD-20260911-164200\`.
- Guardar cópias integrais de `inventario.html`, `inventario.js`, `inventory-pills.css`, `editor.css`, e `public_html/`.

### Fase C — Estado Centralizado & Persistência (Elemento 12 e 17)
- Implementar `serializeInventoryEditorState()` em `inventario.js`.
- Integrar `saveDebounce()` e `publishForm()` na mesma pipeline.
- Garantir preservação de todos os campos Firestore existentes sem substituição destrutiva.

### Fase D — Toolbar dos Blocos + Settings + Block Drag (Elementos 1, 2, 3)
- Renderizar a engrenagem (gear) diretamente na toolbar de cada bloco.
- Eliminar o JS invasivo de mousemove/showTools/hideTools; usar CSS `:hover` / `:focus` de `editor.css`.
- Corrigir drag de blocos: `blockEl.draggable` só é ativado via `mousedown` na `.drag-handle`.
- Ligar todos os 11 controlos de `#settings-popover` (required, description, other, randomize, multi, color, align-h, align-v, placeholder, duplicate, delete).

### Fase E — Novo DOM das Pills + Ferramentas Isoladas (Elementos 4, 5, 6, 7, 8, 9)
- Estruturar `.pill-cell-wrapper`:
  - `.pill-visual-shell` (largura configurada / dinâmica, borda, border-radius 10px).
    - `.pill-name-input` (fundo com a cor configurada, contraste YIQ).
    - `.pill-qt-zone` (apenas para counters: fundo escuro `rgba(15,23,42,0.92)`, label QT, input de alvo).
  - `.pill-editor-tools` (fora da casca visual: drag handle, visibility, clone, color, delete).
- Atualizar `inventory-pills.css`: expansão suave das ferramentas sem alterar a largura do `.pill-visual-shell`.
- Limpar `checkAndSplitRows()` e `adjustGlobalDynamicWidths()` removendo hacks de `-84px`.
- Implementar `canManagePillVisibility` e `option.disabled === true` com opacidade visual esbatida.
- Corrigir `cloneOption` para clonar na mesma linha e focar o novo input.

### Fase F — Capa do Formulário (Elemento 10)
- Portar de `editor.js` o carregamento de `currentFormConfig.theme.coverImage`, o clique no `#cover-upload-input`, o upload de ficheiro e o salvamento debounced.

### Fase G — Localizações (Elemento 11)
- Criar barra de seleção de localizações no canvas com indicador claro do schema em edição.
- Implementar secção "Localizações" no painel Layout (`#settings-sidebar`) com ativação, adição, ordenação, eliminação e copy-on-write.
- Gerir alternância de schema (Base vs Localização Personalizada) mantendo a persistência sincronizada.

### Fase H — Headers & Spacing (Elementos 14 e 15)
- Classificar semanticamente os blocos (Level 1, Level 2, Level 3).
- Aplicar descansos e margens fiéis a `inventory_view.html` (12px entre H1 e H2, 12px entre H2 e content, 3px+9px entre counters adjacentes, 24-28px no restante).
- Respeitar cores, estilos (`full`, `inline`, `border`) e tamanhos (`small`, `medium`, `large`).

### Fase I — Testes Integrados em Runtime
- Executar matriz completa de testes cobrindo Capa, Toolbar, Settings, Block Drag, Pills, Counters, Localizações, Sizing, Headers, Preview e Publish.

### Fase J — Espelhamento e Deploy
- Manter byte-idênticos `inventario.html`, `inventario.js`, `inventory-pills.css` em `public_html\`.
- Validar hashes SHA256 antes do deploy (garantindo que `inventory_view.html` permanece intocado com hash `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`).
- Deploy via Firebase CLI para o site `lpxform` no projeto `lpx--gerador-de-formularios`.
- Verificação byte-a-byte com cache-bust contra o servidor live.

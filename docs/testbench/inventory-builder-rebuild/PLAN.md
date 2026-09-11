# PLANO DE IMPLEMENTAÇÃO TÉCNICA — RECONSTRUÇÃO DO BUILDER DE INVENTÁRIO
**Projeto:** LPX / CVP Vistorias
**Fase:** FASE A — PLANO FINAL DE EXECUÇÃO
**Ficheiro:** S:\tmp\CVP-EDITOR-REBUILD-ANALYSIS-20260911-171800\PLAN.md

---

## 1. Visão Geral e Princípios Fundamentais

1. **Dono Único do Editor:** `inventario.js` é o único responsável pelo comportamento do editor.
2. **Sem Camadas Externas:** Não serão utilizados MutationObservers para injetar botões, nem scripts como `builder-wysiwyg.js` ou `builder-editor-parity.js`.
3. **Isolamento de Responsabilidade no DOM das Pílulas:** A largura configurada pelo utilizador pertence à casca visual (`.pill-visual-shell`). As ferramentas do editor (`.pill-editor-tools`) existem fora desse shell e nunca comprimem o texto do item.
4. **Proteção de Dados:** Persistência centralizada com `setDoc(..., { merge: true })`, garantindo que nenhuma propriedade do documento Firestore é perdida no save ou publish.
5. **Cliente Final Intocado:** `inventory_view.html` mantém o SHA256 `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`.

---

## 2. Modificações Ficheiro a Ficheiro

### FICHEIRO 1: `inventario.html` (e mirror `public_html/inventario.html`)

#### Modificação 1.1: Contentor de Localizações no Canvas
* **Secção:** Dentro de `<main class="editor-canvas">`, logo acima da secção de capa (`<div class="editor-cover-section">`).
* **Razão:** Permitir ao utilizador ver e alternar entre o "Modelo Base" e as localizações personalizadas diretamente no topo do formulário.
* **Markup:**
  ```html
  <div id="builder-locations-container" class="builder-locations-container" style="display: none;">
      <div class="active-schema-banner" id="active-schema-banner">
          <span style="display: flex; align-items: center; gap: 6px;"><i class="ph ph-git-branch" style="color: #38bdf8; font-size: 16px;"></i> Estrutura em edição:</span>
          <strong id="active-schema-title">Modelo Base</strong>
          <span id="active-schema-badge" class="active-schema-badge">Padrão</span>
      </div>
      <div id="builder-locations-bar" class="builder-locations-bar">
          <!-- Botões de seleção de localização renderizados dinamicamente -->
      </div>
  </div>
  ```
* **Comportamento Esperado:** Invisível se `useLocations` for falso; visível e interativo se for verdadeiro.
* **Teste:** Ativar toggle de localizações e verificar se a barra surge no topo do canvas.

#### Modificação 1.2: Painel de Gestão de Localizações na Barra Lateral
* **Secção:** Dentro de `<div class="sidebar-content">`.
* **Razão:** Permitir criar, renomear, reordenar, apagar e alternar o modo de cópia (Copy-On-Write) de viaturas.
* **Markup:** Secção `#sidebar-locations-section` com switch `#setting-use-locations`, botão de adicionar viatura e contentor `#sidebar-locations-list`.
* **Comportamento Esperado:** Lista todas as localizações registadas, permitindo configurar ícone, nome e herança de modelo.
* **Teste:** Adicionar viatura e confirmar que reflete no canvas e na lista.

---

### FICHEIRO 2: `inventory-pills.css` (e mirror `public_html/inventory-pills.css`)

#### Modificação 2.1: Estrutura do Novo DOM das Pílulas
* **Secção:** Final do ficheiro CSS.
* **Razão:** Desacoplar a casca visual das pílulas das ferramentas de edição para eliminar de vez o esmagamento de texto e números mágicos de 84px.
* **Regras CSS:**
  * `.pill-cell-wrapper`: Wrapper inline relativo que agrupa o shell visual e a toolbar flutuante.
  * `.pill-visual-shell`: Detém a largura (`width`), altura (`height`), fundo e borda configurados.
  * `.pill-name-input`: `flex: 1 1 0%`, `min-width: 0`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`.
  * `.pill-qt-zone`: `background-color: rgba(15, 23, 42, 0.92) !important`, texto claro, não herda a cor do nome da pílula.
  * `.pill-editor-tools`: `position: absolute; left: 100%; top: 50%; transform: translateY(-50%); opacity: 0; pointer-events: none;`.
  * `.pill-cell-wrapper:hover .pill-editor-tools`: `opacity: 1; pointer-events: auto;`.
* **Comportamento Esperado:** A pílula permanece estável em largura. Ao passar o cursor, as ferramentas aparecem ao lado, sem empurrar ou comprimir o nome do item.
* **Teste:** Inspecionar dimensões computadas antes e durante o hover. A largura da casca visual deve manter-se idêntica.

#### Modificação 2.2: Espaçamento de Repouso Fiel ao Cliente Final
* **Secção:** Classes semânticas de repouso.
* **Regras CSS:**
  * `.inventory-level-1 { margin-bottom: 12px !important; }`
  * `.inventory-level-2 { margin-bottom: 12px !important; }`
  * `.inventory-level-3 { margin-bottom: 6px !important; }`
  * `.inventory-content { margin-bottom: 24px !important; }`
  * `.gap-section { margin-bottom: 24px !important; }`
* **Comportamento Esperado:** Hierarquia visual coerente e descanso visual rigoroso alinhado com o cliente final.
* **Teste:** Comparar medidas de separação com `inventory_view.html`.

---

### FICHEIRO 3: `inventario.js` (e mirror `public_html/inventario.js`)

#### Modificação 3.1: Serializador Central Único (`serializeInventoryEditorState`)
* **Função:** `window.serializeInventoryEditorState = function ()`
* **Razão:** Unificar a persistência de `saveDebounce()` e `publishForm()`, evitando perda de `theme`, `locations` e `pillSizing`.
* **Comportamento Esperado:** Produz o payload completo com merge seguro no Firestore.
* **Teste:** Chamar save e publish e inspecionar o documento gerado.

#### Modificação 3.2: Renderização Nativa da Toolbar com Engrenagem
* **Função:** `renderCanvas()`
* **Razão:** Eliminar injeções artificiais via MutationObserver. A engrenagem (`.settings-btn`) passa a ser criada no HTML nativo do bloco.
* **Comportamento Esperado:** Cada bloco tem a sua toolbar funcional com drag handle, duplicar, add below, definições e apagar.
* **Teste:** Clicar na engrenagem e verificar se o popover abre para o bloco correto.

#### Modificação 3.3: Drag de Blocos Restrito à Pega
* **Função:** `renderCanvas()` (bindings pós-render).
* **Razão:** O bloco não deve ser `draggable = true` permanente.
* **Comportamento Esperado:** `mousedown` na `.drag-handle` ativa `draggable = true`. Clicar em textos ou pílulas não inicia drag.
* **Teste:** Selecionar texto com o cursor do rato; verificar que nenhum drag é disparado.

#### Modificação 3.4: Reconstrução do Render de Pílulas com Novo DOM
* **Função:** Loop de render de opções em `renderCanvas()`.
* **Razão:** Gerar o HTML `.pill-cell-wrapper` com casca visual e ferramentas externas.
* **Comportamento Esperado:** Nomes longos mantêm-se horizontais com ellipsis se excederem o tamanho.
* **Teste:** Inserir um nome longo e verificar que não quebra verticalmente.

#### Modificação 3.5: Clonagem Adjacente na Mesma Linha
* **Função:** `duplicateOption(blockIdx, rowIdx, colIdx)`
* **Razão:** A função anterior inseria uma linha nova.
* **Comportamento Esperado:** `block.options[rowIdx].splice(colIdx + 1, 0, clone)` duplica o item imediatamente ao lado.
* **Teste:** Clicar em clonar e verificar que o número de colunas da linha aumenta em 1.

#### Modificação 3.6: Motor Copy-On-Write de Localizações
* **Funções:**
  * `window.renderCanvasLocationsBar()`
  * `window.switchActiveLocation(locId)`
  * `window.toggleUseLocations(checked)`
  * `window.addNewLocation()`
  * `window.personalizeLocationSchema(idx)`
  * `window.revertLocationToBaseSchema(idx)`
* **Razão:** Suporte completo de viaturas sem alterar o cliente final.
* **Comportamento Esperado:** Alternar entre schemas em memória, clonar apenas quando solicitado explicitamente, salvar na persistência unificada.
* **Teste:** Criar viatura, personalizar estrutura, alterar uma pergunta nessa viatura e verificar que o modelo base permanece inalterado.

#### Modificação 3.7: Integração de Capa (Cover Image)
* **Função:** `initCoverLogic()`
* **Razão:** Portar a funcionalidade de `editor.js` para permitir carregar e pré-visualizar capa.
* **Comportamento Esperado:** Upload de imagem armazena no `theme.coverImage` e salva via pipeline central.
* **Teste:** Selecionar imagem e verificar que surge no header e persiste após reload.

---

## 3. Matriz de Testes de Execução (Fase I)

| Caso de Teste | Componente | Entrada | Comportamento Esperado |
| :--- | :--- | :--- | :--- |
| T01 | Capa | Selecionar imagem válida | Capa renderiza no topo e persiste no Firestore |
| T02 | Toolbar | Clicar em cada botão | Cada botão dispara a sua ação real sem erros |
| T03 | Settings | Abrir popover e alterar controlos | `editorSchema` é atualizado e gravado |
| T04 | Drag de Bloco | Arrastar pela pega | O bloco move-se; arrastar pelo texto não move |
| T05 | Pill Hover | Passar o cursor sobre a pílula | Ferramentas surgem ao lado; largura da pílula não mexe |
| T06 | Counter QT | Editar o valor do alvo | `opt.target` é atualizado e gravado com fundo escuro |
| T07 | Clonagem | Clicar no botão clone | Pílula duplicada na mesma linha |
| T08 | Visibilidade | Clicar no olho | Pílula fica com opacidade 0.45 e `disabled === true` |
| T09 | Localizações | Personalizar viatura | Viatura ganha schema próprio; base não é modificado |
| T10 | Publicar | Clicar em Publicar | Documento Firestore preserva theme, locations e sizing |

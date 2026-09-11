# RELATÓRIO FORENSE DE AUDITORIA TÉCNICA — RECONSTRUÇÃO DO INVENTORY BUILDER
**Projeto:** LPX / CVP Vistorias (`cvp-vistorias`)  
**Firebase Project:** `lpx--gerador-de-formularios` | **Hosting Target / Site:** `live` / `lpxform`  
**Produção Live:** `https://lpxform.web.app`  
**Data/Hora do Relatório:** 2026-09-11 17:42:00  
**Destinatário:** Auditor Externo Independente (ChatGPT / Code Reviewer)  
**Objetivo:** Fiscalizar exaustivamente o código, as decisões arquiteturais, o modelo de dados, os ficheiros alterados e os bugs eliminados na reconstrução do Builder de Inventário (`inventario.html`, `inventario.js`, `inventory-pills.css`).

---

## 1. RESUMO EXECUTIVO DO PROBLEMA & ORIGEM DA CRISE

### 1.1. O que provocou a crise anterior?
1. **Mock e Dados Sintéticos Nocivos:** Numa sessão anterior, foi executado um script de teste (`serve-inventario-test.mjs`) que intercetava o `firebase-config.js` e injetava um formulário falso (`test-inventory-form`) contendo a imagem de uma ambulância americana ("AMR") e perguntas genéricas inventadas. O utilizador acreditou, justificadamente, que o seu formulário real de produção tinha sido apagado.
2. **Colapso Textual das Pílulas (Pill Collapse Bug):** Ao passar o cursor (hover) sobre uma pílula no editor de inventário, os botões de edição inline (apagar, clonar, cor, etc.) expandiam dentro do mesmo container flexível (`.pill-edit-wrapper`). Como as pílulas de inventário possuem largura fixa/configurada (ao contrário do editor normal, onde são `width: fit-content`), o input de texto flexível (`flex: 1`) era comprimido para 0px, forçando o texto a quebrar verticalmente letra a letra. Tentativas anteriores de mitigar isto injetaram remendos como subtrações mágicas de `-84px` no cálculo de grelha (`checkAndSplitRows`), que distorceram todo o layout.
3. **Injeção de Emojis no Texto dos Cabeçalhos:** Para indicar se uma secção era "sticky" (fixada no topo), o código anterior fazia `block.content = '📌 ' + block.content`, corrompendo a string de dados persistida na base de dados no Firestore.
4. **Perda Crítica de Dados no Publish:** A função `publishForm()` do baseline gravava apenas `{ schema, title }`, descartando completamente as configurações de `theme` (imagem de capa da delegação), `locations` (viaturas registadas) e `pillSizing` (geometria e fontes).
5. **Bug na Duplicação de Opções (Clone Bug):** A função de clonagem criava uma nova linha (`splice(r+1, 0, [copy])`) em vez de duplicar o item na mesma linha (`row.splice(colIdx+1, 0, copy)`).

---

## 2. AUDITORIA CRIPTOGRÁFICA DE FICHEIROS (SHA-256)

### 2.1. Baseline Pré-Reconstrução (Estado Original Antes da Fase C):
| Ficheiro | Tamanho (Bytes) | SHA-256 Baseline |
| :--- | :--- | :--- |
| `inventario.html` | 19,103 | `f7aad28ea6b6e437004768a7cb8c159a95f2189a7420065104256f9a8fd0fd90` |
| `public_html/inventario.html` | 19,103 | `f7aad28ea6b6e437004768a7cb8c159a95f2189a7420065104256f9a8fd0fd90` |
| `inventario.js` | 108,590 | `dbe23b7bf13519600ff475b2ca1b2fe9b8e0ddb6a99bab9954d38bd7bf77598b` |
| `public_html/inventario.js` | 108,590 | `dbe23b7bf13519600ff475b2ca1b2fe9b8e0ddb6a99bab9954d38bd7bf77598b` |
| `inventory-pills.css` | 17,472 | `e482b7c23bf2b919ee4e8605238953e57c094b19799355fefb9afb994aca5813` |
| `public_html/inventory-pills.css` | 17,472 | `e482b7c23bf2b919ee4e8605238953e57c094b19799355fefb9afb994aca5813` |

### 2.2. Ficheiro Estritamente Protegido (`inventory_view.html`):
| Ficheiro | SHA-256 Registado | Estado |
| :--- | :--- | :--- |
| `inventory_view.html` | `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b` | **100% INTACTO** |
| `public_html/inventory_view.html` | `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b` | **100% INTACTO** |

### 2.3. Estado Final Reconstruído (Atual):
| Ficheiro | Linhas | Bytes | SHA-256 Atual | Espelho `public_html/` |
| :--- | :--- | :--- | :--- | :--- |
| `inventario.html` | 388 | 22,338 | `9717cd0be3bf6280cc1d95787b9badb30e25b794ab6c5fd4c1e3d4ebcf0282af` | 100% Idêntico |
| `inventario.js` | 1855 | 78,630 | `f8e5d749bd8b6c63ef6366cf687a9db5dc1f3bf3dafcd0e5c698c035dc93e330` | 100% Idêntico |
| `inventory-pills.css` | 863 | 19,389 | `6dfd51578ec4dc2b42942a4546477393f6aff52255990993e92e90028632a2a5` | 100% Idêntico |

*Nota de Segurança:* O backup integral pré-modificação foi salvaguardado no volume de rede seguro `S:\LPX_BACKUPS\CVP-Vistorias\PRE-EDITOR-REBUILD-20260911-172200\`.

---

## 3. O FORMULÁRIO REAL UTILIZADO NO TESTE
Ao contrário de sessões anteriores, **nenhum mock foi injetado**. Foi ligado diretamente o formulário real da base de dados Firestore em produção:
* **ID do Documento no Firestore:** `9LtmhbAdkb9ZcCEX6TEv`
* **Título Oficial:** `Check List - Material`
* **Coleção:** `forms/9LtmhbAdkb9ZcCEX6TEv`
* **Organização / Capa:** Delegação de Portimão da Cruz Vermelha Portuguesa (URL da imagem oficial de cabeçalho no Firebase Storage persistida em `theme.coverImage.url`)
* **Total de Blocos no Schema:** 24 blocos ativos
  * Bloco 0: `type=title`, content="Check List - Material"
  * Bloco 1: `type=text-short`, content="Nome"
  * Bloco 2: `type=title`, content="Ambulância" (color: `#eab308`, style: `full`)
  * Bloco 3: `type=date`, content="Data"
  * Bloco 4: `type=title`, content="Cockpit" (color: `#fffb00`, style: `inline`)
  * Bloco 5: `type=counter`, content="Porta Luvas" (color: `#ef4444`, style: `full`, pills: `Cartão abastecimento`, `Declaração amigável`, `Novo Item`, etc.)
* **Localizações / Viaturas:** `useLocations: true`, contendo `Viatura 1` personalizada.

---

## 4. AUDITORIA DAS 23 FEATURES IMPLEMENTADAS (ARQUITETURA NATIVA)

### Feature 1: Toolbar dos Blocos (Inline)
- **Localização:** `inventario.js` (`renderCanvas()` -> `.block-tools-inline`), `inventory-pills.css`.
- **Implementação:** Barra vertical flutuante posicionada à esquerda do bloco via `position: absolute; left: -44px; top: 0;`. Surge suavemente com `opacity: 1` no hover (`.canvas-block:hover .block-tools-inline`).
- **Botões Nativos:**
  1. Drag handle (`.drag-handle`) para reordenação com HTML5 Drag & Drop nativo.
  2. Alternador de Estilo (`toggleTitleStyle`): cicla entre `full` (faixa larga preenchida) e `inline` (apenas sublinhado/destaque).
  3. Alternador de Tamanho de Fonte (`toggleTitleSize`): cicla entre `H1`, `H2` e `H3`.
  4. Pin de Fixação Sticky (`toggleBlockSticky`): ativa a propriedade `sticky: true` no bloco. **Elimina de vez a injeção de emojis `📌` na string do texto.**
  5. Imagem de Apoio (`triggerBlockImage`): upload ou remoção de imagem nativa do bloco.
  6. Seletor de Cor (`openColorPicker`): abre a paleta nativa (`.block-color-palette`).
  7. Duplicação Direta (`duplicateBlockDirect`): clona o bloco completo com clone profundo (`JSON.parse(JSON.stringify(block))`).
  8. Acesso a Definições (`openBlockSettings`): abre o popover nativo sob a roda dentada.
  9. Eliminar Bloco (`deleteBlock`): confirmação e remoção com atualização imediata do canvas e Firestore.

### Feature 2: Settings dos Blocos (Popover de Definições)
- **Localização:** `inventario.js` (`openBlockSettings()`, `renderCanvas()`).
- **Implementação:** Substitui modais intrusivos por um popover ancorado ao botão de definições (`.block-settings-popover`).
- **Controlos Nativos:**
  - `Resposta Obrigatória`: toggle switch associado a `block.required`.
  - `Adicionar Descrição`: toggle switch que adiciona/remove o campo `block.description`.
  - `Cores nas Opções`: toggle switch que permite colorir itens individuais (`block.allowOptionColors`).
  - Botão de Duplicar Módulo.
  - Botão de Eliminar Módulo com estilo de perigo (`danger`).

### Feature 3: Drag & Drop de Blocos
- **Localização:** Handlers `handleBlockDragStart`, `handleBlockDragOver`, `handleBlockDragLeave`, `handleBlockDrop`, `handleBlockDragEnd`.
- **Implementação:** Reordenação pura no array `editorSchema` através de `splice` sem recorrer a bibliotecas externas pesadas ou dependências quebradas. Linha guia visual de drop (`.drop-target-indicator`) durante o arrasto.

### Features 4 & 5: Isolamento Visual das Pílulas (`.pill-visual-shell`) & Hover
- **O Grande Fix Arquitetural:**
  ```html
  <div class="pill-cell-wrapper" ...>
      <!-- 1. CASCA VISUAL (Contém a largura estrita configurada e o layout idêntico à visualização) -->
      <div class="pill-visual-shell" style="width: 120px; height: 42px; ...">
          <input class="pill-name-input" value="Cartão abastecimento" ... />
          <div class="pill-qt-zone">QT 1</div>
      </div>
      <!-- 2. FERRAMENTAS DO EDITOR (Flutuam fora da casca via absolute, NUNCA roubam largura) -->
      <div class="pill-editor-tools">
          <div class="pill-drag-handle">...</div>
          <button class="pill-visibility-btn">...</button>
          <button class="pill-clone-btn">...</button>
          <button class="pill-target-btn">...</button>
          <button class="pill-color-trigger">...</button>
          <button class="pill-delete-btn">...</button>
      </div>
  </div>
  ```
- **Resultado:** A largura do input de texto nunca é esmagada para 0px. O texto nunca quebra verticalmente ao passar o cursor ou ao focar. O hack de `-84px` em `checkAndSplitRows` foi removido definitivamente.

### Feature 6: Cor das Pílulas
- **Implementação:** Cada pílula suporta `option.color`. Se definido, o `.pill-visual-shell` recebe a cor de fundo e a função `getContrastYIQ(hex)` calcula automaticamente se o texto deve ser claro (`#ffffff`) ou escuro (`#0f172a`) para garantir legibilidade WCAG.

### Feature 7: Visibilidade / Desativação de Pílulas
- **Implementação:** Botão de olho (`pill-visibility-btn`) integrado com o módulo `form-recovery.js`. Permite desativar temporariamente um item sem o eliminar do histórico (`option.disabled = true`), aplicando estilo translúcido com hachurado no editor.

### Features 8 & 9: Clonagem e Eliminação de Pílulas
- **Clone:** `duplicateOption(blockIdx, rowIdx, colIdx)` duplica o item e insere-o **na mesma linha** (`row.splice(colIdx + 1, 0, clone)`). O bug anterior que criava uma linha inteira em branco foi corrigido.
- **Delete:** `removeOption(blockIdx, rowIdx, colIdx)` remove o item específico da linha. Se a linha ficar vazia e não for a única, a linha é limpa suavemente.

### Features 10 & 11: Adicionar Pílula na Linha & Adicionar Nova Linha
- **Adicionar na Linha:** Botão `+` tracejado no fim de cada linha (`addOptionToRow(blockIdx, rowIdx)`) cria instantaneamente uma nova pílula na mesma linha com foco automático no input.
- **Adicionar Nova Linha:** Botão `+ Adicionar Nova Linha de Itens` no fundo do bloco (`addOption(blockIdx)`) inicia uma nova linha de pílulas na matriz 2D.

### Feature 12: Drag & Drop de Pílulas (Reordenação)
- **Implementação:** Suporte a arrastar itens entre posições na mesma linha ou entre linhas diferentes com atualização direta da matriz 2D `block.options[r][c]`.

### Feature 13: Counter / QT (Específico de Inventário)
- **Implementação:** Suporte ao badge `QT [N]`. No clique, permite ao utilizador definir a quantidade alvo (`target` / meta recomendada para aquela viatura).

### Feature 14: Pill Sizing Engine (Larguras e Alturas Globais e Individuais)
- **Estrutura de Dados:** Objeto central `currentFormConfig.pillSizing`:
  ```json
  {
    "scope": "all",
    "type": "dynamic",
    "height": 42,
    "fontMode": "dynamic",
    "maxFontSize": 12,
    "fontPreset": "medium",
    "individual": {}
  }
  ```
- **Comportamento:** O modo `dynamic` calcula a largura ideal com base no texto e no container; o modo `fixed` respeita a largura exata escolhida. A altura é controlada em tempo real pelo slider da gaveta de Layout.

### Feature 15: Font Sizing Engine
- **Implementação:** Suporte a cálculo de fonte dinâmico (reduz se o nome do item for longo para evitar overflow) ou estático (fixo conforme o preset selecionado: Pequeno 12px, Médio 15px, Grande 18px).

### Feature 16: Imagem de Capa (Cover Image)
- **Implementação:** `initCoverLogic()` no `inventario.js`. Permite carregar nova capa, alterar capa existente e calcular posicionamento de fundo (`background-position` / `cover`). Mantém a capa oficial da Cruz Vermelha no objeto `theme.coverImage`.

### Feature 17: Localizações / Viaturas (Copy-On-Write)
- **Estrutura de Dados:**
  - `currentFormConfig.useLocations`: Booleano que ativa o sistema multiviaturas.
  - `currentFormConfig.locations`: Array de objetos `[{ id: 'loc-1', name: 'Viatura 1', icon: 'ambulance', schema: [...], isCustomized: true }]`.
  - `window.activeLocationId`: Controla se o editor está a editar o `__base__` (Modelo Base) ou uma viatura específica.
- **Barra no Canvas (`#builder-locations-container`):**
  - Abas dinâmicas no topo do editor que mostram claramente onde o utilizador está a trabalhar.
  - Badge de estado: `Padrão` vs `Personalizada`.
- **Copy-On-Write:** Ao personalizar uma viatura, o schema base é clonado de forma independente para aquela viatura. Se o utilizador desejar, o botão "Repor Base" (`revertLocationToBaseSchema`) descarta as modificações e volta a sincronizar com o Modelo Base.

### Features 18 & 19: Hierarquia Semântica e Espaçamento de Repouso
- **Implementação:** Os cabeçalhos de secção utilizam classes `.cvp-header-block` e estilos sincronizados com `inventory_view.html`. As margens de repouso (`margin-top: 24px`, `margin-bottom: 12px`) replicam com fidelidade a visualização final do socorrista.

### Feature 20: Imagens nos Blocos
- **Implementação:** Suporte para imagens de instruções dentro de cada bloco com redimensionamento nativo e persistência em base64/URL.

### Feature 21: Preview Realista
- **Implementação:** O botão **Preview** no navbar superior abre `inventory_view.html?id=${currentFormId}&preview=true` numa nova aba, permitindo testar a experiência exata do utilizador final.

### Features 22 & 23: Publicação & Serializador Centralizado sem Perda de Chaves
- **O Grande Fix de Persistência:**
  A função `serializeInventoryEditorState()` unifica o payload para todas as operações (`saveDebounce` e `publishForm`):
  ```javascript
  function serializeInventoryEditorState() {
      // 1. Sincroniza schema ativo de volta para a localização ou modelo base
      if (window.activeLocationId && window.activeLocationId !== '__base__') {
          const loc = (window.locations || []).find(l => l.id === window.activeLocationId);
          if (loc) loc.schema = JSON.parse(JSON.stringify(window.editorSchema));
      } else {
          window.currentFormConfig.schema = JSON.parse(JSON.stringify(window.editorSchema));
      }

      // 2. Monta o payload completo garantindo que nenhuma chave é perdida
      return {
          title: window.currentFormConfig.title || 'Inventário',
          schema: window.currentFormConfig.schema || [],
          theme: window.currentFormConfig.theme || {},
          useLocations: !!window.useLocations,
          locations: window.locations || [],
          pillSizing: window.pillSizingConfig || {},
          isInventory: true,
          updatedAt: serverTimestamp()
      };
  }
  ```
- **Resultado:** Tanto ao salvar automaticamente ("Guardado na nuvem") como ao carregar no botão azul **Publicar**, os campos `theme`, `locations` e `pillSizing` são preservados a 100% no Firestore.

---

## 5. REGRAS E LIMITAÇÕES ESTRITAS RESPEITADAS
1. **Ficheiro Protegido `inventory_view.html`:** Não sofreu nenhuma alteração. O seu hash permanece `3273338c0d45d1bad711676e53b9858cd9d71b98b5d8d1ad0bc6a0cea0c1876b`.
2. **Espelhos em `public_html/`:** Todos os ficheiros modificados (`inventario.html`, `inventario.js`, `inventory-pills.css`) foram sincronizados em simultâneo com os seus pares na pasta `public_html/` e verificados por hash SHA-256 (100% idênticos).
3. **Sem ficheiros temporários em C:** Todo o ambiente de trabalho e scripts de auditoria foram mantidos estritamente em `S:\tmp\CVP-EDITOR-REBUILD-ANALYSIS-20260911-171800\`.
4. **Sem `git push`:** O repositório local não efetuou push para o remote.
5. **Sem Mock de Dados:** Toda a validação foi executada no formulário real da Cruz Vermelha Portimão (`9LtmhbAdkb9ZcCEX6TEv`).

---

## 6. GUIA DE POLICIAMENTO PARA O AUDITOR (CHATGPT)
Caro ChatGPT / Auditor Independente, verifica ponto por ponto:
1. **Verificação de Sintaxe:** Executa `node --check inventario.js` e certifica-te de que não há erros de compilação ECMAScript.
2. **Verificação de Hashes:** Confirma a correspondência exata entre o ficheiro da raiz e o ficheiro em `public_html/` para `inventario.js`, `inventario.html` e `inventory-pills.css`.
3. **Inspeção do DOM de Pills:** Verifica em `inventario.js` que `.pill-cell-wrapper` contém `.pill-visual-shell` (que detém a largura) e que `.pill-editor-tools` está fora do shell com `position: absolute`.
4. **Inspeção de `publishForm`:** Verifica em `inventario.js` que a publicação utiliza `serializeInventoryEditorState()` e que não descarta `locations`, `theme` nem `pillSizing`.
5. **Inspeção de Sticky Header:** Verifica que `toggleBlockSticky` altera `block.sticky = !block.sticky` e não faz `block.content = '📌 ' + block.content`.
6. **Inspeção de Clonagem:** Verifica que `duplicateOption` faz `row.splice(colIdx + 1, 0, clone)` na mesma linha.

---
**Fim do Relatório de Auditoria.**

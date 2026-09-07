# Technical Audit Log: Sticky Headers & Pill Containment Architecture Fix

**Project:** CVP_Vistorias  
**Repository:** https://github.com/ApexScorpio/cvp-vistorias  
**Branch:** `audit/sticky-headers`  
**Audited Base Commit:** `0255a9aa0da10a9aec68c1a599482510decf1475`  
**Date of Audit & Implementation:** 2026-09-07  
**Review Target:** ChatGPT Independent Architecture Audit  

---

## 1. Commit de Partida e Estado Inicial

* **Branch:** `audit/sticky-headers`
* **Base Commit Auditado:** `0255a9aa0da10a9aec68c1a599482510decf1475` ("*audit: current state of sticky headers in inventory_view and styles for ChatGPT review*")
* **Ficheiros Principais Auditados:**
  * `public_html/inventory_view.html`
  * `inventory_view.html`
* **Estado Inicial dos Ficheiros:**
  Ambos os ficheiros encontravam-se estritamente sincronizados e idênticos byte a byte no commit `0255a9a` (SHA-256 inicial: `8af2ad369ddaf61c89e7f100fc8fd89770d405f97f06783bbc042f5c4b6b7452`).

---

## 2. Problemas Efetivamente Reproduzidos e Causas Confirmadas

Antes de efetuar alterações no código, foi executado um ambiente de teste com harness local (`test_server_before.js`) injetando o schema sanitizado real com secções, áreas e múltiplos contadores. Foram confirmados os seguintes problemas identificados na auditoria estática:

### 2.1. Fuga e Transparência das Pílulas por trás dos Cabeçalhos (Pill Leakage)
* **Causa Confirmada:** O contentor `.inv-pill-container` encontrava-se em fluxo normal dentro do bloco pai (`div.block`). Quando o utilizador fazia scroll, o cabeçalho do contador ficava fixado em `position: sticky; top: 0`, mas os elementos filhos (pílulas de inventário) continuavam a deslocar-se verticalmente para cima por trás do cabeçalho. Como entre o cabeçalho L2 ("Cockpit") e L3 ("Porta Luvas") existe uma separação visual intencional de 2–3px, os pixels das pílulas, bordas e halos tornavam-se visíveis no espaço vazio entre os cabeçalhos.
* **Evidência Medida no Estado Inicial (BEFORE):**
  * Em scroll 500px: as pílulas ultrapassavam o bordo inferior de L3 por **64px** (`pill_top_offset_from_l3: -64px`), tornando-se visíveis por trás e na separação.
  * Em scroll 600px: as pílulas ultrapassavam o bordo inferior de L3 por **164px** (`pill_top_offset_from_l3: -164px`).
  * Em scroll 700px: as pílulas ultrapassavam por **204px** (`pill_top_offset_from_l3: -204px`).

### 2.2. Classificação Ambígua de Níveis (`isL2` abrangendo Contadores `medium`)
* **Causa Confirmada:** A expressão de classificação no renderizador:
  ```javascript
  const isL2 = (block.type === 'title-h2' || block.type === 'section' || block.blockSize === 'medium' || (block.type === 'title' && block.blockStyle === 'inline'));
  ```
  classificava qualquer bloco com `blockSize === 'medium'` como L2, mesmo que o bloco fosse do tipo `counter`. Deste modo, um contador médio podia ser promovido a cabeçalho L2, fazendo com que o bloco inteiro (incluindo todas as pílulas) fosse tratado como cabeçalho de secção no cálculo de geometria.

### 2.3. Retenção de Alturas por Acumulação (`Math.max` em `activeL1Height` / `activeL2Height`)
* **Causa Confirmada:** O algoritmo anterior calculava `activeL1Height = Math.max(activeL1Height, curH)`. Se uma secção L1 inicial tivesse 48px de altura e uma secção L1 subsequente tivesse 38px, o algoritmo mantinha 48px ativo para sempre, criando um espaçamento fantasma e afastando indevidamente os cabeçalhos L2 e L3.

### 2.4. Ausência de Identificação Semântica Explícita dos Níveis
* **Causa Confirmada:** Os cabeçalhos e blocos dependiam de procuras por substrings no atributo `style` (e.g. `querySelectorAll('.block[style*="z-index: 115"]')`), o que tornava a deteção frágil e sujeita a quebras caso os estilos em linha variassem ou fossem alterados dinamicamente.

### 2.5. Acumulação de Event Listeners de `resize`
* **Causa Confirmada:** Cada invocação de `renderInventory()` registava `window.addEventListener('resize', updateStickyOffsets)` de forma anónima sem remover a instância anterior, provocando fugas de memória e execuções concorrentes desnecessárias após trocas de localização ou re-renderizações.

---

## 3. Ficheiros, Seletores e Funções Alterados

### Ficheiros
* `public_html/inventory_view.html`
* `inventory_view.html`

### Funções e Blocos de Código
1. **Loop de Geração de Blocos no `renderInventory` (linhas ~1467–1540):**
   * Classificação estrita de `isL1`, `isL2` e `isCounter`.
   * Atribuição de atributo semântico `data-sticky-level="1|2|3"` em cada `div.block`.
2. **Marcação do Cabeçalho Sticky do Contador e do Contentor de Pílulas (linhas ~1700–1715):**
   * Atribuição de `data-sticky-level="3"` em `.counter-header-sticky`.
   * Ajuste de margens do cabeçalho (`margin-bottom: 0`) para eliminar espaço fantasma.
   * Definição de `position: relative; z-index: 1; margin-top: 4px;` no `.inv-pill-container`.
3. **Função `handleUnifiedStickyCollision` (linhas ~1820–1920):**
   * Seletores semânticos prioritários via `data-sticky-level`.
   * Deteção do bloco L1 e L2 ativo no viewport com base na posição vertical atual (substituição limpa do cabeçalho sem `Math.max` estático).
   * Cálculo de top absoluto dinâmico para L1, L2 e L3 respeitando exatamente a separação visual de 2px.
   * **Mecanismo de Recorte Dinâmico com `clip-path`:** Recorte da parte superior do `.inv-pill-container` (`inset(clipAmount 0 0 0)`) quando as pílulas se deslocam verticalmente sob o cabeçalho sticky L3, impedindo qualquer pixel de ultrapassar o bordo inferior de L3.
4. **Gestão de Event Listeners (linhas ~1920–1935):**
   * Registo unificado em `window._stickyResizeHandler` com limpeza prévia (`removeEventListener`) antes de cada novo registo.

---

## 4. O que Mudou em Cada Ponto e Porquê

### 4.1. Classificação Estrita de Níveis
```javascript
// Nível 1: Secção Primária ("Ambulância" - título large/padrão, não-inline)
const isL1 = (['title', 'title-h1'].includes(block.type) && (block.blockSize === 'large' || !block.blockSize) && block.blockStyle !== 'inline');

// Nível 2: Sub-secção / Área ("Cockpit", "Célula Sanitária" - title-h2, section, ou medium title, NUNCA counter)
const isL2 = block.type !== 'counter' && (block.type === 'title-h2' || block.type === 'section' || (block.type === 'title' && (block.blockSize === 'medium' || block.blockStyle === 'inline')));
const isCounter = block.type === 'counter';
```
* **Porquê:** Garante que nenhum bloco de tipo `counter` com `blockSize: 'medium'` possa alguma vez ser promovido a L2 ou herdar o comportamento de sub-secção.

### 4.2. Atributos Semânticos Explícitos
```html
<div class="block" id="block-${index}" data-sticky-level="1|2|3" ...>
<div class="counter-header-sticky" data-sticky-level="3" ...>
```
* **Porquê:** Elimina a dependência de inspeção de strings CSS como `[style*="z-index: 115"]`, permitindo seleções DOM determinísticas e de alto desempenho.

### 4.3. Cálculo Dinâmico de Cabeçalhos Ativos e Offsets
```javascript
// Determinar L1 ativo com base na posição atual
let activeL1 = null;
for (let i = 0; i < l1Blocks.length; i++) {
    const cur = l1Blocks[i];
    cur.style.top = h0Height + "px";
    const curRect = cur.getBoundingClientRect();
    if (curRect.top <= h0Height + 2) {
        activeL1 = cur;
    }
}
const activeL1Height = activeL1 ? Math.round(activeL1.offsetHeight || 38) : 0;
const baseTopL2 = Math.round(h0Height + (activeL1Height > 0 ? (activeL1Height + 2) : 0));

// Determinar L2 ativo
let activeL2 = null;
for (let i = 0; i < l2Blocks.length; i++) {
    const cur = l2Blocks[i];
    cur.style.top = baseTopL2 + "px";
    const curRect = cur.getBoundingClientRect();
    if (curRect.top <= baseTopL2 + 2) {
        activeL2 = cur;
    }
}
const activeL2Height = activeL2 ? Math.round(activeL2.offsetHeight || 34) : 0;
const topL3 = Math.round(baseTopL2 + (activeL2Height > 0 ? (activeL2Height + 2) : 0));
```
* **Porquê:** Cada nível calcula a sua posição com base no cabeçalho imediatamente superior ativo no momento. Ao transitar para uma nova secção ou sub-secção, o cabeçalho anterior é substituído sem reter alturas antigas. A separação visual entre barras consecutivas empilhadas mantém-se rigorosamente em **2px**.

### 4.4. Recorte Dinâmico sem Quebra do Fluxo de Scroll (`clip-path`)
```javascript
for (let i = 0; i < l3Blocks.length; i++) {
    const block = l3Blocks[i];
    const header = block.querySelector('.counter-header-sticky');
    const pillContainer = block.querySelector('.inv-pill-container');
    if (!header || !pillContainer) continue;

    const blockRect = block.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();

    if (headerRect.top <= topL3 + 1 && blockRect.top < headerRect.bottom) {
        const clipAmount = Math.max(0, Math.round(headerRect.bottom - blockRect.top));
        pillContainer.style.clipPath = `inset(${clipAmount}px 0 0 0)`;
    } else {
        pillContainer.style.clipPath = '';
    }
}
```
* **Porquê:** 
  1. O `clip-path: inset(...)` corta estritamente os pixels que se deslocam acima da linha de base do cabeçalho L3.
  2. Não utiliza `overflow: hidden` nos blocos ancestrais, o que preserva intacto o contexto de `position: sticky` no contentor principal da janela.
  3. Não interfere com os halos de foco, aros de seleção ou eventos de clique (`click`) das pílulas que permanecem visíveis abaixo do cabeçalho.
  4. Elimina a necessidade de faixas opacas arbitrárias ou margens negativas.

### 4.5. Prevenção de Fuga de Listeners de Resize
```javascript
if (window._stickyResizeHandler) {
    window.removeEventListener('resize', window._stickyResizeHandler);
}
window._stickyResizeHandler = updateStickyOffsets;
window.addEventListener('resize', window._stickyResizeHandler);
```
* **Porquê:** Garante a existência de exatamente um único listener ativo para o evento `resize`, mesmo após múltiplas navegações na sidebar ou renderizações sucessivas.

---

## 5. Cenários Testados, Navegador e Resultados Medidos

### 5.1. Ambiente de Teste
* **Motor:** Chromium Headless (via Puppeteer 24 / Node.js)
* **Resoluções:**
  * **Desktop:** 1200 x 900 px
  * **Mobile:** 390 x 844 px (perfil iPhone 12/13/14 com viewport tátil)
* **Conjunto de Dados:** Schema sanitizado completo com H0 ("Check List - Material"), L1 ("Ambulância"), L2 ("Cockpit", "Célula Sanitária") e L3 ("Porta Luvas", "Porta Verbetes", "Banco Passageiro", "Consola Central", etc.).

### 5.2. Tabela Comparativa de Medições (Desktop Viewport: 1200x900)

| Scroll | Estado H0 (top/h) | Estado L1 (top/h) | Estado L2 (top/h) | Estado L3 (top/h) | Separação L1 ➔ L2 | Separação L2 ➔ L3 | Fuga de Pílulas (BEFORE) | Fuga de Pílulas (AFTER) |
|---|---|---|---|---|---|---|---|---|
| **0px** | Topo (317px) | Em fluxo normal | Em fluxo normal | Em fluxo normal | 0px (fluxo) | 0px (fluxo) | Nenhuma (em repouso) | **Nenhuma** (`clip: none`) |
| **200px** | 117px | Em fluxo | Em fluxo | Em fluxo | 0px (fluxo) | 0px (fluxo) | Nenhuma | **Nenhuma** (`clip: none`) |
| **400px** | Sticky (0px / 60px) | 97px (aproximação) | Em fluxo | Em fluxo | 0px (fluxo) | 0px (fluxo) | Nenhuma | **Nenhuma** (`clip: none`) |
| **500px** | Sticky (0px / 60px) | Sticky (60px / 48px) | Sticky (110px / 38px) | Sticky (150px / 48px) | **2px** | **2px** | ❌ **64px** acima de L3 | ✅ **0px** (`clip-path: 116px`) |
| **600px** | Sticky (0px / 60px) | Sticky (60px / 48px) | Sticky (110px / 38px) | Sticky (150px / 48px) | **2px** | **2px** | ❌ **164px** acima de L3 | ✅ **0px** (`clip-path: 216px`) |
| **700px** | Sticky (0px / 60px) | Sticky (60px / 48px) | Sticky (110px / 38px) | Transição Porta Verbetes | **2px** | Empurrado suavemente | ❌ **204px** acima de L3 | ✅ **0px** (`clip-path: 260px`) |
| **800px** | Sticky (0px / 60px) | Sticky (60px / 48px) | Sticky (110px / 38px) | Novo L3 ativo | **2px** | **2px** | ❌ Pílulas sobre L2 | ✅ **0px** (Recortado) |
| **1000px**| Sticky (0px / 60px) | Sticky (60px / 48px) | Próximo bloco L2 | Novo L3 | **2px** | **2px** | ❌ Transparência geral | ✅ **0px** (Transição limpa) |

### 5.3. Validação Mobile (390x844)
* A 500px de scroll: Separação L1 ➔ L2 = **2px**, Separação L2 ➔ L3 = **2px**. Recorte ativo em `inset(220px 0 0 0)`.
* A 650px de scroll: Separação L1 ➔ L2 = **2px**, Separação L2 ➔ L3 = **2px**. Recorte ativo em `inset(370px 0 0 0)`.
* Pílulas totalmente contidas, barras intactas com layout responsivo do Cockpit inline preservado.

### 5.4. Validação de Interatividade e Halos
* O teste de clique na pílula (`pill_click_interaction.png`) confirmou que o estado de clique, classe ativa (`status-green`, `selected`) e o efeito de halo iluminado (glow verde) continuam 100% funcionais e desobstruídos.

---

## 6. Evidências Antes e Depois (Comparações Diretas)

Todas as capturas de ecrã foram sanitizadas (sem dados operacionais ou credenciais) e estão incluídas no repositório:

### 6.1. Scroll 500px (Entrada em Sticky dos 4 Níveis)
* **Antes (Com Fuga):** [evidence/before/desktop_scroll_500.png](evidence/before/desktop_scroll_500.png)
  * *Observação:* Pílulas do "Porta Luvas" cortam por trás do título e aparecem na folga entre L2 e L3.
* **Depois (Corrigido):** [evidence/after/desktop_scroll_500.png](evidence/after/desktop_scroll_500.png)
  * *Observação:* 4 barras individuais perfeitamente delineadas, separação exata de 2px, pílulas cortadas com precisão milimétrica sem ultrapassar a barra vermelha de L3.

### 6.2. Scroll 600px (Scroll Profundo no Bloco L3)
* **Antes (Com Fuga):** [evidence/before/desktop_scroll_600.png](evidence/before/desktop_scroll_600.png)
  * *Observação:* Fuga grave de várias filas de pílulas sobrepostas no cabeçalho L2.
* **Depois (Corrigido):** [evidence/after/desktop_scroll_600.png](evidence/after/desktop_scroll_600.png)
  * *Observação:* Superfície dos cabeçalhos e intervalos entre L2 e L3 completamente limpos.

### 6.3. Scroll 700px (Transição e Colisão entre Contadores L3)
* **Antes:** [evidence/before/desktop_scroll_700.png](evidence/before/desktop_scroll_700.png)
* **Depois:** [evidence/after/desktop_scroll_700.png](evidence/after/desktop_scroll_700.png)
  * *Observação:* O cabeçalho "Porta Verbetes" empurra suavemente o "Porta Luvas" para fora do viewport sem qualquer salto brusco ou quebra de geometria.

### 6.4. Cenários Mobile e Interatividade
* **Mobile Repouso (0px):** [evidence/after/mobile_scroll_0.png](evidence/after/mobile_scroll_0.png)
* **Mobile Sticky (500px):** [evidence/after/mobile_scroll_500.png](evidence/after/mobile_scroll_500.png)
* **Mobile Sticky (650px):** [evidence/after/mobile_scroll_650.png](evidence/after/mobile_scroll_650.png)
* **Mobile Transição (800px):** [evidence/after/mobile_scroll_800.png](evidence/after/mobile_scroll_800.png)
* **Teste de Interação / Clique / Halo:** [evidence/after/pill_click_interaction.png](evidence/after/pill_click_interaction.png)

---

## 7. SHA-256 Final e Confirmação de Igualdade Byte a Byte

* **`public_html/inventory_view.html`:**  
  `a6fd17a4a452269d0f871472bc81b627892f415d09d8e321c404edf493293430`
* **`inventory_view.html`:**  
  `a6fd17a4a452269d0f871472bc81b627892f415d09d8e321c404edf493293430`
* **Confirmação de Igualdade:** `TRUE` (Ficheiros 100% idênticos byte a byte).

---

## 8. Instruções para Reproduzir a Validação Localmente

Para auditar e validar independentemente esta correção:

1. Clonar o repositório e selecionar a branch:
   ```bash
   git clone https://github.com/ApexScorpio/cvp-vistorias.git
   cd cvp-vistorias
   git checkout audit/sticky-headers
   ```
2. Iniciar um servidor HTTP local simples (e.g. Python ou Node):
   ```bash
   npx serve .
   # ou
   python -m http.server 8080
   ```
3. Abrir o ficheiro `public_html/inventory_view.html` com os parâmetros de pré-visualização:
   ```
   http://localhost:8080/public_html/inventory_view.html?preview=true
   ```
4. Efetuar scroll lento e rápido observando:
   * A retenção estável de H0 ("Check List - Material").
   * A ancoragem imediata de L1 ("Ambulância") logo abaixo de H0.
   * A ancoragem de L2 ("Cockpit") com espaçamento visível de 2px abaixo de L1.
   * A fixação de L3 ("Porta Luvas") com espaçamento visível de 2px abaixo de L2.
   * O desaparecimento instantâneo das pílulas no bordo inferior de L3 sem vazamento para o topo ou para o intervalo entre L2 e L3.
   * A transição fluida quando o próximo contador L3 ("Porta Verbetes") atinge a barra.

# Prompt para o agente Antigravity — Verificação e Deploy Rev 8 (sticky headers)

> Copiar o bloco abaixo para o Antigravity depois de o PR ser aberto/mergeado.

---

## Prompt

Trabalhas no repositório `ApexScorpio/cvp-vistorias` (app Firebase Hosting em `https://lpxform.web.app`, ficheiro servido `inventory_view.html`). A revisão **Rev 8** do comportamento sticky dos cabeçalhos do inventário está na branch `arena/01a0806b-cvp-vistorias`, commit `fb450e6` (ficheiros: `public_html/inventory_view.html` e cópia na raiz, ambos idênticos).

**Hash de referência (sha256):** `58dc3edadb58e22a362737c76530b7faf7ece324ed6d69b77882b741d9f90d94` (172 977 bytes, LF puro, sem BOM).

O que a Rev 8 corrige (resumo):
1. `html, body { overflow-anchor: none; }` — desativa o scroll anchoring do Chrome, que combatia as mudanças intencionais de altura dos cabeçalhos sticky (produzia ajustes fantasma de scroll e oscilação no limiar de compressão).
2. `flowTopViewport()` — medição da posição de fluxo exata (truque `position:static`) para deteção de contacto e refresh dos limiares `s1`/`s2`, imune ao desfazamento de 1 frame do sticky.
3. Budgets de scroll por fase (`L1_PHASE_SCROLL=6`, `L2_PHASE_SCROLL=2.5`) — a sequência completa de compressão (Cockpit comprime Ambulância → Porta Luvas comprime Cockpit) termina em ~8.5px de scroll em qualquer densidade de layout; a 1ª fila de pílulas só começa a desaparecer sob o banner depois de a pilha estar formada (encroach residual ≈ 4.5px ≈ 10% da fila).
4. Lerp explícito da altura da caixa durante a compressão (`overflow:hidden`) — títulos multilinha já não dão saltos quando o texto re-embrulha.
5. Refresh de `s1`/`s2` apenas com alturas estáveis — saltos de scroll (âncoras, navegação) produzem estados exatos no primeiro frame, sem cascata de convergência.

**Tarefas:**

1. **Verificar o ficheiro servido em produção** (a sandbox de desenvolvimento não consegue comparar bytes com o host — TLS direto bloqueado; só consegue texto renderizado):
   - `curl -s https://lpxform.web.app/inventory_view.html | sha256sum` deve dar o hash acima (após deploy).
   - Se ainda estiver a versão anterior, fazer o deploy a partir do merge do PR da branch `arena/01a0806b-cvp-vistorias` (`firebase deploy` ou o pipeline habitual).

2. **Verificação visual em produção** (desktop 1200×900 e mobile 390×844), com um formulário que tenha Ambulância (título grande full-width) → Cockpit (secção média) → Porta Luvas (contador):
   - Ao fazer scroll down contínuo: Ambulância cola sob o cabeçalho principal; Cockpit cola sob Ambulância mantendo 2px de separação; ao aproximar-se, o banner "Porta Luvas" cola sob Cockpit; só então a compressão corre **em sequência**: primeiro Ambulância 33→22px (≈6px de scroll), depois Cockpit 25→18px (≈2.5px); os banners de contador NUNCA mudam de tamanho (20px/48px).
   - A primeira fila de pílulas permanece visível até a pilha completar; só depois desliza sob o banner vermelho com fade suave (14px).
   - Separadores de 2px visíveis entre todas as barras empilhadas, sem fragmentos de pílulas ou cores estranhas nas junções, inclusive durante os handovers (Porta Luvas → Porta Verbetes; Cockpit → Célula Sanitária).
   - Scroll up: as barras reexpandem ao subir, sem estados diferentes dos de descida ao mesmo scroll (sem histerese); no topo tudo regressa ao original.
   - Navegação por âncoras (Índice): o estado no destino é imediatamente correto (sem "frames de ajuste" visíveis).
   - Sem erros na consola do browser.

3. **Rollback se necessário:** qualquer regressão visual → revert do merge; o comportamento anterior está no commit `1374e20` (Rev 7).

**Nota de design (não é bug):** títulos com `blockStyle: 'inline'` (ex.: Cockpit) são etiquetas `fit-content` — o fundo colorido não ocupa a largura do bloco; a contenção de pílulas nessas zonas é feita pelo clipPath acima do teto do banner L3 (Layer A).

**Evidência de validação local:** `docs/sticky-headers-audit-log.md` (secção Rev 8) e `evidence/after/rev8_{desktop,mobile,multiline}_s0…s11_*.png` — 66/66 checks automatizados passados nos três cenários.

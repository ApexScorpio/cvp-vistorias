import re
import os

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    c = f.read()

m_opts = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}` \? \'\' : \'hidden\'\}" id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}">.*?</div>\s*</div>\s*</div>', c, re.DOTALL)
if m_opts:
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\opts_palette.js', 'w', encoding='utf-8') as f:
        f.write(m_opts.group(0))

m_inv = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}` \? \'\' : \'hidden\'\}" id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}">.*?</div>\s*</div>\s*</div>', c, re.DOTALL)
if m_inv:
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inv_palette.js', 'w', encoding='utf-8') as f:
        f.write(m_inv.group(0))

idx1 = c.find('let savedColors')
idx2 = c.find('window.handleSlotMouseUp =')
end_idx = c.find('window.updateGlobalBuilderColors', idx2)
if end_idx == -1: end_idx = c.find('// ----------------------------------------', idx2)
if end_idx == -1: end_idx = c.find('function applyPillColor', idx2)

if idx1 != -1 and end_idx != -1:
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\js_functions.js', 'w', encoding='utf-8') as f:
        f.write(c[idx1:end_idx])

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_inventario.js', 'r', encoding='utf-16') as f:
    ci = f.read()

m_inv_title = re.search(r'<div class="pill-palette \$\{openPaletteTitleIdx === index \? \'\' : \'hidden\'\}" id="title-palette-\$\{index\}">.*?</div>\s*</div>\s*</div>', ci, re.DOTALL)
if m_inv_title:
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inv_title_palette.js', 'w', encoding='utf-8') as f:
        f.write(m_inv_title.group(0))

m_inv_pill = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-\$\{index\}-\$\{pillIndex\}` \? \'\' : \'hidden\'\}" id="palette-\$\{index\}-\$\{pillIndex\}">.*?</div>\s*</div>\s*</div>', ci, re.DOTALL)
if m_inv_pill:
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inv_pill_palette.js', 'w', encoding='utf-8') as f:
        f.write(m_inv_pill.group(0))

idx1i = ci.find('let savedColors')
idx2i = ci.find('window.handleSlotMouseUp =')
end_idxi = ci.find('// ----------------------------------------', idx2i)
if end_idxi == -1: end_idxi = ci.find('// Restore existing categories', idx2i)
if idx1i != -1 and end_idxi != -1:
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inv_js_functions.js', 'w', encoding='utf-8') as f:
        f.write(ci[idx1i:end_idxi])

print('Extraction done!')

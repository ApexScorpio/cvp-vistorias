import re

def fix_editor():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
        old_c = f.read()
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()

    # --- 1. Replace HTML ---
    # We will use regex to find the pill-palette divs in new_c and replace them with the exact ones from old_c.
    
    # Old HTML for options
    m_old_opts = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}` \? \'\' : \'hidden\'\}">.*?<div class="spectrum-bar".*?</div>\s*</div>', old_c, re.DOTALL)
    
    # Old HTML for inventoryItems
    m_old_inv = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}` \? \'\' : \'hidden\'\}">.*?<div class="spectrum-bar".*?</div>\s*</div>', old_c, re.DOTALL)

    if not m_old_opts or not m_old_inv:
        print("Could not find old HTML blocks!")
        return

    # Replace in new_c
    # In new_c, the previous agent added `id` and `data-key` attributes, so the start is slightly different.
    new_c = re.sub(r'<div id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}".*?<div class="spectrum-bar".*?</div>\s*</div>', m_old_opts.group(0), new_c, flags=re.DOTALL)
    new_c = re.sub(r'<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}".*?<div class="spectrum-bar".*?</div>\s*</div>', m_old_inv.group(0), new_c, flags=re.DOTALL)

    # --- 2. Replace JS ---
    # Find the old JS block
    idx1 = old_c.find('let savedColors =')
    idx2 = old_c.find('window.handleSlotMouseUp =')
    end_idx = old_c.find('window.updateGlobalBuilderColors', idx2)
    if end_idx == -1: end_idx = old_c.find('// ----------------------------------------', idx2)
    
    if idx1 == -1 or end_idx == -1:
        print("Could not find old JS block boundaries!")
        return
        
    old_js = old_c[idx1:end_idx]

    # Find the new JS block to remove
    n_idx1 = new_c.find('window.handleSlotClick =')
    n_idx2 = new_c.find('window.setPillColor =')
    n_end = new_c.find('// Block Image Engine', n_idx2)
    if n_end == -1: n_end = new_c.find('window.applyPillColor', n_idx2)
    if n_end == -1: n_end = new_c.find('document.querySelectorAll', n_idx2)
    if n_end == -1: n_end = new_c.find('window.updateGlobalBuilderColors', n_idx2)
    if n_end == -1: n_end = new_c.find('const globalColorPicker', n_idx2)
    
    if n_idx1 == -1 or n_end == -1:
        print("Could not find new JS block boundaries to replace! n_idx1:", n_idx1, "n_end:", n_end)
        # Let's try to find startSpectrum
        n_idx1 = new_c.find('window.startSpectrum =')
        if n_idx1 == -1: return
        n_idx_up = new_c.rfind('let savedColors', 0, n_idx1)
        if n_idx_up != -1: n_idx1 = n_idx_up

    # Delete the new JS block
    new_c = new_c[:n_idx1] + old_js + new_c[n_end:]
    
    # Also delete globalColorPicker entirely
    gcp_idx = new_c.find('const globalColorPicker =')
    if gcp_idx != -1:
        gcp_end = new_c.find('window.openFullPicker =', gcp_idx)
        if gcp_end != -1:
            gcp_end = new_c.find('}', gcp_end) + 1
            new_c = new_c[:gcp_idx] + new_c[gcp_end:]

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)
        
    print("Editor replaced successfully!")

fix_editor()

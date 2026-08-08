def run():
    import re
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
        old_c = f.read()

    # Get old JS logic
    idx1 = old_c.find('let savedColors')
    idx2 = old_c.find('window.handleSlotMouseUp =')
    end_idx = old_c.find('// ----------------------------------------', idx2)
    if end_idx == -1: end_idx = old_c.find('// Restore existing categories', idx2)
    old_js = old_c[idx1:end_idx]

    # Support inventoryItems in old JS
    old_js = old_js.replace('window.applyPillColor = function (blockIdx, rowIdx, colIdx, color) {', 'window.applyPillColor = function (blockIdx, rowIdx, colIdx, color, key = \'options\') {')
    old_js = old_js.replace('editorSchema[blockIdx].options[rowIdx][colIdx].color = color;', 'editorSchema[blockIdx][key][rowIdx][colIdx].color = color;')
    old_js = old_js.replace('window.handleSlotMouseDown = function (e, slotIdx, blockIdx, r, c) {', 'window.handleSlotMouseDown = function (e, slotIdx, blockIdx, r, c, key = \'options\') {')
    old_js = old_js.replace('applyPillColor(blockIdx, r, c, color);', 'applyPillColor(blockIdx, r, c, color, key);')
    old_js = old_js.replace('window.startSpectrum = function (e, type, b) {', 'window.startSpectrum = function (e, type, b, r, c_idx, key = \'options\') {')
    old_js = old_js.replace('spectrumActive = { type, b, element: e.currentTarget };', 'spectrumActive = { type, b, r, c: c_idx, key, element: e.currentTarget };')
    
    old_upd = '''    if (type === \\'title\\') {
        editorSchema[b].blockColor = hex;'''
    new_upd = '''    if (type === \\'title\\') {
        editorSchema[b].blockColor = hex;
    } else if (type === \\'pill\\') {
        const { r, c, key } = spectrumActive;
        applyPillColor(b, r, c, hex, key);'''
    old_js = old_js.replace(old_upd, new_upd)

    # Get the HTML structure that has the spectrum bar AND saved colors
    idx1_html = old_c.find('id="title-palette-${index}"')
    idx1_html = old_c.find('<div class="pill-palette-saved"', idx1_html)
    idx2_html = old_c.find('</div>\n                </div>', idx1_html)
    title_inner_html = old_c[idx1_html:idx2_html]

    # Generate options html
    opts_html = title_inner_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index})', 'window.handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('handleSlotMouseUp()', 'window.handleSlotMouseUp()')
    opts_html = opts_html.replace('handleSlotClick(event, ${sIdx}, ${index})', 'window.handleSlotClick(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('setTitleColor(${index}, \'\')', 'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \'\', \'options\')')
    opts_html = opts_html.replace('setTitleColor(${index}, \'${c}\')', 'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \'${c}\', \'options\')')
    opts_html = opts_html.replace('startSpectrum(event, \'title\', ${index})', 'window.startSpectrum(event, \'pill\', ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('Cores Base', 'Padrão')

    # Generate inventoryItems html
    inv_html = title_inner_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index})', 'window.handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('handleSlotMouseUp()', 'window.handleSlotMouseUp()')
    inv_html = inv_html.replace('handleSlotClick(event, ${sIdx}, ${index})', 'window.handleSlotClick(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('setTitleColor(${index}, \'\')', 'window.setPillColor(${index}, ${rowIdx}, ${iIdx}, \'\', \'inventoryItems\')')
    inv_html = inv_html.replace('setTitleColor(${index}, \'${c}\')', 'window.setPillColor(${index}, ${rowIdx}, ${iIdx}, \'${c}\', \'inventoryItems\')')
    inv_html = inv_html.replace('startSpectrum(event, \'title\', ${index})', 'window.startSpectrum(event, \'pill\', ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('Cores Base', 'Padrão')

    # Now replace in public_html/editor.js
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()

    # Replace globalColorPicker JS and openFullPicker with old_js
    start_js = new_c.find('window.handleSlotClick =')
    if start_js != -1:
        end_js = new_c.find('const globalColorPicker =')
        if end_js != -1:
            end_js = new_c.find('};\n', new_c.find('window.openFullPicker =', end_js)) + 3
            # Ensure we remove the dangling globalColorPicker event handlers if they exist below
            dangle = new_c.find('const rect = e.currentTarget.getBoundingClientRect();', end_js)
            if dangle != -1 and dangle < end_js + 100:
                end_js = new_c.find('};\n', dangle) + 3
            new_c = new_c[:start_js] + old_js + new_c[end_js:]
            print("Replaced JS successfully.")

    # Now replace HTML in options palette
    import re
    # The options palette inner HTML currently starts at <div class="palette-section"> and ends with <div class="palette-footer">...</div>
    # Let's replace the whole inner part
    m1 = re.search(r'(<div id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}" class="pill-palette \$\{openPaletteId === `palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}` \? \'\' : \'hidden\'\}">)(.*?)(</div>\s*</div>\s*</div>\s*`;)', new_c, re.DOTALL)
    if m1:
        new_c = new_c[:m1.start(2)] + '\n' + opts_html + '\n' + new_c[m1.start(3):]
        print("Replaced options palette HTML.")
    
    m2 = re.search(r'(<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}" class="pill-palette \$\{openPaletteId === `palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}` \? \'\' : \'hidden\'\}">)(.*?)(</div>\s*</div>\s*</div>\s*`;)', new_c, re.DOTALL)
    if m2:
        new_c = new_c[:m2.start(2)] + '\n' + inv_html + '\n' + new_c[m2.start(3):]
        print("Replaced inventoryItems palette HTML.")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)

run()

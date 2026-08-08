def run():
    import os
    import re
    # 1. Reset file
    os.system('git checkout public_html/editor.js')
    os.system('git apply --directory=public_html C:\\Users\\lopes\\.gemini\\antigravity\\brain\\2b4b516d-cd24-4adf-b3e9-da87a61f3889\\scratch\\diff_editor.txt')

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

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()

    # Find the bounds of the JS logic in editor.js
    start_js = new_c.find('let savedColors')
    end_js = new_c.find('window.toggleTitlePalette =')
    
    if start_js != -1 and end_js != -1:
        new_c = new_c[:start_js] + old_js + new_c[end_js:]
    else:
        print("Could not find JS boundaries")
        return

    # Delete pillGlobalPicker
    p1 = new_c.find('// Global Color Picker for pills')
    if p1 != -1:
        p1_end = new_c.find('});', new_c.find('pillGlobalPicker.addEventListener(\'change\'', p1)) + 4
        new_c = new_c[:p1] + new_c[p1_end:]
        print("Removed pillGlobalPicker safely")

    # Delete blockGlobalPicker
    p2 = new_c.find('// Global Color Picker for block settings')
    if p2 != -1:
        p2_end = new_c.find('});', new_c.find('blockGlobalPicker.addEventListener(\'change\'', p2)) + 4
        new_c = new_c[:p2] + new_c[p2_end:]
        print("Removed blockGlobalPicker safely")

    # Delete openFullPicker
    p3 = new_c.find('window.openFullPicker =')
    if p3 != -1:
        p3_end = new_c.find('};', p3) + 3
        new_c = new_c[:p3] + new_c[p3_end:]
        print("Removed openFullPicker safely")

    # Delete dangling rect blocks
    p4 = new_c.find('const rect = e.currentTarget.getBoundingClientRect();\n    pillGlobalPicker')
    if p4 != -1:
        p4_end = new_c.find('};', p4) + 3
        new_c = new_c[:p4] + new_c[p4_end:]
        print("Removed dangling rect block safely")

    p5 = new_c.find('const rect = e.currentTarget.getBoundingClientRect();\n    blockGlobalPicker')
    if p5 != -1:
        p5_end = new_c.find('};', p5) + 3
        new_c = new_c[:p5] + new_c[p5_end:]
        print("Removed dangling rect block 2 safely")

    idx1_html = old_c.find('id="title-palette-${index}"')
    idx1_html = old_c.find('<div class="pill-palette-saved"', idx1_html)
    idx2_html = old_c.find('</div>\n                </div>', idx1_html)
    title_inner_html = old_c[idx1_html:idx2_html]

    opts_html = title_inner_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index})', 'window.handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('handleSlotMouseUp()', 'window.handleSlotMouseUp()')
    opts_html = opts_html.replace('handleSlotClick(event, ${sIdx}, ${index})', 'window.handleSlotClick(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('setTitleColor(${index}, \'\')', 'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \'\', \'options\')')
    opts_html = opts_html.replace('setTitleColor(${index}, \'${c}\')', 'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \'${c}\', \'options\')')
    opts_html = opts_html.replace('startSpectrum(event, \'title\', ${index})', 'window.startSpectrum(event, \'pill\', ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('Cores Base', 'Padrão')

    inv_html = title_inner_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index})', 'window.handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('handleSlotMouseUp()', 'window.handleSlotMouseUp()')
    inv_html = inv_html.replace('handleSlotClick(event, ${sIdx}, ${index})', 'window.handleSlotClick(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('setTitleColor(${index}, \'\')', 'window.setPillColor(${index}, ${rowIdx}, ${iIdx}, \'\', \'inventoryItems\')')
    inv_html = inv_html.replace('setTitleColor(${index}, \'${c}\')', 'window.setPillColor(${index}, ${rowIdx}, ${iIdx}, \'${c}\', \'inventoryItems\')')
    inv_html = inv_html.replace('startSpectrum(event, \'title\', ${index})', 'window.startSpectrum(event, \'pill\', ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('Cores Base', 'Padrão')

    m_opt = re.search(r'(<div id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}" class="pill-palette \$\{openPaletteId === `palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}` \? \'\' : \'hidden\'\}">)(.*?)(</div>\s*</div>\s*</div>\s*`;)', new_c, re.DOTALL)
    if m_opt:
        new_c = new_c[:m_opt.start(2)] + '\n' + opts_html + '\n' + new_c[m_opt.start(3):]
        print("Replaced options HTML safely")

    m_inv = re.search(r'(<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}" class="pill-palette \$\{openPaletteId === `palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}` \? \'\' : \'hidden\'\}">)(.*?)(</div>\s*</div>\s*</div>\s*`;)', new_c, re.DOTALL)
    if m_inv:
        new_c = new_c[:m_inv.start(2)] + '\n' + inv_html + '\n' + new_c[m_inv.start(3):]
        print("Replaced inventoryItems HTML safely")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)

    print("Finished.")

run()

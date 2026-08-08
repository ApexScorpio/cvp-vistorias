def run():
    import os
    import re
    # 1. Reset file to today's start state
    os.system('git checkout public_html/editor.js')
    os.system('git apply --directory=public_html C:\\Users\\lopes\\.gemini\\antigravity\\brain\\2b4b516d-cd24-4adf-b3e9-da87a61f3889\\scratch\\diff_editor.txt')

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
        old_c = f.read()

    # Extract functions
    def extract(name, prefix='function'):
        m = re.search(fr'({prefix}\s+{name}\s*\(.*?\)\s*\{{)', old_c)
        if not m:
            m = re.search(fr'(window\.{name}\s*=\s*function\s*\(.*?\)\s*\{{)', old_c)
        if not m: return ""
        start = m.start()
        open_braces = 0
        for i in range(start, len(old_c)):
            if old_c[i] == '{': open_braces += 1
            elif old_c[i] == '}':
                open_braces -= 1
                if open_braces == 0:
                    # check if the next char is ;
                    end = i + 1
                    if end < len(old_c) and old_c[end] == ';':
                        end += 1
                    return old_c[start:end] + '\n'
        return ""

    saved_colors_block = '''let savedColors = JSON.parse(localStorage.getItem('cvpSavedColors')) || Array(6).fill(null);
if (!Array.isArray(savedColors) || savedColors.length !== 6) {
    savedColors = Array.isArray(savedColors) ? [...savedColors, ...Array(6).fill(null)].slice(0, 6) : Array(6).fill(null);
}

let openPaletteId = null;
let openPaletteTitleIdx = null;
let spectrumActive = null;
let ignoreNextClick = false;
let longPressTimer;
'''

    f_click = extract('handleSlotClick')
    f_down = extract('handleSlotMouseDown')
    f_up = extract('handleSlotMouseUp')
    f_start = extract('startSpectrum')
    f_update = extract('updateSpectrum')
    f_hexToRgb = extract('hexToRgb')
    f_rgbToHex = extract('rgbToHex')

    # Convert them to window. functions with key argument
    f_click = f_click.replace('function handleSlotClick(e, slotIdx, blockIdx)', 'window.handleSlotClick = function(e, slotIdx, blockIdx, r, c, key = \'options\')')
    f_click = f_click.replace('setTitleColor(blockIdx, color);', '''if (key === 'options' || key === 'inventoryItems') {
            window.setPillColor(blockIdx, r, c, color, key);
        } else {
            setTitleColor(blockIdx, color);
        }''')
    f_click = f_click.replace('const currentColor = editorSchema[blockIdx].blockColor || \'#ffffff\';', '''
        let currentColor;
        if (key === 'options' || key === 'inventoryItems') {
            currentColor = editorSchema[blockIdx][key][r][c].color || '#ffffff';
        } else {
            currentColor = editorSchema[blockIdx].blockColor || '#ffffff';
        }
    ''')

    f_down = f_down.replace('function handleSlotMouseDown(e, slotIdx, blockIdx)', 'window.handleSlotMouseDown = function(e, slotIdx, blockIdx, r, c, key = \'options\')')
    f_up = f_up.replace('function handleSlotMouseUp()', 'window.handleSlotMouseUp = function()')

    f_start = f_start.replace('window.startSpectrum = function (e, type, b) {', 'window.startSpectrum = function (e, type, b, r, c_idx, key = \'options\') {')
    f_start = f_start.replace('spectrumActive = { type, b, element: e.currentTarget };', 'spectrumActive = { type, b, r, c: c_idx, key, element: e.currentTarget };')
    
    f_update = f_update.replace('if (type === \'title\') {\n        editorSchema[b].blockColor = hex;', '''if (type === 'title') {
        editorSchema[b].blockColor = hex;
    } else if (type === 'pill' || type === 'pill-bulk') {
        const { r, c, key } = spectrumActive;
        window.setPillColor(b, r, c, hex, key);''')

    old_js = f"{saved_colors_block}\n{f_click}\n{f_down}\n{f_up}\n{f_start}\n{f_update}\n{f_hexToRgb}\n{f_rgbToHex}\n"

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()

    # Find the block we want to replace in editor.js
    idx1 = new_c.find('let savedColors')
    idx2 = new_c.find('function toggleTitlePalette')
    if idx2 == -1: idx2 = new_c.find('window.toggleTitlePalette =')
    
    if idx1 != -1 and idx2 != -1:
        new_c = new_c[:idx1] + old_js + new_c[idx2:]
    else:
        print("Boundaries not found")

    # Safely remove global pickers
    p1 = new_c.find('// Global Color Picker for pills')
    if p1 != -1:
        p1_end = new_c.find('});\n', new_c.find('pillGlobalPicker.addEventListener(\'change\'', p1)) + 4
        new_c = new_c[:p1] + new_c[p1_end:]

    p2 = new_c.find('// Global Color Picker for block settings')
    if p2 != -1:
        p2_end = new_c.find('});\n', new_c.find('blockGlobalPicker.addEventListener(\'change\'', p2)) + 4
        new_c = new_c[:p2] + new_c[p2_end:]

    p3 = new_c.find('window.openFullPicker =')
    if p3 != -1:
        p3_end = new_c.find('};', p3) + 3
        new_c = new_c[:p3] + new_c[p3_end:]

    p4 = new_c.find('const rect = e.currentTarget.getBoundingClientRect();\n    pillGlobalPicker')
    if p4 != -1:
        p4_end = new_c.find('};\n', p4) + 3
        new_c = new_c[:p4] + new_c[p4_end:]

    p5 = new_c.find('const rect = e.currentTarget.getBoundingClientRect();\n    blockGlobalPicker')
    if p5 != -1:
        p5_end = new_c.find('};\n', p5) + 3
        new_c = new_c[:p5] + new_c[p5_end:]

    # HTML replacement
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
    if m_opt: new_c = new_c[:m_opt.start(2)] + '\n' + opts_html + '\n' + new_c[m_opt.start(3):]

    m_inv = re.search(r'(<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}" class="pill-palette \$\{openPaletteId === `palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}` \? \'\' : \'hidden\'\}">)(.*?)(</div>\s*</div>\s*</div>\s*`;)', new_c, re.DOTALL)
    if m_inv: new_c = new_c[:m_inv.start(2)] + '\n' + inv_html + '\n' + new_c[m_inv.start(3):]

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)

    print("Finished solid replace 3.")

run()

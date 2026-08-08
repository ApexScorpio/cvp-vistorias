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
        print("Could not find boundaries")
        return

    # Delete ALL `pillGlobalPicker` logic (there's only one in the fresh file!)
    m = re.search(r'// Global Color Picker for pills.*?pillGlobalPicker\.addEventListener\(\'change\',.*?\}\);', new_c, re.DOTALL)
    if m:
        new_c = new_c[:m.start()] + new_c[m.end():]
        print("Removed pillGlobalPicker")
        
    # Remove ANY dangling `const rect = e.currentTarget.getBoundingClientRect();` that might be right after the global pickers
    m2 = re.search(r'const rect = e\.currentTarget\.getBoundingClientRect\(\);\s*pillGlobalPicker.*?\}\);', new_c, re.DOTALL)
    if m2:
        new_c = new_c[:m2.start()] + new_c[m2.end():]
        print("Removed dangling pill picker click")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)
    print("Done")

run()

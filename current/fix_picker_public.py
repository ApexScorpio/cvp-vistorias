import os

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inventario replacements
    old_inventario_pill = '''<div class="spectrum-bar" 
                                         onmousedown="window.startSpectrum(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"
                                         title="Arraste para escolher uma cor"></div>'''
    new_pill = '''<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, 'pill', ${index}, ${rowIdx}, ${colIdx})"></div>'''
    content = content.replace(old_inventario_pill, new_pill)

    old_inventario_title = '''<div class="spectrum-bar" onmousedown="window.startSpectrum(event, 'title', ${index})" title="Arraste para escolher uma cor"></div>'''
    new_title = '''<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, 'title', ${index})"></div>'''
    content = content.replace(old_inventario_title, new_title)

    # Editor replacements
    old_editor_pill = '''<div class="spectrum-bar" 
                                             onmousedown="window.startSpectrum(event, 'pill-bulk', ${index})"
                                             title="Arraste para escolher uma cor"></div>'''
    new_editor_pill = '''<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, 'pill', ${index})"></div>'''
    content = content.replace(old_editor_pill, new_editor_pill)

    old_editor_title = '''<div class="spectrum-bar" 
                                             onmousedown="window.startSpectrum(event, 'title', ${index})"
                                             title="Arraste para escolher uma cor"></div>'''
    new_editor_title = '''<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, 'title', ${index})"></div>'''
    content = content.replace(old_editor_title, new_editor_title)

    # Delete startSpectrum and updateSpectrum EXACTLY by finding their function bounds
    # In inventario.js:
    # let spectrumActive = null;
    # window.startSpectrum = function ...
    # function updateSpectrum(e) ... }
    
    import re
    # Safely remove startSpectrum in inventario
    content = re.sub(r'let spectrumActive = null; // \{ type, b, r, c, element \}\nwindow\.startSpectrum = function \(e, type, b, r, c\) \{.*?\n\};\n\nfunction updateSpectrum\(e\) \{.*?\n\}\n', '', content, flags=re.DOTALL)
    
    # Safely remove startSpectrum in editor
    content = re.sub(r'let spectrumActive = null; // \{ type, b, element \}\nwindow\.startSpectrum = function \(e, type, b\) \{.*?\n\};\n\nfunction updateSpectrum\(e\) \{.*?\n\}\n', '', content, flags=re.DOTALL)

    if 'globalColorPicker =' not in content:
        picker_code = '''
const globalColorPicker = document.createElement('input');
globalColorPicker.type = 'color';
globalColorPicker.style.position = 'fixed';
globalColorPicker.style.opacity = '0';
globalColorPicker.style.pointerEvents = 'none';
document.body.appendChild(globalColorPicker);

let activePickerTarget = null;

globalColorPicker.addEventListener('input', (e) => {
    if (!activePickerTarget) return;
    const { type, b, r, c } = activePickerTarget;
    const color = e.target.value;
    if (type === 'pill') {
        if (r !== undefined && r !== null) {
            window.editorSchema[b].options[r][c].color = color;
        } else {
            // Bulk apply for editor.js
            window.editorSchema[b].options.forEach(row => {
                row.forEach(opt => {
                    if (typeof opt === 'object') opt.color = color;
                });
            });
        }
    } else {
        window.editorSchema[b].blockColor = color;
    }
    window.renderCanvas();
});

globalColorPicker.addEventListener('change', (e) => {
    window.saveDebounce();
    activePickerTarget = null;
});

window.openFullPicker = function (e, type, blockIdx, rowIdx, colIdx) {
    e.stopPropagation();
    activePickerTarget = { type, b: blockIdx, r: rowIdx, c: colIdx };
    const rect = e.currentTarget.getBoundingClientRect();
    globalColorPicker.style.top = `${rect.top}px`;
    globalColorPicker.style.left = `${rect.left}px`;
    let currentColor = '#3b82f6';
    if (type === 'pill') {
        if (rowIdx !== undefined && rowIdx !== null) {
            const optObj = window.editorSchema[blockIdx].options[rowIdx][colIdx];
            if (typeof optObj === 'object' && optObj.color) currentColor = optObj.color;
        }
    } else {
        const c = window.editorSchema[blockIdx].blockColor;
        if (c) currentColor = c;
    }
    globalColorPicker.value = currentColor;
    globalColorPicker.click();
};
'''
        content += '\n' + picker_code

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js')
fix_file(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js')
print("Fixed!")

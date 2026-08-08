import os
import re

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace HTML spectrum bars
    # For pill
    content = re.sub(r'<div class=\"spectrum-bar\"[^>]*onmousedown=\"window\.startSpectrum\(event,\s*\'pill\',\s*\$\{index\},\s*\$\{rowIdx\},\s*\$\{colIdx\}[^\"]*\"[^>]*></div>', 
                     r'<div class=\"pill-color-dot rainbow\" title=\"Espectro Completo\" onclick=\"window.openFullPicker(event, \'pill\', ${index}, ${rowIdx}, ${colIdx})\"></div>', content)
    # For title
    content = re.sub(r'<div class=\"spectrum-bar\"[^>]*onmousedown=\"window\.startSpectrum\(event,\s*\'title\',\s*\$\{index\}\)\"[^>]*></div>', 
                     r'<div class=\"pill-color-dot rainbow\" title=\"Espectro Completo\" onclick=\"window.openFullPicker(event, \'title\', ${index}, null, null)\"></div>', content)
                     
    # Remove old spectrum logic if present
    content = re.sub(r'let spectrumActive = null;.*?function updateSpectrum\(e\) \{.*?\}\s*\}', '', content, flags=re.DOTALL)

    # Add openFullPicker and globalColorPicker if not exists
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
        window.editorSchema[b].options[r][c].color = color;
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
        const optObj = window.editorSchema[blockIdx].options[rowIdx][colIdx];
        if (typeof optObj === 'object' && optObj.color) currentColor = optObj.color;
    } else {
        const c = window.editorSchema[blockIdx].blockColor;
        if (c) currentColor = c;
    }
    globalColorPicker.value = currentColor;
    globalColorPicker.click();
};
'''
        content = content + '\n' + picker_code

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js')
fix_file(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js')
print("Fixed files!")

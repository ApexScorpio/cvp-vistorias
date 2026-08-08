import re
import os
import time

ts = str(int(time.time()))

def update_cache(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r'\.js\?v=\d+', f'.js?v={ts}', content)
    content = re.sub(r'\.css\?v=\d+', f'.css?v={ts}', content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.html')
update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\builder.html')

def fix_picker_everywhere(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(m):
        type_str = 'pill' if 'pill' in m.group(1) else 'title'
        has_row_col = 'rowIdx' in m.group(0)
        idx_str = '${index}'
        if has_row_col:
            idx_str += ', ${rowIdx}, ${colIdx}'
        return f"window.openFullPicker(event, '{type_str}', {idx_str})"

    content = re.sub(r"window\.startSpectrum\(event,\s*'(pill|title|pill-bulk)',\s*\$\{index\}(?:,\s*\$\{rowIdx\},\s*\$\{colIdx\})?\)",
                     replacer,
                     content)

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
            let opt = window.editorSchema[b].options[r][c];
            if (typeof opt !== 'object' || opt === null) {
                opt = { text: String(opt) };
                window.editorSchema[b].options[r][c] = opt;
            }
            opt.color = color;
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

    # Add isSticky to appendNewBlock
    content = content.replace('const newBlock = { type: actualType, question: \'\', content: initialContent, blockSize: blockSize };', 'const newBlock = { type: actualType, question: \'\', content: initialContent, blockSize: blockSize };\n    if (actualType === \'title\' || actualType === \'section\') {\n        newBlock.isSticky = true;\n    }')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_picker_everywhere(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js')
fix_picker_everywhere(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js')

print("All fixes applied successfully to root folder files!")

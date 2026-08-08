import re

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
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_picker_everywhere(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js')
fix_picker_everywhere(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js')
print('Fixed startSpectrum calls globally in public_html!')

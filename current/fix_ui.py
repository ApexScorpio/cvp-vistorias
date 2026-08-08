import re

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix isSticky in editor.js
if 'newBlock.isSticky = true;' not in content:
    content = content.replace("const newBlock = { type: type, question: '' };", "const newBlock = { type: type, question: '' };\n    if (type === 'title' || type === 'section') { newBlock.isSticky = true; }")

# Replace spectrum-bar HTML completely in editor.js
# Note: we need to handle newlines inside the div tag and between attributes.
content = re.sub(r'<div class="spectrum-bar"[\s\S]*?onmousedown="window\.openFullPicker\(event,\s*\'([^\']+)\',\s*([^\)]+)\)"[\s\S]*?></div>', 
                 r'<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, \'\1\', \2)"></div>', 
                 content)

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js', 'r', encoding='utf-8') as f:
    content2 = f.read()

# Replace spectrum-bar HTML completely in inventario.js
content2 = re.sub(r'<div class="spectrum-bar"[\s\S]*?onmousedown="window\.openFullPicker\(event,\s*\'([^\']+)\',\s*([^\)]+)\)"[\s\S]*?></div>', 
                  r'<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, \'\1\', \2)"></div>', 
                  content2)

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js', 'w', encoding='utf-8') as f:
    f.write(content2)

# Also update the cache busters again
import time
ts = str(int(time.time()))
def update_cache(filepath):
    import os
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = re.sub(r'\.js\?v=\d+', f'.js?v={ts}', c)
    c = re.sub(r'\.css\?v=\d+', f'.css?v={ts}', c)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.html')
update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\builder.html')

print('Fixed UI HTML and editor.js isSticky!')

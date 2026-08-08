import re
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<div class="spectrum-bar"[^>]*onmousedown="window\.startSpectrum\(event, \'title\', \$\{index\}\)"[^>]*></div>', r'<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, \'title\', ${index})"></div>', content)

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js', 'w', encoding='utf-8') as f:
    f.write(content)

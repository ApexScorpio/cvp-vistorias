import re
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix HTML
content = re.sub(r'<div class="spectrum-bar"[^>]*onmousedown="startSpectrum\(event, \'title\', \$\{index\}\)"[^>]*></div>', r'<div class="pill-color-dot rainbow" title="Espectro Completo" onclick="window.openFullPicker(event, \'title\', ${index})"></div>', content)

# Remove startSpectrum definition block safely
start = content.find('window.startSpectrum = function')
if start != -1:
    end = content.find('function applyColorToDOM', start)
    if end != -1:
        # Also find the spectrumActive = null line before it
        spec_active = content.rfind('let spectrumActive = null;', 0, start)
        if spec_active != -1 and spec_active > start - 100:
            content = content[:spec_active] + content[end:]
        else:
            content = content[:start] + content[end:]

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\editor.js', 'w', encoding='utf-8') as f:
    f.write(content)

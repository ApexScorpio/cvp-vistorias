import re
import os

def fix_editor_js():
    path = r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Change palette-grid back to pill-palette-grid
    c = c.replace('class="palette-grid"', 'class="pill-palette-grid"')

    # The previous agent changed spectrum-bar to pill-color-dot rainbow!
    # Wait, in editor.js I ALREADY REVERTED openFullPicker to startSpectrum.
    # But did I revert <div class="pill-color-dot rainbow"?
    # My compare script showed that editor.js HAS <div class="spectrum-bar"!
    # So editor.js already has spectrum-bar!
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

def fix_inventario_js():
    path = r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    c = c.replace('class="palette-grid"', 'class="pill-palette-grid"')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

def fix_editor_css():
    path = r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.css'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # If pill-palette-grid is missing, append it
    if '.pill-palette-grid' not in c:
        c += '\n\n.pill-palette-grid {\n    display: grid;\n    grid-template-columns: repeat(6, 1fr);\n    gap: 8px;\n}\n'

    # If .spectrum-bar is missing, append it
    if '.spectrum-bar' not in c:
        c += '''
.spectrum-bar {
    width: 100%;
    height: 20px;
    background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
    border-radius: 10px;
    cursor: crosshair;
    margin-top: 10px;
    border: 1px solid rgba(255,255,255,0.2);
    position: relative;
    user-select: none;
}
'''

    # Change pill-color-dot size
    c = re.sub(r'\.pill-color-dot\s*\{[\s\S]*?\}', '''
.pill-color-dot {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.15);
    transition: transform 0.1s, border-color 0.2s;
}''', c)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

fix_editor_js()
fix_inventario_js()
fix_editor_css()
print('Fixed!')

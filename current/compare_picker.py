import re

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    old_c = f.read()

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
    new_c = f.read()

old_m = re.search(r'<div class="pill-palette"[^>]*>[\s\S]*?<div class="spectrum-bar"[\s\S]*?</div>\s*</div>', old_c)
new_m = re.search(r'<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}" class="pill-palette hidden"[^>]*>[\s\S]*?<div class="spectrum-bar"[\s\S]*?</div>\s*</div>\s*</div>', new_c)

if old_m:
    print('OLD (yesterday):')
    print(old_m.group(0))
else:
    print('OLD not found!')

print('\n---\n')

if new_m:
    print('NEW (today):')
    print(new_m.group(0))
else:
    print('NEW not found!')

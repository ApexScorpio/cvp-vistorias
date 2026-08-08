import re

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    c = f.read()

m = re.findall(r'<div class="pill-palette"[^>]*>[\s\S]*?<div class="spectrum-bar"[\s\S]*?</div>\s*</div>', c)
print(f'Found {len(m)} pill-palette blocks')

if len(m) > 0:
    for i, match in enumerate(m):
        with open(rf'C:\Users\lopes\Desktop\CVP_Vistorias\extracted_palette_{i}.txt', 'w', encoding='utf-8') as fout:
            fout.write(match)

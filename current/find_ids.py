import re
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
    c = f.read()

matches = re.findall(r'id="palette-.*?"', c)
print('Matches:', matches)

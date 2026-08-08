import re
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    c = f.read()

for m in re.finditer('class="pill-palette', c):
    print('Found at', m.start())
    # print the next 200 chars
    print(c[m.start():m.start()+200])
    print('-'*40)

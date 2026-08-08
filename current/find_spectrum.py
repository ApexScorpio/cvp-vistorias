import re
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    c = f.read()

for m in re.finditer('spectrum-bar', c):
    print('Found at', m.start())
    print(c[max(0, m.start()-100):min(len(c), m.start()+100)])
    print('-'*40)

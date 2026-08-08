import re
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'inventoryItems', c)
print('Found inventoryItems palette:', bool(m))

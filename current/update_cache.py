import re
import time
import os

ts = str(int(time.time()))

def update_cache(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r'\.js\?v=\d+', f'.js?v={ts}', content)
    content = re.sub(r'\.css\?v=\d+', f'.css?v={ts}', content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.html')
update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\builder.html')
update_cache(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\login.html')
print('Cache busters updated!')

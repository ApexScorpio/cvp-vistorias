import os
import re
import time

def revert_and_fix_public():
    root = r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html'
    
    def process_file(filename):
        path = os.path.join(root, filename)
        if not os.path.exists(path): return
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Revert openFullPicker back to startSpectrum so the gradient bar works dynamically again
        content = re.sub(
            r'onmousedown="window\.openFullPicker\(event,',
            r'onmousedown="window.startSpectrum(event,',
            content
        )
        
        # Apply the sticky fix
        content = content.replace('const isSticky = !!block.isSticky;', 'const isSticky = block.isSticky !== false;')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
    process_file('editor.js')
    process_file('inventario.js')
    
    # Update cache busters
    ts = str(int(time.time()))
    def update_cache(filename):
        path = os.path.join(root, filename)
        if not os.path.exists(path): return
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        c = re.sub(r'\.js\?v=\d+', f'.js?v={ts}', c)
        c = re.sub(r'\.css\?v=\d+', f'.css?v={ts}', c)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
            
    update_cache('inventario.html')
    update_cache('builder.html')

revert_and_fix_public()
print('Public files reverted and fixed!')

import os
import shutil
import re
import time

def rollback_and_fix():
    root = r'C:\Users\lopes\Desktop\CVP_Vistorias'
    
    # 1. Restore the exact backups (which have the old color picker and spectrum bar)
    shutil.copy2(os.path.join(root, 'inventario_backup.js'), os.path.join(root, 'inventario.js'))
    shutil.copy2(os.path.join(root, 'editor_backup.js'), os.path.join(root, 'editor.js'))
    
    # 2. Apply ONLY the sticky icon logic fix
    def fix_sticky(filename):
        path = os.path.join(root, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # This fixes the visual mismatch between the block's icon and the floating menu's icon
        # by making them both treat 'undefined' as 'true' (sticky by default)
        content = content.replace('const isSticky = !!block.isSticky;', 'const isSticky = block.isSticky !== false;')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
    fix_sticky('inventario.js')
    fix_sticky('editor.js')
    
    # 3. Update cache busters to force browser to load these newly reverted files
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

rollback_and_fix()
print('Rollback and minimal sticky fix applied successfully.')

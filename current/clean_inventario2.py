def run():
    import re
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Find the block we want to replace in inventario.js
    idx1 = c.find('let savedColors')
    idx2 = c.find('window.toggleTitlePalette =')
    if idx2 == -1: idx2 = c.find('function toggleTitlePalette')
    
    if idx1 != -1 and idx2 != -1:
        # Instead of injecting the whole block from old_js, let's just make sure global pickers are dead
        m = re.search(r'const globalColorPicker = document\.createElement.*?globalColorPicker\.addEventListener\(\'change\',.*?\}\s*\);\s*', c, re.DOTALL)
        if m:
            c = c[:m.start()] + c[m.end():]
            print("Removed globalColorPicker logic")

    # In inventario.js, we also have to make sure the toggle block uses spectrum
    # But wait, inventario.js does NOT use old_js!
    # Because inventario.js uses setItemColor, not setPillColor.
    # Actually, in inventario.js, let's just use the SAME color picker block as editor.js!
    # Wait, the user ONLY complained about editor.js yesterday. Did they complain about inventario today?
    # I will just write c back.
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

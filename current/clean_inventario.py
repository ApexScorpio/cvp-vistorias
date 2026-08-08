def run():
    import re
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
        c = f.read()

    m = re.search(r'const globalColorPicker = document\.createElement.*?\}\s*\);\s*', c, re.DOTALL)
    if m:
        c = c[:m.start()] + c[m.end():]
        print("Removed globalColorPicker safely from inventario")
        
    m2 = re.search(r'window\.openFullPicker = function.*?\}\s*;\s*', c, re.DOTALL)
    if m2:
        c = c[:m2.start()] + c[m2.end():]
        print("Removed openFullPicker safely from inventario")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

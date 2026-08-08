def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
        c = f.read()
    if 'window.onerror' not in c:
        c = 'window.onerror = function(m, u, l) { alert("Error: " + m + " at line " + l); };\n' + c
        with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'w', encoding='utf-8') as f:
            f.write(c)
run()

def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Find second blockGlobalPicker
    idx1 = c.find('const blockGlobalPicker =')
    if idx1 != -1:
        idx2 = c.find('const blockGlobalPicker =', idx1 + 10)
        if idx2 != -1:
            start = c.rfind('// Global Color', 0, idx2)
            end2 = c.find('});', c.find('blockGlobalPicker.addEventListener(\'change\'', idx2)) + 4
            c = c[:start] + c[end2:]
            print("Removed duplicated blockGlobalPicker")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

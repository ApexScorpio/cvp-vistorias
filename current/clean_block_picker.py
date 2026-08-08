def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Find second blockGlobalPicker
    idx1 = c.find('// Global Color Picker for block settings')
    if idx1 != -1:
        idx2 = c.find('// Global Color Picker for block settings', idx1 + 10)
        if idx2 != -1:
            end2 = c.find('});\n', c.find('blockGlobalPicker.addEventListener(\'change\'', idx2)) + 4
            c = c[:idx2] + c[end2:]
            print("Removed duplicated blockGlobalPicker")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

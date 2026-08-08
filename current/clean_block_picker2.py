def run():
    import re
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()

    # Find second const blockGlobalPicker =
    matches = [m.start() for m in re.finditer(r'const blockGlobalPicker =', c)]
    if len(matches) > 1:
        start_dangle2 = c.rfind('//', 0, matches[1])
        end2 = c.find('});\n', c.find('blockGlobalPicker.addEventListener(\'change\'', matches[1])) + 4
        c = c[:start_dangle2] + c[end2:]
        print("Removed duplicated blockGlobalPicker")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

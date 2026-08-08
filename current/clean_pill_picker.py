def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()
    
    # We must remove pillGlobalPicker and openFullPicker
    start_dangle1 = c.find('// Global Color Picker for pills')
    if start_dangle1 != -1:
        end_dangle1 = c.find('};\n', c.find('window.openFullPicker =', start_dangle1)) + 3
        if end_dangle1 == 2:
            # Maybe window.openFullPicker is not there
            end_dangle1 = c.find('});\n', c.find('pillGlobalPicker.addEventListener(\'change\'', start_dangle1)) + 4
        c = c[:start_dangle1] + c[end_dangle1:]
        print("Removed first pillGlobalPicker block")

    start_dangle2 = c.find('// Global Color Picker for pills')
    if start_dangle2 != -1:
        end_dangle2 = c.find('};\n', c.find('window.openFullPicker =', start_dangle2)) + 3
        if end_dangle2 == 2:
            end_dangle2 = c.find('});\n', c.find('pillGlobalPicker.addEventListener(\'change\'', start_dangle2)) + 4
        c = c[:start_dangle2] + c[end_dangle2:]
        print("Removed second pillGlobalPicker block")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)
run()

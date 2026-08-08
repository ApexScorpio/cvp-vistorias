def run():
    with open('opts_html_final.txt', 'r', encoding='utf-8') as f:
        opts_html = f.read()
    
    inv_html = opts_html.replace('palette-${index}-${rowIdx}-${colIdx}', 'palette-inventoryItems-${index}-${rowIdx}-${iIdx}')
    inv_html = inv_html.replace(', \'options\')', ', \'inventoryItems\')')
    inv_html = inv_html.replace(', ${colIdx},', ', ${iIdx},')

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if 'id="palette-${index}-${rowIdx}-${colIdx}"' in line:
            # We found options palette start.
            out.append(' ' * 36 + opts_html + '\n')
            # Skip until the end of the palette
            while i < len(lines) and '</div>' not in lines[i] or '</div>' not in lines[i+1] or '</div>' not in lines[i+2] or '`;' not in lines[i+3]:
                if '</div>' in lines[i] and '</div>' in lines[i+1] and '</div>' in lines[i+2] and '`;' in lines[i+3]:
                    break
                i += 1
            # Skip the 3 divs
            i += 2
        elif 'id="palette-inventoryItems-${index}-${rowIdx}-${iIdx}"' in line:
            # We found inventoryItems palette start.
            out.append(' ' * 36 + inv_html + '\n')
            while i < len(lines):
                if '</div>' in lines[i] and '</div>' in lines[i+1] and '</div>' in lines[i+2] and '`;' in lines[i+3]:
                    break
                i += 1
            i += 2
        else:
            out.append(line)
        i += 1
        
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.writelines(out)

run()

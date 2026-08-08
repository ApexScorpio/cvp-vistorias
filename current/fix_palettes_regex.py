import re

def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
        old_c = f.read()

    idx1 = old_c.find('id="title-palette-${index}"')
    idx1 = old_c.find('>', idx1) + 1
    idx2 = old_c.find('</div>\n                </div>', idx1)
    
    title_html = old_c[idx1:idx2]
    
    opts_html = title_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index})', 'window.handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('handleSlotMouseUp()', 'window.handleSlotMouseUp()')
    opts_html = opts_html.replace('handleSlotClick(event, ${sIdx}, ${index})', 'window.handleSlotClick(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    opts_html = opts_html.replace('setTitleColor(${index}, \'\')', 'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \'\', \'options\')')
    opts_html = opts_html.replace('setTitleColor(${index}, \'${c}\')', 'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \'${c}\', \'options\')')
    opts_html = opts_html.replace('startSpectrum(event, \'title\', ${index})', 'window.startSpectrum(event, \'pill\', ${index}, ${rowIdx}, ${colIdx}, \'options\')')
    
    inv_html = title_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index})', 'window.handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('handleSlotMouseUp()', 'window.handleSlotMouseUp()')
    inv_html = inv_html.replace('handleSlotClick(event, ${sIdx}, ${index})', 'window.handleSlotClick(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('setTitleColor(${index}, \'\')', 'window.setPillColor(${index}, ${rowIdx}, ${iIdx}, \'\', \'inventoryItems\')')
    inv_html = inv_html.replace('setTitleColor(${index}, \'${c}\')', 'window.setPillColor(${index}, ${rowIdx}, ${iIdx}, \'${c}\', \'inventoryItems\')')
    inv_html = inv_html.replace('startSpectrum(event, \'title\', ${index})', 'window.startSpectrum(event, \'pill\', ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()

    # Find the options palette with regex
    m1 = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}` \? \'\' : \'hidden\'\}">.*?(</div>\s*</div>\s*</div>)', new_c, re.DOTALL)
    if m1:
        start_inner1 = m1.start() + m1.group(0).find('>') + 1
        end1 = m1.end() - len(m1.group(1))
        new_c = new_c[:start_inner1] + opts_html + new_c[end1:]
        print('Options palette fixed!')
    else:
        print('Options palette NOT FOUND')

    # Find the inventoryItems palette with regex
    m2 = re.search(r'<div class="pill-palette \$\{openPaletteId === `palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}` \? \'\' : \'hidden\'\}">.*?(</div>\s*</div>\s*</div>)', new_c, re.DOTALL)
    if m2:
        start_inner2 = m2.start() + m2.group(0).find('>') + 1
        end2 = m2.end() - len(m2.group(1))
        new_c = new_c[:start_inner2] + inv_html + new_c[end2:]
        print('InventoryItems palette fixed!')
    else:
        print('InventoryItems palette NOT FOUND')

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)

run()

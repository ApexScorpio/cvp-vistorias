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

    # Find the options palette with find
    start1 = new_c.find('class="pill-palette ${openPaletteId === `palette-${index}-${rowIdx}-${colIdx}`')
    if start1 != -1:
        inner_start1 = new_c.find('>', start1) + 1
        end1 = new_c.find('</div>\n                                 </div>', inner_start1)
        if end1 != -1:
            new_c = new_c[:inner_start1] + '\n' + opts_html + '\n                                 ' + new_c[end1:]
            print('Options palette fixed!')
        else:
            print('Options palette end not found')
    else:
        print('Options palette start not found')

    # Find the inventoryItems palette (it might just be the second pill-palette now because id was removed)
    # The second pill-palette currently in editor.js is the title-palette from my bad replace earlier?
    # Let's search for the second pill-palette without id.
    start2 = new_c.find('class="pill-palette ${openPaletteId === `palette-inventoryItems-${index}-${rowIdx}-${iIdx}`')
    # wait, earlier we found it didn't exist. Let's just find `palette-inventoryItems-` in case I messed up the exact string
    # Actually, in editor.js right now, what are the pill-palette classes?
    # We saw: `palette-${index}-${rowIdx}-${colIdx}` and `openPaletteTitleIdx` and `pill-palette-saved` and `pill-palette-grid`.
    # I MUST HAVE DELETED THE INVENTORY ITEMS PALETTE.
    pass

run()

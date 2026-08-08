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

    # Wrap it in the opening div
    opts_html = f'<div id="palette-${{index}}-${{rowIdx}}-${{colIdx}}" class="pill-palette ${{openPaletteId === `palette-${{index}}-${{rowIdx}}-${{colIdx}}` ? \'\' : \'hidden\'}}">\n' + opts_html + '</div>'
    
    with open('opts_html_final.txt', 'w', encoding='utf-8') as f2:
        f2.write(opts_html)
run()

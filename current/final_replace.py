def run():
    with open('opts_html_final.txt', 'r', encoding='utf-8') as f:
        opts_html = f.read()
    
    inv_html = opts_html.replace('palette-${index}-${rowIdx}-${colIdx}', 'palette-inventoryItems-${index}-${rowIdx}-${iIdx}')
    inv_html = inv_html.replace(', \'options\')', ', \'inventoryItems\')')
    inv_html = inv_html.replace(', ${colIdx},', ', ${iIdx},')

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()

    start1 = c.find('class="pill-palette ${openPaletteId === `palette-${index}-${rowIdx}-${colIdx}`')
    if start1 != -1:
        start_real = c.rfind('<div ', 0, start1)
        end1 = c.find('</div>\n                                 </div>\n                             </div>\n                         `;', start_real)
        if end1 != -1:
            c = c[:start_real] + opts_html + c[end1:]
            print("Options palette replaced successfully!")

    start2 = c.find('class="pill-palette ${openPaletteId === `palette-inventoryItems-${index}-${rowIdx}-${iIdx}`')
    if start2 != -1:
        start_real2 = c.rfind('<div ', 0, start2)
        end2 = c.find('</div>\n                                    </div>\n                                </div>\n                            `;', start_real2)
        if end2 == -1:
            end2 = c.find('</div>\n                                 </div>\n                             </div>\n                         `;', start_real2)
        if end2 != -1:
            c = c[:start_real2] + inv_html + c[end2:]
            print("InventoryItems palette replaced successfully!")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

def run():
    import re
    # Get the old pill palette HTML
    with open('dump_pill_palette.txt', 'r', encoding='utf-8') as f:
        old_pill_html = f.read()

    # Wait, in inventario.js, we don't need 'inventoryItems' because the global function wasn't there?
    # Wait, I previously injected `window.setPillColor(blockIdx, r, c, color, key)` 
    # But in the old editor.js code, `setPillColor` wasn't `window.setPillColor`, it was just `setPillColor`.
    # AND in the CURRENT inventario.js, does it have `window.setPillColor` or `setPillColor`?
    # Let's check inventario.js to see what it uses.

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
        inv_c = f.read()
    
    # Let's replace the whole <div class="pill-palette ... > ... </div> </div> </div> `; with old_pill_html
    m_inv = re.search(r'(<div class="pill-palette \$\{openPaletteOption === opt \? \'\' : \'hidden\'\}" id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}".*?)(`;)', inv_c, re.DOTALL)
    if m_inv:
        # replace `openPaletteId === ...` in old_pill_html with `openPaletteOption === opt`
        inv_html = old_pill_html.replace('openPaletteId === `palette-${index}-${rowIdx}-${colIdx}`', 'openPaletteOption === opt')
        
        # update setPillColor to window.setPillColor
        inv_html = inv_html.replace('setPillColor(', 'window.setPillColor(')
        inv_html = inv_html.replace('openFullPicker(', 'window.openFullPicker(')
        
        replacement = inv_html + '\n                                </div>\n                            </div>\n                        </div>\n                    `;'
        
        inv_c = inv_c[:m_inv.start(1)] + replacement + inv_c[m_inv.end(2):]
        print("Replaced inventario.js pill palette")
        
        with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'w', encoding='utf-8') as fw:
            fw.write(inv_c)
    else:
        print("Could not find inventario pill palette")

run()

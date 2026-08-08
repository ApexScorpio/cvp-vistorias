def run():
    import re

    # Get the old pill palette HTML
    with open('dump_pill_palette.txt', 'r', encoding='utf-8') as f:
        old_pill_html = f.read()

    # For editor.js options
    opts_html = old_pill_html

    # For inventario.js inventoryItems
    inv_html = old_pill_html.replace('palette-${index}-${rowIdx}-${colIdx}', 'palette-inventoryItems-${index}-${rowIdx}-${colIdx}')
    inv_html = inv_html.replace('openFullPicker(event, ${index}, ${rowIdx}, ${colIdx})', 'openFullPicker(event, ${index}, ${rowIdx}, ${colIdx}, \'inventoryItems\')')
    inv_html = inv_html.replace('setPillColor(${index}, ${rowIdx}, ${colIdx},', 'setPillColor(${index}, ${rowIdx}, ${colIdx},')

    # Wait, the old setPillColor was `setPillColor(blockIdx, rowIdx, colIdx, color)`
    # In my new global setPillColor, it's `window.setPillColor(blockIdx, r, c, color, key='options')`.
    # Let's update `opts_html` and `inv_html` to use `window.setPillColor` and `window.openFullPicker`.
    opts_html = opts_html.replace('setPillColor(', 'window.setPillColor(').replace('openFullPicker(', 'window.openFullPicker(')
    inv_html = inv_html.replace('setPillColor(', 'window.setPillColor(').replace('openFullPicker(', 'window.openFullPicker(')
    
    # We need to add the missing closing tags that I accidentally deleted!
    # The regex I'm going to use will match from `<div id="palette-...` up to `</div>\s*</div>\s*</div>\s*`;` or whatever is left.
    # Actually, in the broken file, there is NO `</div></div></div>`;`! It just ends with `</div> </div> </div> `;` from SOMEWHERE ELSE or it's missing!
    # Wait, let's look at `temp_counter.txt`:
    # 281:                                 </div>
    # 282:                             </div>
    # 283:                         `;
    # This means there ARE 2 closing tags, but the 3rd one is missing!
    # I will replace the ENTIRE `<div id="palette-..." ... > ... </div> </div> </div> `;'` block!

    # Let's read editor.js
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()
    
    # Replace in editor.js
    # Match the broken palette AND whatever closing tags are there before the next Javascript line.
    # Look for `<div id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}"` up to `\`;`
    m = re.search(r'(<div id="palette-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}".*?)(`;)', new_c, re.DOTALL)
    if m:
        replacement = opts_html + '\n                                    </div>\n                                </div>\n                            </div>\n                        `;'
        new_c = new_c[:m.start(1)] + replacement + new_c[m.end(2):]
        print("Replaced editor.js pill palette")
    else:
        print("Could not find editor.js pill palette")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)

    # Let's read inventario.js
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
        inv_c = f.read()

    # The id is palette-inventoryItems-${index}-${rowIdx}-${colIdx}
    # Wait, what was the exact ID in inventario.js?
    # Let's check `old_inventario_js`? No, I injected it!
    # It was `<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}"`
    m_inv = re.search(r'(<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{colIdx\}".*?)(`;)', inv_c, re.DOTALL)
    if not m_inv:
        m_inv = re.search(r'(<div id="palette-inventoryItems-\$\{index\}-\$\{rowIdx\}-\$\{iIdx\}".*?)(`;)', inv_c, re.DOTALL)
    
    if m_inv:
        # Check if it was iIdx
        if 'iIdx' in m_inv.group(1):
            inv_html_use = inv_html.replace('colIdx', 'iIdx')
        else:
            inv_html_use = inv_html

        # Add the 'inventoryItems' parameter to setPillColor and openFullPicker
        inv_html_use = re.sub(r'window\.setPillColor\(\$\{index\}, \$\{rowIdx\}, \$\{[^}]+\}, ([^)]+)\)', r'window.setPillColor(${index}, ${rowIdx}, ${colIdx}, \1, \'inventoryItems\')'.replace('colIdx', 'iIdx' if 'iIdx' in m_inv.group(1) else 'colIdx'), inv_html_use)
        inv_html_use = re.sub(r'window\.openFullPicker\(event, \$\{index\}, \$\{rowIdx\}, \$\{[^}]+\}\)', r'window.openFullPicker(event, ${index}, ${rowIdx}, ${colIdx}, \'inventoryItems\')'.replace('colIdx', 'iIdx' if 'iIdx' in m_inv.group(1) else 'colIdx'), inv_html_use)

        replacement_inv = inv_html_use + '\n                                    </div>\n                                </div>\n                            </div>\n                        `;'
        inv_c = inv_c[:m_inv.start(1)] + replacement_inv + inv_c[m_inv.end(2):]
        print("Replaced inventario.js pill palette")
    else:
        print("Could not find inventario.js pill palette")

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'w', encoding='utf-8') as f:
        f.write(inv_c)

run()

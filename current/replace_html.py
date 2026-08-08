import re

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
    old_c = f.read()

idx_start = old_c.find('class="pill-palette')
if idx_start != -1:
    idx_end = old_c.find('</div>\n                                 </div>', idx_start)
    if idx_end != -1:
        old_opts_html = old_c[idx_start:idx_end+45]
        
        with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f2:
            new_c = f2.read()
            
        new_start1 = new_c.find('id="palette-${index}-${rowIdx}-${colIdx}"')
        if new_start1 != -1:
            new_start1 = new_c.rfind('class="pill-palette', 0, new_start1)
            new_end1 = new_c.find('</div>\n                                 </div>', new_start1)
            if new_end1 != -1:
                new_c = new_c[:new_start1] + old_opts_html + new_c[new_end1+45:]
                print('Replaced options palette in editor.js')
                
        new_start2 = new_c.find('id="palette-inventoryItems-${index}-${rowIdx}-${iIdx}"')
        if new_start2 != -1:
            new_start2 = new_c.rfind('class="pill-palette', 0, new_start2)
            new_end2 = new_c.find('</div>\n                                    </div>', new_start2)
            if new_end2 == -1: new_end2 = new_c.find('</div>\n                                 </div>', new_start2)
            if new_end2 != -1:
                old_inv_html = old_opts_html.replace('`palette-${index}-${rowIdx}-${colIdx}`', '`palette-inventoryItems-${index}-${rowIdx}-${iIdx}`')
                old_inv_html = old_inv_html.replace('handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${colIdx})', 'handleSlotMouseDown(event, ${sIdx}, ${index}, ${rowIdx}, ${iIdx}, \'inventoryItems\')')
                old_inv_html = old_inv_html.replace('applyPillColor(${index}, ${rowIdx}, ${colIdx}, \'${c}\')', 'applyPillColor(${index}, ${rowIdx}, ${iIdx}, \'${c}\', \'inventoryItems\')')
                new_c = new_c[:new_start2] + old_inv_html + new_c[new_end2+45:]
                print('Replaced inventoryItems palette in editor.js')

        with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f3:
            f3.write(new_c)

# Now inventario.js
with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_inventario.js', 'r', encoding='utf-16') as f:
    old_inv_c = f.read()

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
    new_inv_c = f.read()

# Replace title palette
t_start1 = old_inv_c.find('class="pill-palette ${openPaletteTitleIdx === index ? \'\' : \'hidden\'}"')
if t_start1 != -1:
    t_end1 = old_inv_c.find('</div>\n                </div>\n            </div>', t_start1)
    if t_end1 != -1:
        old_title_html = old_inv_c[t_start1:t_end1+50]
        
        n_t_start1 = new_inv_c.find('class="pill-palette ${openPaletteTitleIdx === index ? \'\' : \'hidden\'}"')
        if n_t_start1 != -1:
            n_t_end1 = new_inv_c.find('</div>\n                </div>\n            </div>', n_t_start1)
            if n_t_end1 != -1:
                new_inv_c = new_inv_c[:n_t_start1] + old_title_html + new_inv_c[n_t_end1+50:]
                print('Replaced title palette in inventario.js')

# Replace pill palette
p_start1 = old_inv_c.find('class="pill-palette ${openPaletteId === `palette-${index}-${pillIndex}` ? \'\' : \'hidden\'}"')
if p_start1 != -1:
    p_end1 = old_inv_c.find('</div>\n                </div>\n            </div>', p_start1)
    if p_end1 != -1:
        old_pill_html = old_inv_c[p_start1:p_end1+50]
        
        n_p_start1 = new_inv_c.find('class="pill-palette ${openPaletteId === `palette-${index}-${pillIndex}` ? \'\' : \'hidden\'}"')
        if n_p_start1 != -1:
            n_p_end1 = new_inv_c.find('</div>\n                </div>\n            </div>', n_p_start1)
            if n_p_end1 != -1:
                new_inv_c = new_inv_c[:n_p_start1] + old_pill_html + new_inv_c[n_p_end1+50:]
                print('Replaced pill palette in inventario.js')

with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'w', encoding='utf-8') as f:
    f.write(new_inv_c)
print('Done inventario html')

def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()
    idx = c.find('id="palette-inventoryItems')
    print('idx:', idx)
    if idx != -1:
        idx_end = c.find('</div>\n                                 </div>', idx)
        print('idx_end:', idx_end)
        with open('temp_palette_new.txt', 'w', encoding='utf-8') as f2:
            f2.write(c[idx:idx+2000])
run()

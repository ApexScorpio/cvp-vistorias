def replace_picker():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\old_editor_utf8.js', 'r', encoding='utf-8') as f:
        old_c = f.read()
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        new_c = f.read()

    # 1. Extract old options palette
    opt_start_marker = "class=\"pill-palette ${openPaletteId === `palette-${index}-${rowIdx}-${colIdx}` ? '' : 'hidden'}\">"
    opt_start_idx = old_c.find(opt_start_marker)
    opt_end_idx = old_c.find("</div>\n                                 </div>", opt_start_idx)
    if opt_start_idx == -1 or opt_end_idx == -1: print("Old options palette not found"); return
    opt_html = old_c[opt_start_idx - 5 : opt_end_idx + 45] # grab the outer div too

    # 2. Extract old inventory palette
    inv_start_marker = "class=\"pill-palette ${openPaletteId === `palette-inventoryItems-${index}-${rowIdx}-${iIdx}` ? '' : 'hidden'}\">"
    inv_start_idx = old_c.find(inv_start_marker)
    inv_end_idx = old_c.find("</div>\n                                 </div>", inv_start_idx)
    if inv_start_idx == -1 or inv_end_idx == -1: print("Old inventory palette not found"); return
    inv_html = old_c[inv_start_idx - 5 : inv_end_idx + 45]

    # 3. Extract old JS block
    js_start_idx = old_c.find("let savedColors =")
    js_end_idx = old_c.find("window.updateGlobalBuilderColors")
    if js_end_idx == -1: js_end_idx = old_c.find("function applyPillColor", js_start_idx)
    if js_end_idx == -1: js_end_idx = old_c.find("// ----------------------------------------", js_start_idx)
    if js_start_idx == -1 or js_end_idx == -1: print("Old JS block not found"); return
    old_js = old_c[js_start_idx:js_end_idx]

    # --- NOW IN PUBLIC HTML ---

    # A. Replace options palette
    # Let's find the start of the palette in new_c
    n_opt_start_marker = 'id="palette-${index}-${rowIdx}-${colIdx}"'
    n_opt_start_idx = new_c.find(n_opt_start_marker)
    if n_opt_start_idx != -1:
        # rewind to <div
        n_opt_start_idx = new_c.rfind('<div', 0, n_opt_start_idx)
        n_opt_end_idx = new_c.find("</div>\n                                 </div>", n_opt_start_idx)
        if n_opt_end_idx != -1:
            new_c = new_c[:n_opt_start_idx] + opt_html + new_c[n_opt_end_idx + 45:]
    else:
        print("New options palette not found")

    # B. Replace inventory palette
    n_inv_start_marker = 'id="palette-inventoryItems-${index}-${rowIdx}-${iIdx}"'
    n_inv_start_idx = new_c.find(n_inv_start_marker)
    if n_inv_start_idx != -1:
        n_inv_start_idx = new_c.rfind('<div', 0, n_inv_start_idx)
        n_inv_end_idx = new_c.find("</div>\n                                    </div>", n_inv_start_idx)
        if n_inv_end_idx == -1: n_inv_end_idx = new_c.find("</div>\n                                 </div>", n_inv_start_idx)
        if n_inv_end_idx != -1:
            new_c = new_c[:n_inv_start_idx] + inv_html + new_c[n_inv_end_idx + 45:]
    else:
        print("New inventory palette not found")

    # C. Replace JS block
    n_js_start_idx = new_c.find("window.handleSlotClick =")
    if n_js_start_idx == -1: n_js_start_idx = new_c.find("window.handleSlotMouseDown =")
    
    n_js_end_idx = new_c.find("const globalColorPicker =")
    if n_js_end_idx == -1: n_js_end_idx = new_c.find("window.openFullPicker =")
    if n_js_end_idx == -1: n_js_end_idx = new_c.find("window.updateGlobalBuilderColors")

    if n_js_start_idx != -1 and n_js_end_idx != -1:
        new_c = new_c[:n_js_start_idx] + old_js + new_c[n_js_end_idx:]
    else:
        print("New JS block not found")

    # D. Remove globalColorPicker and openFullPicker
    gcp_idx = new_c.find("const globalColorPicker =")
    if gcp_idx != -1:
        gcp_end = new_c.find("};", new_c.find("window.openFullPicker ="))
        if gcp_end != -1:
            new_c = new_c[:gcp_idx] + new_c[gcp_end + 2:]

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(new_c)

    print("Successfully replaced editor.js color picker logic")

replace_picker()

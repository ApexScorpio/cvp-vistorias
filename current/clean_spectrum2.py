def run():
    import re
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()
    
    # We injected these at the top, so we need to delete the SECOND occurrences.
    
    def remove_second(name, prefix='function'):
        nonlocal c
        # find the second occurrence
        m_iter = list(re.finditer(fr'(?:{prefix}\s+{name}\s*\(|window\.{name}\s*=\s*function\s*\()', c))
        if len(m_iter) > 1:
            start = m_iter[1].start()
            open_braces = 0
            found_brace = False
            for i in range(start, len(c)):
                if c[i] == '{': 
                    open_braces += 1
                    found_brace = True
                elif c[i] == '}':
                    open_braces -= 1
                    if found_brace and open_braces == 0:
                        end = i + 1
                        if end < len(c) and c[end] == ';': end += 1
                        # Remove it!
                        c = c[:start] + c[end:]
                        print(f"Removed second {name}")
                        break

    remove_second('startSpectrum')
    remove_second('updateSpectrum')
    remove_second('hexToRgb')
    remove_second('rgbToHex')

    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

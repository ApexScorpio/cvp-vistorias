def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()
    
    idx1 = c.find('let spectrumActive = null;')
    if idx1 != -1:
        idx2 = c.find('let spectrumActive = null;', idx1 + 10)
        if idx2 != -1:
            end2 = c.find(';', idx2) + 1
            # Also remove the comment if it exists
            end_line = c.find('\n', end2)
            c = c[:idx2] + c[end_line+1:]
            print("Removed duplicated let spectrumActive")
    
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'w', encoding='utf-8') as f:
        f.write(c)

run()

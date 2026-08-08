def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        c = f.read()

    idx = c.find('class="pill-palette')
    if idx != -1:
        print(c[idx:idx+200])
        print('-'*40)
        idx2 = c.find('class="pill-palette', idx+1)
        if idx2 != -1:
            print(c[idx2:idx2+200])
            print('-'*40)
            idx3 = c.find('class="pill-palette', idx2+1)
            if idx3 != -1:
                print(c[idx3:idx3+200])

run()

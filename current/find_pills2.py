def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        if 'id="palette-' in line:
            for j in range(i, min(i+20, len(lines))):
                print(f'{j+1}: {lines[j].strip()}')
            print('---')
run()

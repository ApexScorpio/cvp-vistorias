with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\editor.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "block.type === 'title'" in line:
        for j in range(max(0, i-2), i+15):
            print(f'{j+1}: {lines[j].strip()[:100]}')
        break

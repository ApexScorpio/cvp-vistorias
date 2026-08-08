def run():
    with open(r'C:\Users\lopes\Desktop\CVP_Vistorias\public_html\inventario.js', 'r', encoding='utf-8') as f:
        c = f.read()
    lines = c.split('\n')
    for i, line in enumerate(lines):
        if 'addBlock' in line or 'Adicionar Bloco' in line or 'Inserir Bloco' in line or 'addInventoryBlock' in line:
            print(f"{i+1}: {line.strip()}")
run()

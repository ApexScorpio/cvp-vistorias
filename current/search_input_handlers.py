files = [
    r"C:\Users\lopes\Desktop\CVP_Vistorias\inventario.js",
    r"C:\Users\lopes\Desktop\CVP_Vistorias\editor.js"
]

for filepath in files:
    print(f"\n=== Searching {filepath} ===")
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for idx, line in enumerate(lines, 1):
        if "contenteditable" in line or "data-field" in line or ".innerText" in line or ".textContent" in line:
            print(f"Line {idx}: {line.strip()}")

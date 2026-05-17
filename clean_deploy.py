
import os
import shutil

files_to_move = [
    "index.html", "builder.html", "login.html", "responses.html", 
    "view.html", "preview.html", "style.css", "editor.css", 
    "editor.js", "script.js", "firebase-config.js", "favicon.ico",
    "import_tally.html"
]

target_dir = os.path.join(os.getcwd(), "public_html")
os.makedirs(target_dir, exist_ok=True)

for f in files_to_move:
    src = os.path.join(os.getcwd(), f)
    if os.path.exists(src):
        # Read content and strip any leading/trailing whitespace or strange characters
        with open(src, "rb") as file:
            content = file.read()
        
        # Clean potential BOM or backticks at the start
        # Many of these files start with <!DOCTYPE html> or a comment
        # We'll strip anything before the first '<' for HTML files
        if f.endswith(".html"):
            start_index = content.find(b'<')
            if start_index != -1:
                content = content[start_index:]
        
        # Save to new location
        dst = os.path.join(target_dir, f)
        with open(dst, "wb") as file:
            file.write(content)
        print(f"Cleaned and moved {f}")
    else:
        print(f"Warning: {f} not found at {src}")

# Copy other necessary assets (like favicons) if needed
# For now, this covers the core files.
print("Done.")

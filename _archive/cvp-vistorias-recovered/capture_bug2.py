from playwright.sync_api import sync_playwright
import time
import glob
import os

def capture_bug():
    # Clear old screenshots
    for f in glob.glob("bug_*.png"):
        os.remove(f)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()
        
        # Open local builder
        page.goto("http://localhost:3000/builder.html", wait_until="networkidle")
        time.sleep(1)
        
        # Inject standard form blocks with gap
        page.evaluate("""
            window.editorSchema = [
                {type: 'title', content: 'Teste de Layout'},
                {type: 'text-short', question: 'Nome'},
                {type: 'image', url: 'https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=600', width: 50, offsetX: 10, offsetY: 0, layoutMode: 'flow'},
                {type: 'text-short', question: 'Idade'},
                {type: 'text-long', question: 'Notas'}
            ];
            window.renderCanvas();
        """)
        time.sleep(1)
        
        # Screenshot 1: Default Flow
        page.screenshot(path="bug_1_flow_default.png")
        
        # Drag image down by 150px
        page.evaluate("""
            window.editorSchema[2].offsetY = 150;
            window.renderCanvas();
        """)
        time.sleep(1)
        
        # Screenshot 2: Dragged in Flow
        page.screenshot(path="bug_2_flow_dragged.png")
        
        # Change mode to front
        page.evaluate("""
            window.setImageLayout('front', 2);
        """)
        time.sleep(1)
        
        # Screenshot 3: Front dragged
        page.screenshot(path="bug_3_front_dragged.png")
        
        # Change mode to back
        page.evaluate("""
            window.setImageLayout('back', 2);
        """)
        time.sleep(1)
        
        # Screenshot 4: Back dragged
        page.screenshot(path="bug_4_back_dragged.png")
        
        browser.close()

if __name__ == "__main__":
    capture_bug()

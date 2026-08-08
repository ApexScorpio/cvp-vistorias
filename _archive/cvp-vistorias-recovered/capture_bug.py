from playwright.sync_api import sync_playwright
import time

def capture_bug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        # Open local builder
        page.goto("http://localhost:3000/builder.html", wait_until="networkidle")
        
        # Click the empty state to add first block
        page.click(".empty-state")
        time.sleep(0.5)
        
        # Open slash menu (somehow) or just execute JS to append image
        page.evaluate("appendNewBlock('image')")
        time.sleep(0.5)
        
        # We need an image URL to see it
        page.evaluate("""
            editorSchema[1].url = 'https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=400';
            renderCanvas();
        """)
        time.sleep(1)
        
        page.screenshot(path="bug_step_1_flow.png")
        
        # Change mode to front
        page.evaluate("setImageLayout('front', 1)")
        time.sleep(1)
        
        page.screenshot(path="bug_step_2_front.png")
        
        # Change mode to back
        page.evaluate("setImageLayout('back', 1)")
        time.sleep(1)
        
        page.screenshot(path="bug_step_3_back.png")
        
        browser.close()

if __name__ == "__main__":
    capture_bug()

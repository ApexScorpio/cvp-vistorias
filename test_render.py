from playwright.sync_api import sync_playwright
import time
import os

html_path = 'file:///' + os.path.abspath('index.html').replace('\\', '/')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 650, "height": 3000})
    page.goto(html_path)
    time.sleep(2)
    page.screenshot(path='local_render_test.png', full_page=True)
    browser.close()
    print("Screenshot saved to local_render_test.png")

from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 650, "height": 3000})
    page.goto('https://tally.so/r/eqBRoe')
    time.sleep(3) # Wait for render
    page.screenshot(path='tally_reference.png', full_page=True)
    browser.close()
    print("Screenshot saved to tally_reference.png")

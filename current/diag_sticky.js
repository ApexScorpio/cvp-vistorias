const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('http://localhost:8080/public_html/inventory_view.html?id=hBBuSjc5a47czrfLWveC');
    await page.waitForTimeout(3000);

    const checkSticky = async (scrollY) => {
        await page.evaluate((y) => window.scrollTo(0, y), scrollY);
        await page.waitForTimeout(300);
        return await page.evaluate(() => {
            const blocks = document.querySelectorAll('.block[style*="sticky"]');
            return Array.from(blocks).map((block, i) => {
                const rect = block.getBoundingClientRect();
                return {
                    title: block.textContent.trim().substring(0, 35),
                    top: Math.round(rect.top),
                    isStuck: rect.top <= 1
                };
            });
        });
    };

    console.log('=== SCROLL 800px ===');
    console.log(await checkSticky(800));
    
    console.log('=== SCROLL 1200px ===');
    console.log(await checkSticky(1200));
    
    console.log('=== SCROLL 1800px ===');
    console.log(await checkSticky(1800));
    
    console.log('=== SCROLL 2200px (bottom) ===');
    console.log(await checkSticky(2200));

    // Take final screenshot at bottom
    await page.screenshot({ path: 'sticky_final.png', fullPage: false });
    console.log('Screenshot saved: sticky_final.png');

    await browser.close();
})();

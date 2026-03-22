const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('http://localhost:8585/NewOrigami.Panels.html');
        await page.setViewport({width: 1200, height: 679});
        await new Promise(r => setTimeout(r, 2000));
        
        const rects = await page.evaluate(() => {
            const gc = document.getElementById('guides-container');
            const ic = document.getElementById('input-container');
            const cards = document.querySelectorAll('.card-column');
            return {
                gc: gc ? gc.getBoundingClientRect() : null,
                ic: ic ? ic.getBoundingClientRect() : null,
                pill: document.querySelector('.chat-pill') ? document.querySelector('.chat-pill').getBoundingClientRect() : null,
                firstCard: cards.length > 0 ? cards[0].getBoundingClientRect() : null,
                lastCard: cards.length > 0 ? cards[cards.length-1].getBoundingClientRect() : null,
                bottomPanel: document.getElementById('bottom-panel') ? document.getElementById('bottom-panel').getBoundingClientRect() : null,
                docWidth: document.body.clientWidth
            };
        });
        console.log(JSON.stringify(rects, null, 2));
        await browser.close();
    } catch (e) {
        console.log("No puppeteer found or error:", e.message);
    }
})();

const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQ FAIL:', request.url(), request.failure().errorText));
    await page.goto('file:///Users/mark/Documents/ORIGAMI/NEW.ORIGAMI/NewOrigami.5.html', { waitUntil: 'networkidle0' });
    await browser.close();
})();

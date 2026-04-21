const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: "new"});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    await page.goto('file:///Users/mark/Documents/ORIGAMI/NEW.ORIGAMI/NewOrigami.5.html', {waitUntil: 'networkidle0'});
    await browser.close();
})();

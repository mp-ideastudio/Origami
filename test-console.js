const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.on('console', msg => console.log('CONSOLE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto('http://127.0.0.1:63824/NewOrigami.8.html', {waitUntil: 'networkidle2'});
    await browser.close();
})();

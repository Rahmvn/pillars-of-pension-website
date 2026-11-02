/* Development-only browser checks; no test libraries are shipped to visitors.
 * Set PLAYWRIGHT_MODULE to an existing playwright or playwright-core installation.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
fs.mkdirSync('qa/screenshots', { recursive: true });
const assert = require('node:assert/strict');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:8080';
const widths = [320, 375, 390, 430, 768, 1440];
const heights = {
  home: [1238, 1269, 1300, 1320, 875, 818],
  book: [1175, 1088, 1032, 946, 886, 818],
  author: [1416, 1437, 1455, 1454, 1368, 818],
  launch: [977, 916, 919, 916, 835, 818],
};
const routes = { home: '/', book: '/book.html', author: '/author.html', launch: '/launch.html' };
const requested = process.argv.slice(2);
const pages = requested.length ? requested : Object.keys(routes);

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const results = [];
  try {
    for (const name of pages) {
      for (const [index, width] of widths.entries()) {
        const page = await browser.newPage({ viewport: { width, height: heights[name][index] }, deviceScaleFactor: 1 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
        await page.goto(baseURL + routes[name]);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          headingCount: document.querySelectorAll('h1').length,
          activeLinks: document.querySelectorAll('.primary-navigation [aria-current="page"]').length,
          images: [...document.images].map(img => ({ source: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 })),
          positions: Object.fromEntries([...document.querySelectorAll('.home-introduction,.book-display,.book-action,.home-description,.launch-announcement,.page-title,.reading-content,.portrait,.event-introduction,.event-date,.event-details')].map(el => {
            const r = el.getBoundingClientRect();
            return [el.className, { x: r.x, y: r.y, width: r.width, height: r.height }];
          })),
          resourceBytes: performance.getEntriesByType('resource').reduce((sum, r) => sum + r.transferSize, 0),
        }));
        assert.equal(metrics.scrollWidth, width, `${name} at ${width}: horizontal overflow`);
        assert.equal(metrics.headingCount, 1);
        assert.equal(metrics.activeLinks, 1);
        assert(metrics.images.every(img => img.loaded), 'Images must load');
        assert.deepEqual(errors, [], 'No browser or HTTP errors');
        await page.screenshot({ path: `qa/screenshots/${name}-${width}.png`, fullPage: true });

        if (width < 1100) {
          const toggle = page.locator('.menu-toggle');
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('main').evaluate(el => el.inert), true);
          assert.equal(await page.getByRole('dialog').count(), 1);
          await page.mouse.move(0, 0);
          if (width === 390 || width === 768) await page.screenshot({ path: `qa/screenshots/${name}-menu-${width}.png`, fullPage: true });
          await page.keyboard.press('Shift+Tab');
          assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'The launch');
          await page.keyboard.press('Tab');
          assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
          await toggle.click();
          await page.mouse.click(8, width >= 600 ? 450 : 500);
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
          await toggle.click();
          await page.locator('.primary-navigation [aria-current]').click();
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        }
        if (name === 'home') {
          const action = page.locator('.get-book');
          const before = await action.boundingBox();
          await action.click();
          assert.equal(await action.textContent(), 'Coming soon');
          assert.match(await page.locator('[role="status"]').textContent(), /coming soon/i);
          assert.deepEqual(await action.boundingBox(), before, 'Coming soon keeps the button geometry');
          if (width === 390) await page.screenshot({ path: 'qa/screenshots/home-coming-soon-390.png', fullPage: true });
        }
        results.push({ page: name, width, ...metrics, errors });
        console.log(`PASS ${name} ${width}px`);
        await page.close();
      }
    }
    fs.writeFileSync('qa/results.json', JSON.stringify(results, null, 2) + '\n');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

/* Paint-level focus checks and follow-up inspection of axe's inconclusive text contrast.
 * Requires an existing Playwright installation and Python Pillow for PNG sampling.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const base = process.env.QA_URL || 'http://127.0.0.1:8081';
fs.mkdirSync('qa/artifacts/focus', { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const samples = { focus: [], text: [] };
  try {
    for (const width of [390, 768, 1440]) {
      for (const route of ['/', '/book.html', '/author.html', '/launch.html']) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
        await page.goto(base + route);
        await page.evaluate(() => document.fonts.ready);
        await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
        await page.keyboard.press('Tab');
        const measure = async (selector, state) => {
          const element = page.locator(selector);
          await element.focus();
          assert(await element.evaluate(el => el.matches(':focus-visible')), `${selector}: keyboard focus must be visible`);
          const metrics = await element.evaluate(el => {
            const s = getComputedStyle(el), r = el.getBoundingClientRect();
            return { color: s.outlineColor, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset), shadow: s.boxShadow,
              rect: { x: r.x, y: r.y, right: r.right, height: r.height }, background: s.backgroundColor };
          });
          assert(metrics.width >= 2);
          const file = `qa/artifacts/focus/${width}-${route === '/' ? 'home' : route.slice(1, -5)}-${state}.png`;
          await page.screenshot({ path: file });
          const middleY = Math.floor(metrics.rect.y + metrics.rect.height / 2);
          samples.focus.push({ route, viewport: width, selector, state, file, ...metrics,
            stroke: [Math.floor(metrics.rect.right + metrics.offset + metrics.width / 2), middleY],
            adjacent: metrics.offset < 0 ? [[Math.floor(metrics.rect.right - 1), middleY], [Math.floor(metrics.rect.right - 6), middleY]] : [[Math.floor(metrics.rect.right + 2), middleY], [Math.floor(metrics.rect.right + metrics.offset + metrics.width + 1), middleY]] });
        };
        await measure('.skip-link', 'skip');
        if (route === '/') {
          await measure('.get-book', 'action-default');
          await page.locator('.get-book').hover();
          await page.waitForTimeout(160);
          await measure('.get-book', 'action-hover');
          await page.keyboard.down('Space');
          await measure('.get-book', 'action-pressed');
          await page.keyboard.up('Space');
          await page.mouse.move(0, 0);
        }
        if (width < 1100) {
          await measure('.menu-toggle', 'hamburger');
          await page.locator('.menu-toggle').click();
          await page.mouse.move(0, 0);
          await page.keyboard.press('Tab');
          await measure('.menu-toggle', 'close');
        }
        for (let index = 1; index <= 4; index++) await measure(`.primary-navigation a:nth-child(${index})`, `navigation-${index}`);
        await page.close();
      }
    }
    const scans = JSON.parse(fs.readFileSync('qa/accessibility-chromium.json'));
    for (const [index, scan] of scans.entries()) {
      const inconclusive = scan.incomplete.filter(rule => rule.id === 'color-contrast');
      if (!inconclusive.length) continue;
      const page = await browser.newPage({ viewport: { width: scan.width, height: 844 }, deviceScaleFactor: 1 });
      await page.goto(base + scan.route);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      if (scan.open) await page.locator('.menu-toggle').click();
      await page.mouse.move(0, 0);
      for (const rule of inconclusive) for (const node of rule.nodes) {
        const selector = node.target[0];
        const text = await page.locator(selector).evaluate(el => {
          const s = getComputedStyle(el), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rects = [];
          for (let n; (n = walker.nextNode());) {
            if (!n.textContent.trim()) continue;
            const range = document.createRange(); range.selectNodeContents(n);
            for (const r of range.getClientRects()) if (r.width && r.height) rects.push({ x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height });
          }
          const size = parseFloat(s.fontSize), weight = parseFloat(s.fontWeight);
          return { text: el.textContent.trim(), color: s.color, size, weight, threshold: size >= 24 || size >= 18.66 && weight >= 700 ? 3 : 4.5, rects };
        });
        samples.text.push({ route: scan.route, viewport: scan.width, open: scan.open, selector, reason: node.summary, file: `qa/artifacts/focus/background-${index}.png`, ...text });
      }
      await page.addStyleTag({ content: 'body * { color: transparent !important; text-shadow: none !important; transition: none !important; animation: none !important; }' });
      await page.screenshot({ path: `qa/artifacts/focus/background-${index}.png`, fullPage: true });
      await page.close();
    }
    fs.writeFileSync('qa/artifacts/contrast-samples.json', JSON.stringify(samples, null, 2));
    process.stdout.write(execFileSync(process.env.PYTHON || 'python', ['qa/measure-contrast.py'], { encoding: 'utf8' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

/* Extended development checks. Uses an existing Playwright install and optional axe-core. */
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
fs.mkdirSync('qa/screenshots', { recursive: true });
const assert = require('node:assert/strict');
const baseURL = process.env.QA_URL || 'http://127.0.0.1:8080';
const routes = ['/', '/book.html', '/author.html', '/launch.html'];
const intermediateWidths = [360, 480, 599, 600, 719, 720, 900, 1024, 1099, 1100, 1280, 1600, 1920];
const engine = process.env.QA_BROWSER || 'chromium';

(async () => {
  const browser = await playwright[engine].launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const results = { engine, browserVersion: browser.version(), layouts: [], accessibility: [], interactions: [], performance: [] };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    for (const route of routes) {
      for (const width of intermediateWidths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(baseURL + route);
        await page.evaluate(() => document.fonts.ready);
        const layout = await page.evaluate(() => {
          const box = selector => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          };
          const overflow = [...document.querySelectorAll('main p, main h1, main dt, main dd, main button, .event-month')].filter(el => {
            if (el.classList.contains('visually-hidden') || !el.getClientRects().length) return false;
            const r = el.getBoundingClientRect();
            return r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1;
          }).map(el => ({ class: el.className, text: el.textContent.trim() }));
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow,
            cover: box('.book-cover'), intro: box('.home-introduction'), action: box('.get-book'),
            reading: box('.author-main .reading-content'), portrait: box('.portrait'),
            event: box('.event-introduction'), date: box('.event-date') };
        });
        assert.equal(layout.scrollWidth, width, `${route} ${width}: document overflow`);
        assert.deepEqual(layout.overflow, [], `${route} ${width}: clipped content`);
        const overlaps = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        assert(!overlaps(layout.cover, layout.intro), 'Book must not cover introduction');
        assert(!overlaps(layout.cover, layout.action), 'Book must not cover action');
        if (width >= 1100) assert(!overlaps(layout.reading, layout.portrait), 'Portrait must not cover biography');
        assert(!overlaps(layout.event, layout.date), 'Date must not cover event introduction');
        if ([600, 1024, 1100].includes(width) && engine === 'chromium') {
          await page.screenshot({ path: `qa/screenshots/${route === '/' ? 'home' : route.slice(1, -5)}-${width}.png`, fullPage: true });
        }
        results.layouts.push({ route, width, passed: true });
      }
    }
    console.log(`PASS ${results.layouts.length} intermediate layouts (${engine})`);

    // Every source/destination pair at phone and desktop sizes, including current-page no-op.
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (let source = 0; source < routes.length; source++) {
        for (let destination = 0; destination < routes.length; destination++) {
          await page.goto(baseURL + routes[source]);
          if (width < 1100) await page.locator('.menu-toggle').click();
          const origin = await page.evaluate(() => performance.timeOrigin);
          await page.locator('.primary-navigation a').nth(destination).click();
          await page.waitForURL(baseURL + routes[destination]);
          assert.equal(await page.locator('.primary-navigation [aria-current]').getAttribute('href'), destination === 0 ? './' : routes[destination].slice(1));
          assert.equal(await page.locator('main').evaluate(el => el.inert), false);
          if (source === destination) assert.equal(await page.evaluate(() => performance.timeOrigin), origin, 'Active page should not reload');
          else assert.equal(await page.evaluate(() => scrollY), 0, 'New destination should start at top');
        }
      }
    }
    results.interactions.push('32 navigation pairs; active page does not reload');
    console.log('PASS all navigation pairs');

    // A fresh tab avoids browser-restored tab order from the preceding navigation matrix.
    const keyboardPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await keyboardPage.goto(baseURL + '/');
    await keyboardPage.keyboard.press('Tab');
    assert.equal(await keyboardPage.locator('.skip-link').evaluate(el => el === document.activeElement), true);
    await keyboardPage.keyboard.press('Enter');
    assert.equal(await keyboardPage.locator('main').evaluate(el => el === document.activeElement), true);
    await keyboardPage.keyboard.press('Tab');
    assert.equal(await keyboardPage.locator('.get-book').evaluate(el => el === document.activeElement), true);
    assert.notEqual(await keyboardPage.locator('.get-book').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    await keyboardPage.keyboard.press('Enter');
    assert.equal(await keyboardPage.locator('.get-book').textContent(), 'Coming soon');
    await keyboardPage.close();
    results.interactions.push('Keyboard skip link, visible focus, and Enter activation');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL + '/');
    await page.locator('.menu-toggle').click();
    await page.setViewportSize({ width: 1440, height: 844 });
    assert.equal(await page.locator('main').evaluate(el => el.inert), false);
    assert.equal(await page.locator('.primary-navigation [aria-current]').evaluate(el => el === document.activeElement), true);
    await page.setViewportSize({ width: 390, height: 320 });
    await page.locator('.menu-toggle').click();
    await page.keyboard.press('Shift+Tab');
    const last = await page.locator('.primary-navigation a').last().boundingBox();
    assert(last.y >= 0 && last.y + last.height <= 321, 'Short viewport must scroll focused menu destination into view');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.menu-toggle').evaluate(el => el === document.activeElement), true);
    results.interactions.push('Breakpoint focus handoff and short viewport menu scrolling');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL + '/book.html');
    await page.evaluate(() => scrollTo(0, 150));
    const previousScroll = await page.evaluate(() => scrollY);
    await page.locator('.menu-toggle').click();
    await page.locator('.primary-navigation a').nth(2).click();
    await page.waitForURL(baseURL + '/author.html');
    await page.goBack();
    assert.equal(new URL(page.url()).pathname, '/book.html');
    await page.goForward();
    assert.equal(new URL(page.url()).pathname, '/author.html');
    results.interactions.push(`Normal Back/Forward history (initial scroll ${previousScroll}px); no custom history routing`);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(baseURL + '/');
    assert.equal(await page.locator('.get-book').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await page.locator('.primary-navigation a').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    results.interactions.push('Reduced motion removes transitions');

    if (process.env.AXE_SCRIPT) {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        for (const route of routes) {
          await page.goto(baseURL + route);
          await page.evaluate(() => document.fonts.ready);
          await page.addScriptTag({ path: process.env.AXE_SCRIPT });
          for (const open of width === 390 ? [false, true] : [false]) {
            if (open) await page.locator('.menu-toggle').click();
            const scan = await page.evaluate(async () => {
              const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
              return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
            });
            results.accessibility.push({ route, width, open, ...scan });
          }
        }
      }
      fs.writeFileSync(`qa/accessibility-${engine}.json`, JSON.stringify(results.accessibility, null, 2) + '\n');
      const violations = results.accessibility.filter(r => r.violations.length);
      assert.deepEqual(violations, [], 'Accessibility violations (see qa/accessibility file)');
      console.log('PASS automated accessibility scans');
    }

    const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 700 } });
    await noJS.goto(baseURL + '/');
    assert.equal(await noJS.locator('.primary-navigation a').count(), 4);
    for (const link of await noJS.locator('.primary-navigation a').all()) assert(await link.isVisible());
    await noJS.locator('.primary-navigation a').nth(1).click();
    assert.equal(new URL(noJS.url()).pathname, '/book.html');
    await noJS.close();
    results.interactions.push('Navigation works without JavaScript');

    for (const route of routes) {
      const cold = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const requests = [];
      cold.on('request', request => requests.push(request.url()));
      await cold.goto(baseURL + route);
      await cold.evaluate(() => document.fonts.ready);
      await cold.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const metrics = await cold.evaluate(() => ({ transferBytes: performance.getEntriesByType('resource').reduce((sum, r) => sum + r.transferSize, 0), loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd, resources: performance.getEntriesByType('resource').length }));
      assert(requests.every(url => url.startsWith(baseURL)), 'No external runtime requests');
      results.performance.push({ route, ...metrics, externalRequests: 0 });
      await cold.close();
    }
    fs.writeFileSync(`qa/extended-results-${engine}.json`, JSON.stringify(results, null, 2) + '\n');
    console.log(`PASS extended checks (${engine})`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

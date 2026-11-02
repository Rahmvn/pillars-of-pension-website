/* Reproducible local network/CPU simulation, not Lighthouse or hosted field data. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.QA_URL || 'http://127.0.0.1:8081';
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const report = { browser: browser.version(), environment: 'Local dist/ preview; no Vercel/CDN measurement', viewport: { width: 390, height: 844 }, network: { downloadMbps: 1.6, uploadMbps: .75, latencyMs: 150 }, cpuSlowdown: 4, pages: [] };
  try {
    for (const route of ['/', '/book.html', '/author.html', '/launch.html']) {
      const context = await browser.newContext({ viewport: report.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.localMetrics = { lcp: 0, cls: 0, longTaskMs: 0 };
        new PerformanceObserver(list => { for (const e of list.getEntries()) localMetrics.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) localMetrics.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver(list => { for (const e of list.getEntries()) localMetrics.longTaskMs += e.duration; }).observe({ type: 'longtask', buffered: true });
      });
      const session = await context.newCDPSession(page);
      await session.send('Network.enable');
      await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const measurements = { route };
      for (const state of ['cold', 'warm']) {
        const external = [];
        const listener = request => { if (!request.url().startsWith(base)) external.push(request.url()); };
        page.on('request', listener);
        await page.goto(base + route, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({ ...localMetrics, loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd,
          resources: performance.getEntriesByType('resource').map(e => ({ file: new URL(e.name).pathname, transferBytes: e.transferSize, encodedBytes: e.encodedBodySize, durationMs: Math.round(e.duration), deliveryType: e.deliveryType || '' })) }));
        metrics.transferBytes = metrics.resources.reduce((sum, e) => sum + e.transferBytes, 0);
        assert.deepEqual(external, [], 'All requests must remain local');
        measurements[state] = metrics;
        page.off('request', listener);
      }
      assert(measurements.warm.transferBytes < measurements.cold.transferBytes, 'Warm revalidation should reuse resource bodies');
      report.pages.push(measurements);
      console.log(`${route}: cold LCP ${Math.round(measurements.cold.lcp)}ms; warm LCP ${Math.round(measurements.warm.lcp)}ms; CLS ${measurements.cold.cls.toFixed(4)}; transfer ${measurements.cold.transferBytes} / ${measurements.warm.transferBytes}`);
      await context.close();
    }
    fs.writeFileSync('qa/mobile-performance-results.json', JSON.stringify(report, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

/* Exact previous mobile conditions, with LCP attribution and request timing/priority. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.IMAGE_SITE || 'http://127.0.0.1:8082/sites/baseline';
const routes = (process.env.IMAGE_ROUTES || '/,/author.html,/book.html,/launch.html').split(',');
const repetitions = Number(process.env.IMAGE_RUNS || 1);
const output = process.env.IMAGE_REPORT || 'qa/image-baseline-waterfall.json';
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const report = { browser: browser.version(), site: base, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, network: { downloadMbps: 1.6, uploadMbps: .75, latencyMs: 150 }, cpuSlowdown: 4, repetitions, runs: [] };
  try {
    for (let run = 0; run < repetitions; run++) for (const route of routes) {
      const context = await browser.newContext({ viewport: report.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.imageMetrics = { lcp: 0, cls: 0, lcpEntries: [], layoutShifts: [], navigationReadyAt: null };
        new MutationObserver(events => { if (events.some(e => e.target === document.documentElement) && document.documentElement.classList.contains('js')) imageMetrics.navigationReadyAt = performance.now(); }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) {
          imageMetrics.lcp = entry.startTime;
          const el = entry.element;
          imageMetrics.lcpEntries.push({ at: entry.startTime, loadTime: entry.loadTime, renderTime: entry.renderTime, size: entry.size,
            tag: el?.tagName, class: el?.className, url: entry.url || el?.currentSrc || '', text: el?.tagName === 'IMG' ? '' : el?.textContent?.slice(0, 100) });
        } }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) {
          imageMetrics.cls += e.value;
          imageMetrics.layoutShifts.push({ at: e.startTime, value: e.value, sources: e.sources.map(s => ({ tag: s.node?.tagName, class: s.node?.className, previous: s.previousRect.toJSON(), current: s.currentRect.toJSON() })) });
        } }).observe({ type: 'layout-shift', buffered: true });
      });
      const session = await context.newCDPSession(page);
      await session.send('Network.enable');
      await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      for (const state of ['cold', 'warm']) {
        const requests = new Map();
        const requested = event => requests.set(event.requestId, { url: event.request.url, initialPriority: event.request.initialPriority, priorityChanges: [], type: event.type });
        const changed = event => requests.get(event.requestId)?.priorityChanges.push(event.newPriority);
        session.on('Network.requestWillBeSent', requested);
        session.on('Network.resourceChangedPriority', changed);
        await page.goto(base + route, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({ ...imageMetrics, loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd,
          resources: performance.getEntriesByType('resource').map(e => ({ url: e.name, startMs: e.startTime, requestMs: e.requestStart, responseStartMs: e.responseStart, endMs: e.responseEnd, transferBytes: e.transferSize, encodedBytes: e.encodedBodySize, initiator: e.initiatorType })),
          images: [...document.images].map(img => ({ class: img.className, currentSrc: img.currentSrc, source: img.getAttribute('src'), naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, priority: img.fetchPriority, loading: img.loading })) }));
        for (const resource of metrics.resources) Object.assign(resource, [...requests.values()].find(r => r.url === resource.url) || {});
        metrics.transferBytes = metrics.resources.reduce((sum, r) => sum + r.transferBytes, 0);
        assert(metrics.resources.every(r => new URL(r.url).origin === new URL(base).origin));
        report.runs.push({ run: run + 1, route, state, ...metrics });
        console.log(`${base.split('/').pop()} ${route} ${state}: LCP ${Math.round(metrics.lcp)}ms ${metrics.lcpEntries.at(-1)?.class || metrics.lcpEntries.at(-1)?.tag}; ${metrics.transferBytes} bytes`);
        session.off('Network.requestWillBeSent', requested); session.off('Network.resourceChangedPriority', changed);
      }
      await context.close();
    }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

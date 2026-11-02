/* Capture approved baseline/candidate pages with identical browser/viewport settings. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const base = process.env.IMAGE_SITE || 'http://127.0.0.1:8082/sites/baseline';
const label = process.env.IMAGE_LABEL || 'baseline';
const selectedWidths = (process.env.IMAGE_WIDTHS || '320,375,390,430,768,1440').split(',').map(Number);
const scales = (process.env.IMAGE_DPRS || '1').split(',').map(Number);
const pages = (process.env.IMAGE_PAGES || 'home,book,author,launch').split(',');
const widths = [320,375,390,430,768,1440];
const heights = { home:[1238,1269,1300,1320,875,818], book:[1175,1088,1032,946,886,818], author:[1416,1437,1455,1454,1368,818], launch:[977,916,919,916,835,818] };
const directory = `qa/artifacts/image-lab/screens/${label}`;
fs.mkdirSync(directory, { recursive:true });
(async () => {
  const browser = await chromium.launch({ headless:true, ...(process.env.BROWSER_PATH ? { executablePath:process.env.BROWSER_PATH } : {}) });
  const records = [];
  try {
    for (const dpr of scales) for (const width of selectedWidths) for (const name of pages) {
      const page = await browser.newPage({ viewport:{width,height:heights[name][widths.indexOf(width)] || 900}, deviceScaleFactor:dpr });
      await page.goto(base + (name === 'home' ? '/' : `/${name}.html`));
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      await page.mouse.move(0,0);
      const data = await page.evaluate(() => ({
        text:document.querySelector('main').innerText, title:document.title,
        metadata:[...document.querySelectorAll('meta')].map(el=>el.outerHTML),
        navigation:[...document.querySelectorAll('nav a')].map(el=>({label:el.textContent,href:el.getAttribute('href'),current:el.getAttribute('aria-current')})),
        geometry:[...document.querySelectorAll('main,main p,main h1,main figure,main dt,main dd,main button,.scene,.stone-scene,.book-cover,.portrait img,.site-header,.primary-navigation')].map(el=>{
          const r=el.getBoundingClientRect(), s=getComputedStyle(el);
          return {tag:el.tagName,class:el.className,x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontFamily,fontSize:s.fontSize,color:s.color,objectFit:s.objectFit,objectPosition:s.objectPosition,mask:s.maskImage};
        }),
        images:[...document.images].map(el=>({class:el.className,alt:el.alt,source:el.currentSrc,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,loading:el.loading,priority:el.fetchPriority}))
      }));
      const file=`${directory}/${name}-${width}-dpr${dpr}.png`;
      await page.screenshot({path:file,fullPage:true});
      records.push({name,width,dpr,file,...data});
      await page.close();
    }
    fs.writeFileSync(`${directory}/manifest.json`,JSON.stringify(records,null,2)+'\n');
    console.log(`Captured ${records.length} ${label} cases`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

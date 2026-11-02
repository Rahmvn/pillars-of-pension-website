const playwright=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=process.env.QA_BROWSER || 'chromium';
const base=process.env.QA_URL || 'http://127.0.0.1:8083';
(async()=>{
 const browser=await playwright[engine].launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 const results=[];
 try{
  for(const dpr of [1,2])for(const route of ['/','/book.html','/author.html','/launch.html']){
   const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:dpr});
   await page.goto(base+route);
   for(const width of [320,375,390,430,768,1099,1100,1440]){
    await page.setViewportSize({width,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    const images=await page.locator('img').evaluateAll(images=>images.map(img=>({class:img.className,source:img.currentSrc,visible:img.checkVisibility(),loading:img.loading,priority:img.fetchPriority,loaded:img.complete&&img.naturalWidth>0})));
    for(const image of images){
     assert(image.loaded,'Every selected resource must decode');
     if(image.source.startsWith('data:'))assert(!image.visible,'Placeholder sources must be CSS-hidden');
     if(image.visible)assert.notEqual(image.loading,'lazy','Above-the-fold approved imagery must not be lazy-loaded');
    }
    if(route==='/'){
     const lcp=images.find(i=>i.visible&&i.class===(width<1100?'stone-scene':'scene'));
     assert(lcp&&lcp.source.endsWith('/delivery/interior-1536.avif'));
     assert.equal(lcp.priority,'high');
    }
    if(route==='/author.html'){
     const portrait=images.find(i=>i.source.endsWith('/delivery/author-1153.avif'));
     assert(portrait&&portrait.visible);assert.equal(portrait.priority,'high');
    }
    results.push({route,width,dpr,images});
   }
   await page.close();
  }
  fs.writeFileSync(`qa/image-selection-${engine}.json`,JSON.stringify(results,null,2)+'\n');
  console.log(`PASS ${results.length} ${engine} responsive source/resize cases; visible images never use hidden placeholders or lazy loading`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

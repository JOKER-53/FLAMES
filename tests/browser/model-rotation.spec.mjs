import{test,expect}from'@playwright/test';
const firefox=process.env.PLAYWRIGHT_BROWSER==='firefox';
test.use({launchOptions:firefox?{}:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
for(const vendor of ['fortigate','paloalto'])test(`${vendor} pauses on click and resumes rotation ten seconds after the latest interaction`,async({page})=>{
 test.skip(firefox,'Software WebGL render evidence uses Chromium.');test.setTimeout(60000);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{window.__draws=0;for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){const type=window[name];if(!type)continue;const original=type.prototype.drawElements;type.prototype.drawElements=function(...args){window.__draws++;return original.apply(this,args);};}});
 await page.goto(`/${vendor}/hardware`);await expect(page.getByRole('progressbar',{name:'3D model download',exact:true})).toHaveCount(0,{timeout:30000});const canvas=page.locator('canvas');await expect(canvas).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.__draws)).toBeGreaterThan(0);await canvas.click({position:{x:20,y:20}});await page.waitForTimeout(3000);const paused=await page.evaluate(()=>window.__draws);await page.waitForTimeout(500);expect(await page.evaluate(()=>window.__draws)).toBe(paused);
 // A second click restarts the full idle interval.
 await canvas.click({position:{x:20,y:20}});await page.waitForTimeout(3000);const again=await page.evaluate(()=>window.__draws);await page.waitForTimeout(500);expect(await page.evaluate(()=>window.__draws)).toBe(again);await expect.poll(()=>page.evaluate(()=>window.__draws),{timeout:10000}).toBeGreaterThan(again);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(3000);const reduced=await page.evaluate(()=>window.__draws);await page.waitForTimeout(500);expect(await page.evaluate(()=>window.__draws)).toBe(reduced);
});

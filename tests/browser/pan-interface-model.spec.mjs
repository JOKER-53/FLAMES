import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const firefox=process.env.PLAYWRIGHT_BROWSER==='firefox';
test.use({launchOptions:firefox?{}:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});

test('PA-220 interface model renders, edits the selected port and shares cached transport with hardware',async({page})=>{
 test.skip(firefox,'Software WebGL rendering runs in Chromium; Firefox tests the editable fallback.');test.setTimeout(60000);
 let downloads=0;await page.route('**/pa-220-firewall.glb?*',async route=>{downloads++;await route.continue();});
 await page.addInitScript(()=>{window.__interfaceDraws=0;for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){const type=window[name];if(!type)continue;for(const method of ['drawElements','drawArrays']){const original=type.prototype[method];type.prototype[method]=function(...args){window.__interfaceDraws++;return original.apply(this,args);};}}});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/paloalto/interfaces?task=pan-iface-01');
 const viewer=page.getByRole('region',{name:'Interactive PA-220 interface model',exact:true});
 await expect(viewer.locator('canvas')).toBeVisible();await expect(viewer.getByRole('progressbar')).toHaveCount(0,{timeout:30000});await expect(viewer.getByRole('alert')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>window.__interfaceDraws)).toBeGreaterThan(0);
 const bounds=await viewer.locator('canvas').boundingBox();await viewer.locator('canvas').click({position:{x:bounds.width*0.292,y:bounds.height*0.665}});
 await expect(page.getByLabel('ethernet1/1 type',{exact:true})).toBeVisible();await page.getByLabel('ethernet1/1 zone',{exact:true}).selectOption('Untrust');await page.getByLabel('ethernet1/1 IP address',{exact:true}).fill('203.0.113.1/30');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(viewer.getByRole('status')).toContainText('ethernet1/1 · layer3 · Untrust · 203.0.113.1/30');
 await expect(page.getByRole('region',{name:'Network topology',exact:true})).toContainText('203.0.113.1/30');
 await page.screenshot({path:'/tmp/flames-pan-interface-3d.png',fullPage:true});
 await expect(page.getByText('Saved on this device',{exact:false}).first()).toBeVisible();
 await page.reload();await viewer.getByRole('button',{name:'Configure ethernet1/1',exact:true}).click();await expect(page.getByLabel('ethernet1/1 IP address',{exact:true})).toHaveValue('203.0.113.1/30');
 await expect(viewer.getByRole('progressbar',{name:'3D model download',exact:true})).toHaveCount(0,{timeout:30000});const afterReload=downloads;await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/flames-pan-interface-3d-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:720});await page.getByRole('link',{name:'Hardware & cabling',exact:true}).click();await expect(page.getByRole('progressbar',{name:'3D model download',exact:true})).toHaveCount(0,{timeout:30000});expect(downloads).toBe(afterReload);
});

test('PA-220 interface task remains editable and accessible when WebGL is unavailable',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(String(type).includes('webgl'))return null;return original.call(this,type,...args);};});
 await page.goto('/paloalto/interfaces?task=pan-iface-01');const viewer=page.getByRole('region',{name:'Interactive PA-220 interface model',exact:true});await expect(viewer.getByRole('alert')).toContainText('3D rendering is unavailable');
 await viewer.getByRole('button',{name:'Configure management',exact:true}).click();await page.getByLabel('management IP address',{exact:true}).fill('192.168.1.1/24');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(viewer.getByRole('status')).toContainText('management · management · No zone · 192.168.1.1/24');
 for(const theme of ['light','dark']){if(theme==='dark')await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(report.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);}
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await viewer.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);}
});

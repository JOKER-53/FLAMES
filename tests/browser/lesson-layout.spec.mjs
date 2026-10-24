import {test,expect} from '@playwright/test';

test('lesson introduction keeps a readable brief and wraps metadata across themes and sizes',async({page})=>{
 for(const [vendor,route] of [['fortigate','/fortigate/policy/firewall-policy?scenario=web-server-access-01'],['paloalto','/paloalto/security?task=pan-sec-01']]){
  await page.goto(route);
  const header=page.locator('header[aria-label="Lesson introduction"]');
  await expect(header.getByRole('heading',{level:1})).toBeVisible();
  for(const dark of [false,true]){
   if(dark)await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
   for(const width of [1920,1440,1366,390]){
    await page.setViewportSize({width,height:1000});
    const scenario=page.getByRole('region',{name:'Scenario',exact:true});
    const fits=await header.evaluate(node=>{const bounds=node.getBoundingClientRect();return node.scrollWidth<=node.clientWidth+1&&bounds.left>=0&&bounds.right<=innerWidth+1;});
    expect(fits).toBe(true);await expect(scenario).toBeVisible();if(width===1920){const main=page.getByRole('main');const bounds=await main.boundingBox();const content=await main.locator(':scope > div').boundingBox();expect(content.width).toBeGreaterThan(bounds.width-60);}
    await page.screenshot({path:test.info().outputPath(`${vendor}-${dark?'dark':'light'}-${width}.png`)});
   }
   if(dark)await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
  }
  if(vendor==='paloalto'){await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Show a hint',exact:true}).click();await expect(page.getByRole('button',{name:'Hide hint',exact:true})).toBeVisible();}
 }
});

test('course and module pages use the available width with spacious lesson rows',async({page})=>{
 for(const [base,module,title] of [['/fortigate','policy','Firewall Policy'],['/paloalto','security','Security Policy']]){
  for(const route of [base,`${base}/modules/${module}`]){
   await page.setViewportSize({width:1920,height:1080});await page.goto(route);
   const main=page.getByRole('main');const bounds=await main.boundingBox();const content=await main.locator(':scope > div').boundingBox();
   expect(content.width).toBeGreaterThan(bounds.width-60);
   if(route.includes('/modules/')){
    await expect(page.getByRole('heading',{level:1})).toHaveText(title);
    const rows=page.getByRole('list',{name:'Module lessons',exact:true}).locator(':scope > li');await expect(rows.first()).toBeVisible();
    await page.screenshot({path:test.info().outputPath(`${module}-desktop.png`)});
    await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await page.screenshot({path:test.info().outputPath(`${module}-dark.png`)});await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
   }
   await page.setViewportSize({width:390,height:844});
   expect(await main.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  }
 }
});

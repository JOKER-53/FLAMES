import {test,expect} from '@playwright/test';

test('lesson introduction keeps a readable brief and wraps metadata across themes and sizes',async({page})=>{
 for(const [vendor,route] of [['fortigate','/fortigate/policy/firewall-policy?scenario=web-server-access-01'],['paloalto','/paloalto/security?task=pan-sec-01']]){
  await page.goto(route);
  const header=page.locator('header[aria-label="Lesson introduction"]');
  await expect(header.getByRole('heading',{level:1})).toBeVisible();
  for(const dark of [false,true]){
   if(dark)await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    const scenario=page.getByRole('region',{name:'Scenario',exact:true});
    const fits=await header.evaluate(node=>{const bounds=node.getBoundingClientRect();return node.scrollWidth<=node.clientWidth+1&&bounds.left>=0&&bounds.right<=innerWidth+1;});
    expect(fits).toBe(true);await expect(scenario).toBeVisible();
    await page.screenshot({path:test.info().outputPath(`${vendor}-${dark?'dark':'light'}-${width}.png`)});
   }
   if(dark)await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
  }
  if(vendor==='paloalto'){await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Show a hint',exact:true}).click();await expect(page.getByRole('button',{name:'Hide hint',exact:true})).toBeVisible();}
 }
});

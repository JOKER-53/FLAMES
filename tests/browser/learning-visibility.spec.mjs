import {test,expect} from '@playwright/test';
test('administrator opens and hides both student guides while retaining preview access',async({page,browser})=>{
 await page.goto('/account');await page.getByLabel('Email',{exact:true}).fill('teacher@example.invalid');await page.getByLabel('Password',{exact:true}).fill('BrowserFixture42!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/');await page.goto('/admin');
 const panel=page.getByRole('region',{name:'Learning guide visibility',exact:true});await expect(panel.getByRole('button',{name:'Hide learning guide',exact:true})).toBeVisible();
 const context=await browser.newContext();const student=await context.newPage();
 try{
  await panel.getByRole('button',{name:'Hide learning guide',exact:true}).click();await expect(panel.getByText('Learning guide is now hidden from students.',{exact:true})).toBeVisible();await page.reload();await expect(panel.getByRole('button',{name:'Show learning guide',exact:true})).toBeVisible();
  for(const vendor of ['fortigate','paloalto']){
   await student.goto(`/${vendor}/learn`);await expect(student.getByRole('heading',{name:'Learning guide unavailable',exact:true})).toBeVisible();await expect(student.getByRole('link',{name:'Learning guide',exact:true})).toHaveCount(0);
   await student.goto(vendor==='fortigate'?'/fortigate/policy/firewall-policy?scenario=web-server-access-01':'/paloalto/security?task=pan-sec-01');await expect(student.getByRole('heading',{level:1})).toBeVisible();await expect(student.getByRole('link',{name:'Study this task',exact:true})).toHaveCount(0);
  }
  await panel.getByRole('link',{name:'Preview FortiGate guide',exact:true}).click();await expect(page.getByRole('heading',{name:'Learning guide',exact:true})).toBeVisible();
  await page.goto('/admin');await panel.getByRole('button',{name:'Show learning guide',exact:true}).click();await expect(panel.getByText('Learning guide is now visible to students.',{exact:true})).toBeVisible();
  for(const vendor of ['fortigate','paloalto']){await student.goto(`/${vendor}/learn`);await expect(student.getByRole('heading',{name:'Learning guide',exact:true})).toBeVisible();await expect(student.getByRole('link',{name:'Learning guide',exact:true})).toBeVisible();}
  await panel.getByRole('button',{name:'Hide learning guide',exact:true}).click();await expect(panel.getByRole('button',{name:'Show learning guide',exact:true})).toBeVisible();await student.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(student.getByRole('heading',{name:'Learning guide unavailable',exact:true})).toBeVisible();
 }finally{await page.request.put('/api/admin/learning-settings',{data:{learningGuideVisible:true}});await context.close();}
});

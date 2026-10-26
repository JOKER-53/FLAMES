import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const vendor of ['fortigate', 'paloalto']) {
 test(`${vendor} study guide links tasks and fits normal zoom on mobile and desktop`, async ({ page }) => {
  await page.goto(`/${vendor}/learn`);
  await expect(page.getByRole('heading', {name:'Learning guide',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Learning chapters'}).getByRole('link')).toHaveCount(10);
  await page.getByLabel('Find a task to study').fill(vendor==='fortigate'?'Approved DNS':'DNS-Only');
  const paths=page.getByRole('navigation',{name:'Task study paths'});
  await expect(paths.getByRole('link')).toHaveCount(1);
  await paths.getByRole('link').click();
  await page.screenshot({path:`/tmp/flames-${vendor}-learning-desktop.png`,fullPage:true});
  const plan=page.getByRole('region',{name:'Selected task study plan'});
  await expect(plan).toBeVisible();
  for (const width of [1440,1024,390]) {
   await page.setViewportSize({width,height:1000});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.screenshot({path:`/tmp/flames-${vendor}-learning-mobile.png`,fullPage:true});
  await plan.getByRole('link',{name:'Open practice task'}).click();
  await expect(page.getByRole('region',{name:'Network topology',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Study this task',exact:true}).click();
  await expect(plan).toBeVisible();
 });
}
for (const theme of ['light','dark']) test(`learning diagrams and search are accessible in ${theme}`,async({page})=>{
 await page.goto('/');await page.evaluate(value=>localStorage.setItem('fortisim-theme',value),theme);
 for (const vendor of ['fortigate','paloalto']) {
  await page.goto(`/${vendor}/learn?chapter=${vendor==='fortigate'?'policy':'pan-security'}`);
  await expect(page.getByText('Do all required fields match?',{exact:true})).toBeVisible();
  const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(report.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
  await page.getByLabel('Find a task to study').fill('not-a-real-task');
  await expect(page.getByText('No matching tasks. Try a topic or clear the search.')).toBeVisible();
 }
});

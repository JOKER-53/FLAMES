import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const theme of ['light','dark'])test(`WCAG accessibility checks for representative student and instructor pages (${theme})`,async({page})=>{
 test.setTimeout(120000);
 await page.goto('/');await page.evaluate(value=>localStorage.setItem('fortisim-theme',value),theme);
 for(const route of ['/','/account','/fortigate','/fortigate/modules/policy','/fortigate/policy/firewall-policy?scenario=web-server-access-01','/paloalto/security?task=pan-sec-01','/paloalto/zones?task=pan-zone-01','/paloalto/nat?task=pan-nat-01','/fortigate/network/interfaces?scenario=interface-ip-01','/fortigate/network/routing','/paloalto/interfaces','/paloalto/port?task=pan-port-01','/fortigate/policy/addresses','/fortigate/policy/services','/paloalto/appid']){
  await page.goto(route);await page.getByRole('main').waitFor();
  if(route.includes('firewall-policy'))await page.getByRole('button',{name:'Create New',exact:true}).click();
  if(route.startsWith('/paloalto/security'))await page.getByRole('button',{name:'Add rule',exact:true}).first().click();
  if(route.startsWith('/paloalto/zones'))await page.getByRole('button',{name:'Add zone',exact:true}).first().click();
  if(route.startsWith('/paloalto/nat'))await page.getByRole('button',{name:'Add rule',exact:true}).first().click();
  const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect.soft(report.violations.map(item=>({id:item.id,help:item.help,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),route).toEqual([]);
 }
 await page.goto('/account');await page.getByLabel('Email',{exact:true}).fill('teacher@example.invalid');await page.getByLabel('Password',{exact:true}).fill('BrowserFixture42!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/');
 for(const route of ['/admin','/classroom']){await page.goto(route);await page.getByRole('heading',{level:1}).waitFor();if(route==='/admin'){await page.getByRole('button',{name:'New module',exact:true}).click();await page.getByLabel('Module title',{exact:true}).fill('Accessibility draft');await page.getByRole('button',{name:'Create draft',exact:true}).click();await page.getByRole('button',{name:'Add lesson',exact:true}).click();await page.getByRole('button',{name:'Add multiple choice',exact:true}).click();await page.getByRole('button',{name:'Revision history',exact:true}).click();await page.getByLabel('Compare saved revision',{exact:true}).selectOption('1');await page.getByText(/changed fields compared with revision/).waitFor();}const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect.soft(report.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),route).toEqual([]);}
});

test('keyboard skip link and mobile navigation keep focus predictable',async({page})=>{
 await page.goto('/fortigate');await page.getByRole('main').waitFor();await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('main')).toBeFocused();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open navigation',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Course navigation',exact:true});await expect(dialog).toBeVisible();expect(await page.locator('[data-course-content]').evaluate(node=>node.hasAttribute('inert'))).toBe(true);
 const links=dialog.locator('a[href],button:not([disabled])');await links.last().focus();await page.keyboard.press('Tab');await expect(links.first()).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();expect(await page.locator('[data-course-content]').evaluate(node=>node.hasAttribute('inert'))).toBe(false);
});

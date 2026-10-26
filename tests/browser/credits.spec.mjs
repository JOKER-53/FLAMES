import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('credits navigation shows supplied contributor and organization profiles in both themes', async ({ page }) => {
 await page.goto('/');
 await page.getByRole('banner').getByRole('link',{name:'Credits',exact:true}).click();
 await expect(page).toHaveURL(/\/credits$/);
 await expect(page.getByRole('heading',{name:'The people behind FLAMES',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'KADHIRAVAN EG',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Harish Kumar',exact:true})).toBeVisible();
 await page.setViewportSize({width:1600,height:1000});
 const photo=page.getByRole('img',{name:/Four BeyondBug team members/});await expect(photo).toBeVisible();await expect(photo).toHaveJSProperty('naturalWidth',1280);
 await page.screenshot({path:'/tmp/flames-credits-desktop.png',fullPage:true});
 const links=[['KADHIRAVAN EG on GitHub','https://github.com/JOKER-53'],['KADHIRAVAN EG on LinkedIn','https://www.linkedin.com/in/kadhiravan-e-g/'],['Harish Kumar on GitHub','https://github.com/Harishkumar-47'],['Harish Kumar on LinkedIn','https://www.linkedin.com/in/harish-kumar-vs/'],['BeyondBug repositories on GitHub','https://github.com/orgs/BeyondBug/repositories'],['BeyondBug on LinkedIn','https://www.linkedin.com/company/beyoundbug/?viewAsMember=true']];
 for(const [name,url]of links){const link=page.getByRole('link',{name:name+' (opens in a new tab)',exact:true});await expect(link).toHaveAttribute('href',url);await expect(link).toHaveAttribute('rel','noopener noreferrer');}
 for(const theme of ['light','dark']){
  await page.evaluate(value=>localStorage.setItem('fortisim-theme',value),theme);await page.reload();await expect(page.getByRole('heading',{level:1})).toBeVisible();
  for(const width of [1920,1280,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  await page.screenshot({path:`/tmp/flames-credits-${theme}-mobile.png`,fullPage:true});
  const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(report.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
 }
 for(const vendor of ['fortigate','paloalto']){await page.setViewportSize({width:1280,height:900});await page.goto('/'+vendor);await page.getByRole('banner').getByRole('link',{name:'Credits',exact:true}).click();await expect(page).toHaveURL(/\/credits$/);}
});

test('header Credits stays visible for guests and instructors at mobile widths',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const route of ['/','/fortigate','/paloalto']){await page.goto(route);await expect(page.getByRole('banner').getByRole('link',{name:'Credits',exact:true})).toBeVisible();expect(await page.getByRole('banner').evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);}
 await page.goto('/account');await page.getByLabel('Email',{exact:true}).fill('teacher@example.invalid');await page.getByLabel('Password',{exact:true}).fill('BrowserFixture42!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/');
 for(const route of ['/admin','/fortigate','/paloalto']){await page.goto(route);await expect(page.getByRole('banner').getByRole('link',{name:'Credits',exact:true})).toBeVisible();expect(await page.getByRole('banner').evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);}
});

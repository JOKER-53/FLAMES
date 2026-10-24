import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const password='BrowserStudent42!';
test('author publishes; student registers, grades tasks and resumes isolated progress',async({page,browser})=>{
 await page.goto('/account');await page.getByLabel('Email',{exact:true}).fill('teacher@example.invalid');await page.getByLabel('Password',{exact:true}).fill('BrowserFixture42!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/');
 await page.goto('/admin');await page.getByRole('button',{name:'New module',exact:true}).click();await page.getByLabel('Module title',{exact:true}).fill('CI authored module');await page.getByRole('button',{name:'Create draft',exact:true}).click();await expect(page.getByText('Module created as a private draft.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add lesson',exact:true}).click();await page.getByLabel('Lesson title',{exact:true}).fill('CI reading');await page.getByLabel('Instructions',{exact:true}).fill('Read this and understand ordered policy matching.');await page.getByRole('button',{name:'Publish module',exact:true}).click();await expect(page.getByText('Module published. Students can now open its lessons.',{exact:true})).toBeVisible();
 const catalog=await(await page.request.get('/api/content/catalog')).json();const lesson=catalog.modules.find(module=>module.title==='CI authored module').lessons[0];
 const student=await browser.newContext({baseURL:'http://127.0.0.1:4173'});const s=await student.newPage();const email=`student-${randomUUID()}@example.invalid`;
 await s.goto('/account');await s.getByRole('button',{name:'New student? Create an account',exact:true}).click();await s.getByLabel('Name',{exact:true}).fill('CI Student');await s.getByLabel('Email',{exact:true}).fill(email);await s.getByLabel('Password',{exact:true}).fill(password);await s.getByRole('button',{name:'Create account',exact:true}).click();await s.waitForURL('**/');
 await s.goto(`/fortigate/lessons/${lesson.id}`);await s.getByRole('button',{name:'Mark as read',exact:true}).click();await expect(s.getByText('Lesson complete.',{exact:true})).toBeVisible();
 await expect.poll(async()=> (await(await s.request.get('/api/account/progress/fortigate')).json()).completed).toContain(lesson.id);
 const second=await browser.newContext({baseURL:'http://127.0.0.1:4173'});await second.request.post('http://127.0.0.1:4173/api/account/login',{data:{email,password}});const p=await second.newPage();await p.goto('/fortigate');await expect(p.getByText('CI authored module',{exact:true}).first()).toBeVisible();expect((await(await second.request.get('http://127.0.0.1:4173/api/account/progress/fortigate')).json()).completed).toContain(lesson.id);
 const outsider=await browser.newContext({baseURL:'http://127.0.0.1:4173'});expect((await outsider.request.get('http://127.0.0.1:4173/api/admin/modules')).status()).toBe(401);await outsider.close();await second.close();await student.close();
});
test('theme persists and network dialog supports reduced motion, focus and narrow viewports',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/fortigate/policy/firewall-policy?scenario=web-server-access-01');await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 const opener=page.getByRole('button',{name:'Network view',exact:true});await opener.click();const dialog=page.getByRole('dialog',{name:'Network view',exact:true});await expect(dialog.getByText(/Replay complete/)).toBeVisible();await expect(dialog.getByText('60F · Simulated',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.getByRole('button',{name:'Close network view',exact:true}).focus();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Replay packets',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();
});
test('guest autosave survives reload without transferring work into a new student account',async({page})=>{
 await page.goto('/fortigate/network/routing');await expect(page.getByText('Ready · changes save automatically',{exact:true})).toBeVisible();await page.getByPlaceholder('0.0.0.0/0',{exact:true}).fill('0.0.0.0/0');await page.getByPlaceholder('192.168.1.254',{exact:true}).fill('192.168.1.254');await page.getByRole('button',{name:'Add route',exact:true}).click();await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Delete route 0.0.0.0/0',exact:true})).toBeVisible();
 await page.request.post('/api/account/register',{data:{email:`new-${randomUUID()}@example.invalid`,name:'Fresh student',password}});await page.reload();await expect(page.getByRole('button',{name:'Delete route 0.0.0.0/0',exact:true})).toHaveCount(0);await expect(page.getByText('No static routes yet. Add one below.',{exact:true})).toBeVisible();
});

test('late initial catalog cannot overwrite a newer publication refresh',async({page})=>{
 await page.request.post('/api/account/login',{data:{email:'teacher@example.invalid',password:'BrowserFixture42!'}});
 let first=true,release;let observed;
 const pending=new Promise(resolve=>{observed=resolve;});
 await page.route('**/api/content/catalog',async route=>{
  const response=await route.fetch();const data=await response.json();
  if(first){first=false;observed();await new Promise(resolve=>{release=resolve;});}
  await route.fulfill({response,json:data});
 });
 await page.goto('/admin',{waitUntil:'domcontentloaded'});await pending;
 try{
  await page.getByRole('button',{name:'New module',exact:true}).click();await page.getByLabel('Module title',{exact:true}).fill('Newest catalog module');await page.getByRole('button',{name:'Create draft',exact:true}).click();await expect(page.getByText('Module created as a private draft.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add lesson',exact:true}).click();await page.getByLabel('Lesson title',{exact:true}).fill('New publication');await page.getByLabel('Instructions',{exact:true}).fill('This publication must survive a late response.');await page.getByRole('button',{name:'Publish module',exact:true}).click();await expect(page.getByText('Module published. Students can now open its lessons.',{exact:true})).toBeVisible();
  release();await expect.poll(()=>page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/api/content/catalog')).length)).toBeGreaterThanOrEqual(2);
  await page.getByRole('link',{name:'FLAMES home',exact:true}).click();await page.locator('a[href="/fortigate"]').first().click();await expect(page.getByRole('heading',{name:'Newest catalog module',exact:true})).toBeVisible();
 }finally{release?.();}
});

test('failed completion sync is reported without claiming the server saved progress',async({page})=>{
 await page.request.post('/api/account/register',{data:{email:`outage-${randomUUID()}@example.invalid`,name:'Outage student',password}});
 await page.route('**/api/account/progress/fortigate',route=>{
  if(route.request().method()==='POST'&&route.request().postDataJSON()?.completed?.length)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary progress outage"}'});
  return route.continue();
 });
 await page.goto('/fortigate/network/routing');await expect(page.getByText('Ready · changes save automatically',{exact:true})).toBeVisible();await page.getByPlaceholder('0.0.0.0/0',{exact:true}).fill('0.0.0.0/0');await page.getByPlaceholder('192.168.1.254',{exact:true}).fill('192.168.1.254');await page.getByRole('button',{name:'Add route',exact:true}).click();await page.getByRole('button',{name:'Check my work',exact:true}).click();await expect(page.getByText(/Progress saving failed: Temporary progress outage/)).toBeVisible();await expect(page.getByText(/your progress has been saved/)).toHaveCount(0);
});

test('teachers publish five configuration families and students solve/resume them through forms',async({page,browser})=>{
 test.setTimeout(90000);
 await page.request.post('/api/account/login',{data:{email:'teacher@example.invalid',password:'BrowserFixture42!'}});
 const context=await browser.newContext({baseURL:'http://127.0.0.1:4173'});await context.request.post('/api/account/register',{data:{email:`builder-${randomUUID()}@example.invalid`,name:'Configuration student',password}});const student=await context.newPage();
 const definitions=[
  {family:'interfaces',vendor:'fortigate',values:{'IPv4 address':'192.0.2.2','Mask / prefix':'24','Administrative access':'PING'},wrong:['IPv4 address','192.0.2.99']},
  {family:'routing',vendor:'fortigate',values:{'Destination CIDR':'192.168.10.0/24','Gateway':'10.0.0.1','Outgoing interface':'port1'},wrong:['Gateway','10.0.0.99']},
  {family:'pan-security',vendor:'paloalto',values:{'Applications':'web-browsing'},wrong:['Applications','any']},
  {family:'pan-nat',vendor:'paloalto',values:{'Source zone':'Untrust','Original destination':'203.0.113.10','Translated address':'10.0.1.10'},select:{'Translation type':'destination'},wrong:['Original destination','any']},
  {family:'pan-zones',vendor:'paloalto',values:{'Zone name':'Trust','Interfaces':'ethernet1/2'},wrong:['Interfaces','ethernet1/3']},
 ];
 try{for(const item of definitions){
  await page.goto('/admin');await page.getByRole('button',{name:'New module',exact:true}).click();await page.getByLabel('Course',{exact:true}).selectOption(item.vendor);await page.getByLabel('Module title',{exact:true}).fill(`Builder ${item.family}`);await page.getByRole('button',{name:'Create draft',exact:true}).click();await expect(page.getByText('Module created as a private draft.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Add lesson',exact:true}).click();await page.getByLabel('Lesson type',{exact:true}).selectOption(item.family);await page.getByLabel('Lesson title',{exact:true}).fill(`Exercise ${item.family}`);await page.getByLabel('Instructions',{exact:true}).fill('Use the supplied addressing and traffic plan. Configure the required settings and keep other traffic restricted.');
  await page.getByRole('button',{name:'Test reference configuration',exact:true}).click();await expect(page.getByText('Reference configuration passes all checks.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Publish module',exact:true}).click();await expect(page.getByText('Module published. Students can now open its lessons.',{exact:true})).toBeVisible();
  const catalog=await(await page.request.get('/api/content/catalog')).json();const lesson=catalog.modules.find(module=>module.title===`Builder ${item.family}`).lessons[0];
  await student.goto(`/${item.vendor}/lessons/${lesson.id}`);await expect(student.getByText('Ready · changes save automatically',{exact:true})).toBeVisible();if(item.family!=='interfaces')await student.getByRole('button',{name:'Add row',exact:true}).click();
  for(const[field,value]of Object.entries(item.values))await student.getByLabel(`Configuration row 1 ${field}`,{exact:true}).fill(value);
  for(const[field,value]of Object.entries(item.select??{}))await student.getByLabel(`Configuration row 1 ${field}`,{exact:true}).selectOption(value);
  await student.getByRole('button',{name:'Check my work',exact:true}).click();await expect(student.getByText('Lesson complete',{exact:true})).toBeVisible();const explanations=student.getByRole('region',{name:'Check explanations',exact:true});await explanations.locator('summary').first().click();await explanations.getByRole('button',{name:'Show configuration row',exact:true}).first().click();await expect(student.locator('tr.bg-info-soft')).toHaveCount(1);if(item.family==='pan-nat'){await page.screenshot({path:test.info().outputPath('nat-studio.png'),fullPage:true});await student.screenshot({path:test.info().outputPath('nat-student.png'),fullPage:true});await student.setViewportSize({width:390,height:844});expect(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await student.screenshot({path:test.info().outputPath('nat-mobile.png'),fullPage:true});await student.setViewportSize({width:1280,height:720});}await expect(student.getByText('Saved to your account',{exact:true})).toBeVisible();await student.reload();await expect(student.getByText('Saved to your account',{exact:true})).toBeVisible();await expect(student.getByLabel(`Configuration row 1 ${item.wrong[0]}`,{exact:true})).toHaveValue(item.values[item.wrong[0]]);
  await student.getByLabel(`Configuration row 1 ${item.wrong[0]}`,{exact:true}).fill(item.wrong[1]);await student.getByRole('button',{name:'Check my work',exact:true}).click();await expect(student.getByText('Not quite yet',{exact:true})).toBeVisible();
 }}finally{await context.close();}
});

test('account progress recovers from an empty proxy response with a retry',async({page})=>{
 await page.request.post('/api/account/login',{data:{email:'teacher@example.invalid',password:'BrowserFixture42!'}});
 let outage=true;await page.route('**/api/account/progress/*',route=>outage?route.fulfill({status:500,contentType:'text/plain',body:''}):route.continue());
 await page.goto('/account');await expect(page.getByText('The server is temporarily unavailable. Please try again.',{exact:false})).toBeVisible();await expect(page.getByText(/JSON.parse|Unexpected end/)).toHaveCount(0);
 outage=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByRole('progressbar')).toHaveCount(2);
});

test('packet explanations highlight effective policies/routes and clear after configuration changes',async({page})=>{
 await page.goto('/fortigate/policy/firewall-policy?scenario=web-server-access-01');await expect(page.getByText('Ready · changes save automatically',{exact:true})).toBeVisible();
 await expect(page.getByPlaceholder('e.g. Allow-HTTPS-to-WebServer')).toHaveCount(0);await page.getByRole('button',{name:'Create New',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByPlaceholder('e.g. Allow-HTTPS-to-WebServer')).toHaveCount(0);await page.getByRole('button',{name:'Create New',exact:true}).click();await page.getByPlaceholder('e.g. Allow-HTTPS-to-WebServer').fill('Trace web');await page.getByRole('checkbox',{name:'all (0.0.0.0/0)',exact:true}).first().check();await page.getByRole('checkbox',{name:'WebServer (10.0.2.10/32)',exact:true}).last().check();await page.getByRole('checkbox',{name:'HTTPS (TCP/443)',exact:true}).check();await page.getByRole('button',{name:'Add Policy',exact:true}).click();await expect(page.getByPlaceholder('e.g. Allow-HTTPS-to-WebServer')).toHaveCount(0);await page.getByRole('row').filter({hasText:'Trace web'}).click();await page.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByPlaceholder('e.g. Allow-HTTPS-to-WebServer')).toHaveValue('Trace web');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect(page.getByPlaceholder('e.g. Allow-HTTPS-to-WebServer')).toHaveCount(0);await page.getByRole('button',{name:'Trace packet flow',exact:true}).click();
 const policy=page.getByRole('region',{name:'Policy packet explanation',exact:true});await expect(policy.getByText('Simulation decision: Accepted',{exact:true})).toBeVisible();await expect(policy.getByText(/Route lookup is not evaluated/)).toBeVisible();await policy.getByRole('button',{name:'Show policy row',exact:true}).click();await expect(page.locator('tr').filter({hasText:'Trace web'})).toHaveClass(/bg-info-soft/);await page.getByRole('button',{name:'Delete',exact:true}).click();await expect(policy).toHaveCount(0);
 await page.goto('/fortigate/network/routing');await expect(page.getByText('Ready · changes save automatically',{exact:true})).toBeVisible();await page.getByPlaceholder('0.0.0.0/0',{exact:true}).fill('192.168.10.0/24');await page.getByPlaceholder('192.168.1.254',{exact:true}).fill('10.0.0.1');await page.getByRole('button',{name:'Add route',exact:true}).click();const explorer=page.getByRole('region',{name:'Packet explorer',exact:true});await explorer.getByRole('button',{name:'Explain packet',exact:true}).click();await expect(explorer.getByText('Simulation result: No route',{exact:true})).toBeVisible();await page.getByLabel('Trace destination IPv4',{exact:true}).fill('192.168.10.5');await explorer.getByRole('button',{name:'Explain packet',exact:true}).click();await expect(explorer.getByText('Simulation result: port1 via 10.0.0.1',{exact:true})).toBeVisible();await explorer.getByRole('button',{name:'Show configuration row',exact:true}).click();await expect(page.locator('tr').filter({hasText:'192.168.10.0/24'})).toHaveClass(/bg-info-soft/);await page.getByRole('button',{name:'Delete route 192.168.10.0/24',exact:true}).click();await expect(explorer.getByText(/Simulation result:/)).toHaveCount(0);
});
test('native NAT explorer explains translation without treating it as security permission',async({page})=>{
 await page.goto('/');await page.evaluate(()=>localStorage.setItem('flames:simulator-draft:v1:paloalto:pan-nat-02',JSON.stringify({schemaVersion:1,scenarioVersion:'1',revision:1,updatedAt:Date.now(),config:[{id:1,name:'Trace DNAT',type:'destination',srcZone:'Untrust',dstZone:'Untrust',dstAddr:'203.0.113.10',translated:'10.0.1.10'}]})));
 await page.goto('/paloalto/nat?task=pan-nat-02');await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();await page.getByLabel('Trace source zone',{exact:true}).fill('Untrust');await page.getByLabel('Trace destination IPv4',{exact:true}).fill('203.0.113.10');const explorer=page.getByRole('region',{name:'Packet explorer',exact:true});await explorer.getByRole('button',{name:'Explain packet',exact:true}).click();await expect(explorer.getByText('Simulation result: destination → 10.0.1.10',{exact:true})).toBeVisible();await expect(explorer.getByText(/translation does not grant permission/)).toBeVisible();await explorer.getByRole('button',{name:'Show configuration row',exact:true}).click();await expect(page.locator('#nat-row-1')).toHaveClass(/bg-info-soft/);await explorer.getByRole('button',{name:'Network view',exact:true}).click();const network=page.getByRole('dialog',{name:'Network view',exact:true});await expect(network.getByText(/Original destination 203.0.113.10 · destination → 10.0.1.10/)).toBeVisible();await network.getByRole('button',{name:'Close network view',exact:true}).click();
});

test('Palo Alto network view shows security decisions and separate NAT translation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/paloalto/security');
 const explorer=page.getByRole('region',{name:'Packet explorer',exact:true});
 await explorer.getByRole('button',{name:'Network view',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Network view',exact:true});
 await expect(dialog).toHaveAttribute('data-vendor','paloalto');
 await expect(dialog.getByText('PA-220 · Simulated packet paths',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Denied',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await page.goto('/paloalto/nat?task=pan-nat-02');
 await page.getByRole('region',{name:'Packet explorer',exact:true}).getByRole('button',{name:'Network view',exact:true}).click();
 await expect(dialog.getByText('Unchanged',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Translation does not grant security permission.',{exact:true})).toBeVisible();
 await expect(dialog.getByText('Accepted',{exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Close network view',exact:true}).click();await expect(dialog).toHaveCount(0);
});

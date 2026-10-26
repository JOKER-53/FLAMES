import {test,expect} from '@playwright/test';
import {COURSES,allLessons} from '../../packages/frontend/src/course/curriculum.ts';

for(const course of Object.values(COURSES))for(const lesson of allLessons(course)){
 test(`${course.vendor}: ${lesson.title} has a contained topology`,async({page})=>{
  await page.goto(lesson.route);
  const topology=page.getByRole('region',{name:'Network topology',exact:true});
  await expect(topology).toBeVisible();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const fits=await topology.evaluate(card=>{const bounds=card.getBoundingClientRect();return bounds.width>0&&card.scrollWidth<=card.clientWidth+1&&bounds.left>=-1&&bounds.right<=innerWidth+1;});
   expect(fits).toBe(true);
  }
  await expect(page.getByRole('heading',{level:1})).toHaveText(lesson.title);
 });
}

test('Palo Alto topology updates when rules are added and removed',async({page})=>{
 await page.goto('/paloalto/security?task=pan-sec-01');
 const topology=page.getByRole('region',{name:'Network topology',exact:true});
 await expect(topology.getByText(/No configured connections yet/)).toBeVisible();
 await page.getByRole('button',{name:'Add rule',exact:true}).first().click();
 await page.getByPlaceholder('e.g. Allow-Web-Outbound').fill('Topology web');
 await page.getByRole('button',{name:/^ssl/}).click();
 await page.getByRole('button',{name:'Add rule',exact:true}).last().click();
 await expect(topology.getByText('Topology web',{exact:true})).toBeVisible();
 await expect(topology.getByText('Trust → Untrust · ssl · allow',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Delete Topology web',exact:true}).click();
 await expect(topology.getByText('Topology web',{exact:true})).toHaveCount(0);
});

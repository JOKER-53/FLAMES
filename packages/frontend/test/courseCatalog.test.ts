import { expect, it } from 'vitest';
import { mergeCatalog } from '../src/course/CourseCatalog';
import { allLessons, COURSES } from '../src/course/curriculum';
it('adds published lessons to the selected vendor without mutating the built-in curriculum', () => {
  const courses = mergeCatalog([{ id: 'module-test', vendor: 'fortigate', title: 'Custom', summary: 'New module', lessons: [{ id: 'custom-test', title: 'Custom lesson', summary: '', minutes: 10, level: 'Foundation' }] }]);
  expect(allLessons(courses.fortigate)).toHaveLength(allLessons(COURSES.fortigate).length + 1);
  expect(allLessons(courses.paloalto)).toHaveLength(allLessons(COURSES.paloalto).length);
  expect(courses.fortigate.modules[courses.fortigate.modules.length - 1]?.lessons[0].route).toBe('/fortigate/lessons/custom-test');
  expect(COURSES.fortigate.modules.some(module => module.id === 'module-test')).toBe(false);
});

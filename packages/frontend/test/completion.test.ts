import { expect, it } from 'vitest';
import { COMPLETION_TASKS, filterCompletionTasks } from '@fortisim/engine';
import { COURSES, allLessons } from '../src/course/curriculum';

it('keeps accepted completion IDs aligned with every curriculum lesson', () => {
  for (const vendor of ['fortigate', 'paloalto'] as const) {
    expect([...COMPLETION_TASKS[vendor]].sort()).toEqual(allLessons(COURSES[vendor]).map(lesson => lesson.id).sort());
  }
});
it('filters stale and wrong-vendor cached completion without inflating counts', () => {
  expect(filterCompletionTasks('fortigate', ['web-server-access-01', 'unknown', 'pan-sec-01', 'web-server-access-01', null])).toEqual(['web-server-access-01']);
});

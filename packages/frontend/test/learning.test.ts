import { expect, it } from 'vitest';
import { COMPLETION_TASKS, HARD_QUESTIONS, PAN_SECURITY_SCENARIOS } from '@fortisim/engine';
import { allLessons, COURSES } from '../src/course/curriculum';
import material from '../src/course/learning.json';
import { LESSONS } from '../../../integrations/academy/lesson-manifest.mjs';

it('provides a full study plan for every built-in task and keeps Academy progress synchronized', () => {
  const chapters = new Set(material.chapters.map(chapter => chapter.id));
  const ids: string[] = [];
  for (const vendor of ['fortigate', 'paloalto'] as const) {
    const lessons = allLessons(COURSES[vendor]);
    expect(new Set(lessons.map(lesson => lesson.id))).toEqual(new Set(COMPLETION_TASKS[vendor]));
    expect(new Set(LESSONS[vendor])).toEqual(new Set(COMPLETION_TASKS[vendor]));
    for (const lesson of lessons) {
      ids.push(lesson.id);
      const note = (material.tasks as Record<string, { chapter: string; approach: string; verify: string }>)[lesson.id];
      expect(note, lesson.id).toBeDefined();
      expect(chapters.has(note.chapter)).toBe(true);
      expect(note.approach.length).toBeGreaterThan(30);
      expect(note.verify.length).toBeGreaterThan(30);
    }
  }
  expect(ids).toHaveLength(48);
  expect(new Set(Object.keys(material.tasks))).toEqual(new Set(ids));
});
it('covers every chapter with a worked example, procedure, diagram, and review', () => {
  for (const chapter of material.chapters) {
    expect(chapter.example.length).toBeGreaterThan(150);
    expect(chapter.steps.length).toBeGreaterThanOrEqual(4);
    expect(chapter.flow.length).toBeGreaterThanOrEqual(4);
    expect(chapter.mistakes.length).toBeGreaterThanOrEqual(3);
    expect(chapter.review.length).toBeGreaterThan(30);
    expect(chapter.reviewAnswer.length).toBeGreaterThan(100);
    expect(chapter.exampleCases).toHaveLength(3);
  }
});
it('has curated offline knowledge checks for all added practice tasks', () => {
  for (const vendor of ['fortigate', 'paloalto'] as const) {
    for (const lesson of COURSES[vendor].modules.find(module => module.id === 'practice')!.lessons) {
      expect(HARD_QUESTIONS[lesson.id]?.choices).toHaveLength(4);
      if (vendor === 'paloalto') expect(PAN_SECURITY_SCENARIOS.some(task => task.id === lesson.id)).toBe(true);
    }
  }
});

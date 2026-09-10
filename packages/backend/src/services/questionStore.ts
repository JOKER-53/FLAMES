import { randomUUID } from "crypto";

const TTL_MS = 15 * 60 * 1000;
const questions = new Map<string, { correctIndex: number; expiresAt: number; used: boolean }>();

export function hideAnswer<T extends { question: string; choices: string[]; correctIndex: number }>(generated: T) {
  const questionId = randomUUID();
  questions.set(questionId, { correctIndex: generated.correctIndex, expiresAt: Date.now() + TTL_MS, used: false });
  return { questionId, question: generated.question, choices: generated.choices };
}

export function checkAnswer(questionId: unknown, selectedIndex: unknown): boolean {
  if (typeof questionId !== "string" || !Number.isInteger(selectedIndex)) throw new Error("questionId and integer selectedIndex are required");
  const stored = questions.get(questionId);
  if (!stored || stored.expiresAt < Date.now() || stored.used) {
    questions.delete(questionId);
    throw new Error("Question is expired, invalid, or already answered");
  }
  stored.used = true;
  const correct = stored.correctIndex === selectedIndex;
  questions.delete(questionId);
  return correct;
}

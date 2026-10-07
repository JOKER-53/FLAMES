import { randomUUID } from "crypto";

const TTL_MS = 15 * 60 * 1000;
const questions = new Map<string, { correctIndex: number; expiresAt: number; used: boolean }>();

export function hideAnswer<T extends { question: string; choices: string[]; correctIndex: number }>(generated: T) {
  if (typeof generated.question !== "string" || !generated.question.trim() || generated.question.length > 2000 ||
      !Array.isArray(generated.choices) || generated.choices.length !== 4 ||
      generated.choices.some(choice => typeof choice !== "string" || !choice.trim() || choice.length > 1000) ||
      !Number.isInteger(generated.correctIndex) || generated.correctIndex < 0 || generated.correctIndex > 3) {
    throw new Error("The question generator returned an invalid question.");
  }
  for (const [id, entry] of questions) if (entry.expiresAt <= Date.now()) questions.delete(id);
  if (questions.size >= 1000) throw new Error("Question capacity reached. Try again later.");
  const questionId = randomUUID();
  questions.set(questionId, { correctIndex: generated.correctIndex, expiresAt: Date.now() + TTL_MS, used: false });
  return { questionId, question: generated.question, choices: generated.choices };
}

export function checkAnswer(questionId: unknown, selectedIndex: unknown): boolean {
  if (typeof questionId !== "string" || !Number.isInteger(selectedIndex) || (selectedIndex as number) < 0 || (selectedIndex as number) > 3) throw new Error("questionId and a choice index from 0 to 3 are required");
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

import { Request, Response } from "express";
import { getPanFeedback } from "../services/nimPanFeedback";
import { generatePanKnowledgeCheck } from "../services/nimPanKnowledgeCheck";
import { checkAnswer, hideAnswer, shuffleChoices } from "../services/questionStore";

export const panFeedback = async (req: Request, res: Response) => {
  const { exerciseTitle, failingChecks, taskId } = req.body ?? {};
  if (typeof exerciseTitle !== "string" || !exerciseTitle.trim() || exerciseTitle.length > 200 || !Array.isArray(failingChecks) || failingChecks.length > 100 || failingChecks.some(check => typeof check !== "string" || check.length > 1000)) {
    res.status(400).json({ error: "exerciseTitle and failingChecks[] required" });
    return;
  }
  // getPanFeedback never throws: it falls back to a guided hint for the task's topic.
  const hint = await getPanFeedback(exerciseTitle, failingChecks, typeof taskId === "string" ? taskId : undefined);
  res.json({ feedback: hint.text, source: hint.source });
};

export const panKnowledgeCheck = async (req: Request, res: Response) => {
  try {
    const question = await generatePanKnowledgeCheck(req.params.taskId);
    res.json({ ...hideAnswer(shuffleChoices(question)), source: question.source ?? "ai" });
  } catch (err: unknown) {
    res.status(503).json({ error: "Knowledge check is unavailable. Try again later." });
  }
};

export const panKnowledgeCheckAnswer = (req: Request, res: Response) => {
  try {
    res.json({ correct: checkAnswer(req.body?.questionId, req.body?.selectedIndex) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid answer" });
  }
};

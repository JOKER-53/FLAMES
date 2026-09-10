import { Request, Response } from "express";
import { getPanFeedback } from "../services/nimPanFeedback";
import { generatePanKnowledgeCheck } from "../services/nimPanKnowledgeCheck";
import { checkAnswer, hideAnswer } from "../services/questionStore";

export const panFeedback = async (req: Request, res: Response) => {
  const { exerciseTitle, failingChecks } = req.body;
  if (!exerciseTitle || !Array.isArray(failingChecks)) {
    res.status(400).json({ error: "exerciseTitle and failingChecks[] required" });
    return;
  }
  try {
    const feedback = await getPanFeedback(exerciseTitle, failingChecks);
    res.json({ feedback });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const panKnowledgeCheck = async (req: Request, res: Response) => {
  try {
    const question = await generatePanKnowledgeCheck(req.params.taskId);
    res.json(hideAnswer(question));
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const panKnowledgeCheckAnswer = (req: Request, res: Response) => {
  try {
    res.json({ correct: checkAnswer(req.body?.questionId, req.body?.selectedIndex) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid answer" });
  }
};

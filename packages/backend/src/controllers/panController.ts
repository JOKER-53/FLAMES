import { Request, Response } from "express";
import { getPanFeedback } from "../services/nimPanFeedback";
import { generatePanKnowledgeCheck } from "../services/nimPanKnowledgeCheck";

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
    res.json(question);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
};

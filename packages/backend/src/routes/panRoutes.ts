import { Router } from "express";
import { getPanFeedback } from "../services/nimPanFeedback";
import { generatePanKnowledgeCheck } from "../services/nimPanKnowledgeCheck";

export const panRouter = Router();

panRouter.post("/feedback", async (req, res) => {
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
});

panRouter.get("/knowledge-check/:taskId", async (req, res) => {
  try {
    const question = await generatePanKnowledgeCheck(req.params.taskId);
    res.json(question);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

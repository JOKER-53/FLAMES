import { Router } from "express";
import { gradePanExercise } from "@fortisim/engine";
import { panFeedback, panKnowledgeCheck, panKnowledgeCheckAnswer } from "../controllers/panController";

export const panRouter = Router();

panRouter.post("/grade/:taskId", (req, res) => {
  try { res.json(gradePanExercise(req.params.taskId, req.body?.config)); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid configuration." }); }
});

panRouter.post("/feedback", panFeedback);
panRouter.get("/knowledge-check/:taskId", panKnowledgeCheck);
panRouter.post("/knowledge-check/answer", panKnowledgeCheckAnswer);

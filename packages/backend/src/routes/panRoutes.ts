import { Router } from "express";
import { panFeedback, panKnowledgeCheck, panKnowledgeCheckAnswer } from "../controllers/panController";

export const panRouter = Router();

panRouter.post("/feedback", panFeedback);
panRouter.get("/knowledge-check/:taskId", panKnowledgeCheck);
panRouter.post("/knowledge-check/answer", panKnowledgeCheckAnswer);

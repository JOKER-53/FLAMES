import { Router } from "express";
import { panFeedback, panKnowledgeCheck } from "../controllers/panController";

export const panRouter = Router();

panRouter.post("/feedback", panFeedback);
panRouter.get("/knowledge-check/:taskId", panKnowledgeCheck);

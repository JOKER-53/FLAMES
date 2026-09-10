import { Router } from "express";
import { answerKnowledgeCheck, getKnowledgeCheck } from "../controllers/knowledgeCheckController";

export const knowledgeCheckRouter = Router();

knowledgeCheckRouter.get("/:taskId", getKnowledgeCheck);
knowledgeCheckRouter.post("/answer", answerKnowledgeCheck);

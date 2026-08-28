import { Router } from "express";
import { getKnowledgeCheck } from "../controllers/knowledgeCheckController";

export const knowledgeCheckRouter = Router();

knowledgeCheckRouter.get("/:taskId", getKnowledgeCheck);

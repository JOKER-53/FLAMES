import { Router } from "express";
import { gradeScenario, gradeWithFeedback } from "../controllers/submissionController";

export const submissionsRouter = Router();

submissionsRouter.post("/:scenarioId/grade", gradeScenario);
submissionsRouter.post("/:scenarioId/feedback", gradeWithFeedback);

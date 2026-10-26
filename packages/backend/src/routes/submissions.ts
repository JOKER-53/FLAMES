import { Router } from "express";
import type { Scenario } from "@fortisim/engine";
import { submissionHandlers } from "../controllers/submissionController";
export function createSubmissionsRouter(resolve: (id: string) => Scenario | undefined) {
  const router = Router(); const { gradeScenario, gradeWithFeedback } = submissionHandlers(resolve);
  router.post("/:scenarioId/grade", gradeScenario); router.post("/:scenarioId/feedback", gradeWithFeedback); return router;
}

import { Router } from "express";
import { listScenarios, getScenarioById } from "../scenarios/registry";
import type { ContentStore } from "../content/store";
export function createScenariosRouter(content: ContentStore) {
  const router = Router();
  router.get("/", (_req, res) => res.json([...listScenarios(), ...content.catalog().flatMap(module => module.lessons.filter(lesson => lesson.kind === "policy").map(lesson => ({ id: lesson.id, title: lesson.title, description: lesson.summary })))]));
  router.get("/:id", (req, res) => {
    const custom = content.policyExercise(req.params.id); const scenario = custom?.scenario ?? getScenarioById(req.params.id);
    if (!scenario) { res.status(404).json({ error: "Scenario not found." }); return; }
    const { expectedOutcomes, ...safe } = scenario;
    res.json({ ...safe, version: custom?.version ?? "1", starterPolicies: custom?.starterPolicies ?? [] });
  });
  return router;
}

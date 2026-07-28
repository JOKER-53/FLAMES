// ============================================================================
// POST /api/interface-submissions/:scenarioId/grade
// POST /api/interface-submissions/:scenarioId/feedback
// Same pattern as policy submissions: grade first, AI feedback if failed,
// diagnostics never contain the correct answer values.
// ============================================================================

import { Router } from "express";
import { gradeInterfaceSubmission, InterfaceSubmission, ALL_INTERFACE_SCENARIOS, interfaceFullScenario } from "@fortisim/engine";
import { getFeedbackForInterfaceReport } from "../services/nimInterfaceFeedback";

export const interfaceSubmissionsRouter = Router();

// ALL_INTERFACE_SCENARIOS covers only the 3 regular exercises; the Final
// Assignment (interface-full-01) is defined separately so it isn't shown
// twice in the task list, and must be searched here too, or grading it 404s.
const ALL_INTERFACE_SCENARIOS_AND_FINAL = [...ALL_INTERFACE_SCENARIOS, interfaceFullScenario];

function getScenario(id: string) {
  return ALL_INTERFACE_SCENARIOS_AND_FINAL.find((s) => s.id === id);
}

interfaceSubmissionsRouter.post("/:scenarioId/grade", (req, res) => {
  const scenario = getScenario(req.params.scenarioId);
  if (!scenario) return res.status(404).json({ error: `Scenario "${req.params.scenarioId}" not found` });
  const report = gradeInterfaceSubmission(scenario, req.body as InterfaceSubmission);
  res.json(report);
});

interfaceSubmissionsRouter.post("/:scenarioId/feedback", async (req, res) => {
  const scenario = getScenario(req.params.scenarioId);
  if (!scenario) return res.status(404).json({ error: `Scenario "${req.params.scenarioId}" not found` });
  const report = gradeInterfaceSubmission(scenario, req.body as InterfaceSubmission);
  if (report.overallPassed) return res.json({ report });
  try {
    const aiRemark = await getFeedbackForInterfaceReport(scenario.title, report);
    res.json({ report, aiRemark });
  } catch (err) {
    console.error("NIM feedback failed:", err);
    res.json({ report, aiRemark: null, aiError: "Feedback service unavailable" });
  }
});

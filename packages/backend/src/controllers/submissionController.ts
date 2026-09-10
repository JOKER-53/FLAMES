import { Request, Response } from "express";
import { gradeSubmission } from "@fortisim/engine";
import { getScenarioById } from "../scenarios/registry";
import { getFeedbackForReport } from "../services/nimFeedback";
import { ensureScenarioMatches, parseStudentSubmission } from "../validation";

export const gradeScenario = (req: Request, res: Response) => {
  const scenario = getScenarioById(req.params.scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: `Scenario "${req.params.scenarioId}" not found` });
  }
  try {
    const submission = parseStudentSubmission(req.body);
    ensureScenarioMatches(req.params.scenarioId, submission.scenarioId);
    res.json(gradeSubmission(scenario, submission));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid submission" });
  }
};

export const gradeWithFeedback = async (req: Request, res: Response) => {
  const scenario = getScenarioById(req.params.scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: `Scenario "${req.params.scenarioId}" not found` });
  }
  let report;
  try {
    const submission = parseStudentSubmission(req.body);
    ensureScenarioMatches(req.params.scenarioId, submission.scenarioId);
    report = gradeSubmission(scenario, submission);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid submission" });
  }

  if (report.overallPassed) {
    return res.json({ report });
  }

  try {
    const aiRemark = await getFeedbackForReport(scenario.title, report);
    res.json({ report, aiRemark });
  } catch (err) {
    console.error("NIM feedback call failed:", err);
    res.json({ report, aiRemark: null, aiError: "Feedback service unavailable" });
  }
};

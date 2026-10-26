import { Request, Response } from "express";
import { gradeSubmission, type Scenario } from "@fortisim/engine";
import { getScenarioById } from "../scenarios/registry";
import { getFeedbackForReport } from "../services/nimFeedback";
import { ensureScenarioMatches, parseStudentSubmission } from "../validation";

function studentReport(report: ReturnType<typeof gradeSubmission>) {
  return { ...report, diagnostics: report.diagnostics.map(({ expectedAction, ...diagnostic }) => diagnostic) };
}

export function submissionHandlers(resolveScenario: (id: string) => Scenario | undefined = getScenarioById) {
const gradeScenario = (req: Request, res: Response) => {
  const scenario = resolveScenario(req.params.scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: `Scenario "${req.params.scenarioId}" not found` });
  }
  try {
    const submission = parseStudentSubmission(req.body);
    ensureScenarioMatches(req.params.scenarioId, submission.scenarioId);
    res.json(studentReport(gradeSubmission(scenario, submission)));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid submission" });
  }
};

const gradeWithFeedback = async (req: Request, res: Response) => {
  const scenario = resolveScenario(req.params.scenarioId);
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
    return res.json({ report: studentReport(report) });
  }

  const hint = await getFeedbackForReport(scenario.title, report);
  res.json({ report: studentReport(report), aiRemark: hint.text, remarkSource: hint.source });
};

return { gradeScenario, gradeWithFeedback };
}

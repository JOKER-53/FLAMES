import { Router } from "express";
import { gradePortSubmission, ALL_PORT_SCENARIOS, portFinalScenario, type PortGradingReport } from "@fortisim/engine";
import { tutorHint, TUTOR_RULES, type TutorHint } from "../services/tutor";
import { ensureScenarioMatches, parsePortSubmission } from "../validation";

export const portSubmissionsRouter = Router();

const ALL_PORT_SCENARIOS_AND_FINAL = [...ALL_PORT_SCENARIOS, portFinalScenario];

const SYSTEM_PROMPT = `You are a network configuration tutor helping a student learn FortiGate port zone assignment. WAN is internet-facing, DMZ holds semi-trusted public servers, LAN is the trusted internal network, and unused ports stay unassigned. Point the student to which ports to re-examine and why, based on what each port connects to. ${TUTOR_RULES}`;

function getAiFeedback(scenarioTitle: string, report: PortGradingReport): Promise<TutorHint> {
  const failing = report.results.filter((r) => !r.passed);
  const userContent = [
    `Scenario: ${scenarioTitle}`,
    `Failing checks (${failing.length}/${report.totalChecks}):`,
    ...failing.map((r) => `- "${r.description}": student assigned "${r.studentZone}", which is incorrect`),
  ].join("\n");
  return tutorHint("fortigate-port", SYSTEM_PROMPT, userContent, failing.map((r) => r.description));
}

function getScenario(id: string) {
  return ALL_PORT_SCENARIOS_AND_FINAL.find((s) => s.id === id);
}
portSubmissionsRouter.post("/:scenarioId/grade", (req, res) => {
  const scenario = getScenario(req.params.scenarioId);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  try {
    const submission = parsePortSubmission(req.body);
    ensureScenarioMatches(req.params.scenarioId, submission.scenarioId);
    res.json(gradePortSubmission(scenario, submission));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid submission" });
  }
});

portSubmissionsRouter.post("/:scenarioId/feedback", async (req, res) => {
  const scenario = getScenario(req.params.scenarioId);
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  let report;
  try {
    const submission = parsePortSubmission(req.body);
    ensureScenarioMatches(req.params.scenarioId, submission.scenarioId);
    report = gradePortSubmission(scenario, submission);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid submission" });
  }
  if (report.overallPassed) return res.json({ report });
  const hint = await getAiFeedback(scenario.title, report);
  res.json({ report, aiRemark: hint.text, remarkSource: hint.source });
});

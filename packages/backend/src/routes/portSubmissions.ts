import { Router } from "express";
import { gradePortSubmission, ALL_PORT_SCENARIOS, portFinalScenario } from "@fortisim/engine";
import { ensureScenarioMatches, parsePortSubmission } from "../validation";

export const portSubmissionsRouter = Router();

const ALL_PORT_SCENARIOS_AND_FINAL = [...ALL_PORT_SCENARIOS, portFinalScenario];

async function getAiFeedback(scenarioTitle: string, report: any): Promise<string | null> {
  try {
    const failing = report.results.filter((r: any) => !r.passed);
    const userContent = [
      `Scenario: ${scenarioTitle}`,
      `Failing checks (${failing.length}/${report.totalChecks}):`,
      ...failing.map((r: any) =>
        `- "${r.description}": student assigned "${r.studentZone}" but this is incorrect`
      ),
    ].join("\n");

    const response = await fetch(`${process.env.NVIDIA_NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_NIM_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a network configuration tutor helping a student learn FortiGate port zone assignment.
You will be given a list of ports the student assigned incorrectly.

Your rules:
1. NEVER state the correct zone for any port.
2. DO explain WHY zone assignment matters (WAN = internet-facing, DMZ = semi-trusted servers, LAN = internal trusted).
3. DO point the student toward WHICH ports to re-examine and WHY (e.g. a port connected to internet-facing equipment should be WAN).
4. Keep it brief (2-4 sentences), encouraging, and conceptual.`,
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 300,
        temperature: 0.4,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
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
  const aiRemark = await getAiFeedback(scenario.title, report);
  res.json({ report, aiRemark });
});

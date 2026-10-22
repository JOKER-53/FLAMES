import { InterfaceGradingReport } from "@fortisim/engine";
import { tutorHint, TUTOR_RULES, type TutorHint } from "./tutor";

// AI tutor feedback for FortiGate interface configuration. The AI only sees
// diagnostic facts and the student's own values, never the expected values.
const SYSTEM_PROMPT = `You are a concise FortiGate interface configuration tutor. ${TUTOR_RULES}`;

export function getFeedbackForInterfaceReport(scenarioTitle: string, report: InterfaceGradingReport): Promise<TutorHint> {
  const failing = report.results.filter((r) => !r.passed);
  const userContent = [
    `Scenario: ${scenarioTitle}`,
    `Failing checks (${failing.length}/${report.totalChecks}):`,
    ...failing.map((r) => `- "${r.description}" on interface "${r.interfaceName}" (field: ${r.field}): student set "${Array.isArray(r.studentValue) ? r.studentValue.join(", ") : r.studentValue}"`),
  ].join("\n");
  return tutorHint("fortigate-interface", SYSTEM_PROMPT, userContent, failing.map((r) => `${r.interfaceName}: ${r.description}`), 3);
}

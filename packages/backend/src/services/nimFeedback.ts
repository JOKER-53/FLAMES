import { GradingReport } from "@fortisim/engine";
import { tutorHint, TUTOR_RULES, type TutorHint } from "./tutor";

// AI tutor feedback for FortiGate firewall policy exercises.
const SYSTEM_PROMPT = `You are a concise FortiGate firewall policy tutor helping a student debug their policy table. ${TUTOR_RULES}`;

export function getFeedbackForReport(scenarioTitle: string, report: GradingReport): Promise<TutorHint> {
  const failing = report.diagnostics.filter((d) => !d.passed);
  const userContent = [
    `Scenario: ${scenarioTitle}`,
    `Failing checks (${failing.length}/${report.totalChecks}):`,
    ...failing.map((d) =>
      `- "${d.description}": the student's policies gave ${d.studentAction}` +
      (d.studentAction === d.expectedAction ? " — the action is right, but the matching policy's logging setting is not what the scenario requires"
        : d.webFiltered ? " (blocked by a web filter profile)" : d.matchedPolicyId ? ` (matched policy ${d.matchedPolicyId})` : " (no policy matched, so the implicit deny applied)")
    ),
  ].join("\n");
  return tutorHint("fortigate-policy", SYSTEM_PROMPT, userContent, failing.map((d) => d.description));
}

import { PortScenario, PortSubmission, PortGradingReport, PortCheckResult } from "./interfaceTypes";

/**
 * Check descriptions are authored as "Port 3 → DMZ (web server)". Reports go to the
 * student and the AI tutor, so drop the expected zone and keep only the context.
 */
export function studentFacingPortDescription(description: string): string {
  return description.replace(/\s*→\s*(WAN|LAN|DMZ|Unassigned)\b\s*/i, " ").replace(/\s+/g, " ").trim();
}

export function gradePortSubmission(
  scenario: PortScenario,
  submission: PortSubmission
): PortGradingReport {
  const assignmentMap = new Map(submission.assignments.map((a) => [a.portId, a.zone]));

  const results: PortCheckResult[] = scenario.checks.map((check) => {
    const studentZone = assignmentMap.get(check.portId) ?? "unassigned";
    return {
      portId: check.portId,
      description: studentFacingPortDescription(check.description),
      passed: studentZone === check.expectedZone,
      studentZone,
    };
  });

  const passedChecks = results.filter((r) => r.passed).length;
  return {
    scenarioId: scenario.id,
    totalChecks: results.length,
    passedChecks,
    overallPassed: passedChecks === results.length,
    results,
  };
}

import { Scenario, StudentSubmission } from "./types";
import { evaluatePacket } from "./evaluator";

export interface PacketDiagnostic {
  testPacketId: string;
  description: string;
  passed: boolean;
  studentAction: "ACCEPT" | "DENY";
  expectedAction: "ACCEPT" | "DENY";
  webFiltered: boolean;
  matchedPolicyId: string | null;
}

export interface GradingReport {
  scenarioId: string;
  totalChecks: number;
  passedChecks: number;
  overallPassed: boolean;
  diagnostics: PacketDiagnostic[];
}

export function gradeSubmission(scenario: Scenario, submission: StudentSubmission): GradingReport {
  const diagnostics: PacketDiagnostic[] = scenario.expectedOutcomes.map((expected) => {
    const packet = scenario.testPackets.find((p) => p.id === expected.testPacketId);
    if (!packet) {
      return { testPacketId: expected.testPacketId, description: "(unknown packet)", passed: false, studentAction: "DENY", expectedAction: expected.expectedAction, webFiltered: false, matchedPolicyId: null };
    }
    const result = evaluatePacket(packet, submission.policies, submission.addresses, submission.services, submission.webFilterProfiles ?? []);
    return { testPacketId: packet.id, description: packet.description, passed: result.finalAction === expected.expectedAction, studentAction: result.finalAction, expectedAction: expected.expectedAction, webFiltered: result.webFiltered, matchedPolicyId: result.matchedPolicyId };
  });

  const passedChecks = diagnostics.filter((d) => d.passed).length;
  return { scenarioId: scenario.id, totalChecks: diagnostics.length, passedChecks, overallPassed: passedChecks === diagnostics.length, diagnostics };
}

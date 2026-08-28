// ============================================================================
// Demo script: proves the engine + grader work before any GUI exists.
// ============================================================================

import { StudentSubmission } from "./types";
import { webServerAccessScenario } from "./exampleScenario";
import { gradeSubmission } from "./grader";

function printReport(label: string, submission: StudentSubmission) {
  console.log(`\n=== ${label} ===`);
  const report = gradeSubmission(webServerAccessScenario, submission);
  console.log(`Passed ${report.passedChecks}/${report.totalChecks} checks. Overall: ${report.overallPassed ? "PASS" : "FAIL"}`);
  for (const d of report.diagnostics) {
    const status = d.passed ? "PASS" : "FAIL";
    console.log(
      `  [${status}] ${d.description}: expected=${d.expectedAction} actual=${d.studentAction}` +
        (d.matchedPolicyId ? ` (matched policy: "${d.matchedPolicyId}")` : " (no policy matched, default deny)")
    );
  }
}

const correctSubmission: StudentSubmission = {
  scenarioId: "web-server-access-01",
  addresses: webServerAccessScenario.starterAddresses,
  services: webServerAccessScenario.starterServices,
  policies: [
    {
      id: "p1",
      name: "Allow-HTTPS-to-WebServer",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcAddrIds: ["addr_all"],
      dstAddrIds: ["addr_webserver"],
      serviceIds: ["svc_https"],
      action: "ACCEPT",
      log: true,
      enabled: true,
    },
    {
      id: "p2",
      name: "Deny-All",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcAddrIds: ["addr_all"],
      dstAddrIds: ["addr_all"],
      serviceIds: ["svc_https", "svc_ssh", "svc_http"],
      action: "DENY",
      log: false,
      enabled: true,
    },
  ],
};

const wrongSubmission: StudentSubmission = {
  scenarioId: "web-server-access-01",
  addresses: webServerAccessScenario.starterAddresses,
  services: webServerAccessScenario.starterServices,
  policies: [
    {
      id: "p1",
      name: "Allow-Everything-to-DMZ",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcAddrIds: ["addr_all"],
      dstAddrIds: ["addr_all"],
      serviceIds: ["svc_https", "svc_ssh", "svc_http"],
      action: "ACCEPT",
      log: true,
      enabled: true,
    },
  ],
};

printReport("Submission 1: Correct config", correctSubmission);
printReport("Submission 2: Wrong config (too permissive)", wrongSubmission);

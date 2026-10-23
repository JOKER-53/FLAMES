// ============================================================================
// Interface configuration grader.
// Checks student's interface settings against expected values.
// Returns structured diagnostics only -- no correct values leaked,
// same principle as the firewall policy grader.
// ============================================================================

import {
  InterfaceScenario,
  InterfaceSubmission,
  InterfaceGradingReport,
  InterfaceCheckResult,
} from "./interfaceTypes";

function normalizeIp(ip: string): string {
  return ip.trim();
}

function normalizeSubnet(subnet: string): string {
  // Accept both prefix length ("24") and dotted notation ("255.255.255.0")
  // Normalize to prefix length for comparison
  const trimmed = subnet.trim().replace(/^\//, "");
  if (/^\d{1,2}$/.test(trimmed) && Number(trimmed) <= 32) return String(Number(trimmed));
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    const octets = trimmed.split(".").map(Number);
    if (octets.every(octet => octet <= 255)) {
      const bits = octets.map(octet => octet.toString(2).padStart(8, "0")).join("");
      if (/^1*0*$/.test(bits)) return String(bits.indexOf("0") === -1 ? 32 : bits.indexOf("0"));
    }
  }
  return trimmed;
}

function normalizeAccess(access: string[]): string[] {
  return [...access].map((a) => a.toUpperCase().trim()).sort();
}

export function gradeInterfaceSubmission(
  scenario: InterfaceScenario,
  submission: InterfaceSubmission
): InterfaceGradingReport {
  const interfaceMap = new Map(
    submission.interfaces.map((i) => [i.name, i])
  );

  const results: InterfaceCheckResult[] = scenario.checks.map((check) => {
    const studentInterface = interfaceMap.get(check.interfaceName);

    if (!studentInterface) {
      return {
        interfaceName: check.interfaceName,
        field: check.field,
        description: check.description,
        passed: false,
        studentValue: "not configured",
      };
    }

    let studentValue: string | string[];
    let passed = false;

    switch (check.field) {
      case "ip":
        studentValue = normalizeIp(studentInterface.ip);
        passed = studentValue === normalizeIp(check.expectedValue as string);
        break;
      case "subnet":
        studentValue = normalizeSubnet(studentInterface.subnet);
        passed = studentValue === normalizeSubnet(check.expectedValue as string);
        break;
      case "role":
        studentValue = studentInterface.role;
        passed = studentValue === check.expectedValue;
        break;
      case "adminAccess":
        studentValue = normalizeAccess(studentInterface.adminAccess);
        const expected = normalizeAccess(check.expectedValue as string[]);
        passed =
          studentValue.length === expected.length &&
          studentValue.every((v, i) => v === expected[i]);
        break;
      default:
        studentValue = "unknown field";
        passed = false;
    }

    return {
      interfaceName: check.interfaceName,
      field: check.field,
      description: check.description,
      passed,
      studentValue,
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

// ============================================================================
// Interface configuration data model.
// Separate from the firewall policy types intentionally -- interface config
// is a different kind of exercise with different grading logic (exact value
// checking rather than behavioral equivalence via test packets).
// ============================================================================

export type AdminAccess = "PING" | "HTTPS" | "SSH" | "HTTP";
export type InterfaceRole = "WAN" | "LAN" | "DMZ";

export interface InterfaceConfig {
  name: string;           // e.g. "wan1", "dmz", "internal"
  role: InterfaceRole;    // the zone this interface belongs to
  ip: string;             // e.g. "10.0.2.1"
  subnet: string;         // e.g. "255.255.255.0" or CIDR prefix "24"
  adminAccess: AdminAccess[];
  description?: string;
}

/** A single interface field check -- what the grader checks per field */
export interface InterfaceFieldCheck {
  interfaceName: string;
  field: "ip" | "subnet" | "adminAccess" | "role";
  expectedValue: string | string[];
  description: string; // human readable, e.g. "DMZ interface IP"
}

/** An interface configuration scenario */
export interface InterfaceScenario {
  id: string;
  title: string;
  description: string;
  starterInterfaces: InterfaceConfig[]; // what student sees pre-loaded
  checks: InterfaceFieldCheck[];        // the answer key -- backend only
}

/** Student's submitted interface configuration */
export interface InterfaceSubmission {
  scenarioId: string;
  interfaces: InterfaceConfig[];
}

/** Result of checking one field */
export interface InterfaceCheckResult {
  interfaceName: string;
  field: string;
  description: string;
  passed: boolean;
  studentValue: string | string[];
}

/** Full grading report for an interface submission */
export interface InterfaceGradingReport {
  scenarioId: string;
  totalChecks: number;
  passedChecks: number;
  overallPassed: boolean;
  results: InterfaceCheckResult[];
}

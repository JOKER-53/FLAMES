// Physical port assignment contracts; independent of interface IP configuration.
export type PortZone = "WAN" | "LAN" | "DMZ" | "unassigned";

export interface PortAssignment {
  portId: string;
  zone: PortZone;
}

export interface PortCheck {
  portId: string;
  expectedZone: PortZone;
  description: string;
}

export interface PortScenario {
  id: string;
  title: string;
  description: string;
  ports: { portId: string; label: string; locked?: boolean }[];
  checks: PortCheck[];
}

export interface PortSubmission {
  scenarioId: string;
  assignments: PortAssignment[];
}

export interface PortCheckResult {
  portId: string;
  description: string;
  passed: boolean;
  studentZone: PortZone;
}

export interface PortGradingReport {
  scenarioId: string;
  totalChecks: number;
  passedChecks: number;
  overallPassed: boolean;
  results: PortCheckResult[];
}

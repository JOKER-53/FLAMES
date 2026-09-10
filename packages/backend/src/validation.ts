import type { InterfaceSubmission, PortSubmission, StudentSubmission } from "@fortisim/engine";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireArray(record: Record<string, unknown>, key: string): unknown[] {
  if (!Array.isArray(record[key])) throw new Error(`"${key}" must be an array`);
  return record[key];
}

export function parseStudentSubmission(body: unknown): StudentSubmission {
  if (!isRecord(body)) throw new Error("Request body must be an object");
  const addresses = requireArray(body, "addresses");
  const services = requireArray(body, "services");
  const policies = requireArray(body, "policies");
  if (typeof body.scenarioId !== "string") throw new Error('"scenarioId" must be a string');
  if (body.webFilterProfiles !== undefined && !Array.isArray(body.webFilterProfiles)) {
    throw new Error('"webFilterProfiles" must be an array');
  }
  return { scenarioId: body.scenarioId, addresses, services, policies, webFilterProfiles: body.webFilterProfiles } as StudentSubmission;
}

export function parseInterfaceSubmission(body: unknown): InterfaceSubmission {
  if (!isRecord(body)) throw new Error("Request body must be an object");
  const interfaces = requireArray(body, "interfaces");
  if (typeof body.scenarioId !== "string") throw new Error('"scenarioId" must be a string');
  return { scenarioId: body.scenarioId, interfaces } as InterfaceSubmission;
}

export function parsePortSubmission(body: unknown): PortSubmission {
  if (!isRecord(body)) throw new Error("Request body must be an object");
  const assignments = requireArray(body, "assignments");
  if (typeof body.scenarioId !== "string") throw new Error('"scenarioId" must be a string');
  return { scenarioId: body.scenarioId, assignments } as PortSubmission;
}

export function ensureScenarioMatches(pathId: string, bodyId: string): void {
  if (pathId !== bodyId) throw new Error("Submission scenarioId does not match the request path");
}

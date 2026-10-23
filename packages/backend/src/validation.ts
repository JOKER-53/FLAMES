import type { InterfaceSubmission, PortSubmission, StudentSubmission } from "@fortisim/engine";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireArray(record: Record<string, unknown>, key: string): unknown[] {
  if (!Array.isArray(record[key])) throw new Error(`"${key}" must be an array`);
  if (record[key].length > 200) throw new Error(`"${key}" contains too many entries`);
  return record[key];
}

function text(value: unknown): value is string { return typeof value === "string" && value.length <= 1000; }
function strings(value: unknown): boolean { return Array.isArray(value) && value.length <= 200 && value.every(text); }
function records(entries: unknown[], field: string): Record<string, unknown>[] {
  if (entries.some(entry => !isRecord(entry))) throw new Error(`Invalid ${field} entry`);
  return entries as Record<string, unknown>[];
}
function unique(entries: Record<string, unknown>[], key: string) {
  if (entries.some(entry => !text(entry[key]) || !entry[key]) || new Set(entries.map(entry => entry[key])).size !== entries.length) {
    throw new Error(`Entries require unique ${key} values`);
  }
}
function requireFields(valid: boolean, label: string) { if (!valid) throw new Error(`Invalid ${label} configuration`); }

export function parseStudentSubmission(body: unknown): StudentSubmission {
  if (!isRecord(body)) throw new Error("Request body must be an object");
  const addresses = requireArray(body, "addresses");
  const services = requireArray(body, "services");
  const policies = requireArray(body, "policies");
  if (typeof body.scenarioId !== "string") throw new Error('"scenarioId" must be a string');
  if (body.webFilterProfiles !== undefined && !Array.isArray(body.webFilterProfiles)) {
    throw new Error('"webFilterProfiles" must be an array');
  }
  const addressRecords = records(addresses, "address"), serviceRecords = records(services, "service"), policyRecords = records(policies, "policy");
  unique(addressRecords, "id"); unique(serviceRecords, "id"); unique(policyRecords, "id");
  requireFields(addressRecords.every(a => text(a.name) && ["subnet", "range"].includes(String(a.type)) && text(a.value)), "address");
  requireFields(serviceRecords.every(s => text(s.name) && ["TCP", "UDP", "ICMP"].includes(String(s.protocol)) && (s.port === undefined || text(s.port))), "service");
  requireFields(policyRecords.every(p => text(p.name) && ["WAN", "LAN", "DMZ"].includes(String(p.srcIntf)) && ["WAN", "LAN", "DMZ"].includes(String(p.dstIntf)) &&
    strings(p.srcAddrIds) && strings(p.dstAddrIds) && strings(p.serviceIds) && ["ACCEPT", "DENY"].includes(String(p.action)) &&
    typeof p.enabled === "boolean" && typeof p.log === "boolean" && (p.webFilterProfileId === undefined || text(p.webFilterProfileId))), "policy");
  if (body.webFilterProfiles !== undefined) {
    const profiles = records(requireArray(body, "webFilterProfiles"), "web filter");
    unique(profiles, "id");
    requireFields(profiles.every(p => text(p.name) && strings(p.blockedDomains)), "web filter");
  }
  return { scenarioId: body.scenarioId, addresses, services, policies, webFilterProfiles: body.webFilterProfiles } as StudentSubmission;
}

export function parseInterfaceSubmission(body: unknown): InterfaceSubmission {
  if (!isRecord(body)) throw new Error("Request body must be an object");
  const interfaces = requireArray(body, "interfaces");
  if (typeof body.scenarioId !== "string") throw new Error('"scenarioId" must be a string');
  const entries = records(interfaces, "interface"); unique(entries, "name");
  requireFields(entries.every(i => text(i.ip) && text(i.subnet) && ["WAN", "LAN", "DMZ"].includes(String(i.role)) &&
    strings(i.adminAccess) && (i.adminAccess as string[]).every(access => ["PING", "HTTPS", "SSH", "HTTP"].includes(access))), "interface");
  return { scenarioId: body.scenarioId, interfaces } as InterfaceSubmission;
}

export function parsePortSubmission(body: unknown): PortSubmission {
  if (!isRecord(body)) throw new Error("Request body must be an object");
  const assignments = requireArray(body, "assignments");
  if (typeof body.scenarioId !== "string") throw new Error('"scenarioId" must be a string');
  const entries = records(assignments, "port assignment"); unique(entries, "portId");
  requireFields(entries.every(a => ["WAN", "LAN", "DMZ", "unassigned"].includes(String(a.zone))), "port assignment");
  return { scenarioId: body.scenarioId, assignments } as PortSubmission;
}

export function ensureScenarioMatches(pathId: string, bodyId: string): void {
  if (pathId !== bodyId) throw new Error("Submission scenarioId does not match the request path");
}

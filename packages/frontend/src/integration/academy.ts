export interface IntegrationConfig {
  mode: "standalone" | "academy";
  parentOrigin: string | null;
  parentUrl: string | null;
}
let config: IntegrationConfig = { mode: "standalone", parentOrigin: null, parentUrl: null };
let token = "";
export const getIntegration = () => config;
export const setIntegration = (value: IntegrationConfig) => { config = value; token = ""; };
export const academyAuthorization = () => config.mode === "academy" && token ? `Bearer ${token}` : "";
export function acceptAcademyMessage(event: Pick<MessageEvent, "origin" | "source" | "data">, parent: Window): boolean {
  if (config.mode !== "academy" || event.origin !== config.parentOrigin || event.source !== parent || parent === window) return false;
  const data = event.data;
  if (!data || data.type !== "FORTISIM_AUTH" || data.version !== 1 || !(data.token === null || (typeof data.token === "string" && /^[A-Za-z0-9._~-]{1,8192}$/.test(data.token)))) return false;
  const next = data.token ?? "";
  if (next === token) return false;
  token = next;
  return true;
}
export function notifyAcademy(type: "FORTISIM_READY" | "FORTISIM_PROGRESS_SAVED" | "FORTISIM_AUTH_REQUIRED", payload: Record<string, unknown> = {}) {
  if (config.mode === "academy" && config.parentOrigin && window.parent !== window) {
    window.parent.postMessage({ type, version: 1, ...payload }, config.parentOrigin);
  }
}

export function expireAcademySession() {
  if (config.mode !== "academy" || !token) return;
  token = "";
  notifyAcademy("FORTISIM_AUTH_REQUIRED");
  window.dispatchEvent(new Event("fortisim:auth-expired"));
}

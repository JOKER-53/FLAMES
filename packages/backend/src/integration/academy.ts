import { Router, type Request } from "express";
import { isCompletionTask } from "@fortisim/engine";

export interface IntegrationConfig { mode: "standalone" | "academy"; parentOrigin: string | null; parentUrl: string | null; }
/** Validate the upstream identity before granting any local administrative access. */
export function academyIdentity(value: unknown) {
  const user = value as { id?: unknown; username?: unknown; email?: unknown; role?: unknown } | null;
  if (!user || typeof user !== "object" || typeof user.username !== "string" || !user.username.trim() || user.username.length > 1000) return null;
  if (typeof user.id === "number" ? !Number.isSafeInteger(user.id) || user.id <= 0 : typeof user.id !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(user.id)) return null;
  if (user.email !== undefined && user.email !== null && (typeof user.email !== "string" || user.email.length > 254)) return null;
  return { id: String(user.id), name: user.username, email: typeof user.email === "string" ? user.email : "", role: user.role === "admin" ? "instructor" as const : "student" as const, canManageContent: user.role === "admin" };
}
export function integrationConfig(): IntegrationConfig {
  const mode = process.env.PLATFORM_MODE || "standalone";
  if (mode !== "standalone" && mode !== "academy") throw new Error("PLATFORM_MODE must be standalone or academy.");
  if (mode === "standalone") return { mode, parentOrigin: null, parentUrl: null };
  const parent = new URL(process.env.ACADEMY_ORIGIN || "");
  const api = new URL(process.env.ACADEMY_API_URL || "");
  if (![parent, api].every(url => ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash)) throw new Error("Invalid Academy URLs.");
  if (parent.pathname !== "/") throw new Error("ACADEMY_ORIGIN must be an exact origin without a path.");
  return { mode, parentOrigin: parent.origin, parentUrl: parent.origin + "/" };
}
export function bearer(req: Request): string {
  const header = req.headers.authorization || "";
  return /^Bearer [A-Za-z0-9._~-]{1,8192}$/.test(header) ? header : "";
}
export class AcademyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function academyRequest(req: Request, path: string, data?: unknown): Promise<any> {
  const authorization = bearer(req);
  if (!authorization) throw new AcademyError(401, "Open this lab from Academy and sign in there.");
  const base = process.env.ACADEMY_API_URL!.replace(/\/$/, "");
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Authorization: authorization, ...(data === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(data === undefined ? {} : { method: "POST", body: JSON.stringify(data) }),
      redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new AcademyError([400, 401, 403, 404, 409].includes(response.status) ? response.status : 502,
      response.status === 401 ? "Academy session expired. Sign in again in Academy." : response.status === 409 ? "Another device saved this draft. Reload the saved version." : "Academy could not complete the request.");
    return await response.json();
  } catch (error) {
    if (error instanceof AcademyError) throw error;
    throw new AcademyError(503, "Academy is unavailable. Please try again.");
  }
}
export function academyAccountRouter(config: IntegrationConfig, validTask: (platform: string, id: unknown) => boolean = isCompletionTask) {
  const filter = (platform: string, ids: unknown[]) => [...new Set(ids.filter(id => validTask(platform, id)))];
  const router = Router();
  router.get("/session", (req, res) => res.json({
    user: res.locals.academyUser ?? null, registrationEnabled: false, authRequired: true, integration: config,
  }));
  router.use((req, res, next) => {
    if (!res.locals.academyUser) { res.status(401).json({ error: "Sign in through Academy." }); return; }
    next();
  });
  router.all(["/register", "/login", "/logout", "/classroom"], (_req, res) => {
    res.status(409).json({ error: "Accounts and classroom progress are managed in Academy." });
  });
  router.route("/progress/:platform").all((req, res, next) => {
    if (!["fortigate", "paloalto"].includes(req.params.platform)) { res.status(400).json({ error: "Unknown platform." }); return; }
    next();
  }).get(async (req, res, next) => {
    try {
      const data = await academyRequest(req, `/integrations/fortisim/progress/${req.params.platform}`);
      if (!Array.isArray(data.completed)) throw new AcademyError(502, "Academy returned invalid progress.");
      res.json({ completed: filter(req.params.platform, data.completed) });
    } catch (error) { next(error); }
  }).post(async (req, res, next) => {
    const completed = req.body?.completed;
    if (!Array.isArray(completed) || completed.length > 5000 || completed.some(id => !validTask(req.params.platform, id))) {
      res.status(400).json({ error: "Invalid completion list." }); return;
    }
    try {
      const data = await academyRequest(req, `/integrations/fortisim/progress/${req.params.platform}`, { completed: [...new Set(completed)] });
      if (!Array.isArray(data.completed)) throw new AcademyError(502, "Academy returned invalid progress.");
      res.json({ completed: filter(req.params.platform, data.completed) });
    } catch (error) { next(error); }
  });
  return router;
}

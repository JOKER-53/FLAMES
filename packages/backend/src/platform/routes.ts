import { Router, type RequestHandler } from "express";
import { PlatformStore } from "./store";
import { hashPassword, verifyPassword, requestUser, sessionToken, startSession, clearSession } from "./auth";

export function platformRouter(store: PlatformStore) {
  const router = Router();
  const attempts = new Map<string, { count: number; until: number }>();
  const limit: RequestHandler = (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip ?? "unknown";
    const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    entry.count++; attempts.set(key, entry);
    if (entry.count > 20) { res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." }); return; }
    next();
  };
  const credentials = (body: unknown) => {
    const data = body as { email?: unknown; password?: unknown; name?: unknown } | null;
    if (!data || typeof data.email !== "string" || typeof data.password !== "string") throw new Error("Email and password are required.");
    const email = data.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (data.password.length < 12 || data.password.length > 128) throw new Error("Use a password between 12 and 128 characters.");
    return { email, password: data.password, name: data.name };
  };
  router.get("/session", (req, res) => res.json({ user: requestUser(req, store) ?? null, registrationEnabled: process.env.ALLOW_REGISTRATION !== "false", authRequired: process.env.AUTH_REQUIRED === "true" }));
  router.post("/register", limit, async (req, res, next) => {
    try {
      if (process.env.ALLOW_REGISTRATION === "false") { res.status(403).json({ error: "Registration is disabled. Contact your instructor." }); return; }
      const data = credentials(req.body);
      if (typeof data.name !== "string" || !data.name.trim() || data.name.length > 80) { res.status(400).json({ error: "Enter a name of up to 80 characters." }); return; }
      const password = await hashPassword(data.password);
      if (store.findEmail(data.email)) { res.status(409).json({ error: "This email is already registered. Sign in instead." }); return; }
      const user = store.createUser(data.email, data.name.trim(), password);
      startSession(res, store, user); res.status(201).json({ user });
    } catch (error) {
      if (error instanceof Error && /required|valid email|password between/.test(error.message)) res.status(400).json({ error: error.message });
      else next(error);
    }
  });
  router.post("/login", limit, async (req, res, next) => {
    try {
      const data = credentials(req.body);
      const record = store.findEmail(data.email);
      // Perform password derivation for absent accounts as well.
      const valid = await verifyPassword(data.password, record?.password ?? `00000000000000000000000000000000:${"0".repeat(128)}`);
      if (!record || !valid) { res.status(401).json({ error: "Email or password is incorrect." }); return; }
      startSession(res, store, record.user); res.json({ user: record.user });
    } catch (error) {
      if (error instanceof Error && /required|valid email|password between/.test(error.message)) res.status(400).json({ error: error.message });
      else next(error);
    }
  });
  router.post("/logout", (req, res) => { store.revoke(sessionToken(req)); clearSession(res); res.json({ ok: true }); });
  router.get("/classroom", (req, res) => {
    const user = requestUser(req, store);
    if (!user) { res.status(401).json({ error: "Sign in to view your classroom." }); return; }
    if (user.role !== "instructor") { res.status(403).json({ error: "Instructor access required." }); return; }
    res.json({ students: store.roster(), provenance: "Student-reported completion; not an exam certification." });
  });
  router.use("/progress/:platform", (req, res, next) => {
    if (!["fortigate", "paloalto"].includes(req.params.platform)) { res.status(400).json({ error: "Unknown platform." }); return; }
    if (!requestUser(req, store)) { res.status(401).json({ error: "Sign in to save progress." }); return; }
    next();
  });
  router.get("/progress/:platform", (req, res) => {
    res.json({ completed: store.progress(requestUser(req, store)!.id, req.params.platform) });
  });
  router.post("/progress/:platform", (req, res) => {
    const completed = req.body?.completed;
    if (!Array.isArray(completed) || completed.length > 500 || completed.some(id => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) {
      res.status(400).json({ error: "Invalid completion list." }); return;
    }
    res.json({ completed: store.mergeProgress(requestUser(req, store)!.id, req.params.platform, completed) });
  });
  return router;
}

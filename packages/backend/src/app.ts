import { Diagnostics } from "./diagnostics";
import { schemaStatus } from "./db/migrations";
import { ClassroomStore } from "./classroom/store";
import { classroomRouter } from "./classroom/routes";
import { draftsRouter } from "./drafts/routes";
import { DraftError } from "./drafts/errors";
import { builtinDraftSpec } from "@fortisim/engine";
import { getScenarioById } from "./scenarios/registry";
import { ContentStore, ContentError } from "./content/store";
import { adminContentRouter, studentContentRouter } from "./content/routes";
import { integrationConfig, academyAccountRouter, academyRequest, AcademyError, bearer, academyIdentity } from "./integration/academy";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { createScenariosRouter } from "./routes/scenarios";
import { createSubmissionsRouter } from "./routes/submissions";
import { interfaceSubmissionsRouter } from "./routes/interfaceSubmissions";
import { portSubmissionsRouter } from "./routes/portSubmissions";
import { knowledgeCheckRouter } from "./routes/knowledgeCheck";
import { panRouter } from "./routes/panRoutes";
import { platformRouter } from "./platform/routes";
import { requestUser } from "./platform/auth";
import { PlatformStore } from "./platform/store";

export function createApp(store: PlatformStore, content = new ContentStore(":memory:"), diagnostics = new Diagnostics()) {
  const app = express();
  const integration = integrationConfig();
  const groups = new ClassroomStore(content.db, integration.mode === "academy" ? `academy:${integration.parentOrigin}` : "standalone");
  store.setCompletionResolver((platform, id) => content.isPublishedLesson(platform, id));
  app.disable("x-powered-by");
  app.use(diagnostics.middleware);
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  const allowed = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map(origin => origin.trim());
  app.use(cors({ origin: allowed, credentials: true }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin && !allowed.includes(req.headers.origin)) {
      res.status(403).json({ error: "Request origin is not allowed." }); return;
    }
    next();
  });
  app.use(express.json({ limit: "256kb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/integration/config", (_req, res) => res.json(integration));
  app.get("/api/content/catalog", (_req, res) => res.json({ modules: content.catalog(), ...content.learningSettings() }));
  if (integration.mode === "academy") {
    app.use("/api", async (req, res, next) => {
      if (!bearer(req)) {
        if (req.path === "/account/session") { next(); return; }
        res.status(401).json({ error: "Open this lab from Academy and sign in there." }); return;
      }
      try {
        const result = await academyRequest(req, "/auth/me");
        const user = academyIdentity(result?.user);
        if (!user) throw new AcademyError(502, "Academy returned an invalid identity.");
        res.locals.academyUser = user;
        next();
      } catch (error) { next(error); }
    });
  }
  // Bound tutoring costs and question-store pressure without blocking ordinary navigation.
  const tutorRequests = new Map<string, { count: number; until: number }>();
  app.use("/api", (req, res, next) => {
    if (!/feedback|knowledge-check/.test(req.path)) { next(); return; }
    const now = Date.now();
    for (const [key, value] of tutorRequests) if (value.until <= now) tutorRequests.delete(key);
    const key = res.locals.academyUser?.id ?? requestUser(req, store)?.id ?? req.ip ?? "unknown";
    const entry = tutorRequests.get(key) ?? { count: 0, until: now + 60_000 };
    entry.count++; tutorRequests.set(key, entry);
    if (entry.count > 20) {
      res.locals.rateLimit="tutor";
      res.setHeader("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
      res.status(429).json({ error: "Tutor request limit reached. Try again in a minute." }); return;
    }
    next();
  });
  app.use("/api/account", integration.mode === "academy" ? academyAccountRouter(integration, (platform, id) => store.isCompletionTask(platform, id)) : platformRouter(store, ownerId => groups.groups({ id: ownerId, email: "", name: "", role: "instructor" }).flatMap(group => group.members.map(member => member.id))));
  app.use("/api", (req, res, next) => {
    if (integration.mode !== "academy" && process.env.AUTH_REQUIRED === "true" && !requestUser(req, store)) {
      res.status(401).json({ error: "Sign in to access the training platform." }); return;
    }
    next();
  });
  app.use("/api/classroom", classroomRouter(groups, store, content, integration.mode === "academy"));
  app.use("/api/drafts", draftsRouter(store, integration.mode === "academy", (platform, id) => {
    const configuration = content.configurationExercise(id);
    if (configuration && configuration.vendor === platform) return { kind: configuration.exercise.family, scenarioVersion: configuration.version };
    const policy = platform === "fortigate" ? content.policyExercise(id) : null;
    return policy ? { kind: "policy", scenarioVersion: policy.version } : builtinDraftSpec(platform, id);
  }));
  app.use("/api/admin", adminContentRouter(content, store, integration.mode === "academy", () => ({...diagnostics.snapshot(),schemas:[...store.schemaStatus(),...schemaStatus(content.db)]})));
  app.use("/api/content", studentContentRouter(content));
  app.use("/api/scenarios", createScenariosRouter(content));
  app.use("/api/submissions", createSubmissionsRouter(id => content.policyExercise(id)?.scenario ?? getScenarioById(id)));
  app.use("/api/interface-submissions", interfaceSubmissionsRouter);
  app.use("/api/port-submissions", portSubmissionsRouter);
  app.use("/api/knowledge-check", knowledgeCheckRouter);
  app.use("/api/pan", panRouter);
  app.use((_req, res) => res.status(404).json({ error: "API route not found." }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof DraftError) { res.status(error.status).json({ error: error.message, code: error.code }); return; }
    if (error instanceof ContentError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof AcademyError) { res.status(error.status).json({ error: error.message }); return; }
    if (error.type === "entity.too.large") { res.status(413).json({ error: "Request is too large." }); return; }
    if (error instanceof SyntaxError && "body" in error) { res.status(400).json({ error: "Malformed JSON request." }); return; }
    res.locals.errorCategory = "internal";
    res.status(500).json({ error: "The request could not be completed. Try again." });
  };
  app.use(errors);
  return app;
}

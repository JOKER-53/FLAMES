import { Router } from "express";
import { isSimulatorConfiguration, type DraftSpec } from "@fortisim/engine";
import type { PlatformStore } from "../platform/store";
import { requestUser } from "../platform/auth";
import { academyRequest } from "../integration/academy";
import { DraftError } from "./errors";

export function draftsRouter(store: PlatformStore, academy: boolean, resolve: (platform: string, id: string) => DraftSpec | null) {
  const router = Router();
  router.use("/:platform/:id", (req, res, next) => {
    const user = academy ? res.locals.academyUser : requestUser(req, store);
    if (!user) { res.status(401).json({ error: "Sign in to save configurations across devices." }); return; }
    if (req.headers["x-flames-draft-owner"] && req.headers["x-flames-draft-owner"] !== String(user.id)) { res.status(403).json({ error: "Your account changed. Reload this lesson." }); return; }
    const spec = resolve(req.params.platform, req.params.id);
    if (!spec) { res.status(404).json({ error: "This lesson does not support simulator drafts." }); return; }
    res.locals.draftUser = user; res.locals.draftSpec = spec; next();
  });
  router.get("/:platform/:id", async (req, res, next) => {
    try {
      const draft = academy ? (await academyRequest(req, `/integrations/fortisim/drafts/${req.params.platform}/${req.params.id}`)).draft : store.simulatorDraft(res.locals.draftUser.id, req.params.platform, req.params.id);
      res.json({ spec: res.locals.draftSpec, draft });
    } catch (error) { next(error); }
  });
  router.all("/:platform/:id", async (req, res, next) => {
    if (!["PUT", "DELETE"].includes(req.method)) { res.status(405).json({ error: "Unsupported draft operation." }); return; }
    try {
      const spec = res.locals.draftSpec as DraftSpec;
      const data = req.body;
      if (!data || data.ownerId !== String(res.locals.draftUser.id)) throw new DraftError(403, "Your account changed. Reload the lesson before saving.", "owner-changed");
      if (!Number.isSafeInteger(data.revision) || data.revision < 0 || data.schemaVersion !== 1) throw new DraftError(400, "Invalid draft version.");
      if (data.scenarioVersion !== spec.scenarioVersion) throw new DraftError(409, "The exercise changed. Reload the lesson before saving.", "scenario-changed");
      const config = req.method === "DELETE" ? null : data.config;
      if (config !== null && !isSimulatorConfiguration(spec.kind, config)) throw new DraftError(400, "Invalid simulator configuration.");
      const draft = academy ? (await academyRequest(req, `/integrations/fortisim/drafts/${req.params.platform}/${req.params.id}`, { ...data, config, kind: spec.kind })).draft
        : store.saveSimulatorDraft(res.locals.draftUser.id, req.params.platform, req.params.id, spec.scenarioVersion, config, data.revision);
      res.json({ spec, draft });
    } catch (error) { next(error); }
  });
  return router;
}

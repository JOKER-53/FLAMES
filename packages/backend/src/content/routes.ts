import { validateConfigurationExercise, gradeConfigurationExercise } from "@fortisim/engine";
import { validatePolicyExercise, testPolicyExercise } from "./policyExercise";
import { ContentError } from "./store";
import { Router } from "express";
import { requestUser } from "../platform/auth";
import type { PlatformStore } from "../platform/store";
import { ContentStore } from "./store";

export function adminContentRouter(content: ContentStore, accounts: PlatformStore, academy: boolean, diagnostics?: () => unknown) {
  const router = Router();
  router.use((req, res, next) => {
    const user = academy ? res.locals.academyUser : requestUser(req, accounts);
    if (!user) { res.status(401).json({ error: "Sign in with an instructor account to manage content." }); return; }
    if (academy ? !user.canManageContent : user.role !== "instructor") { res.status(403).json({ error: "Content administrator access required." }); return; }
    next();
  });
  router.get("/learning-settings", (_req, res) => res.json(content.learningSettings()));
  router.put("/learning-settings", (req, res, next) => {
    try { res.json(content.setLearningVisibility(req.body?.learningGuideVisible)); } catch (error) { next(error); }
  });
  router.get("/diagnostics", (_req, res) => res.json(diagnostics?.() ?? {}));
  router.post("/validate-configuration", (req, res, next) => {
    try { const exercise = validateConfigurationExercise(req.body?.exercise, true, false); res.json(gradeConfigurationExercise(exercise, exercise.referenceConfig)); }
    catch (error) { next(new ContentError(400, error instanceof Error ? error.message : "Invalid configuration exercise.")); }
  });
  router.post("/validate-policy", (req, res, next) => {
    try { const exercise = validatePolicyExercise(req.body?.exercise, true, false); res.json(testPolicyExercise(exercise)); }
    catch (error) { next(new ContentError(400, error instanceof Error ? error.message : "Invalid exercise.")); }
  });
  router.post("/imports/preview", (req, res, next) => {
    try { res.json(content.previewImport(req.body)); } catch (error) { next(error); }
  });
  router.post("/imports", (req, res, next) => {
    try { res.status(201).json(content.importModule(req.body)); } catch (error) { next(error); }
  });
  router.get("/modules/:id/export", (req, res, next) => {
    try { res.setHeader("Content-Disposition", 'attachment; filename="flames-module.json"'); res.json(content.exportModule(req.params.id)); } catch (error) { next(error); }
  });
  router.get("/modules", (_req, res) => res.json({ modules: content.list() }));
  router.post("/modules", (req, res, next) => {
    try { res.status(201).json(content.create(req.body?.vendor, req.body?.title)); } catch (error) { next(error); }
  });
  router.get("/modules/:id/history", (req,res,next)=>{try{res.json({revisions:content.history(req.params.id)});}catch(error){next(error);}});
  router.get("/modules/:id/history/:revision", (req,res,next)=>{try{res.json({module:content.historical(req.params.id,req.params.revision)});}catch(error){next(error);}});
  router.post("/modules/:id/duplicate", (req,res,next)=>{try{res.status(201).json(content.duplicate(req.params.id,req.body?.revision));}catch(error){next(error);}});
  router.get("/modules/:id", (req, res, next) => {
    try { res.json(content.get(req.params.id)); } catch (error) { next(error); }
  });
  router.put("/modules/:id", (req, res, next) => {
    try { res.json(content.save(req.params.id, req.body?.module, req.body?.revision)); } catch (error) { next(error); }
  });
  router.post("/modules/:id/publish", (req, res, next) => {
    try { res.json(content.publish(req.params.id, req.body?.revision)); } catch (error) { next(error); }
  });
  router.post("/modules/:id/unpublish", (req, res, next) => {
    try { res.json(content.unpublish(req.params.id, req.body?.revision)); } catch (error) { next(error); }
  });
  router.delete("/modules/:id", (req, res, next) => {
    try { content.delete(req.params.id, req.body?.revision); res.json({ ok: true }); } catch (error) { next(error); }
  });
  return router;
}
export function studentContentRouter(content: ContentStore) {
  const router = Router();
  router.get("/lessons/:id/configuration", (req, res, next) => {
    try { res.json(content.publicConfigurationExercise(req.params.id)); } catch (error) { next(error); }
  });
  router.post("/lessons/:id/configuration/grade", (req, res, next) => {
    try { res.json(content.gradeConfiguration(req.params.id, req.body?.config, req.body?.version)); } catch (error) { next(error); }
  });
  router.get("/lessons/:id", (req, res, next) => {
    try { res.json(content.publicLesson(req.params.id)); } catch (error) { next(error); }
  });
  router.post("/lessons/:id/grade", (req, res, next) => {
    try { res.json(content.grade(req.params.id, req.body?.answers)); } catch (error) { next(error); }
  });
  return router;
}

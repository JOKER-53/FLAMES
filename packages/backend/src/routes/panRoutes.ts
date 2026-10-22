import { Router } from "express";
import fs from "fs";
import path from "path";
import { gradePanExercise } from "@fortisim/engine";
import { panFeedback, panKnowledgeCheck, panKnowledgeCheckAnswer } from "../controllers/panController";

export const panRouter = Router();

panRouter.get("/model", (_req, res) => {
  const candidatePaths = [
    path.resolve(__dirname, "../../../../pa-220-firewall.glb"),
    path.resolve(__dirname, "../../../pa-220-firewall.glb"),
    path.resolve(__dirname, "../../frontend/public/pa-220-firewall.glb"),
    path.resolve(process.cwd(), "pa-220-firewall.glb"),
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "model/gltf-binary");
      const stat = fs.statSync(filePath);
      res.setHeader("Content-Length", stat.size);
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.status(404).json({ error: "pa-220-firewall.glb not found on server." });
});

panRouter.post("/grade/:taskId", (req, res) => {
  try { res.json(gradePanExercise(req.params.taskId, req.body?.config)); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid configuration." }); }
});

panRouter.post("/feedback", panFeedback);
panRouter.get("/knowledge-check/:taskId", panKnowledgeCheck);
panRouter.post("/knowledge-check/answer", panKnowledgeCheckAnswer);

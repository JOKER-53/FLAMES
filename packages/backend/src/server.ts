import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { scenariosRouter } from "./routes/scenarios";
import { submissionsRouter } from "./routes/submissions";
import { interfaceSubmissionsRouter } from "./routes/interfaceSubmissions";
import { portSubmissionsRouter } from "./routes/portSubmissions";
import { knowledgeCheckRouter } from "./routes/knowledgeCheck";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/scenarios", scenariosRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/interface-submissions", interfaceSubmissionsRouter);
app.use("/api/port-submissions", portSubmissionsRouter);
app.use("/api/knowledge-check", knowledgeCheckRouter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.listen(PORT, () => console.log(`FortiSim backend listening on port ${PORT}`));

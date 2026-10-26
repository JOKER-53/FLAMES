import express from "express";
import { createRuntimeApp } from "./src/server";

// Vercel discovers this default-exported Express entry point. Initialization is
// shared per warm instance; failed initialization may be retried on the next request.
const app = express();
let runtime: ReturnType<typeof createRuntimeApp> | undefined;
app.use(async (req, res, next) => {
  try {
    runtime ??= createRuntimeApp().catch(error => { runtime = undefined; throw error; });
    (await runtime)(req, res, next);
  } catch (error) {
    console.error("FLAMES API initialization failed:", error instanceof Error ? error.message : "Unknown initialization error");
    res.status(503).json({ error: "The demo API could not start. Check the Vercel runtime configuration and Node.js version." });
  }
});
export default app;

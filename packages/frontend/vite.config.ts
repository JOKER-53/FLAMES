import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { createReadStream, statSync, existsSync } from "fs";
import type { Plugin } from "vite";

/**
 * Serve the PA-220 GLB directly from public/ with correct MIME type.
 * GLTFLoader requires Content-Type: model/gltf-binary and a clean stream.
 */
function serveGlb(): Plugin {
  return {
    name: "serve-pa220-glb",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/pa-220-firewall.glb") return next();

        const glbPath = resolve(__dirname, "public", "pa-220-firewall.glb");
        if (!existsSync(glbPath)) {
          console.error("[serve-pa220-glb] File not found:", glbPath);
          return next();
        }

        const { size } = statSync(glbPath);
        res.writeHead(200, {
          "Content-Type": "model/gltf-binary",
          "Content-Length": String(size),
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        });
        createReadStream(glbPath).pipe(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), serveGlb()],
    server: {
      port: 5173,
      proxy: {
        "/api": env.API_PROXY_TARGET || "http://127.0.0.1:4000",
      },
    },
  };
});

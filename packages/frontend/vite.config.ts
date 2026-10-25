import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { createReadStream, statSync, existsSync, readFileSync } from "fs";
import { createRequire } from "node:module";
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
        const file=req.url?.split("?")[0];
        if(!["/pa-220-firewall.glb","/firewall.glb","/firewall.optimized.glb"].includes(file??"")||!["GET","HEAD"].includes(req.method??""))return next();
        if(req.headers.range)return next();

        const glbPath = resolve(__dirname, "public", file!.slice(1));
        if (!existsSync(glbPath)) {
          console.error("[serve-pa220-glb] File not found:", glbPath);
          return next();
        }

        const gzip=typeof req.headers["accept-encoding"]==="string"&&/\bgzip\b/.test(req.headers["accept-encoding"])&&existsSync(glbPath+".gz");
        const served=gzip?glbPath+".gz":glbPath;
        const { size } = statSync(served);
        res.writeHead(200, {
          "Content-Type": "model/gltf-binary",
          "Content-Length": String(size),
          "Cache-Control": req.url?.includes("?v=")?"public, max-age=86400":"no-cache",
          "Vary":"Accept-Encoding",
          "X-Model-Size":String(statSync(glbPath).size),
          ...(gzip?{"Content-Encoding":"gzip"}:{}),
          "Access-Control-Allow-Origin": "*",
        });
        if(req.method==="HEAD"){res.end();return;}
        createReadStream(served).pipe(res);
      });
    },
  };
}

export default defineConfig(async ({ mode }) => {
  const preparePath=resolve(__dirname,"../../scripts/prepare-hardware.cjs");
  const models=existsSync(preparePath)?await createRequire(import.meta.url)(preparePath).prepareHardware():JSON.parse(readFileSync(resolve(__dirname,"public/hardware-manifest.json"),"utf8"));
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), serveGlb()],
    define:{__FLAMES_MODELS__:JSON.stringify(models)},
    server: {
      port: 5173,
      proxy: {
        "/api": env.API_PROXY_TARGET || "http://127.0.0.1:4000",
      },
    },
  };
});

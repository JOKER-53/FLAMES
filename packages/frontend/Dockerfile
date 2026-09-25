# Build context MUST be the repo root, same reasoning as backend/Dockerfile.

FROM node:20-slim AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN npm install --workspaces --include-workspace-root

COPY packages/engine packages/engine
COPY packages/frontend packages/frontend

WORKDIR /app/packages/frontend
EXPOSE 5173

# --host is required so Vite's dev server is reachable from outside the
# container (default Vite binds to localhost only, which is invisible
# to the host machine's browser when running inside Docker).
CMD ["npx", "vite", "--host"]

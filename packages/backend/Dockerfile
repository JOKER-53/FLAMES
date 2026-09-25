# Build context MUST be the repo root (see docker-compose.yml), not this
# folder -- npm workspaces needs the root package.json and sibling
# packages/engine present to resolve @fortisim/engine.

FROM node:20-slim AS base
WORKDIR /app

# Copy root + all package manifests first (better layer caching: this layer
# only invalidates when dependencies change, not on every source edit).
COPY package.json package-lock.json* ./
COPY packages/engine/package.json packages/engine/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN npm install --workspaces --include-workspace-root

# Now copy actual source for the packages this service needs.
COPY packages/engine packages/engine
COPY packages/backend packages/backend

WORKDIR /app/packages/backend
EXPOSE 4000

CMD ["npx", "ts-node-dev", "--respawn", "src/server.ts"]

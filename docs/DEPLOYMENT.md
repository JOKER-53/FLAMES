# Deployment and operations

This repository includes deployable configuration, not a running public service. Use Node 22.13+; the API uses built-in SQLite. No extra database package or browser download is needed.

## Local development

Run `npm ci`, copy `packages/backend/.env.example` to `packages/backend/.env`, then run `npm run backend:dev` and `npm run frontend:dev` in separate terminals. The database defaults to `packages/backend/data/fortisim.sqlite` when using the workspace dev command. Guest mode is enabled by default. AI settings may remain blank.

Development Docker uses `docker compose up --build`. It exposes 5173 and 4000 on loopback only and keeps account data in a named volume. The Node development images were updated to 22 because SQLite is unavailable in Node 20. The development backend rebuilds the shared engine at startup. After editing engine source, restart it with `docker compose restart backend`; frontend source and runtime assets are mounted for development.

## HTTPS-hosted classroom

1. Choose a host and HTTPS domain. Configure your existing TLS reverse proxy to forward that site to `127.0.0.1:8080`. This project does not provision a domain or certificates.
2. Copy `.env.production.example` to `.env.production`. Set FRONTEND_ORIGIN to the exact HTTPS origin, without a trailing slash. Set both instructor bootstrap fields and choose a unique password of 12–128 characters. Optional NIM credentials stay server-side. Keep the environment file private and outside Git; it is ignored.
3. Validate and build:

   ```bash
   docker compose --env-file .env.production -f compose.production.yml config --quiet
   docker compose --env-file .env.production -f compose.production.yml up -d --build
   ```

4. Check services:

   ```bash
   docker compose --env-file .env.production -f compose.production.yml ps
   curl -fsS http://127.0.0.1:8080/health
   curl -fsS http://127.0.0.1:8080/api/health
   ```

5. Visit `/account` through the HTTPS domain, sign in as the instructor, register a test student, complete a task, sign out, and confirm that progress returns after signing in on another device. Verify `/classroom` as instructor and confirm a student cannot open the roster.
6. Remove both INSTRUCTOR_EMAIL and INSTRUCTOR_PASSWORD from the environment after bootstrap and recreate the backend. The existing instructor account is retained; bootstrap never resets a password or upgrades a student role. There is no email reset flow in this release—establish an operator recovery process before accepting real students.

The production Compose project is named `fortisim-production`, separate from the development project so their database volumes are not accidentally shared. The API is not published on a host port. It runs as Node's non-root user; Nginx runs unprivileged. Both services use read-only root filesystems, temporary `/tmp`, dropped capabilities, and health checks. SQLite's `/data` is the writable exception.

AUTH_REQUIRED=true blocks anonymous training API requests; public health, session, registration, and login routes remain available. ALLOW_REGISTRATION=false disables self-registration but does not create replacement student accounts. For a closed roster, register approved students before disabling it. Secure production cookies require HTTPS. Do not disable their Secure flag to work around a TLS setup problem.

Nginx sets framing, content-type, referrer, permission, and content-security headers. An outer TLS proxy should supply your HTTPS/HSTS policy. The API trusts one Nginx hop in this topology; do not publish it directly or accept arbitrary forwarded headers. Rate limits are in-memory; authenticate students and keep this deployment single-instance unless you add shared limiting/session-question infrastructure.

## Backups and updates

Account/progress data is in `fortisim-production_classroom-data`. Back it up before updates and on a schedule. For a filesystem copy, stop the backend first so SQLite and WAL files form a consistent snapshot, copy the whole volume including WAL/SHM files using your approved volume-backup tool, then restart it. Alternatively, use a tested SQLite online-backup tool. Do not copy only a live `.sqlite` file and assume it is consistent.

Test restoration into a separate deployment before relying on a backup. Restoring production replaces student data and must be an explicit operator action. `docker compose down` keeps the data volume; `down -v` deletes it, so do not use the latter for ordinary updates or cleanup.

Update using the same environment/project name, rebuild, and repeat the smoke checks. Keep an image/backup rollback point. This release initializes its schema with CREATE TABLE IF NOT EXISTS; future incompatible schema changes require a migration plan.

## Release validation

Run `npm run verify` for the current checkout. It builds the shared engine and API, runs package-owned engine/API/frontend tests, and type-checks/builds the SPA. Local API tests require a temporary localhost listener. A clean dependency install is required after changing branches or manifests.

CI also validates production Compose configuration and builds both production images. Before release, perform the live HTTPS/account/progress smoke checks above and manual browser/mobile/WebGL checks in [the release checklist](RELEASE_CHECKLIST.md). Unit and static-render tests do not establish visual socket alignment or production TLS readiness.

`vercel.json` is a separate hosting configuration. The current backend uses a local SQLite file and in-memory question/rate-limit stores; ephemeral or independently scaled serverless instances do not provide the persistence and shared state assumed by the classroom flow. The documented persistent Compose deployment remains the reference topology.

## College Academy deployment

For parent-owned accounts and progress, use `compose.academy.yml` with `.env.academy.example` and install the parent adapter first. This topology does not mount a local classroom database volume. See [Academy integration](PARENT_LMS_INTEGRATION_GUIDE.md) for the actual college frontend origin, API configuration, framing headers, HTTPS, and installation/acceptance steps.

## Simulator draft storage

Standalone student configurations persist in `simulator_drafts` in the existing account SQLite database; include it in the same consistent backup. Academy users persist configurations only in the parent MySQL `fortisim_simulator_drafts` table. Apply the additive adapter schema and copy `simulator-contract.mjs` with the updated router before enabling autosave there. The authored-content database remains separate and includes published policy exercises and private reference solutions. See [autosave/builder upgrade](AUTOSAVE_AND_EXERCISE_BUILDER.md).

## Operational tools and classroom reporting

Use the [operations runbook](OPERATIONS_RUNBOOK.md) for the shipped SQLite snapshot/restore tool, hidden instructor password recovery, production checking-password guard and release/rollback procedure. Production images include the operational scripts. Group/assignment metadata is part of the content database and must be included in backups. The updated Academy router is required for integrated instructor assignment reports; no local progress copy is used. See [classroom ownership and content transfer](CLASSROOM_AND_CONTENT_TRANSFER.md).

### Development engine changes

`npm run backend:dev` and the development Compose backend now use `scripts/backend-dev.cjs`. It watches both packages, compiles engine/backend together, and replaces the API only after success. Compiler errors keep the previous API running and are retried on the next source edit. This avoids stale shared declarations taking down `/api/integration/config` when engine exports change. Dependency changes still require rebuilding development images. Production continues to use the built API directly.

## Temporary Vercel demonstration

The backend service has a root `app.ts` default Express export for Vercel discovery. On Vercel, default SQLite paths use the writable temporary directory rather than the read-only application bundle. This is a temporary demonstration setup, not durable hosting: accounts, content, certificates, question sessions and rate limits are per-instance and may disappear or differ after cold starts/scaling. The training page labels this mode. Do not use it for real student records or assessment acceptance.

For a standalone demonstration, set backend service environment variables:

```text
PLATFORM_MODE=standalone
FRONTEND_ORIGIN=https://flames-nine-orcin.vercel.app
AUTH_REQUIRED=false
ALLOW_REGISTRATION=false
```

Use Node.js 22.x or a supported newer runtime with `node:sqlite`. Remove old `DATABASE_PATH`/`CONTENT_DATABASE_PATH` overrides that point to read-only locations, or explicitly set `/tmp/flames-demo/fortisim.sqlite` and `/tmp/flames-demo/content.sqlite`. Do not set `ACADEMY_*` values unless a reachable Academy is actually being used. If admin editing is required, configure `INSTRUCTOR_EMAIL` and a unique `INSTRUCTOR_PASSWORD` of at least 12 characters through Vercel's private environment settings, not committed source. Remove invalid/incomplete bootstrap instructor variables if only guest demonstration is needed.

Redeploy after changing environment variables. Verify `/api/health` and `/api/integration/config` return JSON before opening a course. A `FUNCTION_INVOCATION_FAILED` response is a function startup/runtime failure; use Vercel runtime logs for the exact exception if it persists. Vercel credentials are not stored in this repository, so the local fix does not establish a successful remote deployment.

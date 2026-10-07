# Deployment and operations

This repository includes deployable configuration, not a running public service. Use Node 22.13+; the API uses built-in SQLite. No extra database package or browser download is needed.

## Local development

Run `npm ci`, copy `packages/backend/.env.example` to `packages/backend/.env`, then run `npm run backend:dev` and `npm run frontend:dev` in separate terminals. The database defaults to `packages/backend/data/fortisim.sqlite` when using the workspace dev command. Guest mode is enabled by default. AI settings may remain blank.

Development Docker uses `docker compose up --build`. It exposes 5173 and 4000 on loopback only and keeps account data in a named volume. The Node development images were updated to 22 because SQLite is unavailable in Node 20. Rebuild after shared-engine edits; dev source mounts alone do not rebuild the backend's compiled engine.

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

## Verification actually performed

`npm run verify`, production Compose configuration validation, and Nginx syntax validation against an already-installed Nginx image were run locally. CI is configured to build both production images, but the new Node 22/unprivileged-Nginx images were not downloaded or built locally to avoid additional storage consumption. A passing configuration check does not establish a passing image build or live TLS deployment.

AI provider calls and full browser/mobile/WebGL visual acceptance were not exercised. No Playwright was used. Use the manual checklist in [the upgrade report](UPGRADE_2026-10-02.md) before public release.

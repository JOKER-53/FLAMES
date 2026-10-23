# FLAMES

A dual-vendor firewall training lab with FortiOS-style and PAN-OS-style consoles, guided exercises, and interactive 3D hardware. It simulates configuration and traffic checks; it does not connect to real firewalls.

Current changes: [updation.md](updation.md). Prioritized future work: [TODO.md](TODO.md).

## Run locally

Use Node 22.13+ and npm. Run these commands from the repository root:

```bash
npm ci
cp packages/backend/.env.example packages/backend/.env
npm run backend:dev
```

In a second terminal:

```bash
npm run frontend:dev
```

Open http://localhost:5173. Vite forwards `/api` to `127.0.0.1:4000`; `API_PROXY_TARGET` overrides the target. AI credentials are optional and stay in the backend environment. Never put secrets in `VITE_` variables.

## Academy integration and appearance

To use Academy-owned authentication and progress, set `PLATFORM_MODE=academy` and install the supplied [Academy adapter](integrations/academy/README.md). In this mode FLAMES uses the parent login and saves completion only to Academy; it creates no local student accounts or persistent progress cache. Follow the [college integration guide](docs/PARENT_LMS_INTEGRATION_GUIDE.md) for the current host, configuration, and installation steps. Standalone mode remains the default.

The header provides light/dark mode on landing, course, and account pages. The first visit follows the system theme; an explicit choice is saved on the device.

## Current app flow

Choose a vendor at `/`, open its course overview, select a module, then work through lessons and final assessments. The sidebar tracks completion and provides hardware and reference tools. See [application flow](docs/APPLICATION_FLOW.md) for routes and grading boundaries.

- **FortiGate:** firewall policies, interfaces, port assignment, and basic static routing; address/service references; a 60F hardware explorer and cable practice.
- **Palo Alto:** security policies, zones, NAT, interfaces and ports; App-ID reference; a PA-220 hardware explorer and cable practice.
- **Hardware:** full-width in-page viewers with tall canvases, a smaller initial model scale, manual rotation, zoom/reset, component inspection, and cable/socket controls.
- **Accounts:** optional student sign-in, SQLite-saved completion, account-specific caches, and an instructor roster. Guests retain device-local completion.
- **Tutoring:** optional AI hints and one-use knowledge questions, with offline fallbacks when the provider is unavailable.

To create the first instructor, set `INSTRUCTOR_EMAIL` and a unique 12–128 character `INSTRUCTOR_PASSWORD` in the backend environment before starting. Bootstrap never changes an existing password or promotes a student. Remove both settings after account creation. `AUTH_REQUIRED=true` requires training sign-in; `ALLOW_REGISTRATION=false` disables self-registration.

Configuration drafts are not persisted. Completion is student-reported practice progress rather than a certified exam score. Browser bundles contain exercise definitions; answer stripping in the scenario API is not an answer-key secrecy guarantee. PAN behavior is intentionally simplified; see [architecture](docs/ARCHITECTURE.md).

## Repository layout

| Location | Responsibility |
| --- | --- |
| `packages/engine` | Shared simulation, graders, types, scenarios, engine tests |
| `packages/backend` | Express API, SQLite accounts/progress, optional AI services, API tests |
| `packages/frontend` | React app, vendor pages, 3D hardware, frontend tests and runtime assets |
| `integrations/academy` | Copy-in Academy auth/progress adapter, database schema, and iframe wrapper |
| `scripts` | Maintained development utilities |
| `assets/source` | Non-runtime source assets |
| `deploy` | Nginx configuration |
| `docs` | Current documentation and a separate historical archive |

Use the single root `package-lock.json` for workspace dependencies. See [file placement rules](docs/REPOSITORY_STRUCTURE.md).

## Content administration

Open `/admin` with an instructor account (or a verified Academy admin) to create modules, lessons, and tasks. Drafts remain private until published. Lessons support instructions, multiple-choice questions, short answers, preview, ordering, and server-side grading. Published lessons appear in course navigation and progress totals.

Create your own local administrator with `npm run admin:create`, or `docker compose exec backend npm --prefix /app run admin:create`. Password input is hidden; no shared default account is installed. See [admin setup and authoring](docs/ADMIN_CONTENT.md).

## Verification and builds

```bash
npm run verify
```

This builds the engine/API, runs tests in all three packages, type-checks the frontend, and builds the SPA. API tests open a temporary localhost listener. Frontend tests cover static rendering and hardware maps; they do not replace browser/WebGL interaction checks.

`npm run build` builds all packages. `npm run engine:demo` runs the engine demonstration. Rebuild the engine after shared-source changes used by a running backend.

## Hosting and documentation

For development containers, copy the backend example environment file and run `docker compose up --build`. For production use the [deployment guide](docs/DEPLOYMENT.md), including HTTPS, persistent storage, backups, and recovery planning. The repository's Vercel configuration is not a substitute for durable SQLite hosting.

Start at the [documentation index](docs/README.md). Contributors should read [CONTRIBUTING.md](CONTRIBUTING.md); dated reports and retired prototypes are in [docs/archive](docs/archive/README.md).

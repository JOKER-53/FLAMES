# FLAMES

A firewall learning platform with FortiGate-style and Palo Alto-style consoles, 48 native tasks, instructor-authored lessons, packet explanations and interactive 3D hardware. FLAMES simulates configuration and traffic decisions; it does not configure real appliances.

[Learning handbook](docs/LEARNING_HANDBOOK.md) · [Documentation](docs/README.md) · [Repository map](docs/REPOSITORY_STRUCTURE.md) · [Work plan](TODO.md) · [Change history](updation.md)

## Run locally

Use Node 22.13+ and npm. From the repository root:

```bash
npm ci
cp packages/backend/.env.example packages/backend/.env
npm run backend:dev
```

In a second terminal:

```bash
npm run frontend:dev
```

Open http://localhost:5173. Vite proxies `/api` to `127.0.0.1:4000`; `API_PROXY_TARGET` overrides that target. The backend development supervisor builds engine/API changes together and replaces the API only after compilation succeeds. AI credentials are optional and belong in the backend environment, never in `VITE_` variables.

For development containers, copy the backend environment example and run `docker compose up --build`. Container and production instructions are in the [deployment guide](docs/DEPLOYMENT.md).

## Learn, practice and teach

- **FortiGate:** 28 native tasks covering policy, interfaces, ports, static routing and operations practice, plus address/service references and a 60F hardware explorer.
- **Palo Alto:** 20 native tasks covering security policy, zones, NAT, interfaces/ports and operations practice, plus App-ID reference and a PA-220 hardware explorer.
- **Learning material:** ten chapters, individual task plans, worked examples, flowcharts, mistakes and self-check explanations. Administrators enable **Student learning guide** for both courses; it is hidden from students by default and administrators retain previews.
- **Practice tools:** autosaved configurations, positive/negative packet tests, ordered traces, topology and Network view, graded checks, staged hints and optional AI tutoring with labelled offline fallbacks.
- **Teaching:** instructor-owned classroom groups, invitations, assignments/deadlines, scoped progress reports and CSV export.
- **Content studio:** private draft lessons, visual policy/configuration builders, publication, search, duplication, private revision comparisons and versioned import/export.
- **Appearance and credits:** shared light/dark controls and a header-only Credits link. The public credits page includes contributor profiles, BeyondBug links and the original framed team photograph.

Start at `/`, choose a course and module, then open a task. Use **Study this task** when the guide is available. Packet exploration and reading the guide do not mark tasks complete. Existing final assessments retain their prerequisite rules. See [application flow](docs/APPLICATION_FLOW.md) for the complete route map and model boundaries.

## Identity and administration

Standalone mode supports optional local sign-in and SQLite-backed account completion/drafts. Guests use local device storage; guest work is not silently assigned to a signed-in account. `AUTH_REQUIRED=true` requires training login; `ALLOW_REGISTRATION=false` disables registration.

Create your own instructor with `npm run admin:create`, or `docker compose exec backend npm --prefix /app run admin:create`. Alternatively, bootstrap a first instructor with `INSTRUCTOR_EMAIL` and a unique 12–128 character `INSTRUCTOR_PASSWORD`, then remove those environment settings. Bootstrap does not change an existing password or promote a student. No shared production checking account should be used. Open `/admin` to manage content and student learning-guide visibility. See [administration](docs/ADMIN_CONTENT.md).

Set backend `PLATFORM_MODE=academy` to delegate identity, completion and simulator drafts to Academy. Install the companion [Academy adapter](integrations/academy/README.md) in that separate project; FLAMES does not install or deploy it automatically. FLAMES retains authored content and teaching settings locally. Parent failures do not fall back to local student accounts. Follow [integration setup](docs/PARENT_LMS_INTEGRATION_GUIDE.md), and verify the actual deployed parent version before acceptance.

Completion is practice progress, not certified examination evidence. Native exercise definitions can be browser-visible; private authored answers remain behind API serializers. App-ID, sessions, routing, NAT and HA/management behavior are deliberately simplified teaching models.

## Repository ownership

| Location | Responsibility |
| --- | --- |
| [packages/engine](packages/engine/README.md) | Feature-grouped simulation, graders, scenarios, content/progress contracts and hints |
| [packages/backend](packages/backend/README.md) | API, accounts, content, classrooms, drafts, migrations, diagnostics and AI transport |
| [packages/frontend](packages/frontend/README.md) | React routes, shared shells, vendor screens, learning source, hardware and runtime assets |
| [integrations/academy](integrations/academy/README.md) | Companion adapter, schema, manifest and iframe wrapper for Academy |
| [scripts](scripts/README.md) | Maintained development, generation and operational commands |
| [tests](tests/README.md) | Cross-package isolated browser workflows |
| `assets/source` | Non-runtime model originals |
| `deploy` | Nginx configuration; Docker/Compose entry points remain at the root |
| [docs](docs/README.md) | Maintained guides and a separate historical archive |

Use the single root `package-lock.json`. Source moves preserve `@fortisim/engine` public exports and existing route/model URLs. See [placement rules](docs/REPOSITORY_STRUCTURE.md).

## Commands and verification

| Command | Purpose |
| --- | --- |
| `npm run verify` | Build engine/API, run package tests, type-check and build the frontend |
| `npm run build` | Build all three packages |
| `npm run docs:check` | Check local Markdown file links in maintained documentation |
| `npm run docs:learning` | Regenerate the handbook from curriculum and shared learning JSON |
| `npm run sync:academy` | Regenerate the Academy simulator validator after engine draft-contract changes |
| `npm run engine:demo` | Run the standalone engine demonstration |
| `npm run admin:create` | Interactive instructor setup/recovery |
| `npm run data:backup` / `npm run data:restore` | Explicit operational backup/restore workflows |

For browser checks, build the application, install browsers with `npx playwright install chromium firefox`, then run `npm run test:browser` and `PLAYWRIGHT_BROWSER=firefox npm run test:browser`. The fixture uses temporary databases, disables live AI and does not open development user data. Do not run separate browser suites concurrently because they share fixture ports. See [browser testing](docs/BROWSER_TESTING.md).

Automated layout/accessibility checks do not replace actual-device WebGL/socket alignment or assistive-technology acceptance. Production hosting, HTTPS, parent integration, backup scheduling and release acceptance require the target environment. See [deployment](docs/DEPLOYMENT.md), [operations](docs/OPERATIONS_RUNBOOK.md) and the [release checklist](docs/RELEASE_CHECKLIST.md). `vercel.json` alone does not provide durable SQLite hosting.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), keep secrets/runtime data out of Git, and update the relevant guide when behavior or ownership changes. Dated verification reports and retired tools belong in [docs/archive](docs/archive/README.md), not among active setup instructions.

Internal college completion certificates are available through **Certificates** in the header. Staff customize both vendor designs, preview layouts and manage local roll numbers from **Admin**. These records are explicitly not approved certificates and are not for placements. See [certificate guide](docs/CERTIFICATES.md), [configuration tools](docs/CONFIGURATION_TOOLS.md) and [remaining acceptance](docs/acceptance/NON_AWS_ACCEPTANCE.md).

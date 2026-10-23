# Architecture

FLAMES is an npm workspace with three packages.

| Package | Responsibility |
| --- | --- |
| engine | Pure traffic matching, graders, scenario definitions, PAN practice models |
| backend | Express API, input validation, SQLite accounts/sessions/progress, tutoring proxy |
| frontend | React routes, vendor consoles, hardware interaction, guest/account completion cache |

See [repository structure](REPOSITORY_STRUCTURE.md) for file ownership and [application flow](APPLICATION_FLOW.md) for the current user journey. Frontend screens are grouped into `pages/fortigate/`, `pages/pan/`, and shared course/account pages. Each workspace owns its tests.

## Runtime

The frontend sends same-origin /api requests. Vite forwards them to the API during development; Nginx does so in production. The API loads compiled CommonJS engine output. Vite consumes the engine's TypeScript browser entry. Rebuild the engine after source changes when running the backend independently.

AccountProvider resolves session state before hosted training access. Local guest practice remains available unless AUTH_REQUIRED=true. Passwords use salted scrypt, session tokens are random and stored as SHA-256 digests, and sessions expire after seven days. Cookie flags are HTTP-only, SameSite=Lax, and Secure in production. Mutating requests with an unapproved Origin are rejected. Registration never accepts a caller-selected instructor role.

SQLite tables hold users, sessions, and completion markers. WAL and a busy timeout support a small single-instance classroom. Completion writes are transactional, monotonic merges keyed by user + platform + task. Completion IDs are validated against a shared public lesson registry and invalid legacy IDs are excluded from reads. Device caches use account-specific keys, so guest history is not silently assigned to an account. Roster access is instructor-only. This is one shared classroom, not a multi-tenant institution system.

## Grading and tutoring

FortiGate policy/interface/port submissions are graded by API endpoints. Palo Alto security/zone/NAT submissions use /api/pan/grade/:taskId and the shared PAN exercise definitions. Security checks evaluate effective first-match traffic behavior; zone checks enforce exclusive interface ownership; NAT checks require coherent exact mappings instead of unrelated partial rules or substring matches.

The AI tutor is optional. Requests use a 15-second timeout, and grading reports remain usable on provider failure. Generated questions are validated, kept in a capped 15-minute store, and consumed once. Restarting the API invalidates pending questions. The question store is in-memory and unsuitable for an uncoordinated multi-replica deployment.

Knowledge checks and ordinary submissions both contribute student-reported completion. Instructor counts are not tamper-proof grades. Configuration drafts are ephemeral. Some tools still evaluate locally. Browser bundles include exercise definitions; API answer stripping is not a claim of browser answer-key secrecy.

## UI and hardware

Routes are lazy-loaded. The initial bundle does not include Three.js; hardware pages load it on demand. The hardware renderer derives front-panel depth from model bounds and keeps socket indicators/connectors in the same rotating group. Hardware reference pages use a full-width, tall in-page canvas with a pulled-back initial camera; supporting details scroll below. Reset restores that initial camera. Explore hides dots and cables. Cable mode starts empty, allows manual rotation, provides keyboard port controls, and clears connections with Reset. WebGL errors are surfaced; geometry, materials, textures, observers, timers, and handlers are cleaned up.

The model's socket X/Y anchors remain calibrated to the supplied asset. Automated checks establish unique ordered anchors and cable compatibility, not pixel-perfect socket fit. Visual acceptance must use current screenshots or manual interaction.

## Deployment boundary

The production build has a non-root Node API and an unprivileged Nginx SPA target. Only the frontend port is exposed on loopback; an external HTTPS reverse proxy must terminate TLS. The API trusts one internal Nginx hop only when TRUST_PROXY=1. Do not expose that API directly or broaden proxy trust without reassessing the network boundary. SQLite lives in a persistent volume; backup it with the API stopped or use a consistent SQLite backup tool.

Production and dev containers are deliberately separate. See [deployment](DEPLOYMENT.md) and [release checklist](RELEASE_CHECKLIST.md).

## Academy mode

`integration/academy.ts` provides runtime configuration, parent identity validation, and the progress proxy. In Academy mode the standalone SQLite store is in-memory and no local credentials/progress are used. The frontend accepts bearer credentials from its exact configured parent and keeps them only in memory. The companion `integrations/academy` package uses Academy JWT middleware and MySQL; the supplied wrapper displays saved completion in Academy. Parent failures produce errors instead of falling back to a local account. No signing keys are shared.

The React UI uses light/dark CSS tokens initialized before render by `public/theme-init.js`. The theme preference is independent of account and progress storage.

## Authored content

The API `content/` module maintains a separate SQLite content database with draft and published JSON snapshots, revision checks, and server-side task grading. Published catalog metadata is public; lesson answer keys remain on the server. `CourseCatalogProvider` merges published modules with the built-in curriculum so existing shells, navigation, and progress use the combined lesson list. Built-in engine graders remain unchanged. Academy can consume the public catalog from its configured `FLAMES_CATALOG_URL` to validate custom IDs and compute totals.

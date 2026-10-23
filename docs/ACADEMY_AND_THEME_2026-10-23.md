# Academy integration and theme verification — 2026-10-23

## Implementation

- Runtime-selectable Academy mode validates the parent bearer identity through Academy `/api/auth/me`, proxies saved completion, disables local account operations, and uses no persistent local progress/account store.
- An origin-checked, versioned iframe bridge keeps credentials in memory, scopes API credentials to same-origin requests, ignores duplicate initialization, reports expiry, and only notifies the parent of successful completion saves.
- Copy-in Academy Express/MySQL adapter, lesson manifest, SQL schema, and React iframe/progress wrapper are in `integrations/academy/`.
- `.env.academy.example`, `compose.academy.yml`, and a generated exact-origin Nginx configuration support the college topology. The configuration helper regenerates the framing policy when the parent origin changes.
- Light/dark toggle appears in shared headers, follows system preference on first visit, saves explicit preferences, and updates course/console/form/topology colors. Theme initialization runs before React to avoid a light flash.

The reference Academy source is public `main` at `e7b04c60a92fe81c40130dbeae369fd69cebbee5`. The supplied frontend `http://110.172.151.108:5173/` returned HTTP 200 to a read-only HEAD request. Its deployed commit and actual backend API address remain unverified. No college files, data, or services were changed.

## Validation performed

- `npm run verify`: 39 engine tests, 34 backend tests, 21 frontend tests; engine/API compilation, frontend type checking, and SPA build passed.
- Academy API tests cover identity validation, local-session rejection, parent-only completion, account isolation, malformed credentials, invalid lesson IDs, and parent outages.
- Adapter tests exercise authenticated routing and parameterized/idempotent writes with an injected database interface. The shipped public lesson manifest matches the engine registry.
- Bridge tests reject forged origins/windows, prevent credential forwarding to unrelated URLs, check expiry and logout, and verify exact-origin notifications.
- Headless Chromium browser checks passed for light/dark switching, reload persistence, system dark preference, both vendor lesson pages, mobile page width, and absence of page errors.
- A browser iframe flow against a local mock Academy passed login, grading a static-route lesson, parent-side save, progress restoration after reload, parent logout, no browser token/progress persistence, and absence of page errors.
- Local Markdown links, JavaScript syntax for shipped adapter/init scripts, YAML parsing, and `git diff --check` passed.

## Still requires college acceptance

The parent adapter must be installed and its table migrated using the college's deployment process. Confirm the deployed Academy revision, actual API address, HTTPS/ports, Nginx framing policy, and two real user accounts. Existing Academy room scoring/certificates are not automatically mapped to FLAMES practice completion.

Live MySQL migration, real Academy credentials, live AI calls, and production container runtime were not exercised. The development Docker images were subsequently rebuilt and both services restarted; the actual `http://localhost:5173` settings/health APIs and light/dark browser flows passed. CI validates the Compose definitions and builds production images. The SPA build retains its existing lazy-loaded Three.js chunk-size warning. See [integration setup](PARENT_LMS_INTEGRATION_GUIDE.md).

## Local Docker recovery and FLAMES branding

The running development backend initially had stale compiled shared-engine exports and stopped compiling while source files continued to update through bind mounts. Rebuilt the shared engine and both development images, then recreated the services while retaining the classroom-data volume. Development Compose now invokes `backend:dev` from the workspace root so every backend startup rebuilds the engine. Frontend runtime assets and `index.html` are mounted alongside source.

Verified the actual existing `localhost:5173` frontend, its proxied settings/health endpoints, both vendor lesson pages, theme persistence, system preference, mobile layout, and no browser page errors. Visible project branding, browser titles, and current documentation use **FLAMES**. Internal workspace/protocol/storage identifiers remain stable for compatibility. The Academy wrapper is now named `FlamesLab.jsx`.

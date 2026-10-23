# FLAMES — project update

Date: 2026-10-23  
Target branch: `NewFeatures`

This document records the current implementation and verification. Outstanding work and proposed features are tracked separately in [TODO.md](TODO.md).

## 1. Branding and repository structure

- Visible project branding, browser titles, and current guides use **FLAMES**.
- Existing `@fortisim/*` workspace names, protocol identifiers, session keys, and integration URLs remain stable for compatibility.
- FortiGate pages are grouped in `packages/frontend/src/pages/fortigate/`; Palo Alto pages remain under `pages/pan/`.
- Hardware pages have descriptive names: `FortiGateHardwarePage.tsx` and `PanHardwarePage.tsx`.
- Tests belong to their owning engine, backend, or frontend package.
- Maintained utilities are in `scripts/`, non-runtime source assets in `assets/source/`, and historical notes/prototypes in `docs/archive/`.
- The duplicate root PA-220 model was removed; runtime GLBs remain in `packages/frontend/public/`.
- The root `package-lock.json` is the active npm workspace lockfile.
- Updated setup, contribution, architecture, deployment, scenario-authoring, and integration documentation. The [documentation index](docs/README.md) links the current guides.

See [repository structure](docs/REPOSITORY_STRUCTURE.md).

## 2. Hardware viewer improvements

- Both vendor hardware references use the full course content width and a taller viewer.
- The sidebar, header, and controls remain visible; this is an in-page layout.
- Initial camera distance was increased so the appliances load at a comfortable scale within the expanded viewer.
- Reset returns to the adjusted initial camera view.
- Explore, rotation, zoom, cable/socket interaction, and keyboard-accessible port controls remain available.

## 3. Internal bug fixes

| Area | Change |
| --- | --- |
| Domain filtering | Normalize capitalization, whitespace, and trailing dots; retain correct subdomain boundaries. |
| Missing filter references | Prevent an invalid policy from silently accepting traffic without its referenced filter. |
| Static routing | Reject incorrect preferred/equal-cost competing routes; allow lower-priority backups and equivalent CIDR networks. |
| Login limits | Separate login identities and registration limits; successful sign-ins do not consume the shared classroom failure quota. |
| Completion validation | Reject unknown/wrong-vendor IDs and exclude invalid historical IDs from counts. |
| Interface masks | Normalize every contiguous IPv4 mask from /0 through /32, including slash-prefix input. |
| Submission validation | Validate nested fields, booleans, enums, collection limits, and unique object identities before grading. |
| Stale grading | Invalidate old results/requests when FortiGate policies, interfaces, ports, or selected lessons change. |
| Palo Alto management | Require the management interface type and no security-zone assignment; invalidate stale feedback after edits. |
| Model API | Correct the compatibility endpoint's canonical asset path. |
| Docker development | Build the shared engine before API startup; mount current frontend HTML/runtime assets. Rebuilt the actual running services after identifying stale engine output. |
| Provisioned test login | Permit sign-in with an existing operator-provisioned password while retaining the 12-character registration minimum. |

Regression tests were added for confirmed cases. These fixes are not a guarantee that no undiscovered bugs remain. See [bug-fix report](docs/BUG_FIXES_2026-10-23.md).

## 4. Dark/light mode

- A theme toggle appears in the shared header on landing, course, account, and administration pages.
- The first visit follows the operating system preference; an explicit choice persists on the device.
- Theme initialization occurs before React renders.
- Course shells, lesson tables, forms, cards, references, and topology backgrounds share theme tokens.
- The 3D stages retain their dedicated rendering backgrounds and lighting.
- Mobile layouts and administrator header overflow were checked and corrected.

## 5. Academy integration preparation

Reference project: [liyander/Incogn1tr1x-Academy](https://github.com/liyander/Incogn1tr1x-Academy). The inspected public `main` revision was `e7b04c60a92fe81c40130dbeae369fd69cebbee5` (2026-10-21).

Supplied college frontend: `http://110.172.151.108:5173/`. It responded to a read-only HTTP check. Its deployed Git revision and actual backend API address are still unverified.

### Implemented in FLAMES

- `PLATFORM_MODE=standalone` retains the local optional-account workflow.
- `PLATFORM_MODE=academy` uses the parent bearer identity validated through Academy `/api/auth/me`.
- The iframe bridge checks the exact parent origin, source window, and protocol version.
- Parent credentials stay in memory and are attached only to same-origin lab API calls.
- Academy mode does not create local student accounts or persist local student progress/token caches.
- Completion is proxied to the Academy adapter. The parent is notified only after a confirmed save and reloads progress from its authenticated API.
- Logout/credential expiry removes lab access; parent outages do not fall back to standalone authentication.
- Verified Academy `admin` users can author FLAMES content.

### Supplied for installation in Academy

The [adapter package](integrations/academy/README.md) contains:

- Express router using Academy authentication and its MySQL pool.
- SQL schema for per-user practice completion.
- Public built-in lesson manifest.
- `FlamesLab.jsx`, an iframe wrapper and saved-progress display.
- Support for published custom lessons through the operator-configured `FLAMES_CATALOG_URL`.

The separate Academy Compose configuration, environment example, framing-policy helper, and installation instructions are included. **The adapter has not been installed on the college server.** Existing Academy room scores, certificates, and leaderboards are not automatically mapped to FLAMES practice completion.

Follow the [college integration guide](docs/PARENT_LMS_INTEGRATION_GUIDE.md). HTTPS, live schema migration, API connectivity, and two-user acceptance remain deployment prerequisites.

## 6. Administration and content authoring

Open `/admin` with a standalone instructor account or a verified Academy admin.

The content studio supports:

- Create FortiGate or Palo Alto modules.
- Add and reorder lessons with title, summary, duration, level, and instructions.
- Add multiple-choice tasks with a selected correct answer.
- Add short-answer tasks with accepted answers and normalized grading.
- Save private drafts and preview lessons.
- Publish validated snapshots, unpublish modules, and delete unpublished drafts.
- Detect stale revisions instead of silently overwriting another editor's changes.
- Display published modules in course navigation, lesson routes, and progress totals.
- Keep answer keys on the server and omit them from student responses.
- Complete reading-only lessons through a mark-as-read action.

Authored content persists in a separate SQLite content database. In Academy mode, it contains teaching material and answer keys; student identity and saved completion remain in Academy.

The studio authors instructional lessons and question tasks. New firewall simulator behavior and packet-based scenario types still require engine/UI development; a visual simulator exercise builder is proposed in [TODO.md](TODO.md).

### Set up your own local administrator

```bash
# Host development
npm run admin:create

# Development Docker
docker compose exec backend npm --prefix /app run admin:create
```

The command asks for email, display name, and a hidden password. It does not overwrite/promote existing accounts. Sign in at `/account`, then open `/admin`.

A local test account was provisioned at the user's request. Its database state and credentials are not part of the source commit; this is not a seeded default account for new deployments.

See [administrator guide](docs/ADMIN_CONTENT.md) and [authoring verification](docs/ADMIN_VERIFICATION_2026-10-23.md).

## 7. Current application flow

1. Open `/` and choose a vendor.
2. Select a module and lesson from the course overview/sidebar.
3. Complete built-in simulated configuration exercises or published authored lesson tasks.
4. Review grading and optional tutor guidance.
5. Completion updates the course outline and unlocked navigation.
6. Guests use device-local completion; standalone accounts synchronize through SQLite; Academy mode saves through the parent platform.
7. Administrators manage custom content through `/admin`.

Configuration drafts for the built-in simulated devices are still temporary; persistent lab autosave is planned. Completion is student-reported practice progress, not certified exam evidence.

## 8. Verification

Latest `npm run verify` result:

| Package | Passing tests |
| --- | ---: |
| Engine | 39 |
| Backend | 45 |
| Frontend | 23 |
| **Total** | **107** |

Also passed:

- Engine/backend builds, frontend TypeScript checking, and production SPA build.
- Development and Academy Compose configuration validation.
- Development Docker image builds and actual local service restart/recovery.
- Browser checks on the actual `localhost:5173` site for both vendor lessons, theme switching/persistence, system preference, and mobile layout.
- Browser authoring flow: create, edit both task types, save, preview, publish, student navigation, wrong-answer retry, completion, and reload persistence.
- Browser sign-in and admin access using the requested local test account.
- Mock-Academy iframe login, parent-only progress save, reload restoration, logout, and absence of browser token/progress persistence in Academy mode.
- Documentation links and `git diff --check`.

Live college authentication, MySQL migration, real multi-user college deployment, and current live AI-provider operation still need acceptance. The production build retains a warning for the lazy-loaded Three.js chunk size.

## 9. Next work

Use [TODO.md](TODO.md) as the action plan. The recommended order is college integration acceptance, configuration autosave, and the visual simulator exercise builder, followed by targeted hints, instructor assignments, and content import/export.

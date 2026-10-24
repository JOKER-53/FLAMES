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

The studio authors instructional lessons, question tasks, and visual FortiGate policy exercises with a checked reference solution. Additional simulator builder families remain future work.

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

Applied configurations across all nine existing simulator families now autosave, with guest/account isolation, server persistence, and Academy-owned draft storage. Completion is student-reported practice progress, not certified exam evidence.

## 8. Verification

Latest `npm run verify` result:

| Package | Passing tests |
| --- | ---: |
| Engine | 39 |
| Backend | 57 |
| Frontend | 24 |
| **Total** | **120** |

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

Use [TODO.md](TODO.md) as the action plan. Autosave and the FortiGate visual policy builder are implemented. The next work is college integration acceptance, targeted hints, instructor assignments, and content import/export.

## 10. Simulator autosave and visual policy builder

- Applied configurations now autosave across FortiGate policies, interfaces, ports, and routing, plus Palo Alto security, zones, NAT, interfaces, and ports.
- Standalone accounts resume through SQLite; guests use per-lesson device storage; Academy keeps drafts in the parent MySQL table through the upgraded adapter.
- Versioned snapshots, owner checks, revision conflicts, reset tombstones, status/retry controls, and expired-session handling protect configuration ownership and prevent stale overwrites.
- The admin studio now includes visual FortiGate policy authoring: starter addresses/services/profiles/rules, packet checks, expected actions/logging, and ordered reference policies.
- Reference validation blocks publication of invalid, over-permissive, or failing exercises. Student APIs omit reference policies and expected outcomes; student grading reports omit expected-action fields.
- Custom published exercises open in the normal FortiGate console, contribute to progress, and use autosave with scenario-version invalidation.
- Browser checks passed all nine guest restorations, real saves/resets, cross-context account resume, account isolation, stale-device conflicts, corrupt/blocked storage recovery, retry, expired sessions, custom exercise grading, changed-version reset, and dark/mobile builder layouts.
- Academy needs the updated router, generated simulator contract, and additive draft-table migration installed before parent-side autosave is available there. No college deployment was changed.

See [the feature guide](docs/AUTOSAVE_AND_EXERCISE_BUILDER.md) and [verification record](docs/AUTOSAVE_BUILDER_VERIFICATION_2026-10-23.md).


## 11. Operations, targeted guidance, assignments and content transfer

- Added `data:backup` / `data:restore`: WAL-aware SQLite snapshots, integrity/foreign-key checks, SHA-256 manifests, private file permissions, isolated restore and overwrite rejection. A snapshot of the actual local Docker data was restored successfully; its private copy is ignored under `.backups/verified-2026-10-23`.
- Added instructor recovery through `admin:create -- --reset-password`, preserving identity/progress and revoking existing sessions. Production startup refuses the local checking password. The requested checking account remains available in development; permanent credentials must be selected before public use.
- Added an operator release/rollback runbook. College MySQL backup, production restore/rollback and authenticated deployment acceptance remain operator work, not claimed completed.
- Added deterministic staged hints across simulator checks for rule ordering, CIDR scope, services, route selection, zones, NAT, logging and management access. These work offline and reset with the report/lesson.
- Added instructor-owned groups, invitation-based authenticated enrollment, module assignments with deadline/required count snapshots, assigned/started/completed/overdue views, authorized name/status filters and CSV export. The old global roster endpoint now respects group ownership.
- Group teaching metadata is stored in the FLAMES content database; integrated identities/progress remain in Academy. The supplied Academy adapter now has a validated admin-only classroom progress endpoint. It still needs installation on the college server.
- Added versioned, admin-only module export, import validation/preview and explicit private-draft import. Every imported module/lesson/question gets new IDs; ordering, keys and policy definitions are retained, while unrelated progress is never transferred. HTML-looking instructions render as text, with no remote asset loading.
- Replaced the retired local NVIDIA model with `nvidia/nemotron-3.5-lightning-30b-a3b`, verified actual app hints and knowledge questions, and retained labelled offline fallback. Tutor AI now receives vetted concept guidance rather than raw answer-bearing scenario/check text; concrete value/prescription and unsupported NAT guards reject unsuitable responses.
- Restyled the network view to match FLAMES surfaces, light/dark tokens, typography, buttons and badges. Added a responsive SVG, actual packet endpoints, correct FortiGate 60F branding, keyboard dialog behavior and reduced-motion results; replay remains available.

Guides: [operations and recovery](docs/OPERATIONS_RUNBOOK.md), [classrooms/content transfer/hints](docs/CLASSROOM_AND_CONTENT_TRANSFER.md).

Verification: 131 automated checks (39 engine, 68 backend, 24 frontend) and production frontend build and final verification passed. Real local browser checks covered group creation/enrollment, assignment start/completion, CSV download, content preview/import/export/publication, escaped script text, staged hints, and light/dark/mobile network playback, Escape and focus restoration. Temporary browser content, groups and student accounts were removed. No new commit/push or college deployment is implied.

## 12. Dependency remediation — 2026-10-24

Patched the Express body-parser dependency and Vitest packages, upgraded React Router to 7.18.4, and pinned the shared PostCSS selector parser to a patched release through a direct tooling dependency/override. `npm audit` reports zero vulnerabilities. `npm run verify` passed (131 tests plus frontend production build). Advisory references: [React Router](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).

## 13. AI question fallback fix — 2026-10-24

Both vendors now validate question text, answer bounds, choice types/uniqueness and length inside the generation fallback boundary. Previously a malformed successful provider response could escape generation and fail at answer hiding, producing an error instead of a bank question. Shared validation keeps the public endpoint and generator consistent. Regression fixtures cover out-of-range answer indexes, duplicate/null choices and empty/oversized questions; the two focused recovery tests passed.

## 14. Content consistency fix — 2026-10-24

Content mutations now begin an immediate SQLite transaction before reading revisions, identity collisions or module limits. This prevents separate processes from passing stale checks before writing. The public catalog checks SQLite's data version so another connection's publication/unpublication is visible without a restart. Two focused multi-connection regressions passed, including stale save/publish/unpublish/delete rejection and private-draft visibility.

## 15. Preserve assignment credit after publication changes — 2026-10-24

Assignment reports now read historical completion markers, including withdrawn custom lessons, while normal course catalogs/totals still filter to current published lessons. Previously unpublishing a module could change an already completed assignment back to incomplete/overdue. The Academy adapter's owned progress read supports `includeArchived=true`, and its admin report retains historical custom IDs. Nineteen focused classroom/adapter checks passed. Install the updated parent adapter before integrated reports use this contract.

## 16. Strict API and exercise schema validation — 2026-10-24

Firewall/interface/port enum fields now require actual strings instead of accepting arrays through string coercion. Policy exercises require explicit object/profile/policy lists, bounded packet IDs and integer ports in range, including draft and ICMP packets. This prevents malformed persisted drafts from reaching editors and evaluators. Two focused regressions cover the enum families, missing lists, and invalid packet ports.

## 17. Accurate completion messaging — 2026-10-24

Passing a grader no longer unconditionally displays “your progress has been saved.” That claim was shown even when account synchronization failed. The result now reports passed checks, while the existing sync warning reports persistence failures separately. The frontend render regression passed.

## 18. Routing failure containment — 2026-10-24

The routing evaluator validates nested OSPF and SD-WAN lists, object fields and bounds before evaluating them. Previously null/missing nested lists could throw outside the static-route catch and crash the caller. The new malformed-input regression passed with the engine suite.

## 19. Effective NAT grading — 2026-10-24

Outbound source and inbound destination NAT checks now evaluate the first matching original-packet rule instead of accepting any later correct-looking row. Source translation also requires the intended unrestricted destination scope. Regressions reject shadowed translations and an overly narrow source rule while preserving satisfiable exercises. The 41-test engine suite passed. This remains the documented simplified NAT model, not a full PAN-OS dataplane.

## 20. AI provider credential isolation — 2026-10-24

The LLM client now selects credentials, URL and model from one provider namespace rather than mixing OPENAI/LLM/NVIDIA values. Mixed environment settings previously could send one provider's key to another configured endpoint. Provider redirects are rejected, malformed credential-bearing URLs are rejected, and echoed keys are redacted from bounded error text. Three focused recovery tests passed, including namespace selection and key redaction. The environment example documents precedence.

## 21. Catalog refresh ordering — 2026-10-24

A generation guard now prevents a slower initial catalog request from overwriting a newer publication refresh, or setting errors/loading state after a newer request or unmount. An intercepted browser regression holds the initial response, publishes a module, then releases the stale response and verifies the new module remains in the course. The browser workflow suite passed.

## 22. Draft row identity validation — 2026-10-24

Saved simulator configurations now reject duplicate/empty row identities (including interface names and physical port IDs) before restoration. Duplicate IDs previously could make editing/deleting one row affect several rows or produce duplicate React keys. Optional filter references must also have the expected string shape, and unknown simulator kinds explicitly fail validation. The Academy contract was regenerated. The 42-test engine suite passed.

## 23. Unknown knowledge task lookup — 2026-10-24

Knowledge-check metadata and fallback lookups now require own properties. Prototype names such as `constructor`, `toString` and `__proto__` previously reached the generation/error path instead of being rejected as unknown tasks. Both vendor endpoints return 404 before generation. A focused route regression covers unknown and prototype-named IDs.

## 24. Browser regressions in CI — 2026-10-24

Added an isolated Playwright test server with temporary databases and no AI credentials. Five workflows cover instructor publication, student registration/reading completion and cross-device isolation, theme persistence, mobile/reduced-motion keyboard dialog behavior, guest autosave/account separation, stale catalog responses, and failed completion synchronization. All five passed locally using Chromium; GitHub Actions now installs Chromium and runs the suite. Browser artifacts are ignored. Both local production images built successfully. AWS deployment is pending; the unavailable college deployment was not modified.

## 25. Private build-context exclusions — 2026-10-24

Docker build contexts now exclude whole operational backup/release directories and browser recordings, in addition to existing environment/database exclusions. This avoids transferring private auxiliary artifacts or recordings into the builder context. Runtime data and secrets remain outside Git and production images.

## 26. Static NAT shadowing correction — 2026-10-24

Static mappings now also must be effective for every source/destination zone pair in their configured scope. A later correct mapping no longer passes when an earlier broad or partially overlapping rule changes that traffic. The final exercise instructions explain the required ordering, and the reference fixture puts specific static mappings before broad source translation. A regression covers complete/partial shadowing and a satisfiable final configuration; all 43 engine tests passed.

## 27. Academy identity validation — 2026-10-24

Administrative access now requires a valid upstream identity with a nonempty bounded username and a positive safe numeric ID or bounded identifier string. Empty IDs, non-finite/negative numeric IDs and malformed types previously passed the loose type-only check. Invalid profiles fail with 502 before administrative routes, while unknown roles remain least-privilege students. The integration regression suite covers a malformed admin profile and valid role normalization.

## 28. Final audit verification — 2026-10-24

The [code audit report](docs/CODE_AUDIT_2026-10-24.md) records the reproduced failures and individual fix commits. Final verification: 146 unit/API/render tests, five isolated Chromium workflows, zero npm audit findings, production image builds, isolated read-only production startup/health/auth checks, valid standalone/Academy Compose configuration, and clean diff checks. College/AWS deployment and unchecked new features remain explicitly pending in TODO.md.

## 29. Lesson header layout — 2026-10-24

Combined lesson title, metadata and scenario into one compact themed header, changed healthy autosave status to a slim toolbar, and slightly widened lesson workspaces. Warning/retry states remain prominent. The frontend production build and five browser workflows passed; desktop light/dark and mobile screenshots were captured and the mobile page has no horizontal overflow.

## 30. Expanded configuration authoring — 2026-10-24

Added visual builders and student consoles for FortiGate interfaces/static routing and Palo Alto security/NAT/zones. Definitions are versioned and private; validation/reference testing gates publication, expected values stay out of public serializers, grading is bound to the published version, and native account/Academy/guest autosave is reused. Updated module transfer/catalog metadata and the supplied Academy draft adapter. All five author/publish/student solve/resume/wrong-answer browser flows passed; server regressions cover privacy, version/vendor isolation, invalid references and effective policy/route/NAT behavior. See [the builder guide](docs/CONFIGURATION_EXERCISE_BUILDER.md).

# FLAMES — work plan

Updated: 2026-10-24

Completed implementation and verification are recorded in [updation.md](updation.md). Checked feature items are implemented; unchecked items remain future work or deployment acceptance. Completing implementation does not imply the college deployment has been performed.

## Priority 0 — connect and validate the college deployment

### Academy connection

- [ ] Confirm the Git revision actually deployed at `http://110.172.151.108:5173/`.
- [ ] Confirm the Academy backend URL/port and compare its auth middleware and `/api/auth/me` contract with the inspected repository.
- [ ] Back up Academy's database; apply the supplied `fortisim_progress` schema through the college's migration process.
- [ ] Install the updated Academy router, manifest, and `FlamesLab.jsx` wrapper.
- [ ] Add authenticated student lab routes and an admin-accessible launch route/navigation link.
- [ ] Configure FLAMES `PLATFORM_MODE`, `ACADEMY_ORIGIN`, `ACADEMY_API_URL`, and `FRONTEND_ORIGIN`.
- [ ] Set Academy `VITE_FORTISIM_URL` and backend `FLAMES_CATALOG_URL` so published custom lessons contribute to parent progress.
- [ ] Configure reachable ports/reverse proxy and exact framing origins.
- [ ] Use HTTPS for both Academy and FLAMES before real authenticated student use.

Acceptance: two real students see separate saved progress; completion appears in Academy and returns after reload/new-device login; an Academy admin can publish a lesson; students cannot edit it; logout/expiry removes lab access; an API outage never creates a local fallback account or false saved-progress indication.

Guide: [Academy integration](docs/PARENT_LMS_INTEGRATION_GUIDE.md).

### Release and operations

Local tools delivered: verified SQLite backup/restore, instructor password recovery/session revocation, production rejection of the checking password, and an operator rollback runbook. A real local snapshot/isolated restore was checked. Live tutor and question requests passed after replacing the retired provider model. College production/Academy backup and release acceptance remain unchecked below. See [operations](docs/OPERATIONS_RUNBOOK.md).

- [ ] Run both vendor courses and the authoring workflow on the actual college deployment.
- [ ] Check desktop/mobile navigation, keyboard interaction, and current WebGL socket alignment on actual devices.
- [ ] Build/run the production images with the intended HTTPS topology and health checks.
- [ ] Establish consistent backups and test restoration of Academy progress plus FLAMES authored content.
- [ ] Replace or remove the local checking account before public access; establish an administrator account recovery process.
- [x] Revalidate a supported live AI provider/model locally; verify labelled offline fallback behavior on failure. Repeat in the college deployment.
- [x] Triage dependency audit findings and apply compatible fixes with regression testing (2026-10-24: zero audit findings; router and parser compatibility verified).
- [ ] Record the deployed commit, rollback image, backup location, and operator runbook.

Acceptance: a documented fresh deployment, restart, backup restore, and rollback succeed without losing content or student progress.

## Priority 1 — save unfinished configurations

### Configuration autosave and resume — implemented

- [x] Define a versioned draft format for each supported simulator exercise.
- [x] Save policies, addresses, services, interface settings, routing entries, and relevant PAN configurations.
- [x] Restore drafts by student, vendor, and lesson without mixing accounts or guests.
- [x] Keep configuration drafts separate from completion records and instructor-published content.
- [x] Decide the Academy-owned storage contract before enabling server persistence in Academy mode.
- [x] Show saved/saving/failed states, explicit reset, and a retry action.
- [x] Handle concurrent tabs, changed scenario versions, and expired authentication.

Acceptance: close and reopen a partially completed lesson on another device; restore the intended configuration; reset one lesson without clearing other lessons; account switching never reveals another student's draft.

Delivered: applied configurations resume per guest/account and lesson. See the implementation guide for save status, reset, changed-version handling, and verified failure behavior.

## Priority 2 — visual simulator exercise builder — implemented for FortiGate policies

The content studio now also authors FortiGate policy simulator exercises through forms, validates the reference configuration, and publishes them into the normal course flow.

- [x] Define a versioned simulator scenario schema for supported exercise types.
- [x] Edit starter addresses/services, policy source/destination interfaces, filter profiles, and initial policies through forms.
- [x] Define test packets, expected actions, and relevant logging/filtering checks.
- [x] Include both allowed and denied traffic, ordering mistakes, and over-permissive configurations.
- [x] Validate object references and scenario consistency before publishing.
- [x] Preview and test a reference solution with the shared grading engine.
- [x] Keep expected outcomes/answer keys out of student API responses.
- [x] Reuse draft snapshots, role restrictions, publication, and revision checks from the existing studio.

Acceptance: an admin creates and publishes a complete supported firewall exercise through the UI; the correct configuration passes; defined common mistakes fail; students can open it through the normal course outline.

Implemented scope: FortiGate policy exercises. Other simulator families remain a later extension.

Implementation and verification: [autosave and builder guide](docs/AUTOSAVE_AND_EXERCISE_BUILDER.md). Academy adapter/schema upgrades and live college acceptance remain under Priority 0; completing the code does not imply the college deployment is complete.

## Priority 3 — targeted learning guidance

### Hints based on mistakes — implemented

- [x] Convert structured grading failures into topic-specific hints: rule order, CIDR scope, service ports, routing, zone ownership, and NAT mappings.
- [x] Provide useful deterministic guidance without a live AI dependency.
- [x] Add optional staged hints and distinguish guidance from grading results.
- [x] Prevent old hints from appearing after configuration or lesson changes.
- [x] Evaluate hint usefulness and accidental answer disclosure with representative fixtures.

Acceptance: a student sees a relevant explanation for a reproducible error, can correct the configuration, and receives consistent guidance when the AI provider is unavailable.

### Packet explanation tools

- [ ] Show a step-by-step path through route selection, rule matching, filtering, and the simplified NAT model where implemented.
- [ ] Highlight the exact configuration element responsible for each decision.
- [ ] Keep simulator simplifications explicit in teaching content.

Acceptance: students can explain why a packet passed or failed using the displayed trace rather than guessing from a score.

## Priority 4 — instructor assignments and classroom insight — implemented

- [x] Add class/group membership and restrict roster visibility to authorized instructors.
- [x] Assign modules to groups with due dates and completion requirements.
- [x] Show assigned, started, completed, and overdue states with clear provenance.
- [x] Provide filtered instructor views and an export of authorized student results.
- [x] Define how assignments are represented in Academy so the parent remains the source of identity and progress in integrated mode.
- [ ] Add server-issued assessment evidence only if certified scoring becomes a requirement.

Acceptance: an instructor assigns a module to one group, sees its completion, and cannot access another instructor's restricted classroom. Ordinary practice completion must not be labelled a certified exam result.

## Priority 5 — content import/export — implemented

- [x] Define a versioned module export format including lessons, tasks, and answer keys for authorized administrators.
- [x] Support export, validation, import preview, ID collision handling, and draft-only import.
- [x] Prevent imported HTML/scripts or untrusted URLs from executing.
- [x] Preserve lesson ordering and correct grading behavior.
- [x] Define asset handling and ensure progress is never accidentally reassigned to unrelated imported lessons.

Acceptance: export a module from local development, import it into a separate test deployment, preview it, and publish it with equivalent task grading. Students cannot download answer-key exports.

Delivered feature guidance: [classrooms, content transfer and hints](docs/CLASSROOM_AND_CONTENT_TRANSFER.md). Academy classroom reports require the updated parent adapter; it has not been installed remotely.

## Later improvements

- [ ] Extend the visual exercise builder to additional FortiGate and Palo Alto simulator families.

- [ ] Expand content-studio editing tools after teacher feedback: search, duplication, richer safe formatting, and clearer change history.
- [ ] Add browser interaction regressions to CI for authoring, accounts, themes, and progress; retain meaningful WebGL/manual acceptance.
- [ ] Improve large 3D asset loading/caching and investigate the lazy-loaded Three.js chunk-size warning.
- [ ] Add accessibility checks for focus order, keyboard-only use, contrast, and reduced motion.
- [ ] Add rate-limit observability, useful operational error logs, and migration/versioning procedures.
- [ ] Add hosted password recovery/account administration for standalone deployments if they remain in use.
- [ ] Consider configuration diff views, topology authoring, and supported CLI practice after the core flow is stable.

## Working rules

- Keep FLAMES branding and the existing light/dark design consistent.
- Preserve the Academy identity/progress ownership boundary in integrated mode.
- Keep secrets and runtime databases out of Git.
- Test authorization, account isolation, persistence, and failure behavior for new stored features.
- Run `npm run verify` and relevant browser checks before release.
- Update this checklist and [updation.md](updation.md) when work is completed; record actual evidence rather than assuming deployment success.

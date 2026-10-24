# Current application flow

## Student journey

1. Open `/` and choose FortiGate 60F or Palo Alto PA-220.
2. Open the course overview at `/fortigate` or `/paloalto`.
3. Choose a module, then a lesson. Curriculum metadata defines lesson order, prerequisites, duration, and final assessments. FortiGate lesson URLs select exercises with `scenario` (plus `track` for interfaces/ports); Palo Alto URLs use `task`.
4. Read the scenario, configure the simulated device, and check the work. Available knowledge checks provide an additional practice path. Optional tutoring returns AI guidance or labelled offline hints when no provider is available.
5. Completion updates the course outline and module navigation. Applied simulator configurations autosave per lesson and identity, with saved status, retry, and version/conflict recovery.

Guests can practice by default. `/account` provides registration and sign-in; signed-in users synchronize completion through the API. `AUTH_REQUIRED=true` redirects anonymous training users to sign-in and protects training API routes. `ALLOW_REGISTRATION=false` disables registration. `/classroom` shows all registered students to instructors; this is a shared classroom rather than separate institutional tenants.

## Routes

| Area | Route |
| --- | --- |
| Course module | `/fortigate/modules/:moduleId`, `/paloalto/modules/:moduleId` |
| FortiGate policies | `/fortigate/policy/firewall-policy` |
| FortiGate address/service references | `/fortigate/policy/addresses`, `/fortigate/policy/services` |
| FortiGate interfaces and port exercises | `/fortigate/network/interfaces` |
| FortiGate static routing | `/fortigate/network/routing` |
| Palo Alto security, zones, NAT | `/paloalto/security`, `/paloalto/zones`, `/paloalto/nat` |
| Palo Alto interfaces and ports | `/paloalto/interfaces`, `/paloalto/port` |
| Palo Alto App-ID reference | `/paloalto/appid` |
| Hardware references | `/fortigate/hardware`, `/paloalto/hardware` |

Older task and network URLs redirect to the current course pages. Unknown routes return to the appropriate overview or vendor selection.

## Hardware interaction

Both hardware pages use the full course content width, retain the sidebar/header, and provide a tall viewer (78 dynamic viewport height units, minimum 480px). Supporting information and cable controls can scroll below the viewer. This is an in-page layout, not browser fullscreen.

Models initially load with extra camera distance so they fit comfortably inside the larger viewer. Drag to rotate, scroll or use the zoom buttons to change scale, and Reset to restore the initial view. Explore allows component inspection; Cable mode starts with no connected cables and provides compatible cable selection, socket clicking, and keyboard-accessible socket buttons. Reset view and clearing cable connections are separate controls.

Runtime model URLs are `/firewall.glb` and `/pa-220-firewall.glb`. WebGL rendering and loading errors appear in the viewer. Socket anchors are calibrated to these assets; model changes require manual alignment verification.

## Grading and completion

FortiGate policy, interface, and port exercises use backend grading. Palo Alto security, zones, and NAT use backend grading against shared engine definitions. Static routing and some interface/reference practice use local evaluation. The simulator does not configure real appliances or inspect real traffic.

Guest progress is device-local. Account progress uses account-specific local caches plus SQLite-backed monotonic completion merges. Guest history is not automatically imported into an account. Failed cloud saving produces a warning; reopening the lab retries synchronization. Signing out revokes the current server session.

Completion is student-reported practice progress, not an authenticated examination score. Exercise definitions are included in browser bundles. Generated knowledge questions are single-use, expire after 15 minutes, and are lost when the API restarts.

## Parent-managed mode and appearance

With `PLATFORM_MODE=academy`, the parent Academy owns sign-in and saved progress. FLAMES accepts the parent credential only from its configured iframe parent, validates it through Academy, and proxies completion there. Standalone registration/classroom routes are replaced by links back to Academy. No account/progress database file or browser progress cache is written in this mode. See [integration setup](PARENT_LMS_INTEGRATION_GUIDE.md).

Every shared header provides a light/dark toggle. A first visit uses the system preference, then a saved choice persists across reloads. Course shells, forms, lesson tables, references, and topology backgrounds use the same theme tokens. The dark 3D stage retains its lighting and canvas background.

## Authored modules

`/admin` lets authorized instructors/Academy admins create draft modules, lessons, and multiple-choice or short-answer tasks. Publishing adds them to the vendor course outline. Student routes are `/fortigate/lessons/:lessonId` and `/paloalto/lessons/:lessonId`; grading occurs on the API, and completion follows the existing progress flow. Reading-only lessons can be marked as read. Drafts and answer keys are never exposed through the published catalog. See [administration](ADMIN_CONTENT.md).

See [autosave and visual policy authoring](AUTOSAVE_AND_EXERCISE_BUILDER.md) for guest/account/Academy storage, reset behavior, and custom exercise publishing.

Configuration lessons: administrator selects a family, edits starter/reference rows and checks, tests the reference and publishes. The student lesson loads only public starters/check descriptions, resumes its native-family draft, and submits the configuration with the published version for private server grading. Decision traces show the student’s own rows; packet explorers do not grant completion. See [expanded builder](CONFIGURATION_EXERCISE_BUILDER.md) and [packet explanations](PACKET_EXPLANATIONS.md).

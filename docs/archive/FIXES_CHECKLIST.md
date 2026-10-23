# FortiSim — Review Checklist (2026-10-22)

How it was run: `npm ci` → `npm run verify` → `npm run backend:dev` + `npm run frontend:dev`, then I called the API through the Vite proxy.
- At first: engine tests passed (39/39), backend tests did not (15/16), and the frontend built.
- Now: engine tests 39/39, backend tests 16/16, and the frontend builds. Health, scenarios, grading, knowledge-check and the 3D model (`/pa-220-firewall.glb`) all respond.
- The browser UI was **not** tested by clicking through it.

## Bugs fixed

- [x] **Backend test suite failed.** `AI outage is graceful…` expected 503, but the services now fall back to rule-based hints and curated questions (HTTP 200). I changed the test to check the fallback, and it also checks that `correctIndex` is never sent to the browser.
- [x] **Paths from another developer's machine (`/home/kadhir/...`)** were hardcoded in `routes/panRoutes.ts` and `src/copyGlb.ts`. I removed both, and deleted `copyGlb.ts` because nothing used it.
- [x] **The server copied files at startup.** `server.ts` copied the `.glb` into `frontend/public` every time it booted. That doesn't work in Docker or a read-only deploy, and the file is already in `public/`. I removed the copy.
- [x] **AI feedback for port assignments could hang.** `routes/portSubmissions.ts` called `fetch` directly with no timeout. When AI wasn't configured, it requested `undefined/chat/completions`. It also ignored the `OPENAI_*` / `LLM_*` settings. It now uses the shared `sendLLMRequest`, which has a 15 s timeout and works with any provider. I also replaced the `any` types with `PortGradingReport`.
- [x] **Security warnings in dependencies.** `npm audit fix` without `--force` cleared the critical `proxy-addr` issue and the high-severity issues in `vite`, `brace-expansion` and `source-map-js`. The audit count went from 20 to 13.

## Cable mode and port assignment fixed (round 2)

Checked in headless Chromium by clicking through every cable view and taking screenshots.

**FortiGate → Interfaces → Port Assignment** (`CableDragDiagram.tsx`, rewritten)
- [x] **Ports 7–10 couldn't be set at all.** The diagram only mapped 8 sockets, while exercises use `port1`–`port10`. Now:
  - port N goes into LAN socket N, and ports 6–8 use the DMZ/HA-A/HA-B sockets.
  - A port list under the model sets **every** port, including 9–10, which have no socket on a 60F.
- [x] **The socket mapping didn't match the model's labels.** The socket printed "5" was `port6`, and the DMZ socket was `port5`.
- [x] **Each new cable deleted the earlier ones (stale React state).** The 3D handlers always saw the plug list from the first render. The cables also never cleared when you switched scenarios. Cables are now drawn directly from the page's port list.
- [x] **The model showed its underside, auto-rotated, and was cropped.** It now faces front, tilted slightly so you see the top, and the camera fits the width of the front panel.
- [x] **You could drag-rotate while placing a cable, and there was no way to unplug.** Small drags no longer count as clicks, clicking a cabled socket unplugs it, and an "Unplug all" button was added.
- [x] **Usability:** touch/pointer input, zoom limits, a reset-view button, a loading/error state, and a label on each socket. Dots pulse in the selected cable's colour.

**FortiGate → Hardware Reference → Cable Mode** (`DashboardPlaceholder.tsx`)
- [x] **Dots and cables sat below the sockets.** The model's size was measured *after* it was tilted, which inflated its height about 2.2×.
- [x] **You could only unplug a socket if you had its matching cable type selected.**
- [x] **Explore mode only ever showed "Chassis" information.** It now tells you which port you clicked.
- [x] **Reset view used a fixed distance (15.5)** that didn't match the fitted camera, and it showed the model from below.
- [x] **The success/error message resized the 3D view**, so the model jumped on every click.

**Palo Alto → Port Assignment** (`PanChassisDiagram.tsx`, rebuilt; `PanPortAssignment.tsx`)
- [x] **No cables were drawn at all.** A zone only appeared as a faint glow on a hand-built box model. The diagram now loads the real `pa-220-firewall.glb` and finds each socket by its named mesh (`eth1_N_housing`, `mgt_housing`, …), so cables plug into the real sockets.
- [x] **MGT could be put into Trust/Untrust.** It's now fixed as the dedicated management port, and data ports no longer offer a "Management" zone.
- [x] **Console/USB clicks did nothing without saying why.** They now explain that these aren't network interfaces.
- [x] **Grading was too loose.** Scenario 1 didn't check that other ports were left unassigned. Scenario 2 didn't re-check eth1/1 and eth1/2, even though its instructions say to keep them.
- [x] **Upper-row cables covered the lower-row sockets.** They now drape over the top of the chassis.
- [x] **The 3D view changed size when the info text changed**, so clicks landed on the wrong socket. The viewport now has a fixed height and the message floats over it.
- [x] Added a Reset button, ✓ marks on completed scenarios, and grades clear when you change a port.

**Shared:** cables are built by one function, `hardware/cableMesh.ts`, so both firewalls draw them the same way and in the right zone colours. Two new engine tests check the socket mapping. Test count: engine 41/41, backend 16/16.

## Bugs / risks still open (need a decision)

- [ ] three.js is **r128 (2021)** and uses settings that have since been removed (`outputEncoding`, `sRGBEncoding`). Upgrading means updating every 3D page.
- [ ] The FortiGate `firewall.glb` is a single box with a photo texture. Socket positions are measured by hand (`hardware/cables.ts`), and the logo on the lid texture is mirrored.
- [ ] PAN port-assignment grading runs only in the browser. Other PAN tracks are graded on the server.

- [ ] 13 audit warnings remain: `react-router`, `braces`, `postcss-selector-parser` and `@vitest/mocker`. Fixing them needs `npm audit fix --force`, which installs breaking major versions, so the app needs testing afterwards.
- [ ] **Port grading gives away answers.** Each result's `description` includes the correct zone, for example `"WAN2 → WAN (backup internet uplink)"`. The same text goes to the LLM, which is told never to reveal the zone.
- [ ] `/api/pan/model` reads `.glb` files from several guessed paths, but the frontend never calls it (it loads `/pa-220-firewall.glb` from `public/`). Delete the endpoint, or point it at one configured path.
- [ ] Two AI clients do the same job: `services/nimRequest.ts` (NIM only) and `services/llmClient.ts` (any provider). `nimInterfaceFeedback` still uses the NIM-only one, so interface feedback ignores the `OPENAI_*` / `LLM_*` settings.
- [ ] The rate limits for the tutor and for sign-in are kept in memory. They reset on restart and don't work across more than one instance.
- [ ] `.env.example` lists only the `NVIDIA_NIM_*` AI settings, but the code also reads `OPENAI_*` and `LLM_*`.

## Suggestions to improve

- [ ] **Remove repo clutter:** `fix_dashboard.py` (a one-off patch script), `templete.html` (misspelled scratch file), the 7 MB root `pa-220-firewall.glb` (already in `frontend/public/`), `copy-glb.mjs`, the unused `public/firewall.fbx`, and the stray `packages/engine/package-lock.json` inside the workspace.
- [ ] **Make the 3D models smaller:** `firewall.glb` and `pa-220-firewall.glb` are about 7 MB each. Compressing them with Draco or meshopt (`gltf-transform optimize`) would probably bring each under 1 MB.
- [ ] **Smaller first download:** `three.module` is 512 kB and only the 3D pages need it. Load it lazily or put it in its own `manualChunks` entry.
- [ ] **Stricter types:** replace the `any` types in `FirewallPolicyPage`, `InterfacesPage`, `PanNAT`, `PanZones`, `CableDragDiagram` and `engine/panExercises.ts`.
- [ ] **Shared styling:** the PAN pages use inline `style={{}}` objects while the FortiGate pages use Tailwind. Moving the PAN pages to Tailwind would make the two consistent.
- [ ] **Browser tests:** add Playwright tests for login → complete an exercise → progress syncs.
- [ ] **Clearer error message:** PanDashboard tells users to run `node copy-glb.mjs` if the model fails to load. Show a neutral "3D model unavailable" message instead.
- [ ] **Docs:** `Notes.md` and `Architecture.md` mostly repeat `docs/`. Merge them in, and record the npm version the project expects (npm wasn't installed on this machine).

## Palo Alto cable mode added (round 3)

- [x] **PA-220 → Hardware Ref** (`pages/pan/PanDashboard.tsx`) now has **🔍 Explore / 🔌 Cable Mode**, like the FortiGate page.
  - Six cable types: 12V DC power, RJ-45 data, RJ-45 management, RJ-45 console, micro-USB console, and USB. Each one fits only the right socket, and wrong cables are rejected with a message.
  - 14 sockets: ETH 1/1–1/8, MGT, RJ-45 and µUSB console, USB, and **two rear DC inputs (PWR1/PWR2)**. **Front / Rear (power)** buttons swing the camera to the right side.
  - Cables are drawn into the real sockets of `pa-220-firewall.glb`, found by the names of its parts. Upper-row cables drape over the lid.
  - Sockets that accept the selected cable pulse. Every socket also has a button to connect or unplug it, and there's a Reset button.
  - Explore mode: clicking a port explains it, including the power inputs.
- [x] Shared code: the `hardware/panCables.ts` socket table and `cableMesh.ts` helpers (`measureSockets`, cables for rear-facing sockets, `labelSprite`) are used by both PA-220 views. This removed two copies of the label code.
- [x] Fixed an old misleading load-error message that told users to run `node copy-glb.mjs`.
- [x] New `engine/test/panCables.test.ts`. Engine tests now 43/43.

## AI tutor and feedback fixed (round 4)

**Bugs found:** I called every tutor endpoint with no AI key set (the default setup).
- [x] **14 knowledge checks failed with HTTP 503:** 11 of the 15 PA tasks and all 3 FortiGate finals had no offline question. All 14 are now written, and a test checks that every task has one.
- [x] **One built-in PA question was factually wrong.** `pan-nat-01` marked "security policy matches pre-NAT zone and post-NAT IP" as correct; PAN-OS does the opposite. It was also off-topic for an SNAT task, so I replaced it.
- [x] **PA hints were the same for every topic.** NAT, App-ID and interface exercises all got "review zone pairings and rule ordering". The frontend now sends the task id, and hints are written per topic (security, zones, NAT, interfaces).
- [x] **Interface and port feedback gave no hint at all without AI.** Interface feedback also only read the `NVIDIA_NIM_*` settings, and port feedback had no timeout. All four tracks now go through one tutor service (`services/tutor.ts`), and I deleted `nimRequest.ts`.
- [x] **Port grade reports revealed the answer key.** "Port 3 → DMZ" was shown to the student and sent to the AI. The grader now shows "Port 3 (web server)".
- [x] **Reasoning models' output was not cleaned.** `<think>…</think>` blocks (DeepSeek-R1 and similar) would have been shown to students and could break JSON parsing. They're now stripped. Numbered lists and inline code are also removed from hints.
- [x] **NVIDIA and other non-OpenAI providers were sent `gpt-4o-mini`** when no model was set. That now gives a clear configuration error and the built-in hint is used instead.
- [x] **The correct answer was predictable:** every curated answer is option B, and LLMs prefer the first slots. Choices are now shuffled on the server. Generated questions with duplicate choices are rejected.
- [x] **A policy check that failed only on logging** was described as wrong-action. The AI is now told the action is right and logging is the problem.
- [x] **The UI always said "AI-generated and unique each time".** Each hint or question now shows an **AI tutor**, **Guided hint**, or **Question bank** tag.

New `backend/test/tutor.test.cjs` has 6 tests. Totals: engine 43, backend 22, all passing.

**Still open**
- [ ] Adding a hint for log-only failures to the offline (no AI) fallback text.
- [ ] AI responses aren't cached. Repeated identical failures cost one AI call each, within the 20-per-minute limit.

## UI redesign: course shell + vendor console (round 5)

You chose "course shell + vendor console": a calm learning-platform frame around workspaces that look like the real FortiOS / PAN-OS consoles. I checked every page in headless Chromium at 1400 px and at 390 px (mobile).

**Foundation**
- [x] Design tokens in `src/index.css`: neutral ink and slate surfaces, one accent per vendor (`data-vendor`), and semantic success / danger / warning colours. They're mapped into `tailwind.config.js`.
- [x] Fonts are self-hosted with `@fontsource-variable` (Inter for the UI, JetBrains Mono for config values), because the production CSP blocks font CDNs. Base text is now 14 px instead of 11–12.5 px.
- [x] A single SVG icon set (`components/ui/Icon.tsx`) replaces every emoji icon (🛡️ ⚙️ 🔌 📋 🔍 ⚡ 🌐 🏆).
- [x] Shared building blocks: `PageHeader`, `ProgressBar`, `Callout`, `Section`, `StatusIcon`, and `TutorSourceTag`.

**Course structure** (`src/course/curriculum.ts`)
- [x] Both courses are defined as modules → lessons, each with a route, time estimate and level, plus "next lesson" and lock rules.
- [x] Policy lesson titles are plain data, and I checked that the frontend bundle still has no answer keys.
- [x] Every lesson has its own URL: FortiGate policy lessons now read `?scenario=`, and PA ports read `?task=`.
- [x] Fixed: the Interfaces page ignored URL changes, so moving to the next lesson didn't switch the exercise.

**Pages**
- [x] One `CourseShell` for both vendors replaces the two old shells (`AppShell` and the inline-styled `PanAppShell`, which listed Security, NAT and Zones twice).
  - The left outline shows module progress, a status icon for each lesson, and locked assessments.
  - Breadcrumbs, a mobile drawer, and per-lesson page titles.
- [x] Course overview ("Start here / Continue", your progress, module cards) and module pages (lesson list with level, time and status) replace the old "Tasks" pages.
- [x] `LessonFrame` gives every lesson the same structure: module and "Lesson n of N", time and level, a scenario card with a collapsible hint, the workspace, then previous/next navigation.
- [x] `ConsoleFrame` marks the vendor console workspace. `CheckYourWork` gives every exercise the same results panel (score, each check, tutor hint). One `KnowledgeCheckCard` replaces five copies.
- [x] Rebuilt pages: FortiGate policy, interfaces/ports and routing; PA security, zones, NAT, interfaces and ports; both hardware references; landing, sign-in and classroom.
- [x] The classroom now shows each student's progress against the real lesson totals, not bare counts.
- [x] Deleted 14 unused files (old shells, task pages, stub pages, `PacketTestModal`, `AccountLink`, and the emoji icon set). Old URLs redirect to the new ones.

**Bugs found while redesigning**
- [x] **PA Interfaces taught something wrong:** it required putting MGT into a "Management" zone, but MGT is out-of-band and never joins a zone. It also never checked the interface type. Both fixed.
- [x] **Routing lesson had no distance field:** it was hard-coded to 10 and only matched the scenario by coincidence. There is now a validated distance field.
- [x] **The FortiGate hardware view collapsed to about 320 px** inside the new layout.
- [x] **Knowledge-check card:** the redesign briefly let students retry after a wrong answer; I removed that, so the one-attempt rule still holds.
- [x] Engine data quirks to clean up later: `ALL_PORT_SCENARIOS` already contains the final assessment, and engine titles embed 🏆 (the curriculum hides both).

Tests: engine 44 (smoke test now checks the lesson frame and outline), backend 22. Build passes.

**Next (agreed plan)**
- [ ] Grader audit: run every exercise with correct and blank answers.
- [ ] New tracks: Security Profiles, graded App-ID, more PA port/interface lessons, more FortiGate routing.
- [ ] three.js still makes a 550 kB chunk (shared by the 3D pages only). Upgrading three.js would shrink it.

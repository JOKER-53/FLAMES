# Current application flow

## Student journey

1. Open `/` and choose FortiGate 60F or Palo Alto PA-220.
2. Open the course overview and choose a module. There are 28 native FortiGate tasks and 20 native Palo Alto tasks, plus any published instructor modules.
3. If the administrator has opened the learning guide, study the relevant chapter or choose **Study this task**. The guide defaults to hidden for students; administrators retain previews.
4. Read the scenario and configure the simulated device. Native selectors use `scenario` (and interface/port `track`) for FortiGate and `task` for Palo Alto.
5. Use available packet tests, traces and Network view to inspect the current configuration. These exploratory tools do not grant completion.
6. Submit **Check my work**. Supported knowledge checks offer an alternate concept-based practice path; provider failures use labelled offline fallbacks. Assessments unlock after the other lessons in their module.
7. Applied simulator configurations autosave by task and identity. Completion updates navigation, progress totals and classroom assignment reports.

Standalone guest practice is enabled by default. `/account` supports registration/sign-in when configured. `AUTH_REQUIRED=true` requires training sign-in; `ALLOW_REGISTRATION=false` disables registration. Instructor-owned classroom groups and invitations determine student membership/report access; instructors do not receive unrestricted access to every account.

## Routes

| Area | Route |
| --- | --- |
| Landing, account, classroom | `/`, `/account`, `/classroom` |
| Content administration | `/admin` |
| Public credits | `/credits` |
| Vendor overview | `/fortigate`, `/paloalto` |
| Module | `/fortigate/modules/:moduleId`, `/paloalto/modules/:moduleId` |
| Learning guide | `/fortigate/learn`, `/paloalto/learn` |
| Published authored lessons | `/fortigate/lessons/:lessonId`, `/paloalto/lessons/:lessonId` |
| FortiGate policy | `/fortigate/policy/firewall-policy?scenario=<id>` |
| FortiGate address/service references | `/fortigate/policy/addresses`, `/fortigate/policy/services` |
| FortiGate interfaces/ports | `/fortigate/network/interfaces?track=<interface-or-port>&scenario=<id>` |
| FortiGate static routing | `/fortigate/network/routing` |
| Palo Alto security, zones, NAT | `/paloalto/security?task=<id>`, `/paloalto/zones?task=<id>`, `/paloalto/nat?task=<id>` |
| Palo Alto interfaces/ports | `/paloalto/interfaces`, `/paloalto/port?task=<id>` |
| Palo Alto App-ID reference | `/paloalto/appid` |
| Hardware | `/fortigate/hardware`, `/paloalto/hardware` |

Older task/network URLs redirect to current course pages. Unknown routes return to the appropriate overview or landing page. Route URLs are independent of source folder names.

## Accounts, drafts and completion

Guest progress/drafts are device-local. Signed-in standalone users use account-specific caches and server persistence; guest work is not silently imported into an account. Draft hydration, debounced saving, retry/reset, revisions and stale-tab conflicts are explicit. Reset uses a revisioned tombstone. Failed completion synchronization displays a warning rather than claiming the server saved progress.

In Academy mode, the configured parent owns identity, completion and simulator drafts. FLAMES accepts credentials only through its verified parent bridge and validates parent identity server-side. It does not fall back to a local student account or persistent local progress. Authored content, classroom teaching metadata and learning-guide settings remain FLAMES content responsibilities. See [Academy integration](PARENT_LMS_INTEGRATION_GUIDE.md).

Completion is practice progress, not certified examination evidence. Native exercise definitions may be included in browser bundles. Generated knowledge questions are one-use, expire after 15 minutes and are lost on API restart. Private authored reference rows, expected answers and revision snapshots remain behind instructor authorization.

## Classroom and administration

`/classroom` provides instructor-owned groups, invitations, module assignments/deadlines and scoped completion reporting. Operations Practice is a separate assignment module in each vendor; original policy assessment prerequisites and existing assignment snapshots are preserved.

`/admin` supports private drafts, publication, ordering, module/lesson search and duplication, private revision comparison, transfer preview/import and visual exercise builders. Published lessons enter the course catalog dynamically. Reading lessons support multiple-choice/short-answer tasks; policy/configuration lessons use server-side grading bound to their published version. See [content administration](ADMIN_CONTENT.md) and [configuration builders](CONFIGURATION_EXERCISE_BUILDER.md).

## Learning material and visibility

`course/learning.json` supplies ten chapters and study plans for all 48 native tasks. It includes worked examples, predicted-result tables, accessible flowcharts, mistakes and self-check explanations. Run `npm run docs:learning` to regenerate the [handbook](LEARNING_HANDBOOK.md). Reading it does not mark tasks complete. Instructor-authored modules can supply additional material.

**Admin → Student learning guide** opens/closes access for both vendors. The setting defaults to hidden, persists through content migration 3 and controls sidebar/study links and direct in-app guide routes. Administrators retain preview links. Visible tabs refresh on focus and every 30 seconds; reloading also fetches the current setting.

## Hardware and packet tools

Hardware viewers use the available course width while preserving navigation. Models initially fit within the viewport. Rotation, zoom/reset, component inspection, download/parse feedback and retries are available. Cable mode starts empty and provides keyboard cable/socket controls. Reset view and clearing cables are separate actions.

Original model URLs stay `/firewall.glb` and `/pa-220-firewall.glb`. The default FortiGate viewer loads the generated optimized asset; gzip/versioned transport, per-tab buffer caching and idle/hidden rendering suspension improve performance. Model replacements require actual-device socket/alignment acceptance. Keyboard component descriptions remain available if WebGL fails. See [hardware performance](HARDWARE_PERFORMANCE.md).

Topology panels and network views represent the exercise/current configuration, not live traffic. Policy tests use supplied interface direction rather than a complete route/session engine. NAT translation is distinct from permission; App-ID uses supplied labels. These teaching boundaries are described in the learning guide and packet explanations.

### PA-220 interface task

The native Palo Alto Interface Configuration task embeds the real PA-220 model above its interface table. Clicking a data Ethernet socket or MGT selects the matching row and opens its editor; keyboard interface buttons provide the same action. Save applies type/zone/address changes through the existing draft flow and updates topology and the selected-interface summary. The viewer highlights the selected physical socket; console, USB and power are not network configuration targets.

The embedded viewer has a compact in-page height and starts without automatic rotation. It shares the hardware reference's loader/cache, retry, calibrated socket mapping and render suspension through `hardware/PanApplianceViewer.tsx`. A missing WebGL context does not prevent keyboard/table editing. Selecting a port does not assign a zone, change a link, or grant completion.

## Appearance and credits

Shared headers provide theme and Credits controls. The first visit follows system light/dark preference; an explicit choice persists locally. Course/forms/topology UI uses shared tokens, while the 3D stage keeps its own scene background.

`/credits` is public and lists KADHIRAVAN EG (`JOKER-53`), Harish Kumar (`Harishkumar-47`) and BeyondBug with supplied GitHub/LinkedIn links. Its opt-in full-width layout frames the original 1280 × 567 team photograph at `public/images/beyondbug-team.png` without cropping. Profiles sit alongside it on wide screens and stack below on small screens. Credits is linked only in the shared header, without footer/sidebar duplicates. Other standard pages retain their usual widths.

## Internal completion records

The shared header links to `/certificates`. Signed-in students see separate vendor eligibility and SVG downloads after all required vendor tasks are saved and their authoritative profile supplies a roll number. Administrators edit templates/live previews and local roll numbers in the content studio. See [certificate flow](CERTIFICATES.md); this is explicitly internal practice completion, not approved assessment certification.

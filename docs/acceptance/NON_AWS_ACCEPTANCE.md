# Non-AWS acceptance and remaining human checks

Updated 2026-10-26. Automated checks and implementation are not substitutes for actual user/device acceptance. Record reviewer, date, exact commit, device/browser, result and evidence for each real run; do not replace pending entries with fabricated approvals.

| Area | Delivered local capability | Remaining evidence | Status |
| --- | --- | --- | --- |
| Exercise authoring | FortiGate physical ports, PAN physical ports/interfaces, private grading and versioned publication | Teacher reviews an authored exercise | Implementation verified; teacher review pending |
| Student tools | Draft comparisons and atomic allowlisted interface CLI | Student usability feedback | Implementation verified; pilot pending |
| Topology editor | Forms, node/link validation, preview, publication and text alternative | Teacher validates its network meaning | Implementation verified; review pending |
| Accessibility | Automated light/dark WCAG and browser keyboard coverage | NVDA/Firefox or VoiceOver/Safari, actual touch and 200%/400% zoom sign-off | Manual acceptance pending |
| Hardware | Shared real PA-220 model, socket picking, interface editor, fallback and idle rotation | Actual GPU/mobile/socket alignment and prolonged interaction | Device acceptance pending |
| Learning material | 48 task plans, examples, deterministic grading, handbook generation | Instructor checks each task and at least two students complete a pilot | Human review pending |
| Certificates | Per-vendor eligibility, templates, live preview, custom backgrounds, internal-use note | College accepts wording/retention and deployed Academy roll-number mapping | Institutional/integration acceptance pending |
| Identity ownership | Academy owns login/progress/recovery; staff assigns local roll numbers | Deployed Academy profile/progress contract | Depends on deployment |
| Operations | Checksummed schema, diagnostics, isolated backup/restore tools | Production identity rotation, target backups, restore, rollback and monitoring | Depends on deployment |
| AI | Labelled offline fallback and provider-independent grading | Target provider/model quota and failure acceptance | Depends on deployment |

## Human review record

For accessibility: navigate without a mouse, open/close overlays, check focus restoration and error announcements, inspect both themes at 100%/200%/400%, and use the topology text alternative. Record at least one supported assistive-technology/device combination rather than inferring it from an automated scanner.

For each native task, record vendor/task ID, guide/instruction review, correct solution result, common incorrect solution result, knowledge-check clarity, topology correctness and teacher initials. Start from the canonical task IDs in `packages/engine/src/progress/completion.ts`; the built-in totals are 28 FortiGate and 20 Palo Alto. Use two real student accounts and include one unfinished draft/reload and one denied-packet explanation in the pilot.

For hardware, record model orientation, zoom, front/rear socket mapping, touch drag, ten-second idle resume, reduced-motion behavior, WebGL failure/retry and mobile framing. Browser software WebGL evidence is separate from this actual-device sign-off.

Issues [8](https://github.com/JOKER-53/FLAMES/issues/8), [9](https://github.com/JOKER-53/FLAMES/issues/9) and [14](https://github.com/JOKER-53/FLAMES/issues/14) need the deployed services. Issues [11](https://github.com/JOKER-53/FLAMES/issues/11), [12](https://github.com/JOKER-53/FLAMES/issues/12) and [13](https://github.com/JOKER-53/FLAMES/issues/13) retain human/device/pilot acceptance. Excluding AWS deployment does not make these checks complete.

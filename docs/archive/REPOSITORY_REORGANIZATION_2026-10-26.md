# Repository reorganization — 2026-10-26

This records local implementation and verification at this change. Use the [current repository map](../REPOSITORY_STRUCTURE.md) for maintained ownership and the [documentation index](../README.md) for active guides.

## Source moves

The engine public package entry remains `@fortisim/engine` through `src/index.ts`. Internal implementation files now belong to feature folders. Imports, tests, the demonstration and the Academy contract generator were updated together.

| Previous source | New source |
| --- | --- |
| `packages/engine/src/types.ts` | `packages/engine/src/policy/types.ts` |
| `packages/engine/src/matching.ts` | `packages/engine/src/policy/matching.ts` |
| `packages/engine/src/evaluator.ts` | `packages/engine/src/policy/evaluator.ts` |
| `packages/engine/src/grader.ts` | `packages/engine/src/policy/grader.ts` |
| `packages/engine/src/interfaceTypes.ts` | `packages/engine/src/interfaces/interfaceTypes.ts` |
| `packages/engine/src/interfaceGrader.ts` | `packages/engine/src/interfaces/interfaceGrader.ts` |
| `packages/engine/src/interfaceScenarios.ts` | `packages/engine/src/interfaces/interfaceScenarios.ts` |
| `packages/engine/src/portGrader.ts` | `packages/engine/src/ports/portGrader.ts` |
| `packages/engine/src/portScenarios.ts` | `packages/engine/src/ports/portScenarios.ts` |
| `packages/engine/src/panExercises.ts` | `packages/engine/src/pan/panExercises.ts` |
| `packages/engine/src/authoredContent.ts` | `packages/engine/src/content/authoredContent.ts` |
| `packages/engine/src/configurationExercises.ts` | `packages/engine/src/content/configurationExercises.ts` |
| `packages/engine/src/hardQuestions.ts` | `packages/engine/src/learning/hardQuestions.ts` |
| `packages/engine/src/learningHints.ts` | `packages/engine/src/learning/learningHints.ts` |
| `packages/engine/src/completion.ts` | `packages/engine/src/progress/completion.ts` |
| `packages/engine/src/drafts.ts` | `packages/engine/src/progress/drafts.ts` |
| `packages/engine/src/exampleScenario.ts` | `packages/engine/src/scenarios/fortigate/exampleScenario.ts` |
| `packages/engine/src/dbLockdownScenario.ts` | `packages/engine/src/scenarios/fortigate/dbLockdownScenario.ts` |
| `packages/engine/src/dmzMultiServiceScenario.ts` | `packages/engine/src/scenarios/fortigate/dmzMultiServiceScenario.ts` |
| `packages/engine/src/interZoneTrustScenario.ts` | `packages/engine/src/scenarios/fortigate/interZoneTrustScenario.ts` |
| `packages/engine/src/fullNetworkPolicyScenario.ts` | `packages/engine/src/scenarios/fortigate/fullNetworkPolicyScenario.ts` |
| `packages/engine/src/multiSystemScenario.ts` | `packages/engine/src/scenarios/fortigate/multiSystemScenario.ts` |
| `packages/engine/src/webFilterScenario.ts` | `packages/engine/src/scenarios/fortigate/webFilterScenario.ts` |
| `packages/engine/src/complexScenarios.ts` | `packages/engine/src/scenarios/fortigate/complexScenarios.ts` |
| `packages/engine/src/practiceScenarios.ts` | `packages/engine/src/scenarios/fortigate/practiceScenarios.ts` |
| `packages/engine/src/finalAssignments.ts` | `packages/engine/src/scenarios/assessments/finalAssignments.ts` |
| `packages/engine/src/scenarios/routingScenarios.ts` | `packages/engine/src/scenarios/fortigate/routingScenarios.ts` |

Port contracts were also separated from interface IP contracts into `ports/portTypes.ts`, preserving the same root public type exports. No exercise IDs, grading requirements, database migrations, model URLs or application routes were changed by the source reorganization.

## Documentation and tooling

Dated Academy/theme, admin, autosave, bug-fix and audit reports were moved into this archive and internal Markdown links were rebased. Current README, architecture, application flow, repository structure, authoring, roadmap and browser guides were rewritten around implemented behavior. Package, scripts and cross-package test guides were added. The stale college-host availability statement is now explicitly historical.

`npm run docs:check` validates local file links in maintained Markdown and runs in CI. `npm run docs:learning` regenerates the handbook. `npm run sync:academy` regenerates the adapter validator from the relocated progress contract. Docker/Compose entry points, existing operational script paths and live data locations remain stable. Empty obsolete template/asset directories were removed; installed dependencies, private data and backups were preserved.

## Verification

- Clean engine/backend build followed by package tests and production frontend build passed.
- Final `npm run verify`: 56 engine, 97 backend and 37 frontend tests passed (190 total).
- Chromium full suite: 77 browser workflows passed.
- Firefox full suite: 75 passed; the two actual GPU model-rendering cases were intentionally skipped, with fallback/keyboard checks retained.
- `npm run docs:check`: local targets in 39 maintained Markdown files resolved.
- Handbook and Academy contract generation completed successfully.
- Engine CLI demo ran, accepting its valid fixture and rejecting the deliberately permissive fixture.
- Production and Academy Compose configuration validation passed.
- The actual local API health endpoint returned `{"status":"ok"}` after the source moves.
- `git diff --check` passed.

No AWS deployment, Academy installation or publishing was performed. Actual-device/assistive-technology acceptance remains separate. Chromium/browser source moves were followed by the final type-only port-contract separation; the final package/build checks and Firefox suite cover that separation as well.

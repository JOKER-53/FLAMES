# Add or update a training task

Prefer the [content studio](ADMIN_CONTENT.md) for instructor-authored modules. Native curriculum changes require the engine, public lesson metadata, learning material and progress integration to agree. Avoid scenario-specific branches in generic evaluators; a new simulation capability is a separate implementation decision.

## Native task locations

| Task family | Definition / behavior |
| --- | --- |
| FortiGate policy | `packages/engine/src/scenarios/fortigate/` and `src/policy/` |
| FortiGate operations practice | `src/scenarios/fortigate/practiceScenarios.ts` |
| Interface configuration | `src/interfaces/interfaceScenarios.ts`, contracts and grader in the same folder |
| Port assignment | `src/ports/portTypes.ts`, `portScenarios.ts` and `portGrader.ts` |
| Final assessments | `src/scenarios/assessments/finalAssignments.ts` |
| Static routing | `src/scenarios/fortigate/routingScenarios.ts` and `src/evaluators/routingEvaluator.ts` |
| Palo Alto security/zones/NAT | `src/pan/panExercises.ts` |

The `src/` paths in this table are relative to `packages/engine/`. Export new public definitions through `src/index.ts`; other workspaces consume `@fortisim/engine` rather than reaching into internal source folders.

## Design the exercise

1. Pick the concept and write an exact, student-facing requirement. Use example networks, not real credentials or production settings.
2. Define sensible starter objects or rows. Keep distractors useful rather than overcrowding the form.
3. Provide positive and negative tests: neighboring addresses, wrong services/applications, reverse initiation and overlapping-rule order where relevant.
4. For policy tasks, express expected outcomes as behavior, not one mandatory rulebase. Add logging requirements only when stated in the brief.
5. For interface/port tasks, validate the complete required inventory. For PAN security, evaluate effective ordered decisions; zones must reject duplicate ownership; NAT checks must match one coherent translation.
6. Prove a valid solution and demonstrate failure for missing permissions, broad access and relevant ordering/protocol/logging mistakes. Never derive the test's reference solution automatically from the expected outcome list.

## Register a native lesson

- Add metadata to `packages/frontend/src/course/curriculum.ts`, preserving existing URLs and assessment prerequisite behavior.
- Add native IDs to engine `progress/completion.ts` and the matching `integrations/academy/lesson-manifest.mjs`. Operations Practice also uses `PRACTICE_TASKS` to keep classroom modules separate.
- Register FortiGate policy scenarios in backend `src/scenarios/registry.ts`; interface/port/PAN families use their native registries.
- Add the relevant knowledge-check concept mapping in the backend and a curated offline question in engine `learning/hardQuestions.ts` or the existing PAN fallback bank.
- Add a study plan to frontend `course/learning.json`; update chapters/examples if introducing a new concept. Run `npm run docs:learning`.
- Update scoped classroom module resolution if adding a new module/family. Do not accidentally add practice tasks to existing assessment requirements or alter saved assignment snapshots.
- Run `npm run sync:academy` after changing draft validation contracts. The companion adapter must be updated in the actual Academy deployment separately.

Frontend coverage compares native curriculum, completion IDs, Academy manifest and learning plans. New task IDs must work with the existing draft family/version resolver and both guest/account ownership boundaries.

## Authored modules

The admin studio creates reading/choice/answer lessons, FortiGate policy exercises and supported configuration-family lessons. Define starters, private reference settings and checks, test the reference, then publish. Published modules are discovered dynamically and do not need static completion registration. Imports receive new IDs and remain private drafts; duplication must not copy completion.

Public serializers must omit private reference values, expected answers and revision snapshots. Built-in definitions can be browser-visible; do not represent native practice tasks as a secret-answer-key examination system.

## Verify and document

Run `npm run verify` and `npm run docs:check`. Run relevant browser workflows for navigation, topology, forms and persistence; a new native task is included in curriculum-wide topology coverage. Regenerate the handbook/Academy contract and review their diffs. Actual-device rendering, assistive-technology acceptance and parent-deployment round trips are separate checks.

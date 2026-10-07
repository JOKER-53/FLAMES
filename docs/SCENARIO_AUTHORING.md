# Authoring a new Scenario

Scenarios are pure data. Adding a new exercise should never require
touching evaluator or grader logic -- if it does, that means the scenario
needs a genuinely new engine capability, which is a deliberate, separate
decision.

## Firewall Policy scenarios

See `packages/engine/src/exampleScenario.ts` (Web Server Access) and
`packages/engine/src/dbLockdownScenario.ts` as worked templates.

1. **Pick a teaching objective.** What mistake should this scenario catch?
   (rule ordering, forgetting default-deny, wrong CIDR scope, wrong
   service/port, asymmetric zone trust.)
2. **Define starter objects** (`starterAddresses`, `starterServices`).
   Include distractor objects so the scenario tests judgment, not just
   data entry.
3. **Write test packets that actually probe the objective.** Include
   packets that should be DENIED, not just the happy-path ACCEPT case --
   otherwise an overly permissive "allow everything" config can pass.
4. **Never let `expectedOutcomes` describe a config, only a behavior.**
   Many valid policy lists can satisfy the same expected outcomes; that's
   the point of behavioral grading.
5. **Register it** in `packages/backend/src/scenarios/registry.ts`'s
   `allScenarios` array, and export it from `packages/engine/src/index.ts`.

## Interface Configuration scenarios

See `packages/engine/src/interfaceScenarios.ts`.

1. Define `starterInterfaces` (what the student sees pre-loaded -- often
   blank IP/subnet/adminAccess fields for the student to fill in).
2. Define `checks`: one entry per field you want graded, each pointing
   at an `interfaceName` and `field` (`ip` | `subnet` | `adminAccess` |
   `role`) with an `expectedValue`.
3. Register the scenario in `ALL_INTERFACE_SCENARIOS`
   (`packages/engine/src/interfaceScenarios.ts`).

## Port Assignment scenarios

See `packages/engine/src/portScenarios.ts`.

1. Define `ports`: the list of physical ports visible on the chassis
   diagram for this exercise (`portId`, display `label`).
2. Define `checks`: one entry per port you want graded, each with an
   `expectedZone` (`WAN` | `LAN` | `DMZ` | `unassigned`).
3. Register the scenario in `ALL_PORT_SCENARIOS`
   (`packages/engine/src/portScenarios.ts`).
4. Good port scenarios introduce a *new wrinkle* each time (e.g. ports
   that should stay unassigned despite being wired, redundant WAN links,
   port numbering not matching physical position) rather than repeating
   the same basic LAN/DMZ/WAN split.

## Anti-patterns to avoid

- **Don't** add scenario-specific `if (scenario.id === "...")` branches
  anywhere in evaluator/grader code or route handlers. If a scenario
  needs special-case logic, the data model is missing something general.
- **Don't** put a model/correct answer inside any field that could
   accidentally be sent to the frontend. The API strips expected outcomes,
   but browser-side exercises currently import scenario definitions. Do not
   treat the application as a secret-answer-key examination system.
- **Don't** write scenarios with only a "happy path" check. Always
  include packets/fields that should fail if the student is too
  permissive or careless.

## Palo Alto exercises

Add security, zone, or NAT exercises in `packages/engine/src/panExercises.ts`,
metadata in `packages/frontend/src/pages/pan/panTasks.ts`, and a concept mapping
for optional knowledge checks. Exercise selectors and server grading share
these definitions. Prove every listed exercise and final with positive and
negative fixtures in `packages/engine/test/panExercises.test.ts`.

Security tests must evaluate effective traffic in rule order, not the mere
existence of an allow/deny rule. Zone checks must reject shared interface
ownership. NAT mappings must match exactly within one coherent rule.

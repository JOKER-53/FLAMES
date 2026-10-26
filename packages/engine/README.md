# Shared simulation engine

`@fortisim/engine` supplies pure simulation behavior and contracts to the API and React app. Consumers import its supported symbols from `src/index.ts`; the package entry point remains `dist/index.js` and its browser source entry remains `src/index.ts`.

| Folder | Owns |
| --- | --- |
| `src/policy` | Packet/object types, matching, ordered evaluation and grading |
| `src/interfaces`, `src/ports` | Interface and cable/port task contracts, native scenarios and grading |
| `src/pan` | Simplified Palo Alto security, zone and NAT exercises |
| `src/scenarios/fortigate` | Native FortiGate policy, operations and static-route task data |
| `src/scenarios/assessments` | Combined final-assessment definitions |
| `src/evaluators` | Routing and security-profile decisions |
| `src/content` | Authored lesson schemas, configuration validation/grading and packet explanations |
| `src/progress` | Native completion IDs and versioned simulator draft validation |
| `src/learning` | Curated fallback questions and deterministic concept hints |
| `test` | Engine regressions, independent valid configurations and negative cases |

From the repository root, run `npm run build --workspace=@fortisim/engine`, `npm test --workspace=@fortisim/engine`, or `npm run engine:demo`. The backend consumes compiled output; frontend Vite resolves the browser source entry. Do not introduce credentials, database access or browser APIs here.

See [scenario authoring](../../docs/SCENARIO_AUTHORING.md) for all registration steps. Keep API serializers explicit about private authored answers; built-in models remain teaching simulations, not a secure examination system.

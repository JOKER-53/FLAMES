# Repository structure

FLAMES uses one npm workspace and one active lockfile: `/package-lock.json`. Run dependency installation from the repository root.

```text
.
├── packages/
│   ├── engine/
│   │   ├── src/                 # Shared types, matching, grading, scenarios
│   │   │   ├── evaluators/      # Routing and security-profile evaluators
│   │   │   └── scenarios/       # Routing scenario definitions
│   │   └── test/                # Engine regression tests
│   ├── backend/
│   │   ├── src/
│   │   │   ├── controllers/     # Submission and knowledge-check handlers
│   │   │   ├── platform/        # SQLite, authentication, accounts, progress
│   │   │   ├── routes/          # Training API routes
│   │   │   ├── scenarios/       # Server scenario registry
│   │   │   └── services/        # AI providers, fallback hints, question store
│   │   └── test/                # API and tutor regression tests
│   └── frontend/
│       ├── public/              # Runtime GLB models, served at stable URLs
│       ├── src/
│       │   ├── api/             # HTTP clients
│       │   ├── components/      # Shared UI, shells, lesson and 3D components
│       │   ├── course/          # Curriculum and lesson metadata
│       │   ├── hardware/        # Socket maps, cable compatibility and geometry
│       │   ├── hooks/           # Accounts, progress, sessions and grading
│       │   └── pages/
│       │       ├── fortigate/   # FortiGate hardware, policies and network tools
│       │       ├── pan/         # Palo Alto hardware and exercises
│       │       └── course/      # Shared overview and module pages
│       └── test/                # Render smoke and hardware mapping tests
├── integrations/academy/        # Parent router/schema/iframe wrapper for installation
├── assets/source/               # Non-runtime source assets
├── scripts/                     # Maintained development utilities
├── deploy/                      # Nginx configuration
├── docs/                        # Current guides
│   └── archive/                 # Historical reports, prototypes and retired files
└── .github/                     # CI and contribution templates
```

Root Docker/Compose files, `vercel.json`, workspace manifests, and community files remain at the root so their tooling and hosting discovery continue to work. Each package owns its compiler and build configuration. Generated `dist/`, installed `node_modules/`, local environment files, and SQLite data are ignored.

## Placement rules

- Put vendor-specific screens in `pages/fortigate/` or `pages/pan/`; keep account, classroom, and vendor selection screens at `pages/`.
- Share learning metadata through `course/curriculum.ts` and pure simulation behavior through the engine's public `src/index.ts` exports.
- Keep API handlers in the backend; provider credentials must never enter the frontend.
- Tests belong to the package whose behavior they cover. Frontend tests can import shared engine definitions.
- Runtime models belong in `packages/frontend/public/`. The FBX source belongs in `assets/source/`; do not duplicate runtime GLBs at the root.
- Import replacement GLBs with `node scripts/import-model.mjs /path/to/model.glb [pa-220-firewall.glb|firewall.glb]`. Recheck socket alignment after replacing a model.
- Keep active instructions in `docs/`; place dated implementation reports and retired tooling in `docs/archive/`.

The hardware pages are `FortiGateHardwarePage.tsx` and `PanHardwarePage.tsx`. Their public routes remain `/fortigate/hardware` and `/paloalto/hardware`.

The API `src/integration/` and frontend `src/integration/` implement parent-managed mode. `integrations/academy/` contains the companion files for the other repository; it is not automatically deployed by FLAMES.

The product name is **FLAMES**. Existing `@fortisim/*` workspace names, database/session keys, and `FORTISIM_*` integration identifiers remain stable for compatibility. Use FLAMES for visible labels and documentation.

Content authoring lives in backend `src/content/`, frontend `pages/admin/`, and `course/CourseCatalog.tsx`. Shared authored-content interfaces are in engine `src/authoredContent.ts`. The interactive local administrator setup is `scripts/create-admin.cjs`.

Simulator autosave contracts are in engine `src/drafts.ts`, persistence APIs in backend `src/drafts/`, and shared client state/status in frontend `src/drafts/`. `PolicyExerciseEditor.tsx` provides visual policy authoring; backend `content/policyExercise.ts` validates and tests it. `scripts/sync-academy-contract.mjs` generates the companion Academy validator.

Additional feature locations: `packages/backend/src/classroom/` contains scoped group/assignment persistence, module resolution and authenticated routes; `packages/engine/src/learningHints.ts` supplies deterministic concept guidance; `packages/frontend/src/components/lesson/StagedHints.tsx` renders hint stages. Content import/export uses the existing `content/store.ts` and admin routes with `pages/admin/ContentTransfer.tsx`. Operational commands are in `scripts/data-backup.cjs` and `scripts/create-admin.cjs`; private snapshots belong outside Git (the `.backups/` directory is ignored).

Expanded authoring uses `engine/src/configurationExercises.ts`, `pages/admin/ConfigurationExerciseEditor.tsx`, shared `components/configuration/` forms/traces, and `pages/course/AuthoredConfigurationLesson.tsx`. Backend content storage/routes keep reference definitions private and grade version-bound submissions. `scripts/backend-dev.cjs` supervises shared-engine/API compilation in development.

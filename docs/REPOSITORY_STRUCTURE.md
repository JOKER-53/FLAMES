# Repository structure

FLAMES is one npm workspace with three packages and one active dependency lockfile, `package-lock.json`. Install and run workspace commands from the repository root. Product labels use **FLAMES**; `@fortisim/*`, database/session keys, and Academy protocol identifiers stay stable for compatibility.

```text
.
├── packages/
│   ├── engine/
│   │   ├── src/
│   │   │   ├── index.ts                  # Public @fortisim/engine exports
│   │   │   ├── demo.ts                   # CLI demonstration
│   │   │   ├── policy/                   # Packet types, matching, evaluation, grading
│   │   │   ├── interfaces/               # Interface contracts, scenarios, grading
│   │   │   ├── ports/                    # Port contracts, scenarios and grading
│   │   │   ├── pan/                      # Palo Alto security, zones and NAT models
│   │   │   ├── content/                  # Authored lesson/configuration contracts
│   │   │   ├── progress/                 # Native completion IDs and draft contracts
│   │   │   ├── learning/                 # Curated questions and deterministic hints
│   │   │   ├── evaluators/               # Routing and security-profile evaluators
│   │   │   └── scenarios/
│   │   │       ├── fortigate/            # Policy/operations/static-route definitions
│   │   │       └── assessments/          # Combined final-assessment definitions
│   │   └── test/                         # Pure engine regressions
│   ├── backend/
│   │   ├── src/
│   │   │   ├── app.ts / server.ts        # App construction and process startup
│   │   │   ├── platform/                 # Accounts, sessions and completion
│   │   │   ├── content/                  # Private drafts, publishing, history, guide settings
│   │   │   ├── classroom/                # Ownership, invitations and assignments
│   │   │   ├── drafts/                   # Versioned simulator autosave APIs
│   │   │   ├── db/                       # Transactional, checksummed migrations
│   │   │   ├── integration/              # Academy identity/progress proxy
│   │   │   ├── routes/ / controllers/    # Native training and knowledge-check endpoints
│   │   │   ├── scenarios/                # Server policy-scenario registry
│   │   │   └── services/                 # AI provider, fallbacks and question sessions
│   │   └── test/                         # API, persistence, authorization and operations
│   └── frontend/
│       ├── public/
│       │   ├── firewall.glb              # Original FortiGate asset
│       │   ├── pa-220-firewall.glb        # Original Palo Alto asset
│       │   ├── images/beyondbug-team.png # Original credits team photograph
│       │   └── theme-init.js             # Theme initialization before React
│       ├── src/
│       │   ├── App.tsx                   # Public/account/admin/course routes
│       │   ├── api/                      # Shared HTTP behavior
│       │   ├── components/               # UI primitives, shells, lessons, packet tools
│       │   ├── course/                   # Curriculum, catalog, learning source/access
│       │   ├── drafts/                   # Hydration, autosave, conflicts and status
│       │   ├── hardware/                 # Shared appliance viewer, loading, scheduling, sockets/cables
│       │   ├── hooks/                    # Identity, progress, grading and sessions
│       │   ├── integration/              # Verified parent-frame bridge
│       │   ├── utils/                    # Small shared helpers
│       │   └── pages/
│       │       ├── admin/                # Content studio, builders, guide visibility
│       │       ├── course/               # Overview, modules, authored lessons, guide
│       │       ├── fortigate/            # Native FortiGate screens
│       │       ├── pan/                  # Native Palo Alto screens
│       │       └── *.tsx                 # Landing, account, classroom and credits
│       └── test/                         # Frontend logic, rendering and content coverage
├── integrations/academy/                 # Companion adapter installed in Academy
├── assets/source/                        # Non-runtime model source assets
├── scripts/                              # Development, generation and operations commands
├── tests/browser/                        # Isolated Chromium/Firefox workflows
├── deploy/                               # Production and Academy Nginx configuration
├── docs/                                 # Active, maintained documentation
│   └── archive/                          # Dated evidence and retired prototypes
└── .github/                              # CI, issues and pull-request templates
```

## Placement and ownership

| Change | Source of truth | Companion updates |
| --- | --- | --- |
| Native task | Engine feature/scenario folder | Public engine export, server registry where used, curriculum, progress IDs, Academy manifest, learning plan and tests |
| Learning material | Frontend `course/learning.json` | Run `npm run docs:learning`; output is `docs/LEARNING_HANDBOOK.md` |
| Student guide visibility | Backend `content/store.ts` and protected routes | Frontend `useLearningAccess.ts`, admin panel, catalog and route/navigation guards |
| Content authoring | Engine `content/`, backend `content/`, frontend `pages/admin/` | Public serializers must omit reference answers and private history |
| Simulator drafts | Engine `progress/drafts.ts`, backend/frontend `drafts/` | Run `npm run sync:academy` after contract changes |
| Hardware | Frontend `hardware/`, vendor hardware pages and public GLBs | Model preparation, socket checks and real-device visual acceptance |
| Credits | Frontend `pages/CreditsPage.tsx` and public team photo | Header access in shared `AccountMenu`; no footer/sidebar duplicate |
| Operational command | `scripts/` | Script index, command documentation and deployment image copies if used there |

Import shared behavior through `@fortisim/engine`. Keep its supported exports in `src/index.ts`; internal source paths are implementation details. Tests may use feature-local imports. Keep grading credentials and private authored solutions in the backend.

Keep package compiler/build configuration beside its package. Root Dockerfiles, Compose files, `vercel.json`, workspace manifests, CI/community files, and the `TODO.md`/`updation.md` entry points stay discoverable at their existing paths. `Architecture.md` is a compatibility pointer to the maintained architecture guide. GitHub templates belong only in `.github/`.

## Source assets, generated output and runtime data

Keep original runtime GLBs at their stable public URLs. The optimized FortiGate GLB, gzip sidecars, manifest and content-hashed references are generated by `scripts/prepare-hardware.cjs` and ignored by Git. Development with a read-only public mount uses the private `node_modules/.cache/flames-hardware` cache. Do not move model URLs without updating serving, transport and socket calibration together.

Keep the credits photo in `public/images/`; it is a source asset, not generated output. Keep the FBX original in `assets/source/`.

`node_modules/`, `dist/`, browser reports, coverage, local environment files, SQLite databases and private backup directories are generated or runtime state. They stay ignored; a repository reorganization must not move or delete live databases, volumes or user backups. Retired implementation reports belong in `docs/archive/`; their historical statements are not current acceptance guarantees.

Package guides: [engine](../packages/engine/README.md), [backend](../packages/backend/README.md), [frontend](../packages/frontend/README.md). Command guide: [scripts](../scripts/README.md). Browser guide: [tests](../tests/README.md).

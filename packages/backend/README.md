# Training API

The Express API constructs dependencies in `src/app.ts` and starts through `src/server.ts`. Native training endpoints use `routes/`, `controllers/`, the scenario registry and shared engine. Feature modules own their authenticated routes and persistence.

| Folder / file | Owns |
| --- | --- |
| `platform/` | Local users, sessions, account completion and account endpoints |
| `content/` | Draft/published lessons, private reference answers, revisions, imports and guide visibility |
| `classroom/` | Instructor-owned groups, invitations, assignments and scoped reports |
| `drafts/` | Identity/version-bound simulator autosave |
| `db/` | Checksummed transactional migration ledger |
| `integration/` | Academy identity verification and parent-owned progress/draft proxy |
| `services/` | AI transport, validated questions, fallbacks and staged guidance |
| `diagnostics.ts` | Correlated request logs and protected process/schema diagnostics |
| `validation.ts`, `middlewares/` | Shared request validation and middleware |
| `test/` | API, isolation, authorization, persistence, migration and operational regressions |

Run `npm ci` at the root, copy `.env.example` to `.env` in this package, then use root command `npm run backend:dev`. It supervises engine/API builds together. `npm run build --workspace=@fortisim/backend` compiles the API after the engine is built. Tests use temporary data; production data must remain outside source control.

Standalone account storage and content/classroom storage are separate SQLite responsibilities. Academy owns identities, completion and simulator drafts in integrated mode; FLAMES still persists authored content and learning-guide settings. Never send provider credentials or private authored reference definitions to student clients.

Read [architecture](../../docs/ARCHITECTURE.md), [diagnostics/migrations](../../docs/DIAGNOSTICS_AND_MIGRATIONS.md), [administration](../../docs/ADMIN_CONTENT.md) and [operations](../../docs/OPERATIONS_RUNBOOK.md).

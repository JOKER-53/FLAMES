# Maintained scripts

Run npm commands from the repository root. Script paths remain stable because Compose, Docker images and operational documentation refer to them.

| Script | Command / purpose |
| --- | --- |
| `backend-dev.cjs` | `npm run backend:dev`: watches engine/API sources, builds both, replaces the API only after a successful build |
| `browser-server.cjs` | Fixture used by `npm run test:browser`: temporary databases, fixture accounts, no live AI credentials; never a production server |
| `prepare-hardware.cjs` | Frontend predev/prebuild: reproducibly creates optimized models, gzip sidecars and versioned manifest; outputs are ignored |
| `prepare-learning.cjs` | `npm run docs:learning`: generates the task handbook from current curriculum and shared learning source |
| `check-docs.cjs` | `npm run docs:check`: validates local Markdown link targets in active docs and package/script guides |
| `sync-academy-contract.mjs` | `npm run sync:academy`: generates the companion Academy simulator validator from engine `progress/drafts.ts` |
| `configure-academy.mjs` | Generates local Academy-mode settings; see its usage and the integration guide before invoking |
| `create-admin.cjs` | `npm run admin:create`: interactive instructor creation/recovery using configured account storage |
| `data-backup.cjs` | `npm run data:backup` / `npm run data:restore`: explicit backup/restore operator workflows |
| `import-model.mjs` | `node scripts/import-model.mjs /path/to/model.glb [pa-220-firewall.glb\|firewall.glb]`: imports an original runtime GLB |

Generated documentation and integration contracts are committed; generated model derivatives and private snapshots are not. Review diffs after generation. Replacing a model requires manual socket/alignment acceptance. Read the [operations runbook](../docs/OPERATIONS_RUNBOOK.md) before backup, restore or account recovery.

Retired one-off patch scripts are kept only in the [archive](../docs/archive/README.md), not in this maintained command directory. Deployment copies only scripts required by its target; keep Docker copy instructions synchronized if adding an operational dependency.

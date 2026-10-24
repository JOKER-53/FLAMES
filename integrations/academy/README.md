# Academy adapter package

This is a copy-in integration for the inspected Incogn1tr1x-Academy repository. It has not been installed on the college server.

| File | Copy/use in Academy |
| --- | --- |
| `fortisim.routes.mjs` | `backend/src/routes/fortisim.routes.mjs` |
| `simulator-contract.mjs` | `backend/src/routes/simulator-contract.mjs` (shared simulator draft validation) |
| `lesson-manifest.mjs` | `backend/src/routes/lesson-manifest.mjs` |
| `schema.sql` | Apply to the existing Academy MySQL database |
| `FlamesLab.jsx` | `src/components/FlamesLab.jsx` |

Follow the [integration guide](../../docs/PARENT_LMS_INTEGRATION_GUIDE.md) for the route mount, authenticated frontend routes, environment settings, Nginx framing policy, and verification.

Accounts remain exclusively in Academy. The progress table stores student-reported practice completion, not certified exam scores. All queries scope reads/writes to the authenticated Academy identity. Completion IDs come from the public manifest. Repeated saves are idempotent.

For authored lessons, set `FLAMES_CATALOG_URL` on the Academy backend to the reachable FLAMES `/api/content/catalog` endpoint. This extends the built-in task registry with published custom lessons and updates totals. See [content administration](../../docs/ADMIN_CONTENT.md).

The additive SQL schema now includes `fortisim_simulator_drafts` for parent-owned configuration autosave. Copy the generated simulator contract with the router when upgrading. See [autosave integration](../../docs/AUTOSAVE_AND_EXERCISE_BUILDER.md).

## Classroom assignment adapter update

The updated adapter adds admin-only `POST /api/integrations/fortisim/classroom/progress` for validated batches of up to 500 student IDs. Install the updated router before integrated instructor reports are used. FLAMES stores group/assignment teaching metadata and parent ID references in its content database; account identity, completion and simulator drafts remain in Academy. Group ownership is checked by FLAMES before requesting parent results. No Academy UI/schema change for assignments is installed automatically. Back up both systems and preserve parent IDs during restore.

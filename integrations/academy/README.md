# Academy adapter package

This is a copy-in integration for the inspected Incogn1tr1x-Academy repository. It has not been installed on the college server.

| File | Copy/use in Academy |
| --- | --- |
| `fortisim.routes.mjs` | `backend/src/routes/fortisim.routes.mjs` |
| `lesson-manifest.mjs` | `backend/src/routes/lesson-manifest.mjs` |
| `schema.sql` | Apply to the existing Academy MySQL database |
| `FlamesLab.jsx` | `src/components/FlamesLab.jsx` |

Follow the [integration guide](../../docs/PARENT_LMS_INTEGRATION_GUIDE.md) for the route mount, authenticated frontend routes, environment settings, Nginx framing policy, and verification.

Accounts remain exclusively in Academy. The progress table stores student-reported practice completion, not certified exam scores. All queries scope reads/writes to the authenticated Academy identity. Completion IDs come from the public manifest. Repeated saves are idempotent.

For authored lessons, set `FLAMES_CATALOG_URL` on the Academy backend to the reachable FLAMES `/api/content/catalog` endpoint. This extends the built-in task registry with published custom lessons and updates totals. See [content administration](../../docs/ADMIN_CONTENT.md).

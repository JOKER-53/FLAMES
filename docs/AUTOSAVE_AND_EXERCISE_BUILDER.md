# Simulator autosave and visual policy exercise builder

Implemented: 2026-10-23. These features extend the existing FLAMES course, content studio, and Academy integration.

## Configuration autosave

Applied simulator configurations now save automatically after a short debounce. A status bar shows loading, changes waiting, saving, saved, or failure. It provides retry, reset, and conflict recovery controls.

Supported configurations:

| Vendor | Saved state |
| --- | --- |
| FortiGate policy exercises | Addresses, services, web-filter profiles, and ordered policies |
| FortiGate interfaces | Interface addressing, roles, masks, and administrative access |
| FortiGate ports | Physical port assignments |
| FortiGate routing | Static route entries |
| Palo Alto security | Ordered security rules and application selections |
| Palo Alto zones | Zone settings and interface membership |
| Palo Alto NAT | NAT rules and mappings |
| Palo Alto interfaces | Interface configuration |
| Palo Alto ports | Port-to-zone assignments |

Published custom FortiGate policy exercises use the same autosave mechanism. Unapplied text in a create/edit dialog and hardware reference camera/cable exploration are not configuration snapshots; apply the edit in the console to include it in autosave.

### Storage ownership

- Guests use device-local storage keyed by vendor and lesson. Guest history is never silently imported into an account.
- Standalone signed-in users use the account SQLite database's `simulator_drafts` table and can resume from another device.
- Academy users use the parent MySQL `fortisim_simulator_drafts` table through authenticated proxy endpoints. FLAMES does not persist their simulator drafts in a local student database or browser configuration cache.
- Instructor-authored module drafts, student configuration drafts, and lesson completion are separate records.

### Versions, conflicts, and recovery

Snapshots have `schemaVersion: 1`, a scenario version, an optimistic revision, configuration, and update time. Built-in scenario versions are explicit; custom policy versions derive from the published exercise definition.

- Editors wait for saved configuration loading before allowing changes, avoiding an empty starter overwriting an existing draft.
- A stale tab/device receives a conflict instead of overwriting a newer save. **Reload saved version** discards the local unsaved configuration with confirmation.
- Guest tabs use Web Locks where available and storage-change conflict detection. Signed-in writes use server-side compare-and-swap.
- Reset keeps a revisioned empty tombstone, preventing an old tab from resurrecting a reset configuration. Completion and other lessons are unaffected.
- An incompatible or changed scenario draft is preserved and blocked from automatic restore; resetting explicitly starts the current version.
- Each authenticated write checks the expected account ID; reads from the UI also carry an expected-owner check. Work started under an earlier login cannot be saved into a newly logged-in account.
- Authentication failures stop editing until reauthentication/reload. Old account configuration is not copied into guest state.
- Failed saves remain visibly unsaved and can be retried. Dirty configurations warn before closing/reloading; pending changes flush on in-app unmount and tab hiding when possible.

A browser that is forcibly killed, loses storage, or has no network cannot guarantee saving unacknowledged changes. Confirm the saved status before leaving important work.

### API

`GET /api/drafts/:platform/:lessonId` returns the current scenario spec and the current user's draft. `PUT` saves a versioned configuration; `DELETE` resets it with a revisioned tombstone. Both write operations require the expected owner, schema/scenario versions, and revision. Authentication and supported-lesson checks always apply.

The Academy adapter exposes corresponding `GET/POST /api/integrations/fortisim/drafts/:platform/:lessonId` operations. A `POST` with `config: null` performs a revisioned reset.

## Visual exercise builder

In `/admin`, create a FortiGate module, add a lesson, and choose **FortiGate policy simulator exercise** as the lesson type. Write the instructions, then use the forms to configure:

1. Starter address objects (subnets or IP ranges).
2. Starter service objects and protocols/ports.
3. Optional web-filter profiles and blocked domains.
4. Optional initial policy rules visible to students.
5. Test packets, expected ACCEPT/DENY behavior, and optional logging requirements.
6. Ordered reference policies using the same objects.

The seeded example demonstrates publishing HTTPS to a DMZ server while blocking unapproved HTTP. It is a starting point for editing, not a student answer key.

**Test reference solution** grades the complete reference configuration with the shared engine and reports each packet's result to the administrator. Publication independently repeats validation: object references and networking fields must be valid; every packet needs an outcome; both allowed and denied traffic must be represented; the reference must pass every check. A broad or incorrectly ordered rule that fails a negative packet prevents publication.

Save draft, revision protection, publication snapshots, unpublishing, and access restrictions are reused from the content studio. Editing a draft does not change the published exercise until republished.

Published exercises appear in course navigation and open in the existing FortiGate console at `/fortigate/policy/firewall-policy?scenario=custom-…`. Students configure and grade them through the normal flow; completion counts in the existing progress system. Custom exercises do not request unsupported knowledge-bank questions.

### Private teaching data

The student scenario endpoint exposes starter objects/policies and test packets, but removes expected outcomes and reference policies. Catalog and generic lesson endpoints also omit the exercise definition and answer keys. Student grading diagnostics omit expected-action fields. Administrator preview retains those fields for author testing.

As with existing practice, completion is not a certified exam result and repeated grading can reveal useful feedback. No claim of a tamper-proof examination system is made.

### Current builder scope

The original visual builder supports **FortiGate policy exercises**. As of 2026-10-24, [expanded authoring](CONFIGURATION_EXERCISE_BUILDER.md) also supports FortiGate interfaces/static routing and Palo Alto security/NAT/zones. Instructional lessons and choice/short-answer tasks still work for both vendors. Built-in physical-port/PAN-interface exercises retain autosave but are not authorable through the new builder.

## Academy upgrade steps

Before using these features in integrated mode:

1. Copy the updated `fortisim.routes.mjs` and the new `simulator-contract.mjs` alongside `lesson-manifest.mjs` into Academy `backend/src/routes/`.
2. Apply the additive `schema.sql` update to create `fortisim_simulator_drafts` in the parent database.
3. Configure Academy `FLAMES_CATALOG_URL` to the reachable FLAMES `/api/content/catalog` endpoint. Custom policy lesson metadata includes its scenario version; the adapter uses it to validate draft versions and lesson kinds.
4. Restart the Academy backend and verify two users, reset/conflict handling, and resume on another device.

The generated contract is synchronized from the engine with `node scripts/sync-academy-contract.mjs`; regression tests compare it with the shared engine behavior. Back up the parent simulator-draft table with Academy data. The college deployment itself has not been changed by this implementation.

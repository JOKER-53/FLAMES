# Autosave and policy builder verification — 2026-10-23

The requested configuration autosave and visual exercise builder are implemented. Builder scope is FortiGate policy exercises; autosave covers all nine existing simulator configuration families. No college deployment or database migration was performed.

## Automated verification

`npm run verify` passed:

| Package | Tests |
| --- | ---: |
| Engine | 39 |
| Backend | 57 |
| Frontend | 24 |
| Total | 120 |

Engine/backend compilation, frontend TypeScript checking, and production SPA build also passed. The existing lazy-loaded Three.js chunk-size warning remains.

New backend tests cover:

- Save/restore for FortiGate policy, interface, port, and routing configurations and PAN security, zone, NAT, interface, and port configurations.
- Account/lesson/vendor isolation, authentication, invalid snapshot rejection, and expected-owner guards.
- Stale and simultaneous writes, revisioned resets, and protection against a stale tab resurrecting reset data.
- SQLite restart persistence and independent completion records.
- Private unpublished policy exercises, reference testing, server-side student grading, completion registration, and safe public serializers.
- Invalid references, over-permissive reference policies, malformed networking fields, and missing negative packet checks.
- Changed published exercise versions preserving old drafts and rejecting obsolete writes.
- Parent-owned Academy draft storage, revision handling, user isolation, dynamic custom policy versions, and parity between generated Academy validation and engine contracts.

A frontend regression also verifies that an unauthorized response from an old Academy identity cannot expire a newly supplied credential.

## Browser verification on the actual local Docker site

Headless Chromium checks against `http://localhost:5173` passed:

1. Restore guest configurations in all nine simulator families and verify the actual rendered fields/assignments/rules.
2. Edit, debounce-save, reload, and reset a guest routing configuration.
3. Save as a standalone user and resume through a second authenticated browser context.
4. Confirm another account and the guest identity receive none of that private configuration.
5. Reject a write using another account's expected owner.
6. Detect stale-device and competing guest-tab writes; reload the winning saved version without keeping the discarded local entry.
7. Recover from corrupt JSON, incompatible configuration/schema versions, and blocked device storage; retry a failed save without losing the in-memory edit.
8. Retry a server save failure and lock editing when the session expires. Reload into guest mode without copying the private configuration.
9. Build a policy lesson through `/admin`, test the reference, demonstrate negative-packet failure for an overly broad rule, and block publication until corrected.
10. Publish, discover the lesson through the course/module outline, enter a working policy in the student console, restore it after reload, grade it, and record completion.
11. Republish changed checks, detect the stale custom scenario draft, and explicitly reset to the current version.
12. Verify answer keys are absent from public scenario/catalog responses, the builder fits mobile width, dark styling works, and the flows produce no browser page errors.

Temporary test students and sample modules were removed. The existing user-requested checking administrator was retained.

## Operational limits

- Academy installations need the new generated simulator contract, updated router, and additive `fortisim_simulator_drafts` migration. Adapter tests use an injected database interface and mock Academy; live MySQL/college acceptance remains required.
- Applied simulator configurations are saved; unapplied form/editor text and hardware reference camera/cable exploration are outside the snapshot scope.
- Save acknowledgement matters: forcibly terminating a browser or losing network/storage can prevent unacknowledged edits from persisting.
- The visual builder does not yet author other simulator families.
- Completion remains practice progress, not certified examination evidence.

See [feature setup and behavior](AUTOSAVE_AND_EXERCISE_BUILDER.md).

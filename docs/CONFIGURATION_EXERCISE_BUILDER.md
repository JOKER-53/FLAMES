# Expanded configuration exercise builder

Implemented 2026-10-24. The content studio now authors FortiGate interface/static-routing and Palo Alto security/NAT/zone exercises alongside the existing FortiGate policy builder.

## Instructor flow

Create a module for the intended vendor, add a lesson, and choose its simulator family in **Lesson type**. Enter instructions and the complete addressing/traffic plan; check descriptions are reminders, not a replacement for an explicit teaching brief.

Use the starter and reference configuration tables to add/edit/remove rows. Security/NAT rule order can be changed with the row movement buttons. Starter rows are public; reference settings and check expectations are private. **Create editable starter rows** creates editable rows with matching names/IDs without copying reference settings. This is useful for targeted interface/zone field checks and required for exact routing-row field checks. Use route-packet checks when students should add their own routes instead.

Define checks through forms:

| Family | Checks |
| --- | --- |
| FortiGate interfaces | Address, mask/prefix, role and exact administrative-access set for named interfaces; existing mask normalization is reused |
| FortiGate routing | Destination lookups using longest prefix, then administrative distance; every equal-cost path must meet the requirement. Optional exact field checks on starter rows |
| Palo Alto security | Original source/destination zones and application; first matching rule wins, otherwise implicit deny |
| Palo Alto NAT | Original source/destination zones and IPv4 destination; first matching translation, or explicitly unchanged traffic |
| Palo Alto zones | Named-zone field/set checks plus automatic exclusive interface ownership |

Security exercises require both allowed and denied packets. NAT exercises require translated and unchanged traffic. The reference must pass every check before publication. The validation endpoint returns reference diagnostics only to administrators. Test the reference, save/publish through the existing revision-controlled studio, and open the lesson from the normal course outline.

## Student flow and persistence

Published configuration lessons use their course lesson URL and a vendor console styled like the existing workspaces. Students edit their own rows, check the configuration on the server, and receive pass/fail descriptions and diagnostics of their own settings. Expected values/reference rows are not returned by student endpoints.

Autosave uses the native simulator draft family, account/guest isolation, conflict handling and changed-version reset flow. A hash of the published definition versions the exercise; changing its checks/reference/starter configuration requires an explicit reset of an older draft. Grading rejects an old version instead of checking against a silently changed definition. Completion and instructor group assignments reuse the existing progress flow.

## Storage, transfer and Academy

Authored lessons use `kind: configuration` with a versioned `configurationExercise`. Public catalog entries expose only the family and scenario version. The public definition endpoint exposes starter rows and check IDs/descriptions. A separate version-bound grading endpoint returns diagnostics without expected values.

Module import/export retains the new definition privately, remaps module/lesson/task identities, and imports as a draft. The destination must include this builder release; older servers reject the unsupported lesson kind rather than silently changing it.

The supplied Academy adapter recognizes published family/version metadata for all eight families. Update the parent router before enabling these lessons in integrated mode. Student identities, progress and saved configurations remain in Academy; teaching definitions remain in the FLAMES content database. No remote Academy installation has been performed.

## Model limits

These exercises are intentionally separate teaching models. Static routing covers IPv4 prefixes, next hops, interfaces, distance and equal-cost selection, without dynamic routing or live reachability. Security uses zone/App-ID matching without sessions or protocol identification. NAT matches the original destination and returns the configured translation string; it does not simulate connection tracking, full source/port rewriting, routing or security permission. Zone checks compare authored membership/settings without discovering physical cabling. Interface checks do not configure real equipment.

Verification includes all eight publication/grading/draft flows, private serializers, stale versions, vendor boundaries, unsatisfied references, broad security rules, NAT shadowing, route conflicts/longest-prefix selection, zone ownership, module transfer, Academy draft recognition and browser author/student solve-and-resume workflows.

## Rollback compatibility

Back up content before publishing the new lesson kinds. Older releases do not support configuration lessons. Before rolling application code back to one of those releases, unpublish these modules using the current release or restore the matched pre-upgrade content snapshot. Do not assume that an older backend can correctly grade a new published lesson kind.

## Physical and PAN interface families

`ports` authors FortiGate physical assignments, `pan-ports` authors PA-220 assignments, and `pan-interfaces` authors PA-220 interface settings. Use public starter rows and private field requirements/reference configurations. Publishing validates native port IDs and keeps the dedicated management interface outside data-plane zones. Student changes use normal autosave and server grading. New family definitions require the updated Academy router; deploy the companion adapter before integrated use. See [configuration tools](CONFIGURATION_TOOLS.md) for topology/CLI behavior.

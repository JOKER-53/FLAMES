# FLAMES documentation

Start with the [project README](../README.md) for local setup. This index lists maintained guides; dated verification records live in the [archive](archive/README.md). Pending deployment acceptance is tracked in [TODO](../TODO.md), with implementation history in [updation.md](../updation.md).

## Learn and use FLAMES

| Guide | Purpose |
| --- | --- |
| [Learning handbook](LEARNING_HANDBOOK.md) | All 48 native tasks, ten chapters, worked examples, flowcharts and self-check explanations |
| [Application flow](APPLICATION_FLOW.md) | Current routes, student journey, accounts, grading, guide visibility and credits |
| [Content administration](ADMIN_CONTENT.md) | Instructor setup, authoring, publishing, search, duplication, history and learning-guide visibility |
| [Classrooms and content transfer](CLASSROOM_AND_CONTENT_TRANSFER.md) | Groups, assignments, scoped reports, import/export and staged hints |
| [Autosave and policy builder](AUTOSAVE_AND_EXERCISE_BUILDER.md) | Draft ownership, reset/conflicts and visual FortiGate policy authoring |
| [Configuration builder](CONFIGURATION_EXERCISE_BUILDER.md) | FortiGate interfaces/routes and Palo Alto security/NAT/zones authoring |
| [Packet explanations](PACKET_EXPLANATIONS.md) | Student-config traces, row highlighting and model boundaries |
| [Glossary](NETWORKING_CONCEPTS_GLOSSARY.md) | Networking terminology |
| [Supplemental background](COMPLETE_FORTISIM_PANSIM_MASTER_GUIDE.md) | Broader networking background; not a list of implemented simulator features |

The student learning guide is hidden by default. Administrators enable it for both vendors in the content studio and retain preview access. The public Credits page is reached through the shared header.

## Develop and maintain

| Guide | Purpose |
| --- | --- |
| [Repository structure](REPOSITORY_STRUCTURE.md) | Source ownership, folder layout, generated output and placement rules |
| [Architecture](ARCHITECTURE.md) | Engine/API/UI boundaries, persistence and integration |
| [Scenario authoring](SCENARIO_AUTHORING.md) | Registering native tasks and keeping curriculum, learning and progress synchronized |
| [Browser testing](BROWSER_TESTING.md) | Isolated browser fixtures, execution and limitations |
| [Accessibility](ACCESSIBILITY.md) | Keyboard/focus/contrast support and manual assistive-technology acceptance |
| [Hardware performance](HARDWARE_PERFORMANCE.md) | Asset generation, transport cache, loading feedback and rendering |
| [Diagnostics and migrations](DIAGNOSTICS_AND_MIGRATIONS.md) | Request IDs, redacted logs, private diagnostics and append-only schema versions |
| [Contribution guide](../CONTRIBUTING.md) | Development and review expectations |
| [Script index](../scripts/README.md) | Maintained build, generation and operator commands |

## Integrate and operate

| Guide | Purpose |
| --- | --- |
| [Deployment](DEPLOYMENT.md) | Development/production containers, durable storage and reverse proxy setup |
| [Academy integration](PARENT_LMS_INTEGRATION_GUIDE.md) | Parent-owned authentication, completion and draft integration |
| [Academy adapter package](../integrations/academy/README.md) | Companion files installed in the Academy repository |
| [Operations runbook](OPERATIONS_RUNBOOK.md) | Backups, isolated restore, recovery and rollback |
| [Release checklist](RELEASE_CHECKLIST.md) | Environment-dependent acceptance before release |
| [Roadmap](ROADMAP.md) | Implemented capabilities versus remaining/optional work |

## Keep documentation synchronized

- Edit `packages/frontend/src/course/learning.json`, then run `npm run docs:learning` to rebuild the handbook. Do not edit its generated task plans independently.
- After changing engine draft contracts, run `npm run sync:academy` and verify the generated companion contract.
- Run `npm run docs:check` to validate local links in active documentation.
- Update the relevant guide when changing routes, feature flags, migrations, commands or file ownership. Store dated evidence in the archive and distinguish automated checks from deployment/manual acceptance.

## Current additions

- [Internal completion certificates](CERTIFICATES.md)
- [Configuration comparison, CLI practice and topology authoring](CONFIGURATION_TOOLS.md)
- [Non-AWS acceptance and human review](acceptance/NON_AWS_ACCEPTANCE.md)
- [Identity and assessment decision](decisions/0001-identity-and-assessment-boundaries.md)
- [Single-instance runtime decision](decisions/0002-single-instance-runtime.md)

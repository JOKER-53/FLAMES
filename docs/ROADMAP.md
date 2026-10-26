# Current capabilities and remaining work

The prioritized acceptance list is [TODO.md](../TODO.md). This page separates implemented behavior from optional features and environment-dependent validation.

## Implemented

- Two vendor courses with 48 native tasks, guided configuration and assessments.
- Local accounts/sessions, identity-scoped progress, Academy-owned identity/progress integration and versioned simulator autosave.
- Administrator-authored reading/questions, FortiGate policy exercises, and configuration builders for FortiGate interfaces/routes and Palo Alto security/NAT/zones, physical ports and interfaces; FortiGate physical-port authoring is also supported.
- Private drafts, publication, revision comparison, module/lesson search and duplication, versioned content transfer.
- Instructor-owned classroom groups, invitation membership, module assignments/deadlines, scoped reporting and CSV export.
- Ten learning chapters, individual study plans, worked examples, flowcharts and a generated handbook. Student guide visibility is administrator-controlled and defaults to hidden.
- Staged concept hints, optional AI tutoring and labelled offline fallback questions.
- Theme-aware packet explanations/network views, topology panels, optimized 3D transport/cache, loading feedback and idle/offscreen render suspension.
- Public contributor/organization credits with team photograph and header navigation.
- Request-correlated diagnostics, protected schema/process status, checksummed migrations and documented backup/recovery workflows.
- Automated package/browser regressions and light/dark accessibility checks.

See the [application flow](APPLICATION_FLOW.md) and feature guides for model boundaries. Simulator completion is practice progress, not a certified assessment score.

- Per-vendor internal college completion certificates, staff-editable designs/backgrounds, live previews and required roll numbers; see [certificates](CERTIFICATES.md).

## Environment-dependent acceptance

AWS hosting, HTTPS/DNS, production configuration, persistent storage, scheduled backups and external monitoring must be verified in the target deployment. Academy adapter installation and parent auth/progress/draft round trips require the actual deployed Academy version. The previous college endpoint is not evidence of a currently working deployment.

Manual actual-device WebGL/socket alignment, screen-reader/assistive-technology review, and release acceptance remain separate from automated browser success. Follow the [release checklist](RELEASE_CHECKLIST.md) and [operations runbook](OPERATIONS_RUNBOOK.md).

## Optional future features

- Standalone hosted password recovery, email verification and MFA if local identities remain in use; Academy-owned identities use Academy recovery.
- Certified assessment evidence and server-authoritative examination scoring, if required by the institution.
- Configuration comparisons, topology authoring and the supported FortiGate interface CLI subset are implemented; see [configuration tools](CONFIGURATION_TOOLS.md).
- Durable/distributed question sessions, shared rate limiting and multi-replica storage design if scaling requires them.
- More appliance fidelity: stateful sessions, actual App-ID inspection, complete NAT/session behavior and real HA/management configuration. These are not implied by the current simulator models.

Dated implementation and verification reports are historical evidence in the [archive](archive/README.md), not a current deployment guarantee.

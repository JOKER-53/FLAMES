# Identity and assessment boundaries

Status: current supported product baseline, 2026-10-26. Revisit when institutional requirements change.

## Identity ownership

The requested college integration delegates authentication and progress to Academy. Simulator drafts follow that identity boundary. Recovery, email verification and MFA for those identities belong to Academy; FLAMES must not create a competing student credential database or recovery flow in integrated mode.

Standalone mode remains supported for local practice and explicitly configured self-hosted use, with operator-managed account recovery. It is not a reason to introduce hosted email flows before a deployment chooses standalone student identities. If such a deployment is required, reopen [issue 19](https://github.com/JOKER-53/FLAMES/issues/19) with approved mail delivery, expiring one-use recovery tokens, enumeration/replay limits, session revocation and MFA requirements. Never use a local development checking identity for public access.

Decision: no duplicate hosted recovery/verification/MFA flow is added to FLAMES for Academy-owned accounts. This is a scope decision, not evidence that Academy's own recovery/MFA deployment has been reviewed. Actual parent verification remains [issue 8](https://github.com/JOKER-53/FLAMES/issues/8).

## Assessment meaning

FLAMES currently provides practice tasks and student-reported completion, including alternate knowledge-check completion. Native definitions can be browser-visible. A passing lesson must not be labelled certified examination evidence.

The user requested internal college completion certificates on 2026-10-26, explicitly not approved and not for placements. Implement those practice completion records with roll numbers and a mandatory disclaimer; see [certificates](../CERTIFICATES.md). This does not request a professional or certified examination mode. Keep practice semantics and labels. Before implementing a certified mode, obtain explicit requirements for identity assurance, attempt limits/timing, server-authoritative evidence, retention/access/deletion, accommodations, appeals and migration of existing progress. Native browser-visible definitions and alternative completion paths would need separate treatment; approved examination credentials cannot be inferred from a practice progress percentage.

Decision: certified scoring is deferred until the institution requests and defines it. [Issue 20](https://github.com/JOKER-53/FLAMES/issues/20) records that decision; it does not represent a certified-assessment implementation or institutional sign-off.

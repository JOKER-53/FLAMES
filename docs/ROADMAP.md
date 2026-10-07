# Release status and future work

## Delivered in the October 2026 upgrade

Accounts and expiring sessions, account-scoped server completion, instructor progress visibility, guest practice, responsive account/navigation UI, lazy routes, API timeouts/validation, regression verification, and deployment configuration are implemented.

The listed Palo Alto security/zone/NAT finals now have actual exercises and server grading. Task navigation selects the requested exercise. Hardware practice has distinct connector families, manual rotation, keyboard ports, and no preconnected cables. Explore hides cables and indicators.

See [upgrade report](UPGRADE_2026-10-02.md) for checks actually run and remaining acceptance work.

## Deliberate future work

- Hosted password reset, email verification, MFA, and operator account management.
- Server-saved configuration drafts, instructor-defined courses, multiple classrooms, and auditable server-issued assessment scores.
- Full PAN-OS/FortiOS parity: connection tracking, actual App-ID inspection, NAT packet/session behavior, real HA/management configuration, CLI parsing, and device integration.
- Durable question sessions and distributed rate limiting if the API becomes multi-replica.
- Broader browser/mobile visual and interaction tests, using an approach approved by the user.

These are not represented as working features. Public hosting, TLS provisioning, backup scheduling, provider credentials, and visual acceptance are operator tasks documented in [deployment](DEPLOYMENT.md).

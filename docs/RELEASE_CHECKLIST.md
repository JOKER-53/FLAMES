# Upgrade acceptance checklist

The release target is a classroom training platform with an optional account workflow and a reproducible production deployment. Existing FortiGate and Palo Alto exercises remain the teaching baseline.

- [x] Durable student accounts and expiring, revocable sessions.
- [x] Server-saved completion progress for both platforms, with guest practice retained.
- [x] Instructor roster with progress visibility and explicit progress provenance.
- [x] Responsive account/classroom code and navigation; route recovery and error boundary.
- [x] Reliable local development proxy and lazy-loaded pages.
- [x] Bounded API requests, consistent JSON errors, AI request timeouts.
- [x] Production container definitions, persistent volume, health checks, and secure configuration guidance.
- [x] Unified tests, type checks, builds, and CI definitions.
- [x] Current architecture and deployment documentation.
- [ ] Full production image-build/runtime/TLS acceptance.
- [ ] Interactive browser/mobile/3D alignment acceptance using current screenshots or manual checks.
- [ ] Configured live AI provider acceptance.

Not acceptance claims: a browser-only simulator is not a real firewall, and completion markers submitted by a browser are not certified exam results. Account recovery, public deployment, email delivery, and visual acceptance require operator configuration or additional review. No live deployment is implied by implementing this checklist.

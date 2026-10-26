# Supported runtime and scaling boundary

Status: current supported architecture, 2026-10-26. No deployment capacity claim is made.

FLAMES currently supports one API process with one writer to its local persistent SQLite account/content stores. Academy-owned student identity/progress/drafts use the parent adapter, but this does not remove the FLAMES content/classroom SQLite ownership constraint.

Question sessions, diagnostics counters and rate limits are process-local. Questions expire and are single-use; restarting invalidates pending questions and clients can request a new one. In-memory state is not a distributed guarantee. Do not place multiple independent API replicas behind a load balancer and claim coherent question consumption, shared quotas, or durable content.

Decision: keep the initial supported runtime single-instance/single-writer. The actual expected load, AWS capacity and operator topology must be established in deployment/pilot work; they are not known from local tests. No Redis/shared-question service or multi-writer database is introduced without a scaling requirement.

If scaling is required, reopen [issue 21](https://github.com/JOKER-53/FLAMES/issues/21) with a design for durable expiring question sessions, cross-instance replay prevention, shared limits, identity keys, database/write ownership, backup consistency and restart/load acceptance. The design must also address failure behavior and secret-free cross-instance diagnostics. This decision does not imply high availability or unlimited classroom capacity.

# Agent Nudge Protocol v1

All protocol objects carry `schemaVersion: 1`, immutable IDs, project IDs, timestamps, and extension metadata. Events add idempotency, correlation, and trace identifiers. Facts carry effective time, expiry, sensitivity, sources, and future-ready relations: supersedes, contradicts, depends on, and invalidates.

Delivery classes:

- `BLOCK`: visible advisory pre-action hold for an exact active conflict.
- `ACT_NOW`: high-confidence context requiring immediate attention.
- `NEXT_BOUNDARY`: deliver before the next relevant tool or turn.
- `DIGEST`: retain for a low-interruption summary.
- `DROP`: suppress as irrelevant, stale, isolated, duplicate, or already handled.

Nudge states are queued, delivered, acknowledged, snoozed, dismissed, expired, or superseded. “Delivered” does not imply model knowledge. Evidence always travels as references rather than an entire transcript.

## Live Sync v1

The v1 shared-state loop adds sessions, current tasks, exact-path claims, a monotonic SQLite change log, recipient sync digests, and ownership-checked outcome receipts.

Facts published through `POST /v1/facts` are content-addressed and automatically routed to relevant active sessions in the same project. `POST /v1/sync` returns changes after a caller-owned cursor plus current peer, claim, and nudge state. Claim leases expire automatically; release or expiry supersedes their blocking nudges. `POST /v1/nudges/:id/receipts/:action` records acknowledge, dismiss, snooze, wrong, stale, or used outcomes. Exact idempotent retries return the original receipt; conflicting reuse, wrong recipients, cross-project requests, expired nudges, and invalid transitions fail. State, receipt, and change cursor commit atomically.

See [LIVE-SYNC.md](LIVE-SYNC.md) for HTTP, MCP, lifecycle, and capability details.

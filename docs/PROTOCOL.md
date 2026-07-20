# Agent Nudge Protocol v1

All protocol objects carry `schemaVersion: 1`, immutable IDs, project IDs, timestamps, and extension metadata. Events add idempotency, correlation, and trace identifiers. Facts carry effective time, expiry, sensitivity, sources, and future-ready relations: supersedes, contradicts, depends on, and invalidates.

Delivery classes:

- `BLOCK`: visible advisory pre-action hold for an exact active conflict.
- `ACT_NOW`: high-confidence context requiring immediate attention.
- `NEXT_BOUNDARY`: deliver before the next relevant tool or turn.
- `DIGEST`: retain for a low-interruption summary.
- `DROP`: suppress as irrelevant, stale, isolated, duplicate, or already handled.

Nudge states are queued, delivered, acknowledged, snoozed, dismissed, expired, or superseded. “Delivered” does not imply model knowledge. Evidence always travels as references rather than an entire transcript.

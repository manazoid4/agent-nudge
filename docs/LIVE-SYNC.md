# Live Sync v1

Live Sync turns Agent Nudge from a read-only context dashboard into a local coordination loop for heterogeneous agents.

## Product contract

```text
declare → preflight → act or replan → receipt
```

The shared state is intentionally narrow:

- session presence and task intent;
- project-relative paths and tags;
- expiring path claims;
- sourced decisions, failures, warnings, changes, verifications, and handoffs;
- recipient-specific nudges;
- acknowledgement and a monotonic project change cursor.

Raw prompts, responses, hidden reasoning, command bodies, and file contents are not part of this contract.

## HTTP

```text
POST /v1/sessions/check-in
POST /v1/sessions/:id/heartbeat
POST /v1/facts
POST /v1/sync
POST /v1/claims
POST /v1/claims/:id/release
POST /v1/nudges/:id/acknowledge
POST /v1/hooks/preflight
POST /v1/hooks/receipt
```

`POST /v1/sync` returns:

- a monotonic cursor and changes after the caller's cursor;
- a stable digest over recipient state;
- `HOLD`, `REVIEW`, or `CLEAR`;
- present peer sessions and their declared task scope;
- active claims;
- active recipient nudges.

All writes require an existing same-project session. Cross-project access and acknowledgements by the wrong recipient fail.

## MCP

```text
agent_nudge_sync
agent_nudge_publish_fact
agent_nudge_claim
agent_nudge_release_claim
agent_nudge_acknowledge
```

The tools use the same database and decision engine as HTTP. MCP is the portable baseline when a provider cannot offer a pre-tool hook.

## Claim lifecycle

A claim is an exact normalized project path with a 30–3,600 second lease. Re-acquiring an owned path renews the lease. A conflicting session receives the existing claim and a `BLOCK` nudge. Release or expiry supersedes the claim nudge and changes the recipient preflight state to `CLEAR` when no other context remains.

Claims are coordination evidence, not operating-system locks. Separate worktrees, semantic contract overlap, directories, and branch-aware policy are future refinements.

## Idempotency

Explicit facts receive a content-derived identifier. Re-publishing the same semantic fact returns the existing fact and nudge instead of creating a second delivery. Nudges use a deterministic dedupe key per fact, recipient, and affected path.

## Honest capability boundary

V0.4 adds explicit, reversible provider connection. Every connect is a dry-run unless `--apply` is present. See [Live Connect](LIVE-CONNECT.md).

- `ENFORCED` — host supports a pre-action stop;
- `ADVISORY` — agent receives a boundary check but can continue;
- `OBSERVED` — host only reports the action afterward.

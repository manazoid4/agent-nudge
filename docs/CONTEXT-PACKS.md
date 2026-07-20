# Deterministic Context Packs

A context pack answers one question: **what source-backed context must this agent review before its next consequential action?**

## Contract

Inputs:

- `projectId` — required isolation boundary
- `recipientSessionId` — optional recipient filter
- current sessions, facts, nudges, task intent, and claims from the local ledger

Output:

- `HOLD` when unresolved blocking context exists
- `REVIEW` when immediate non-blocking context exists
- `CLEAR` when no consequential active context remains
- ranked items with relevance score, confidence, paths, reasons and source references
- SHA-256 digest and stable pack ID

The digest excludes generation time. The same project/recipient ledger state therefore produces the same digest; any changed item, delivery state or source reference produces a different digest.

## Surfaces

```text
GET /context-pack?projectId=<id>&recipientSessionId=<optional-id>
agent-nudge context-pack <project-id> [recipient-session-id]
MCP tool: agent_nudge_context_pack
```

Portfolio aggregation is available through:

```text
GET /portfolio
agent-nudge portfolio
MCP tool: agent_nudge_portfolio
```

These reads remain local. The public website uses public-safe fixture data and never reads a user's repositories.

V0.3 Live Sync adds a recipient digest that also covers present peers and active claim leases. This digest is used at the coordination boundary; the original context-pack endpoint remains available as the stable fact/nudge projection.

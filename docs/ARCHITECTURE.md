# Architecture

## Components

- `src/core`: versioned schemas, redaction, deterministic scoring, delivery classes, nudge compiler, fixtures.
- `src/storage`: SQLite WAL ledger with idempotent event ingestion and project-scoped reads.
- `src/daemon`: localhost Fastify API and lifecycle endpoints.
- `src/adapters`: provider-neutral Claude/Codex hook normalization and fail-open delivery.
- `src/mcp`: official MCP stdio tools for status, fixture recording, and inbox reads.
- `src/cli`: doctor, demo, install preview, export, and purge preview.
- `src/ui`: shared React landing page, public fixture demo, and Electron operations UI.
- `electron`: hardened shell, embedded local daemon, tray, and safe external-link handling.

## Event lifecycle

```text
provider event → sanitize → validate → idempotent record
explicit fact → project recipients → relevance factors → delivery class
nudge queue → desktop/MCP/agent boundary → acknowledgement → feedback record
```

## Trust boundaries

The public website receives no local context. The desktop renderer has no Node access and talks to a loopback-only daemon. The daemon validates request shapes, limits bodies, redacts inputs, and uses project-scoped reads. V1 warnings are advisory.

## Failure behavior

Adapter delivery has a 350ms timeout and fails open so an offline daemon never blocks agent work. Duplicate events return success without duplicating records. Expired, same-author, acknowledged, and cross-project facts suppress by policy.

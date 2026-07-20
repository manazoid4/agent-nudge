# Architecture

## Components

- `src/core`: versioned schemas, redaction, deterministic scoring, delivery classes, nudge compiler, fixtures.
- `src/storage`: SQLite WAL ledger with idempotent event ingestion and project-scoped reads.
- `src/daemon`: localhost Fastify API and lifecycle endpoints.
- `src/adapters`: strict provider normalization, disk outbox, hook runner, and fail-open delivery.
- `src/connectors`: dry-run planning, project-safe apply/disconnect, manifests, backups, inspection, rollback, and capability labels.
- `src/mcp`: official MCP stdio tools for status, fixture recording, and inbox reads.
- `src/cli`: doctor, demo, connect/disconnect/status, export, and purge preview.
- `src/ui`: shared React landing page, public fixture demo, and Electron operations UI.
- `electron`: hardened shell, embedded local daemon, tray, and safe external-link handling.

## Event lifecycle

```text
provider event → allowlist → atomic outbox → idempotent record
explicit fact → project recipients → relevance factors → delivery class
nudge queue → desktop/MCP/agent boundary → acknowledgement → feedback record
```

## Trust boundaries

The public website receives no local context. The desktop renderer has no Node access and talks to a loopback-only daemon. The daemon validates request shapes, limits bodies, redacts inputs, and uses project-scoped reads. Provider hooks may enforce covered actions only while enabled and trusted.

## Failure behavior

Adapter delivery is bounded and fails open so an offline daemon never blocks agent work. Allowlisted events remain in the disk outbox until accepted; duplicate events return success without duplicating records. Expired, same-author, acknowledged, and cross-project facts suppress by policy.

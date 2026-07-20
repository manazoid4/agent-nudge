# Agent Nudge

**Context before action.** Agent Nudge is a local-first Windows coordination layer for AI coding agents. It captures structured evidence—not full transcripts—scores who needs it, delivers the smallest useful context delta, and records acknowledgement separately from delivery.

![Agent Nudge status](https://img.shields.io/badge/status-Windows_MVP-79d99a) ![Privacy](https://img.shields.io/badge/privacy-local--first-173d2a) ![License](https://img.shields.io/badge/license-MIT-black)

[Open the live interactive demo](https://agent-nudge-manazir-s-projects1.vercel.app/#demo)

## Product proof

- Conflicting edit: Claude claims `src/lib/cache.ts`; Codex receives a pre-action `BLOCK` warning.
- Changed decision: signed-cookie guidance reaches the agent touching authentication.
- Failed approach: Redis test failures surface before another agent repeats the approach.
- Irrelevant suppression: an unrelated documentation event is scored `DROP`.

Every delivered nudge shows its score factors, evidence reference, freshness, recipient, state, and reason for arriving now.

## Run locally

Requirements: Windows 10/11, Node.js 20 or newer, npm.

```powershell
npm install
npm run test
npm run test:integration
npm run build
npm run dev:desktop
```

Run the daemon and browser UI separately:

```powershell
npm run dev:daemon
npm run dev
```

The daemon binds only to `127.0.0.1:47831`. The SQLite ledger defaults to `%USERPROFILE%\.agent-nudge\agent-nudge.db`; the packaged desktop uses its Electron user-data directory.

## Two-minute demo

```powershell
npm run demo
npm run doctor
npm run package:win
npm run smoke:release
```

The desktop **Run proof** action writes all four fixture scenarios through the same API and SQLite path used by the app. The public browser demo uses static fixtures and never sends project context anywhere.

## CLI

```text
agent-nudge doctor
agent-nudge demo
agent-nudge install all --scope project --dry-run
agent-nudge export [output.json]
agent-nudge purge --preview
```

The installer is preview-only in v0.1.0. It shows exact project-scoped Claude/Codex changes and never touches real configuration during tests.

## Architecture

```text
Claude/Codex hooks → normalizer/redaction → localhost Fastify API
                                            ↓
                                     SQLite fact ledger
                                            ↓
                              deterministic relevance engine
                                            ↓
                      desktop inbox / CLI / MCP acknowledgement
```

The public Vercel site contains marketing and an interactive fixture demo only. The local daemon, SQLite database, and project context are not deployed.

## Privacy and security

- No cloud account, model API, analytics, or telemetry is required.
- No raw prompts, assistant responses, file contents, clipboard data, browser history, or `.env` values are collected by default.
- Credential-shaped text is redacted before persistence.
- Project ID scopes every ledger query.
- Electron runs with context isolation, sandboxing, and no renderer Node integration.
- Delivery is never labelled as proof that a model “knows” something.

See [docs/SECURITY.md](docs/SECURITY.md), [docs/PROTOCOL.md](docs/PROTOCOL.md), and [docs/WINDOWS-INSTALL.md](docs/WINDOWS-INSTALL.md).

## Development commands

```text
npm run dev
npm run dev:daemon
npm run dev:desktop
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
npm run build
npm run package:win
npm run smoke:release
npm run demo
npm run doctor
```

## Known MVP boundaries

The current build proves deterministic routing, local persistence, APIs, adapters, MCP tools, safe install previews, UI, and packaging. It does not automatically modify Claude or Codex configuration, infer hidden model state, synchronize context between devices, or enforce hard execution blocks.

## License

MIT. See [LICENSE](LICENSE).

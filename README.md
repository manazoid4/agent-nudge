# Agent Nudge

**Two agents. One repository. No stale decisions.** Agent Nudge is a local-first Windows preflight and receipt layer for AI coding agents. It shares structured execution state—not full transcripts—routes the smallest useful context delta, and records acknowledgement separately from delivery.

![Agent Nudge status](https://img.shields.io/badge/status-Windows_MVP-79d99a) ![Privacy](https://img.shields.io/badge/privacy-local--first-173d2a) ![License](https://img.shields.io/badge/license-MIT-black)

[Open the live interactive demo](https://agent-nudge-manazir-s-projects1.vercel.app/#demo)

## Live product proof

V0.3 closes the real coordination loop without calling a model API:

```text
agent check-in + task intent
  → expiring path claim or sourced fact
  → deterministic same-project fan-out
  → recipient sync + cursor
  → HOLD / REVIEW / CLEAR
  → acknowledge or release
```

- Conflicting edit: Claude claims `src/lib/cache.ts`; Codex receives a pre-action `BLOCK` warning.
- Changed decision: signed-cookie guidance reaches the agent touching authentication.
- Failed approach: Redis test failures surface before another agent repeats the approach.
- Irrelevant suppression: an unrelated documentation event is scored `DROP`.

The live proof uses session check-in, claim, sync, and acknowledgement APIs from a clean SQLite ledger. Releasing the claim changes the recipient from `HOLD` to `CLEAR`. Duplicate fact publication creates one recipient nudge.

Every delivered nudge shows its score factors, evidence reference, freshness, recipient, state, and reason for arriving now.

The v0.2 Context Mesh remains the cross-project read model. V0.3 adds the [Live Sync contract](docs/LIVE-SYNC.md). See the [complete 19-repository synthesis](docs/PORTFOLIO-SYNTHESIS.md) and [context pack contract](docs/CONTEXT-PACKS.md).

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

The desktop **Run two-agent proof** action checks in live Claude/Codex sessions, creates a five-minute path claim, syncs the recipient, and displays the resulting hold through the production `/v1` path. The public browser demo uses static fixtures and never sends project context anywhere.

## CLI

```text
agent-nudge doctor
agent-nudge demo
agent-nudge install all --scope project --dry-run
agent-nudge check-in claude-1 claude-code project-id "Refactor cache" src/cache.ts
agent-nudge check-in codex-1 codex project-id "Update cache adapter" src/cache.ts
agent-nudge claim project-id claude-1 src/cache.ts 300
agent-nudge sync project-id codex-1 0
agent-nudge release-claim project-id claude-1 claim-id
agent-nudge publish project-id claude-1 decision "Cache API changed" "Await cache reads" src/cache.ts
agent-nudge acknowledge project-id codex-1 nudge-id
agent-nudge context-pack project-agent-nudge codex-session-id
agent-nudge portfolio
agent-nudge export [output.json]
agent-nudge purge --preview
```

The installer is still preview-only in v0.3.0. It shows exact project-scoped Claude/Codex changes and never touches real configuration during tests. The next slice is reversible `connect`/`disconnect` with owned markers and capability labels.

## Architecture

```text
Claude / Codex / OpenCode task intent
                 ↓
       localhost HTTP + MCP
                 ↓
 SQLite facts · tasks · claims · change cursor
                 ↓
   deterministic recipient fan-out
                 ↓
    preflight pack + acknowledgement receipt
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

The current build proves deterministic live routing, local persistence, task presence, expiring claims, monotonic sync cursors, HTTP/MCP round trips, safe install previews, UI, and packaging. It does not automatically modify provider configuration, infer hidden model state, synchronize between devices, or enforce hard execution blocks. Provider-specific hooks and a disk-backed offline outbox are the next activation slice.

## License

MIT. See [LICENSE](LICENSE).

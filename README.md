# Agent Nudge

**Context assurance for your coding agents.** Agent Nudge is a local-first Windows preflight and receipt layer for Claude, Codex, OpenCode, and Aider. It inspects repository rules, catches drift and conflicts, compiles the smallest useful brief, and records acknowledgement separately from delivery.

![Agent Nudge status](https://img.shields.io/badge/status-Windows_MVP-79d99a) ![Privacy](https://img.shields.io/badge/privacy-local--first-173d2a) ![License](https://img.shields.io/badge/license-MIT-black)

[Open the live interactive demo](https://agent-nudge-bay.vercel.app/#demo)

[Read the changelog](CHANGELOG.md)

## Live product proof

V0.5 closes the coordination loop and adds the commercial utility layer without calling a model API:

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

The v0.2 Context Mesh remains the cross-project read model. V0.3 added the [Live Sync contract](docs/LIVE-SYNC.md); v0.4 adds [reversible Live Connect](docs/LIVE-CONNECT.md). See the [complete 19-repository synthesis](docs/PORTFOLIO-SYNTHESIS.md) and [context pack contract](docs/CONTEXT-PACKS.md).

V0.5 adds repository context health, safe two-second bootstrap, deterministic changelogs, direct Claude/Codex/Aider handoffs, signed local Pro licenses, and hosted Stripe Checkout. Community remains useful for one local repository; Pro is $29/year for managed automation.

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

The daemon binds only to `127.0.0.1:47831`. The CLI, MCP server, hook bridge, and packaged desktop share `%USERPROFILE%\.agent-nudge` by default. Override it with `AGENT_NUDGE_HOME` for isolated tests.

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
agent-nudge connect all --project C:\path\to\repo
agent-nudge connect all --project C:\path\to\repo --apply
agent-nudge status --project C:\path\to\repo
agent-nudge disconnect all --project C:\path\to\repo
agent-nudge disconnect all --project C:\path\to\repo --apply
agent-nudge check-in claude-1 claude-code project-id "Refactor cache" src/cache.ts
agent-nudge check-in codex-1 codex project-id "Update cache adapter" src/cache.ts
agent-nudge claim project-id claude-1 src/cache.ts 300
agent-nudge sync project-id codex-1 0
agent-nudge release-claim project-id claude-1 claim-id
agent-nudge publish project-id claude-1 decision "Cache API changed" "Await cache reads" src/cache.ts
agent-nudge acknowledge project-id codex-1 nudge-id
agent-nudge context-pack project-agent-nudge codex-session-id
agent-nudge portfolio
agent-nudge health --repo C:\path\to\repo
agent-nudge init --repo C:\path\to\repo
agent-nudge init --repo C:\path\to\repo --apply
agent-nudge changelog --repo C:\path\to\repo
agent-nudge changelog --repo C:\path\to\repo --apply CHANGELOG.generated.md
agent-nudge license status
agent-nudge license activate SIGNED_TOKEN
agent-nudge run codex --repo C:\path\to\repo --brief-file brief.md
agent-nudge export [output.json]
agent-nudge purge --preview
```

`connect` and `disconnect` are dry-run by default. `--apply` is explicit. Agent Nudge merges only an owned Claude/Codex hook entry, owns the OpenCode plugin file, records manifests and byte-exact backups outside the repository, refuses drift, and leaves unrelated provider settings intact. Repeating connect or disconnect is a no-op.

Capability labels are deliberately conditional. Claude Code, trusted Codex project hooks, and OpenCode project plugins can block covered pre-tool actions while enabled. Hosted, disabled, bypassed, untrusted, and otherwise uncovered actions remain outside that boundary.

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
    preflight hook + acknowledgement receipt
```

The public Vercel site contains marketing and an interactive fixture demo only. The local daemon, SQLite database, and project context are not deployed.

Hosted checkout uses the server-only variables documented in [.env.example](.env.example). Create a recurring $29/year Stripe Price, set `STRIPE_PRO_PRICE_ID`, and configure the checkout/webhook secrets plus an Ed25519 signing private key. Desktop clients verify the resulting signed token with the matching public key; the payment server never receives repository context.

## Privacy and security

- No cloud account, model API, analytics, or telemetry is required.
- No raw prompts, assistant responses, file contents, clipboard data, browser history, or `.env` values are collected by default.
- Credential-shaped text is redacted before persistence.
- Project ID scopes every ledger query.
- Electron runs with context isolation, sandboxing, and no renderer Node integration.
- Raw provider payloads are discarded; only allowlisted event metadata can enter the outbox or ledger.
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

The current build proves deterministic live routing, local persistence, task presence, expiring claims, monotonic sync cursors, HTTP/MCP round trips, reversible project connectors, offline outbox replay, compiler receipts, context drift, signed licensing, allowlisted local runner processes, UI, and Windows packaging. It does not infer hidden model state, guarantee coverage of every provider action, recover a connector transaction after a hard process termination, synchronize between devices, or replace provider trust and hook controls.

## License

MIT. See [LICENSE](LICENSE).

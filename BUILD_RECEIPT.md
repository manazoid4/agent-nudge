# Agent Nudge v0.1.0 Build Receipt

- Date: 2026-07-20
- Source branch: `agents/agent-nudge-mvp`
- Source commit: `pending-first-commit`
- Issue: [GitHub #1](https://github.com/manazoid4/agent-nudge/issues/1)
- Production: [agent-nudge-manazir-s-projects1.vercel.app](https://agent-nudge-manazir-s-projects1.vercel.app)

## Acceptance result

All acceptance criteria in `ISSUE.md` passed on Windows. The product includes the deterministic routing core, SQLite ledger, loopback API, CLI, MCP server, Claude/Codex adapters, Electron console, public fixture demo, tests, documentation, and two Windows release formats.

## Verification evidence

| Gate                       | Result                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| `npm ci && npm run build`  | Passed from the lockfile on Windows                                           |
| `npm run lint`             | Passed                                                                        |
| `npm run format:check`     | Passed                                                                        |
| `npm run typecheck`        | Passed                                                                        |
| `npm run test`             | 11/11 unit tests passed                                                       |
| `npm run test:integration` | 8/8 integration tests passed                                                  |
| `npm run test:e2e`         | 2/2 end-to-end tests passed                                                   |
| `npm run demo`             | Conflict `BLOCK` 155; decision/failure `ACT_NOW` 115; irrelevant event `DROP` |
| `npm run doctor`           | Data directory writable; local endpoint configured                            |
| `npm audit --omit=dev`     | 0 production vulnerabilities                                                  |
| `npm run package:win`      | Installer and portable targets completed                                      |
| `npm run smoke:release`    | Portable EXE returned healthy v0.1.0 on `127.0.0.1:47831` only                |
| Public deployment          | Vercel `Ready`, HTTP 200, interactive inbox acknowledgement verified          |

## Artifacts

- `release/Agent-Nudge-Setup-0.1.0-x64.exe` — 95,210,667 bytes — SHA-256 `966574E7EC4B225E0336450C6787B803334E5C5E082D261AF875BC1719350E56`
- `release/Agent-Nudge-Portable-0.1.0-x64.exe` — 94,980,720 bytes — SHA-256 `1E61F44322433C18F091FF0BE54649188805C00B986D54A2BBD3DBF04789A3C3`

Release binaries remain local and are ignored by Git. The public deployment contains only the landing page and fixture data.

## Safety and limitations

- The daemon listens only on loopback and the desktop uses local SQLite storage.
- The app does not collect raw transcripts or secrets by default; structured input is redacted before persistence.
- Claude/Codex installation is preview-only in v0.1.0 and does not change real configuration.
- The Windows binaries use Electron's default icon and have no paid publisher certificate, so Windows SmartScreen may warn.
- Node's built-in SQLite API currently prints an experimental warning.
- Full development dependency audit reports one low and one high transitive issue in packaging tooling; production dependency audit reports zero vulnerabilities.

# Agent Nudge v0.3.0 Build Receipt

- Date: 2026-07-20
- Source branch: `agents/context-mesh`
- Verified source commit: `3b240581eabebbfa3ec834d37bb2717b3298c230`
- Issue: [GitHub #2](https://github.com/manazoid4/agent-nudge/issues/2)
- Production: [agent-nudge-bay.vercel.app](https://agent-nudge-bay.vercel.app)
- Vercel deployment: `dpl_3XGzcvQeMs1Ue8r18YFH9LLs4CUJ`

## Acceptance result

V0.3 crosses the product from a fixture-led proof into a functioning local coordination loop. Claude, Codex, OpenCode, or another MCP/CLI client can check in, declare task scope, publish structured facts, acquire expiring path claims, preflight recipient-specific changes, acknowledge nudges, and observe HOLD → CLEAR transitions through one persisted SQLite ledger.

## Verification evidence

| Gate                       | Result                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Clean `npm ci`             | Passed from the committed lockfile on Windows                                                                                  |
| `npm run build`            | Passed; Vite and all five Node/Electron bundles completed                                                                      |
| `npm run lint`             | Passed                                                                                                                         |
| `npm run format:check`     | Passed                                                                                                                         |
| `npm run typecheck`        | Passed                                                                                                                         |
| `npm run test`             | 17/17 unit tests passed                                                                                                        |
| `npm run test:integration` | 11/11 integration tests passed                                                                                                 |
| `npm run test:e2e`         | 2/2 end-to-end tests passed                                                                                                    |
| Built CLI live proof       | HOLD on conflicting claim, CLEAR after release, deterministic duplicate fact/nudge, acknowledgement persisted, cursor advanced |
| `npm audit`                | 0 vulnerabilities across production and development dependencies                                                               |
| `npm run package:win`      | Installer and portable targets completed                                                                                       |
| `npm run smoke:release`    | Portable EXE returned healthy v0.3.0 on `127.0.0.1` only                                                                       |
| Browser QA                 | Desktop and 390 px mobile passed without horizontal overflow; no private portfolio names exposed                               |
| Production deployment      | Vercel `READY`; alias returned HTTP 200 and the v0.3.0 bundle/headline                                                         |

## Artifacts

- `release/Agent-Nudge-Setup-0.3.0-x64.exe` — 95,177,743 bytes — SHA-256 `2177721B69DEE800F9B1E0C493EDD74BEB167646981907917624140F3F854528`
- `release/Agent-Nudge-Portable-0.3.0-x64.exe` — 94,947,825 bytes — SHA-256 `FDC97DB6BB631EBFD065B5F1B7EF539ADCAD30E3C6115E981E6E888CA64A2B2F`

Release binaries remain local and are ignored by Git. The Vercel deployment contains the landing page and a safe fixture dashboard; the installed desktop app connects to the real local daemon.

## Safety and honest limitations

- The daemon listens only on loopback and the desktop uses local SQLite storage.
- The live contract stores structured facts, task/path scope, claims, and receipts—not raw transcripts or file bodies.
- Path claims cover exact normalized paths. Directory, semantic-contract, branch, and worktree-aware conflicts are the next refinement.
- Claude Code, Codex, and OpenCode automatic hook installation remains preview-only. V0.3 ships the real HTTP, CLI, MCP, persistence, and desktop loop without silently editing provider configuration.
- The Windows binaries use Electron's default icon and have no paid publisher certificate, so Windows SmartScreen may warn.
- Node's built-in SQLite API currently prints an experimental warning.

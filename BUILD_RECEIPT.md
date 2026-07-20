# Agent Nudge v0.4.0 Build Receipt

- Date: 2026-07-20
- Source branch: `agents/live-connect-v04`
- Verified source commit: `1e433ae86a3213c5128160a2ce7abd8d6a6922a5`
- Issue: [GitHub #4](https://github.com/manazoid4/agent-nudge/issues/4)
- Production: [agent-nudge-bay.vercel.app](https://agent-nudge-bay.vercel.app)
- Vercel deployment: `dpl_4WmCws4BL2aEs9YAxVxv3nyNTHdM`

## Acceptance result

V0.4 ships real, project-scoped Live Connect for Claude Code, Codex, and OpenCode. Connect and disconnect are dry-run by default and apply only with an explicit flag. The connector manager owns exact fragments, keeps manifests and backups outside repositories, refuses drift and concurrent edits, rolls back partial operations, and preserves unrelated provider settings.

Provider hooks now run the same local preflight and post-action receipt boundary. Raw hook payloads are discarded; an allowlisted event envelope enters a disk-backed, idempotent offline outbox.

## Verification evidence

| Gate                                          | Result                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci`                                | Passed from committed lockfile on Windows; 0 vulnerabilities                                                                                |
| `npm run lint` / `format:check` / `typecheck` | Passed                                                                                                                                      |
| `npm run test`                                | 22/22 unit tests passed                                                                                                                     |
| `npm run test:integration`                    | 18/18 integration tests passed                                                                                                              |
| `npm run test:e2e`                            | 2/2 end-to-end tests passed                                                                                                                 |
| `npm run build`                               | Vite and six Node/Electron bundles completed                                                                                                |
| Connector CLI smoke                           | Dry-run no change; three providers connected; status healthy; reconnect no-op; disconnect preserved unrelated JSON and removed owned plugin |
| Hook privacy/collision proof                  | Exact-path collision produced provider denial; post hook released claim; private canary absent; offline event queued                        |
| Rollback proof                                | Partial failure restored originals; racing external edit was preserved and recovery refused                                                 |
| `npm run demo` / `doctor`                     | Four scenarios passed; doctor reported daemon, connector, drift, and outbox state                                                           |
| `npm run package:win`                         | Installer and portable targets completed                                                                                                    |
| `npm run smoke:release`                       | Portable EXE returned healthy v0.4.0 on `127.0.0.1` only                                                                                    |
| Browser QA                                    | Desktop and 390 px mobile passed without overflow; demo/settings/copy flow passed; no console errors                                        |
| Production                                    | Vercel `READY`; alias HTTP 200; v0.4 capability language and command verified in production bundle                                          |

## Artifacts

- `release/Agent-Nudge-Setup-0.4.0-x64.exe` — 95,196,701 bytes — SHA-256 `4994152EC9B4F520176C6E4E6883E423F653C393FFE6F550CD1DD05EEA2D0546`
- `release/Agent-Nudge-Portable-0.4.0-x64.exe` — 94,966,787 bytes — SHA-256 `1B71C14FE6BF39E571F7E75E7A2DB996EB0D3D942C15321552A0D976FFC5F65E`

Release binaries remain local and are ignored by Git. The Vercel deployment contains the landing page and safe fixture dashboard only; provider configuration and project context remain local.

## Safety and honest limitations

- `ENFORCED` means an enabled and trusted provider hook/plugin can stop a covered pre-action. It is not a complete security boundary.
- Hosted, disabled, bypassed, untrusted, and otherwise uncovered actions remain outside connector enforcement.
- Hooks fail open when the local daemon is unavailable; allowlisted events queue locally for the next delivery attempt.
- Hard process termination recovery and stale connector-lock recovery are not automated yet; byte-exact backups remain available.
- Merged JSON is structurally preserved but may be reformatted.
- The unsigned Windows binaries use Electron's default icon, so SmartScreen may warn.
- Node's built-in SQLite API currently prints an experimental warning.

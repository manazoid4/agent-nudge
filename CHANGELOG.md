# Changelog

All notable Agent Nudge changes are recorded here. Dates use ISO 8601.

## [Unreleased]

### Security

- Authenticated every local daemon request with a cryptographically random per-installation credential stored outside repositories with owner-only permissions.
- Rejected hostile `Host` values and removed the Electron renderer's former `Origin: null` exception.
- Added a sandboxed Electron main-process request bridge so the renderer never receives local control credentials.
- Added daemon instance identity, challenge-response health verification, atomic credential rotation, and leakage/impersonation regressions.
- Documented the local control-plane threat model, credential storage, diagnostics, rotation, and recovery.

### Commercial validation

- Auditing one-time pricing, the 14-day Pro trial, email-list capture, and the long-term moat roadmap before changing the live offer.
- Added the commercial site audit and prioritized paid-launch blockers: authenticated local control, production license activation, installer distribution, lifecycle recovery, and live-site parity.

## [0.5.0] - 2026-07-26

### Added

- Repository Context Health with tracked source digests, drift states, Git worktree status, line counts, estimated tokens, and active token-budget usage.
- Safe two-step repository bootstrap for `AGENTS.md`, `CLAUDE.md`, and `.agent-nudge/rules.json`; preview is the default and existing files are never overwritten.
- Deterministic `agent-nudge changelog` generation with Added, Changed, Fixed, Security, Documentation, and Internal sections.
- Direct, allowlisted brief handoffs to Claude Code, Codex, and Aider with job status, bounded redacted output, cancellation, and temporary-file cleanup.
- Signed Ed25519 local licenses, a 14-day automatic Pro trial, daemon-enforced entitlements, activation/deactivation commands, and device-local license state.
- Hosted Stripe Checkout, license redemption, Billing Portal, and signature-verified webhook endpoints.
- Payment-success delivery screen for copying the signed token into the desktop app.
- Windows installer and portable v0.5.0 packages.

### Changed

- Rebuilt the compiler screen as a high-contrast navy/yellow operations workbench.
- Kept Community free and moved the paid offer into validation: $29 one-time founding beta, $49 one-time Personal, and optional paid updates after the included year.
- Updated the public message to “Context assurance for your coding agents.”
- Added loopback endpoint overrides for isolated desktop and release smoke tests.
- Updated daemon, Electron, CLI, and package versions to 0.5.0.

### Security

- Replaced wildcard daemon CORS with an explicit loopback-origin allowlist.
- Kept agent execution behind fixed provider adapters, argument arrays, `shell: false`, executable checks, repository validation, and daemon-side entitlements.
- Bounded runner output and brief size, redacted credential-shaped content, and restricted temporary and license files to owner-only modes where supported.
- Added containment and symbolic-link checks to onboarding and changelog writes.
- Kept Stripe secrets and private signing keys in hosted API routes; repository context remains local.
- Updated vulnerable production transitive dependencies; `npm audit --omit=dev` reports zero vulnerabilities.

### Verification

- 42 unit, 20 integration, and 2 end-to-end tests pass.
- Lint, typecheck, production build, CLI health/bootstrap/changelog/license flows, Windows packaging, and loopback-only portable smoke tests pass.

## [0.4.0] - 2026-07-20

### Added

- Reversible Live Connect for Claude Code, Codex, and OpenCode.
- Dry-run-first connect/disconnect commands, owned manifests, byte-exact backups, drift refusal, rollback, and offline outbox replay.
- Provider pre-action collision checks and post-action receipts through the local daemon.

### Security

- Discarded raw provider payloads and persisted only allowlisted event metadata.
- Preserved unrelated provider settings during connector installation and removal.

## [0.3.0] - 2026-07-18

### Added

- Live Sync contract with project-scoped session check-in, claims, cursors, acknowledgement, and deterministic context delivery.

## [0.2.0] - 2026-07-17

### Added

- Context Mesh portfolio read model for cross-project health, activity, and coordination state.

## [0.1.0] - 2026-07-15

### Added

- Local-first SQLite daemon, desktop inbox, CLI, MCP server, deterministic relevance scoring, evidence references, expiry, deduplication, and the two-agent proof.

[Unreleased]: https://github.com/manazoid4/agent-nudge/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/manazoid4/agent-nudge/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/manazoid4/agent-nudge/releases/tag/v0.4.0

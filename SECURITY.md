# Security Policy

## Supported version

The current supported development line is `0.4.x`. Security and reliability hardening is being tracked for `0.5.0`.

## Reporting a vulnerability

Do not open a public issue containing secrets, private source code, exploit details, or customer data.

Use GitHub private vulnerability reporting when it is available for this repository. Otherwise contact the maintainer privately through the address published on the project website.

Include:

- affected version and platform;
- exact component or connector;
- reproduction steps using non-sensitive fixtures;
- expected and actual behaviour;
- impact assessment;
- whether the issue requires local access, repository control, or provider configuration access.

## Security boundaries

Agent Nudge is local-first, but loopback binding is not a complete trust boundary. Current controls include:

- daemon binding to `127.0.0.1`;
- Electron context isolation, sandboxing, and disabled Node integration;
- structured metadata rather than transcript storage;
- explicit connector dry-run and apply modes;
- project containment checks;
- symlink and junction refusal;
- owned configuration fragments;
- external backups;
- drift refusal;
- rollback on recognised partial failures;
- redaction and privacy-canary testing.

## Current limitations

The following limitations are known and must not be represented as solved:

1. Local API client authentication is not yet implemented.
2. Electron and a standalone daemon can currently create more than one SQLite writer.
3. Hard process termination recovery is incomplete.
4. Stale connector-lock recovery is incomplete.
5. Provider hooks fail open when the daemon is unavailable.
6. Hosted, disabled, bypassed, or uncovered provider actions remain outside enforcement.
7. Current Windows binaries are unsigned and may trigger SmartScreen.
8. `ENFORCED` means a trusted and enabled hook can stop a covered action; it is not a complete security boundary.

These items are tracked through the v0.5 reliability and control-plane issues.

## Data handling

The default product must not persist:

- raw prompts;
- complete model replies;
- complete source files;
- clipboard history;
- browser history;
- provider secrets;
- authentication tokens in normal logs.

Evidence records should remain minimal, project-scoped, attributable, expiring where appropriate, and exportable by the user.

## Release verification

Published releases should include:

- exact version and source commit;
- SHA-256 checksums;
- build receipt;
- dependency audit result;
- test summary;
- signature status stated explicitly;
- known limitations.

Never imply an unsigned artifact is signed or a fixture simulation is a live multi-agent execution.

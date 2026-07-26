# Local control-plane threat model

Agent Nudge runs a loopback HTTP daemon because the desktop app, CLI, provider hooks, and event outbox need one local coordination boundary. Loopback binding prevents remote-network access; it does not make other processes on the same computer trustworthy.

## Protected assets

- Repository context, local facts, claims, receipts, and exports.
- Agent-launch and file-writing operations.
- License activation state.
- The daemon identity used by desktop and CLI diagnostics.

## Trust boundary

The daemon accepts requests only when all of these checks pass:

1. The HTTP `Host` is `127.0.0.1`, `localhost`, or `[::1]` with an optional valid port.
2. Browser `Origin`, when present, is an explicitly allowed loopback development origin. The unsafe `null` origin is rejected.
3. The request carries the per-installation bearer credential in the `Authorization` header.

The packaged renderer never receives the credential. Electron's sandboxed preload sends a bounded request description to the main process, and the main process adds authentication before calling the daemon. Request paths must remain on the fixed loopback origin; renderer methods are limited to `GET` and `POST`.

## Credential storage

The first trusted process creates:

- `%USERPROFILE%\.agent-nudge\control-plane.key`
- `%USERPROFILE%\.agent-nudge\daemon-instance`

`AGENT_NUDGE_HOME` overrides the directory for isolated development and tests. The key is 32 cryptographically random bytes encoded with base64url. It never belongs in a repository, URL, manifest, export, fixture, error, or normal log. Files use owner-only permissions (`0600` on POSIX); on Windows, inherited ACLs are removed and access is granted only to the current user. The containing directory is owner-only as well.

## Health and daemon identity

`GET /v1/health` requires authentication plus a random `X-Agent-Nudge-Challenge`. The response includes the stable daemon instance ID and an HMAC proof over the instance ID and challenge. Desktop collision detection and `agent-nudge doctor` verify that proof rather than trusting static service/version text.

## Rotation and recovery

Run:

```powershell
agent-nudge auth rotate
```

The authenticated daemon atomically replaces the credential, updates its in-memory verifier, and returns only rotation status. The previous credential stops working immediately. CLI, hooks, and outbox clients read the protected credential from disk; Electron keeps the shared verifier current without exposing the replacement.

If the credential file is corrupt or its ACL cannot be secured, Agent Nudge fails closed. To recover while the daemon is stopped, move the corrupt `control-plane.key` out of `.agent-nudge` and restart Agent Nudge; a new protected credential is generated. Existing local ledger data is unaffected. Keep the moved file private and delete it after recovery is confirmed.

## Out of scope

This boundary does not defend against an attacker already running as the same OS user with arbitrary file-read or process-injection capability. Remote access, shared accounts, cloud sync, and enterprise identity are intentionally not enabled.

# Security and privacy

- Bind network listeners to `127.0.0.1` only.
- Reject malformed protocol objects and bodies above 256 KiB.
- Redact bearer tokens, GitHub-style tokens, generic secrets, environment values, and private keys before persistence.
- Store structured facts and short opt-in summaries—not prompts, responses, files, terminal transcripts, clipboard, or browser history.
- Keep queries project-scoped and test cross-project isolation.
- Use Electron context isolation, sandbox mode, no renderer Node integration, and deny in-app navigation to remote sites.
- Discard unknown provider fields and raw payloads before persistence; queue only allowlisted metadata.
- Keep connector manifests and byte-exact backups outside repositories.
- Dry-run connector changes by default; require `--apply`, preserve unrelated settings, refuse drift, and disconnect only owned fragments.
- Reject connector path escape and symlink/junction traversal; use atomic writes, project locks, compare-and-swap checks, and rollback.

Hooks fail open when the local daemon is unavailable. `ENFORCED` means the enabled provider hook can stop a covered pre-action; it is not a claim that every provider action is intercepted.

This unsigned local build has not undergone an external security audit. Report vulnerabilities privately through GitHub security advisories rather than public issues.

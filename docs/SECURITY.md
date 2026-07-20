# Security and privacy

- Bind network listeners to `127.0.0.1` only.
- Reject malformed protocol objects and bodies above 256 KiB.
- Redact bearer tokens, GitHub-style tokens, generic secrets, environment values, and private keys before persistence.
- Store structured facts and short opt-in summaries—not prompts, responses, files, terminal transcripts, clipboard, or browser history.
- Keep queries project-scoped and test cross-project isolation.
- Use Electron context isolation, sandbox mode, no renderer Node integration, and deny in-app navigation to remote sites.
- Preview configuration changes and preserve unrelated settings. V0.2.0 does not apply configuration automatically.

This unsigned local build has not undergone an external security audit. Report vulnerabilities privately through GitHub security advisories rather than public issues.

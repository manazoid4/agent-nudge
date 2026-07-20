# Windows installation

## Packaged application

Run `npm run package:win`. Electron Builder creates an NSIS installer and portable executable in `release/`.

Because the MVP is unsigned, Windows SmartScreen may show an unknown-publisher warning. Inspect the public source and release hash before choosing **More info → Run anyway**. No startup task or agent hook is registered by the Windows installer itself.

## Source build

Install Node.js 20+, clone the repository, run `npm install`, then `npm run dev:desktop`.

## Agent integration

Run `npm run doctor` and `npm run demo` first. Preview project-scoped changes with:

```powershell
node dist-node/cli.cjs connect all --project C:\path\to\repo
node dist-node/cli.cjs connect all --project C:\path\to\repo --apply
node dist-node/cli.cjs status --project C:\path\to\repo
node dist-node/cli.cjs disconnect all --project C:\path\to\repo --apply
```

Without `--apply`, connect and disconnect only print the plan. Applied changes use `.claude/settings.local.json`, `.codex/hooks.json`, and `.opencode/plugins/agent-nudge.js`; manifests and backups stay under `%USERPROFILE%\.agent-nudge`.

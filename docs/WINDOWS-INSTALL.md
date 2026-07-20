# Windows installation

## Packaged application

Run `npm run package:win`. Electron Builder creates an NSIS installer and portable executable in `release/`.

Because the MVP is unsigned, Windows SmartScreen may show an unknown-publisher warning. Inspect the public source and release hash before choosing **More info → Run anyway**. No startup task or agent hook is registered by the installer.

## Source build

Install Node.js 20+, clone the repository, run `npm install`, then `npm run dev:desktop`.

## Agent integration

Run `npm run doctor` and `npm run demo` first. Preview project-scoped changes with:

```powershell
node dist-node/cli.cjs install all --scope project --dry-run
```

V1 prints the intended `.claude/settings.json` and `.codex/config.toml` merge locations but deliberately does not apply them.

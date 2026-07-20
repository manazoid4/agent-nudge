# Live Connect v0.4

Live Connect installs a narrow project boundary between Claude Code, Codex, OpenCode, and the local Agent Nudge daemon.

## Safe workflow

```powershell
agent-nudge connect all --project C:\path\to\repo
agent-nudge connect all --project C:\path\to\repo --apply
agent-nudge status --project C:\path\to\repo
agent-nudge disconnect all --project C:\path\to\repo
agent-nudge disconnect all --project C:\path\to\repo --apply
```

The first command is a read-only plan. Apply is never inferred. Provider names can replace `all`: `claude-code`, `codex`, or `opencode`.

## Owned project files

| Provider    | Project surface                                | Label       | Boundary                                                                       |
| ----------- | ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| Claude Code | `.claude/settings.local.json` pre/post entries | `ENFORCED*` | Covered pre-tool actions while hooks are enabled; post hooks release receipts. |
| Codex       | `.codex/hooks.json` pre/post entries           | `ENFORCED*` | Covered local actions after trust; post hooks release receipts.                |
| OpenCode    | `.opencode/plugins/agent-nudge.js`             | `ENFORCED*` | Covered `tool.execute.before` actions while the project plugin is enabled.     |

`*` These are guardrails, not a complete security boundary. Hosted, disabled, bypassed, untrusted, or otherwise uncovered actions are not blocked.

Claude and Codex JSON is structurally merged. Disconnect removes the exact owned hook value and preserves unrelated settings. The OpenCode plugin is an Agent Nudge-owned file and is removed only when its hash still matches the installed version.

## Recovery and ownership

- Manifests live under `%USERPROFILE%\.agent-nudge\connectors`.
- Byte-exact pre-change backups live under `%USERPROFILE%\.agent-nudge\backups`.
- Writes use same-directory temporary files and atomic rename.
- A filesystem project lock and compare-and-swap hash checks refuse concurrent changes.
- Failure during a multi-file apply rolls completed writes back in reverse order.
- Edited owned fragments are reported as drift and are never overwritten or removed automatically.

Hard process termination between writes and stale lock recovery are not yet automated. Backups remain available for manual recovery.

## Offline behavior and privacy

Hooks time out quickly and fail open when the daemon is offline. The normalized, allowlisted event envelope is queued as one atomic JSON file and retried without changing its idempotency key. Raw prompts, responses, command bodies, file contents, environment values, and the original provider payload are discarded.

## Provider references

- [Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Codex hooks](https://developers.openai.com/codex/hooks)
- [OpenCode plugins](https://opencode.ai/docs/plugins/)

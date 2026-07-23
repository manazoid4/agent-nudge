# Shadow Mode and Replay Lab

## Why this exists

Agent Nudge must measure whether a warning is useful before stronger enforcement is enabled. Delivery or acknowledgement does not prove that a conflict was prevented.

## Project modes

- `OFF`: no candidate decision is recorded and no intervention occurs.
- `SHADOW`: the candidate decision is recorded, but the effective decision is always `CLEAR`.
- `ADVISORY`: candidate `HOLD` decisions become `REVIEW`; no hard block occurs.
- `ENFORCED`: a covered, trusted, healthy connector may apply `HOLD`.

## Honest outcome fields

Shadow evaluation separates:

- warning generated;
- warning delivered;
- warning reviewed;
- warning acknowledged;
- action changed;
- claim released;
- conflict occurred;
- conflict prevented with an evidence reference;
- false positive;
- false negative where observable;
- bypassed;
- repeated work avoided;
- human usefulness label;
- preflight latency.

Unknown usefulness and prevention outcomes remain unknown rather than being silently converted into success.

## Deterministic replay

Run the bundled public-safe fixture:

```powershell
npm run assure -- replay docs/fixtures/replay-conflicts.json 45 100
```

The two numbers are the REVIEW and HOLD thresholds. The same fixture and policy produce the same ordered decisions and digest.

Use the interactive browser demonstration at `/replay` to explore threshold changes without executing agents or changing a repository.

## Worktree inventory

Inspect worktree identity and dirty path keys:

```powershell
npm run assure -- worktrees C:\path\to\repository
```

The inventory is read-only. It does not create, prune, delete, repair, checkout, merge, or modify worktrees.

## Privacy boundary

Replay fixtures and reports contain structured scores, rule IDs, labels, evidence references, counts, timestamps, and outcomes. They do not require prompts, model responses, source-file bodies, command logs, shell environments, or private repository names.

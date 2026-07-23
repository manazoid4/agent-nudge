# Agent Nudge Assurance Core

## Purpose

The assurance core is the provider-neutral layer around coding agents. It does not run models or replace an IDE. It answers six questions before and after consequential work:

1. What can this provider connection actually observe or enforce?
2. Which instructions, rules, skills, agents, plugins, and configurations were active?
3. Is another task, worktree, branch, or failed approach likely to collide with this action?
4. What evidence was produced after the action?
5. Is there a valid recovery point, and what does it actually cover?
6. Did a warning change an action or prevent a problem, and what remains unknown?

## Capability truth

`src/core/capabilities.ts` defines versioned manifests with four levels:

- `unsupported`: the connected path cannot reliably expose the event;
- `observed`: Agent Nudge can record an allowlisted event after or around the action;
- `advisory`: Agent Nudge can surface context but cannot guarantee prevention;
- `enforced`: a covered trusted hook can deny the action while the connector and daemon are healthy.

An `enforced` declaration is downgraded whenever the connector is missing, disabled, untrusted, offline, or drifted. The label never applies to hosted, bypassed, or otherwise uncovered provider paths.

## OpenCode reference adapter

`src/adapters/opencode-v2.ts` normalises the supported OpenCode event surface into the existing Agent Nudge event contract. The generated OpenCode connector subscribes to a reviewed lifecycle allowlist through the generic event hook and retains dedicated synchronous pre-tool and post-tool hooks.

Only allowlisted metadata is retained:

- provider event name;
- session and parent-session identity;
- project identity;
- agent mode and model identifier;
- tool class;
- permission class and status;
- normalised paths;
- diagnostic counts and compact error codes;
- timestamps, source hashes, correlation IDs, and trace IDs.

The connector and adapter explicitly exclude prompts, responses, message bodies, complete command output, source-file bodies, shell environment, TUI payloads, arbitrary plugin payloads, and secrets.

## Instruction provenance

`src/core/instruction-provenance.ts` scans bounded known project locations for instructions, rules, skills, agents, plugins, and provider configuration. It records only:

- repository-relative path;
- provider and scope;
- kind;
- SHA-256 digest;
- byte size;
- modification time;
- trust status.

The scanner ignores symbolic links, refuses files larger than 1 MiB, caps the number of files, and never returns file contents. Reports can be compared to detect additions, removal, or modification during a session.

## Structured evidence

`src/core/evidence.ts` converts eligible provider events into compact evidence records. The provenance ladder is:

1. self-reported;
2. hook-observed;
3. command-receipt;
4. test-verified;
5. git-verified;
6. human-confirmed;
7. signed-remote.

A source reference or attached confidence is not automatically called verification. Evidence records retain references, counts, paths, hashes, and compact status fields—not logs or source content.

## Repetition detection

`src/core/doom-loop.ts` detects the same failed action, input, outcome, and targets recurring without a changed hypothesis or environment. At the configured threshold it returns `REVIEW` and requires an explicit replan or override receipt.

Legitimate retries remain allowed when the hypothesis or environment digest changes.

## Task graph and handoffs

`src/core/task-graph.ts` provides provider-neutral task states, dependencies, claims, leases, expected artifacts, acceptance checks, abandonment detection, and structured handoffs.

Starting a task before a declared dependency is complete returns `HOLD`. Missing task owners or expired leases can be surfaced as abandoned work rather than silently blocking future agents.

## Checkpoints and recovery

`src/core/checkpoints.ts` records provider-native, Git, or Agent Nudge recovery points and explicitly states whether they cover files, conversation state, worktree state, and environment state.

Restore previews always require approval. Invalid, expired, or previously restored checkpoints return `HOLD`. Partial coverage returns `REVIEW`. The core contains no automatic restore operation.

## Merge risk

`src/core/merge-risk.ts` classifies exact paths, directory overlap, lockfiles, migrations, generated files, and shared configuration. It can optionally invoke read-only `git merge-tree --write-tree` analysis. It never checks out a branch, writes a merge result, force-pushes, deletes a worktree, or changes the repository.

## Worktree inventory

`src/core/worktrees.ts` builds a read-only inventory from `git worktree list --porcelain` and bounded status summaries. It records:

- canonical repository identity from the common Git directory;
- physical worktree path;
- branch, detached HEAD, current commit, lock, and prune state;
- staged, unstaged, and untracked counts;
- lower-cased changed path keys without file contents.

It does not create, remove, prune, checkout, merge, or repair worktrees.

## Shadow Mode outcome model

`src/core/shadow-mode.ts` separates candidate policy decisions from interventions and observed outcomes.

Project modes are:

- `OFF`: do not evaluate or intervene;
- `SHADOW`: record the decision that would have occurred but always return `CLEAR`;
- `ADVISORY`: deliver review context without hard blocking;
- `ENFORCED`: permit covered trusted HOLD decisions to block.

Outcome reporting keeps these separate:

- generated, delivered, reviewed, and acknowledged;
- action changed and claim released;
- conflict occurred;
- conflict prevented only when an evidence reference exists;
- false positive and false negative where observable;
- bypassed;
- repeated work avoided;
- usefulness labels;
- preflight latency.

Acknowledgement or changed action alone is never counted as a prevented conflict. Unknown usefulness and prevention outcomes remain explicit.

## Deterministic Replay Lab

`src/core/replay-lab.ts` replays versioned public-safe fixtures against threshold policies. Events are sorted by sequence and ID, decisions are deterministic, and each run receives a digest.

Policy comparison reports:

- changed decisions by event;
- warning-count delta;
- expectation-match delta;
- CLEAR, REVIEW, and HOLD totals;
- mismatched labelled outcomes.

The included `docs/fixtures/replay-conflicts.json` fixture contains scores, labels, expected decisions, and evidence references only. It contains no transcripts, logs, source bodies, or private repository names.

## CLI

```text
agent-nudge-assure capabilities [provider]
agent-nudge-assure instructions [repository-path]
agent-nudge-assure merge-risk <left-paths> <right-paths>
agent-nudge-assure worktrees [repository-path]
agent-nudge-assure replay <fixture.json> [review-threshold] [hold-threshold]
agent-nudge-assure shadow-report <evaluations.json>
```

The source equivalent is `npm run assure -- ...`.

Example replay:

```powershell
npm run assure -- replay docs/fixtures/replay-conflicts.json 45 100
```

## Remaining gates

The following remain release gates before broader enforcement or remote supervision:

- issue #6: sole-writer SQLite ownership, transactions, and crash recovery;
- issue #7: authenticated local control plane and unified receipt mutations;
- issue #8: verified Windows artifacts and guided onboarding;
- issue #9: persisted Shadow Mode, labelled real-world evaluation, and dashboard reports;
- issue #10: executable provider/version conformance matrix;
- issue #11: transactional worktree claims and full Conflict Escrow;
- issue #13: broader competitive feature programme.

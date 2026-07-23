# Agent Nudge Assurance Core

## Purpose

The assurance core is the provider-neutral layer around coding agents. It does not run models or replace an IDE. It answers five questions before and after consequential work:

1. What can this provider connection actually observe or enforce?
2. Which instructions, rules, skills, agents, plugins, and configurations were active?
3. Is another task, worktree, branch, or failed approach likely to collide with this action?
4. What evidence was produced after the action?
5. Is there a valid recovery point, and what does it actually cover?

## Capability truth

`src/core/capabilities.ts` defines versioned manifests with four levels:

- `unsupported`: the connected path cannot reliably expose the event;
- `observed`: Agent Nudge can record an allowlisted event after or around the action;
- `advisory`: Agent Nudge can surface context but cannot guarantee prevention;
- `enforced`: a covered trusted hook can deny the action while the connector and daemon are healthy.

An `enforced` declaration is downgraded whenever the connector is missing, disabled, untrusted, offline, or drifted. The label never applies to hosted, bypassed, or otherwise uncovered provider paths.

## OpenCode reference adapter

`src/adapters/opencode-v2.ts` normalises the supported OpenCode event surface into the existing Agent Nudge event contract. Only allowlisted metadata is retained:

- provider event name;
- session and parent-session identity;
- project identity;
- agent mode and model identifier;
- tool class;
- permission class and status;
- normalised paths;
- diagnostic counts and compact error codes;
- timestamps, source hashes, correlation IDs, and trace IDs.

The adapter explicitly excludes prompts, responses, complete command output, source-file bodies, arbitrary plugin payloads, and secrets.

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

## CLI

```text
agent-nudge-assure capabilities [provider]
agent-nudge-assure instructions [repository-path]
agent-nudge-assure merge-risk <left-paths> <right-paths>
```

The source equivalent is `npm run assure -- ...`.

## Remaining gates

The following remain release gates before broader enforcement or remote supervision:

- issue #6: sole-writer SQLite ownership, transactions, and crash recovery;
- issue #7: authenticated local control plane and unified receipt mutations;
- issue #8: verified Windows artifacts and guided onboarding;
- issue #9: Shadow Mode and deterministic replay evaluation;
- issue #10: executable provider conformance matrix;
- issue #11: full worktree-aware Conflict Escrow;
- issue #13: broader competitive feature programme.

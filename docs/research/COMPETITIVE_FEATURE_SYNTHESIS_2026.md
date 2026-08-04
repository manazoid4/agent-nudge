# Competitive feature synthesis (2026)

Research reference, not a tracked task. Originally issue #13, moved here on 2026-08-04 so the
issue tracker holds only executable work. Sources were reviewed on 2026-07-23; treat every
capability claim below as version-sensitive and re-verify before relying on it.

## Mission

Turn Agent Nudge into the **provider-neutral assurance, coordination, and recovery layer** around modern coding agents.

Do not rebuild another chat UI, model runner, IDE, or generic orchestrator. Agent Nudge should integrate with OpenCode, Claude Code, Codex, GitHub Copilot, Gemini CLI, Cursor, Cline/Roo, Goose, and OpenHands, then provide the capabilities those products do not consistently share:

- pre-action conflict and scope assurance;
- cross-provider task and worktree awareness;
- source-backed context routing;
- deterministic policy decisions;
- recovery and checkpoint evidence;
- human-readable receipts proving what happened after a warning.

This epic expands #10. Provider conformance remains tracked there; this issue owns the competitive product synthesis and the features selected for Agent Nudge.

---

## Competitive conclusion

The market is converging on:

1. isolated parallel workers and Git worktrees;
2. plan/build/review agents with scoped permissions;
3. lifecycle hooks and typed event streams;
4. reusable skills, rules, plugins, and MCP servers;
5. checkpoints, rewind, fork, and session resume;
6. task graphs, subagents, mailboxes, and background execution;
7. dashboards for status, diffs, review, and approvals;
8. sandboxing, audit, and human approval.

Agent Nudge must **consume and govern these primitives**, not duplicate them.

### Direct and adjacent products researched

| Product/category                     | Strong features                                                                                                                                                   | Agent Nudge response                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| OpenCode                             | Rich plugin event stream, primary/subagents, granular permissions, task permissions, snapshots, forks, sessions, skills, LSP diagnostics, todo events, SDK/server | Build the deepest first-party adapter and use its event richness as the reference conformance target      |
| Claude Code                          | Hooks, agent teams, shared task list, mailbox, dependencies, worktrees, background/forked agents, skills, per-agent tools                                         | Add provider-neutral task graph, handoff receipts, teammate identity, and dependency-aware preflight      |
| Codex                                | Multi-agent command center, worktrees, skills, automations, remote/mobile supervision, sandboxing, review queue                                                   | Integrate task/worktree state and provide cross-provider supervision rather than competing as an agent UI |
| GitHub Copilot                       | Repository hooks, pre-tool denial, custom agents, subagents, skills, plugins, MCP/LSP bundles                                                                     | Add a packaged Agent Nudge plugin and canonical capability/policy manifest                                |
| Gemini CLI                           | Hooks before model/tool selection, subagents, extension bundles, checkpoint/rewind/resume, experimental worktrees, policy engine                                  | Support checkpoint receipts, instruction provenance, and extension packaging                              |
| Cursor / Cline / Roo                 | Memories or rules, checkpoints, plan/act modes, browser verification, custom modes, task timelines, orchestration modes                                           | Import approved context and checkpoint metadata; do not copy private chat history                         |
| OpenHands                            | Typed event stream, sandbox lifecycle, remote agent server, trajectories and evaluation                                                                           | Adopt typed canonical events, environment identity, replay, and evaluation fixtures                       |
| Goose                                | Recipes, MCP extensions/apps, subagents, prompt-injection controls, adversary reviewer                                                                            | Add signed/reviewed assurance recipes and security-verifier hooks later                                   |
| Stoneforge / AQ / Workstreams / Hive | Worktree creation, parallel-agent dashboard, dependency-aware dispatch, diff review                                                                               | Integrate with these orchestrators; avoid becoming another full worktree IDE                              |
| Cipherra                             | Ownership, shared memory, structured handoffs                                                                                                                     | Differentiate with evidence provenance, deterministic routing, privacy minimisation, and receipts         |
| Clash                                | Read-only `git merge-tree` conflict prediction across worktrees                                                                                                   | Add merge-risk simulation beyond exact file locks                                                         |

---

## Product boundary

### Build

- assurance and policy;
- provider capability discovery;
- task, worktree, claim, checkpoint, instruction, evidence, and receipt contracts;
- cross-provider conflict prediction;
- structured handoffs;
- replay and outcome evaluation;
- local-first supervision.

### Do not build

- another general coding agent;
- a model marketplace;
- a full IDE or terminal multiplexer;
- public transcript sharing;
- hidden memory extraction;
- automatic merging or destructive recovery;
- cloud sync before #6 and #7 are complete;
- a generic MCP marketplace.

---

# Feature programme

## P0 — OpenCode reference adapter v2

OpenCode currently exposes a particularly useful event surface. Build a production adapter that consumes only allowlisted structured fields from:

- `session.created`, `session.updated`, `session.status`, `session.idle`, `session.error`, `session.compacted`, `session.diff`, `session.deleted`;
- `tool.execute.before`, `tool.execute.after`;
- `file.edited`, `file.watcher.updated`;
- `permission.asked`, `permission.replied`;
- `todo.updated`;
- `lsp.client.diagnostics`, `lsp.updated`;
- `command.executed`;
- `installation.updated` and `server.connected`.

### Required behaviour

- [ ] Detect OpenCode version and publish a capability manifest.
- [ ] Check in primary agents and subagents with stable parent/child identity.
- [ ] Capture agent mode, model identifier, permission profile, task summary, declared paths, worktree, branch, session parent/fork and freshness.
- [ ] Run Agent Nudge preflight before edit/write/patch, risky bash, external-directory access, and selected MCP tools.
- [ ] Record post-action receipts without persisting prompts, responses, complete command output, or file bodies.
- [ ] Convert LSP diagnostics, command outcomes, file changes, todo changes, and session errors into typed evidence candidates.
- [ ] Handle daemon-offline operation through the durable idempotent outbox.
- [ ] Preserve reversible install, dry-run, drift refusal, backup, disconnect, and rollback guarantees.
- [ ] Add integration fixtures for every consumed event and every unsupported event.
- [ ] Add privacy canaries proving sensitive payload fields never enter storage or logs.

## P0 — Canonical provider capability and policy manifest

Create a provider-neutral schema describing what Agent Nudge can actually observe or enforce.

```ts
type ProviderCapabilityManifest = {
  provider: string;
  version: string;
  transport:
    "native-hook" | "plugin" | "extension" | "acp" | "mcp" | "cli-wrapper";
  events: Record<string, "unsupported" | "observed" | "advisory" | "enforced">;
  permissions: {
    file: boolean;
    shell: boolean;
    network: boolean;
    externalDirectory: boolean;
    mcpTools: boolean;
  };
  checkpoint: "none" | "provider-native" | "agent-nudge";
  worktreeIdentity: boolean;
  subagentIdentity: boolean;
  taskGraph: boolean;
  source: string;
  testedAt: string;
};
```

- [ ] Generate dashboard capability labels from manifests.
- [ ] Never call a provider `ENFORCED` when a covered hook can be bypassed, disabled, or unavailable.
- [ ] Detect configuration or version drift and downgrade capability honestly.
- [ ] Create canonical policy profiles that can compile into provider-native allow/ask/deny rules where safe.
- [ ] Show effective policy, source, precedence, and drift rather than only configured intent.

## P0 — Instruction, rule, skill, and plugin provenance

Modern agents load many overlapping instruction sources. Agent Nudge should prove which configuration was active before action.

Track hashes and precedence for supported files such as:

- `AGENTS.md`;
- `CLAUDE.md` and `.claude/rules`, agents, skills and plugin manifests;
- `GEMINI.md`, Gemini extensions, skills and agents;
- OpenCode rules, agents, skills, plugins and config;
- `.github/agents`, skills, hooks and plugin manifests;
- Cursor, Cline and Roo project rules/modes where accessible.

- [ ] Record paths, hashes, scope, precedence, provider and load time—never complete contents by default.
- [ ] Detect changed instructions during an active session.
- [ ] Detect contradictory active instructions and route `REVIEW` before consequential actions.
- [ ] Mark skills/plugins as trusted, untrusted, changed, missing or version-drifted.
- [ ] Add a context-pack section listing the exact instruction and skill digests used.
- [ ] Permit explicit, reviewed excerpts only when the user opts in.

## P0 — Worktree-aware merge-risk engine

Extend #11 beyond exact-path claims.

Use read-only Git analysis to predict conflict and integration risk:

- [ ] identify repository, physical worktree, branch, base commit and current commit;
- [ ] use `git merge-tree` or equivalent read-only simulation across active branches/worktrees;
- [ ] distinguish same-worktree overwrite risk from future textual merge risk;
- [ ] detect exact path, directory, rename/delete, add/add, generated file, lockfile, schema/migration, API contract and shared-resource overlap;
- [ ] include dependency-aware risk where one task changes an interface consumed by another;
- [ ] publish evidence factors and uncertainty rather than a black-box number;
- [ ] offer coordinate, wait, safe fork/worktree, or continue-with-warning;
- [ ] never auto-merge, force-push, or delete a worktree.

## P0 — Checkpoint and recovery contract

OpenCode, Gemini CLI, Cursor, Cline and Roo expose checkpoint or snapshot concepts. Agent Nudge should normalise their evidence.

- [ ] Record provider-native checkpoint/snapshot ID before configured high-risk actions.
- [ ] Record repository/worktree state, dirty paths, branch, and base commit without file contents.
- [ ] Link every high-risk receipt to the closest valid recovery point.
- [ ] Show whether recovery covers files only, conversation state, both, or neither.
- [ ] Detect checkpoint expiry or invalidation.
- [ ] Require explicit user approval before any restore.
- [ ] Record restore preview and restore receipt.
- [ ] Provide Agent Nudge-owned Git recovery only when provider-native recovery is unavailable and safety is proven.

## P0 — Provider-neutral task graph, mailbox, and handoff receipts

Borrow the useful coordination primitives from Claude teams and modern orchestrators without becoming the orchestrator itself.

- [ ] Typed task states: proposed, ready, claimed, active, blocked, review, completed, failed, cancelled.
- [ ] Parent/child tasks and explicit dependencies.
- [ ] Agent claims with lease, worktree, paths, expected artifacts and acceptance checks.
- [ ] Dependency-aware preflight: prevent work starting against an unresolved prerequisite.
- [ ] Structured agent-to-agent messages with sender, recipient, reason, task, evidence references and acknowledgement.
- [ ] Handoff pack containing decisions, failures, changed interfaces, open risks, receipts and exact next action.
- [ ] Idle, blocked, waiting-for-input and abandoned-session detection.
- [ ] No vague broadcast feed; route only to affected recipients.

## P0 — Structured evidence adapters

Turn development signals into small source-backed facts:

- [ ] LSP errors/warnings by path, symbol and diagnostic code;
- [ ] test run identity, selected tests, pass/fail count and failure fingerprint;
- [ ] lint/typecheck/build receipt;
- [ ] CI/check state and commit SHA;
- [ ] runtime crash or health-check fingerprint;
- [ ] database migration/schema version;
- [ ] dependency or lockfile change;
- [ ] browser/device verification artifact reference;
- [ ] code review finding and resolution state.

Store references, hashes, counts and compact summaries—not full logs or source files.

## P0 — Repetition and doom-loop detector

OpenCode already surfaces a `doom_loop` permission concept. Generalise this across providers.

- [ ] Detect repeated identical or near-identical tool calls with unchanged inputs and outcomes.
- [ ] Detect repeated edits followed by the same diagnostic/test failure.
- [ ] Detect another agent retrying a previously failed approach.
- [ ] Route `REVIEW` with the last failure receipt and a required replan reason.
- [ ] Permit explicit override with a receipt.
- [ ] Avoid blocking legitimate retry strategies when inputs, environment or hypothesis changed.

## P1 — ACP observation and interoperability adapter

ACP is becoming a common IDE-to-agent protocol across OpenCode, Gemini CLI, Claude adapters, Codex adapters, Goose, Cline, OpenHands and others.

- [ ] Research the current ACP schema and event coverage.
- [ ] Build a read-only ACP observer or proxy prototype that preserves end-to-end behaviour.
- [ ] Capture session identity, tool permission requests, tool calls, plan updates, file changes and terminal events where the protocol exposes them.
- [ ] Fall back to provider-native adapters for enforcement and richer events.
- [ ] Never claim ACP observation alone is an enforcement boundary.
- [ ] Add conformance tests against at least OpenCode and Gemini CLI.

## P1 — A2A-compatible task and artifact export

- [ ] Map Agent Nudge tasks, statuses and artifacts onto A2A concepts only where semantics match.
- [ ] Export read-only task status and signed context-pack digests.
- [ ] Preserve local authorization; no unauthenticated remote mutation.
- [ ] Keep this behind an experimental feature flag.

## P1 — Cost, latency, and attention budgets

- [ ] Per-provider preflight latency.
- [ ] Agent runtime and idle time.
- [ ] Estimated tokens/cost when providers expose it.
- [ ] Number of warnings generated, reviewed, useful, ignored and wrong.
- [ ] Human interruptions per saved conflict/repeated failure.
- [ ] Coordination ROI with explicit assumptions.
- [ ] Budget rules that advise or require approval; never silently terminate paid work.

## P1 — Sanitised handoff and replay export

- [ ] Export context packs, task graph, receipts and evidence metadata without transcript/file content.
- [ ] Add an explicit optional redaction-reviewed export for deeper debugging.
- [ ] Support deterministic replay in #9.
- [ ] Never create public links automatically.

## P1 — Native packaging and marketplaces

Package Agent Nudge using each provider’s supported distribution unit where mature:

- [ ] OpenCode npm/project plugin;
- [ ] Claude Code plugin;
- [ ] GitHub Copilot plugin containing hooks/skills/agent profile where appropriate;
- [ ] Gemini CLI extension;
- [ ] Cline/Roo marketplace package only after conformance testing.

Every package must expose exact owned files, permissions, update path, uninstall path, version, checksum and drift status.

## P2 — Human supervision bridge

After #6 and #7:

- [ ] local desktop notification for HOLD/input-required/recovery-required;
- [ ] optional read-only web/mobile status surface;
- [ ] explicit approval challenge tied to authenticated session and action digest;
- [ ] no raw transcript or source-code sync;
- [ ] revocable pairing and short-lived approvals;
- [ ] complete approval receipt.

---

# Research and evaluation requirements

## Competitive matrix

Create `docs/research/COMPETITIVE_FEATURE_SYNTHESIS_2026.md` containing:

- current official feature evidence;
- provider/product version and retrieval date;
- capability taxonomy;
- implementation relevance to Agent Nudge;
- privacy/security implications;
- build, integrate, defer or reject decision;
- maintenance risk and confidence.

Include at minimum:

- OpenCode;
- Claude Code;
- Codex;
- GitHub Copilot;
- Gemini CLI;
- Cursor;
- Cline;
- Roo Code;
- OpenHands;
- Goose;
- Stoneforge;
- AQ;
- Workstreams or Hive;
- Cipherra;
- Clash.

## Empirical scenarios

Turn research into versioned fixtures:

- [ ] same path in same worktree;
- [ ] same path in separate worktrees;
- [ ] branches that pass path checks but conflict under `merge-tree`;
- [ ] API producer/consumer dependency conflict;
- [ ] stale `AGENTS.md` or changed skill during session;
- [ ] contradictory rules from two scopes;
- [ ] repeated failed test loop;
- [ ] abandoned agent claim;
- [ ] task started before dependency completion;
- [ ] provider checkpoint available/unavailable/expired;
- [ ] ACP event available but native enforcement unavailable;
- [ ] malicious or over-broad plugin/skill permissions;
- [ ] daemon offline and outbox replay;
- [ ] false-positive conflict with a justified override.

## Success metrics

- conflict-warning precision;
- prevented overwrite rate;
- merge-risk detection beyond exact paths;
- repeated-failure avoidance;
- instruction-drift detection;
- task dependency violations prevented;
- median preflight latency;
- nudge acknowledgement and changed-action rate;
- false-positive and bypass rate;
- private-data canary leakage: zero.

---

# Delivery sequence

## Gate 0 — Reliability and trust

Complete or materially satisfy:

- #6 sole-writer ledger, transactions and crash recovery;
- #7 authenticated local control plane and unified receipt mutations.

Do not widen enforcement before these gates.

## Phase 1 — OpenCode-first foundation

1. Provider capability manifest.
2. OpenCode adapter v2.
3. Instruction/skill provenance.
4. Structured evidence adapters.
5. Repetition detector.
6. Dashboard capability and evidence views.

## Phase 2 — Coordination depth

1. Worktree-aware merge-risk engine.
2. Task graph/mailbox/handoff packs.
3. Checkpoint/recovery contract.
4. Shadow Mode and Replay Lab from #9.
5. Safe fork/Conflict Escrow from #11.

## Phase 3 — Interoperability

1. ACP observer prototype.
2. Copilot/Claude/Gemini provider packages.
3. A2A task/artifact export experiment.
4. Cost and attention budgets.
5. Optional supervision bridge.

---

# Required build outputs

- [ ] Competitive synthesis document.
- [ ] ADRs for capability manifests, ACP, instruction provenance, merge risk and checkpoint contract.
- [ ] Typed schemas and migrations.
- [ ] OpenCode v2 connector/plugin.
- [ ] Public-safe fixtures and conformance tests.
- [ ] Unit, integration, E2E and privacy-canary tests.
- [ ] Dashboard views for capabilities, task graph, merge risk, checkpoints and provenance.
- [ ] Updated threat model.
- [ ] Updated protocol and connector docs.
- [ ] Build receipt with exact versions and known limitations.
- [ ] Smaller implementation issues split from this epic before coding each major phase.

---

# Source starting set

Official and primary sources reviewed on 2026-07-23:

- OpenCode plugins/events: https://opencode.ai/docs/plugins/
- OpenCode agents/permissions: https://opencode.ai/docs/agents/
- OpenCode CLI/sessions/forks/stats: https://opencode.ai/docs/cli/
- OpenCode rules: https://opencode.ai/docs/rules/
- OpenCode skills: https://opencode.ai/docs/skills
- OpenCode snapshots: https://opencode.ai/docs/config/
- Claude Code subagents: https://code.claude.com/docs/en/subagents
- Claude Code agent teams: https://code.claude.com/docs/en/agent-teams
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Claude Code parallel agents/worktrees: https://code.claude.com/docs/en/agents
- GitHub Copilot hooks: https://docs.github.com/en/copilot/concepts/agents/hooks
- GitHub Copilot custom agents/subagents: https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/custom-agents
- GitHub Copilot plugins: https://docs.github.com/en/copilot/concepts/agents/about-plugins
- Gemini CLI extension reference: https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
- Gemini CLI commands/checkpoints/rewind: https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/commands.md
- Gemini CLI configuration/hooks/worktrees: https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md
- Gemini CLI subagents: https://github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md
- Codex app/worktrees/skills/automations: https://openai.com/index/introducing-the-codex-app/
- Codex security and audit: https://openai.com/index/running-codex-safely/
- ACP: https://agentclientprotocol.com/ and https://zed.dev/acp
- A2A: https://a2a-protocol.org/
- Cline: https://github.com/cline/cline and https://www.mintlify.com/cline/cline/core-workflows/checkpoints
- Roo Code: https://roocodeinc.github.io/Roo-Code/features/
- OpenHands architecture/events/sandbox: https://docs.openhands.dev/sdk/arch/overview and https://docs.openhands.dev/openhands/usage/sandboxes/overview
- Goose: https://block.github.io/goose/
- Stoneforge: https://stoneforge.ai/ and https://docs.stoneforge.ai/getting-started/introduction/
- AQ: https://aq.dev/docs/
- Cipherra: https://cipherra.ai/
- Clash: https://clash.sh/

Research papers to evaluate, not treat as product claims:

- CooperBench: https://arxiv.org/abs/2601.13295
- Effective Strategies for Asynchronous Software Engineering Agents / CAID: https://arxiv.org/abs/2603.21489
- AI Agent Pull Requests and Merge Conflict Rates: https://arxiv.org/abs/2607.04697
- Configuring Agentic AI Coding Tools: https://arxiv.org/abs/2602.14690
- Overeager Coding Agents: https://arxiv.org/abs/2605.18583

## Definition of done

This epic is not done when the research document exists. It is done when the selected features are represented by schemas, fixtures, tested adapters, dashboard surfaces and smaller executable implementation issues—while rejected features remain explicitly out of scope.

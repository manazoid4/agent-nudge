# Session Start Assurance — Pro Feature Plan

Status: proposed next paid feature after v0.5 release readiness.

## Product promise

When Maz opens a new or interrupted coding-agent session, Agent Nudge answers one question:

> What should this agent resume or start, based on verified local state?

The answer is a small, source-backed start card—not a transcript summary and not another dashboard.

## Why this is worth paying for

Claude Code and Cursor can reopen earlier conversations, and Cursor can reference past chats. Agent tools also load persistent repo rules. Those features restore provider history; they do not reconcile an old conversation with current Git state, abandoned work, live claims, instruction drift, and the user's approved operating rules.

Agent Nudge's paid value is the verified join:

`task ledger + current repo + approved rules -> resume/start prompt + evidence receipt`

Research references:

- [Claude Code can continue or resume sessions](https://docs.anthropic.com/en/docs/claude-code/cli-usage).
- [Cursor exposes local chat history and @Past Chats](https://docs.cursor.com/en/agent/chat/history).
- [Cursor requires approval for background-generated memories](https://docs.cursor.com/en/context/memories).
- [Codex composes user and repository AGENTS.md instructions by specificity](https://openai.com/index/unrolling-the-codex-agent-loop/).

Product conclusion: do not compete on chat storage. Compete on current evidence, explicit selection, conflict visibility, and cross-agent portability.

## Maz dogfood flow

1. Open MAZos and choose a project.
2. See at most three start cards, ordered by consequence:
   - **Resume** abandoned or interrupted work.
   - **Review** work waiting on a gate or verification.
   - **Start** the current highest-value action.
3. Open a card to see why it exists, freshness, files/branch, and verification commands.
4. Send it through Agent Nudge to Claude, Codex, OpenCode, or copy as Markdown.
5. Agent Nudge records `launched`, `dismissed`, or `completed` through the existing receipt path.

Target: useful in under 30 seconds with no manual repo rescan.

## Feature contract

### 1. Recovery Inbox

Add `GET /v1/session-start?project=<id>`.

Return a maximum of three ranked cards built from existing structured state:

- abandoned tasks from `detectAbandonedTasks`;
- task state and lease expiry;
- session presence;
- checkpoint restore preview;
- structured handoff;
- instruction provenance/drift;
- open claims and unresolved HOLD/REVIEW nudges.

Each card must include:

- `kind`: `resume | review | start`;
- project, task, branch, and affected paths;
- one-sentence reason;
- evidence references and freshness;
- exact next action and verify commands;
- risk/uncertainty flags;
- deterministic score factors;
- optional existing runner preset.

Ranking order: safety block > abandoned active work > explicit human gate > verified next action. Ties prefer fresher evidence.

### 2. Start Prompt

Render one compact prompt from a selected card. Reuse the brief compiler, instruction provenance, and runner service.

Prompt sections:

1. objective;
2. verified current state;
3. constraints and conflicts;
4. next action;
5. verification and stop condition;
6. source digest.

No model generates or rewrites the prompt in v1. Templates remain deterministic and inspectable.

### 3. MAZos consumer

MAZos is the first client, not the source of truth. Its NOW view requests the local Agent Nudge endpoint, shows the three cards, and launches/copies the selected prompt. If Agent Nudge is unavailable, MAZos keeps its current context-pack workflow and labels assurance offline.

## Paid boundary

Use the existing `custom_profiles`/Pro licensing seam; do not add a second billing system.

- Community: current single-repo compiler, context health, connectors, and manual local context pack.
- Pro: Session Start Assurance, multi-repo recovery history, saved operator prompt library, and direct runner handoff.
- Team later: shared recovery visibility and policy. Not part of this build.

The 14-day Pro trial includes the feature. Core safety checks remain free.

## Privacy and safety invariants

- Agent Nudge never reads Claude, Codex, Cursor, or OpenCode transcript stores.
- No prompts, command bodies, file contents, secrets, or raw provider payloads enter recovery cards.
- MAZos may inspect the user's local chats for its separate private panel, but it must not send transcript content to Agent Nudge.
- Every card is project-scoped, size-bounded, source-backed, and redacted.
- Launch reuses the existing allowlisted runner service; no new process-execution surface.
- Offline or uncertain state fails quiet and shows why.

## Delivery slices

### Slice 1 — Read model

- Define `SessionStartCard` schema and deterministic ranking.
- Join task, checkpoint, presence, handoff, drift, and claim state.
- Add unit tests for ranking, stale evidence, redaction, and the three-card cap.

### Slice 2 — API and prompt

- Add authenticated `GET /v1/session-start` and prompt render/preview.
- Gate the paid action with the existing entitlement service.
- Reuse existing receipts and runner preview/launch paths.
- Add integration tests for auth, Community/Pro behavior, and offline state.

### Slice 3 — Maz dogfood UI

- Add one compact “Start here” strip to MAZos NOW.
- Show Resume/Review/Start, reason, freshness, and one primary action.
- Keep current context-pack fallback.
- Dogfood on Agent Nudge plus one revenue repo for seven days.

Only after the dogfood gate passes should Agent Nudge gain its own Recovery Inbox view.

## Ship gate

Ship beyond Maz only if seven-day dogfood proves:

- used on at least five days;
- median time from opening MAZos to launching/copying a card is under 30 seconds;
- at least 70% of shown cards are launched or explicitly marked useful;
- zero transcript reads or privacy-boundary violations;
- no duplicate/stale resume card after task completion;
- full Agent Nudge and MAZos builds/tests pass.

If the cards are routinely ignored, remove the UI and keep the read model as an internal API. Do not expand into chat search, sync, or AI-written summaries.

## Explicit non-goals

- General chat history or semantic transcript search.
- A new memory store.
- LLM prompt generation.
- A second task manager.
- Team coordination in the first release.
- New pricing tiers or licensing infrastructure.

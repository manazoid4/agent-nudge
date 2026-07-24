# Maz Prompt Playbook

Operating guide for AI coding agents (Claude, Codex, OpenCode, Hermes) based on verified research and Maz's repository rules.

## 1. Repository Planning (The PLAN Pass)
* **Rule:** Separate analysis from execution. In a PLAN pass, the agent may only read, analyze, and write a `plan.md` or `BUILD_PLAN.md` file. Zero commits or code changes allowed.
* **Scope:** [PERSONAL DEFAULT]
* **Why it works:** Forces task decomposition. LLMs degrade in reasoning quality when mixing code-generation with high-level planning (ArXiv:2308.11432).
* **When to use:** Any task requiring >2 files changed or >3 steps.
* **When not to use:** Single-file typos or isolated styling fixes.
* **Example:** "Analyze `src/auth.ts`. Write `plan.md` with steps. Do not modify source code."
* **Evidence:** Confirms existing MAZos rule; supported by Anthropic Prompt Chaining docs.

## 2. Building One Vertical Slice (The BUILD Pass)
* **Rule:** Execute exactly ONE unchecked plan item, make the smallest coherent diff, run verification, and stop.
* **Scope:** [PERSONAL DEFAULT]
* **Why it works:** Prevents agent "runaway" and hallucination loops. Shortens the context delta for rollback.
* **When to use:** Executing the output of a PLAN pass.
* **Example:** "Implement Step 2 from `plan.md`. Run `npm run test`. Append result to `progress.md`. Stop."
* **Evidence:** Confirms existing MAZos rule.

## 3. Resuming Interrupted Work
* **Rule:** Do not feed the agent the raw previous transcript. Feed it the `HANDOFF.md`, `BUILD_RECEIPT.md`, and current `git status`.
* **Scope:** [PERSONAL DEFAULT]
* **Why it works:** Raw transcripts burn tokens and introduce "stale state hallucination" where the agent acts on old code blocks in context. Structured state files provide absolute truth.
* **When to use:** Session restarts, morning bootups, multi-day features.
* **Example:** "Read `.agent-state/HANDOFF.md`. Verify CI status. Propose next action based on `git status`."
* **Evidence:** Confirms FlowLens `HANDOFF.md` practice; supported by LangChain workflow state management.

## 4. Reducing Token Waste
* **Rule:** Enforce a hard 200-line limit on global `CLAUDE.md`. Move specific tech instructions to path-scoped rules (e.g., `.claude/rules/database.md`).
* **Scope:** [NEW CANDIDATE RULE]
* **Why it works:** Global instructions crowd out the active working memory. Path-scoping ensures instructions only load when the relevant files are touched.
* **When to use:** In mega-repos or multi-stack monorepos.
* **Evidence:** Anthropic "How Claude remembers your project" documentation.

## 5. Proving Completion (Evidence before claims)
* **Rule:** Agents must not claim completion, correctness, or deployment without verifiable commands, outputs, or receipts.
* **Scope:** [PERSONAL DEFAULT]
* **Why it works:** LLMs are sycophantic and will claim "I have fixed the issue" if the code looks syntactically correct, even if tests fail.
* **When to use:** Universal.
* **Example:** "Do not declare success because files exist. Run `npm test`. If it fails, report the error and stop."
* **Evidence:** Confirms Agent Nudge `2026-07-20` build prompt.

## 6. Coordinating Multiple Agents
* **Rule:** Use deterministic preflight claims (Agent Nudge) to lock files. Do not use conversational chat to coordinate.
* **Scope:** [PROJECT-SPECIFIC] (Agent Nudge)
* **Why it works:** Chat-based coordination causes race conditions. SQLite-backed claims are deterministic.
* **When to use:** When Codex and Claude are running in the same repo simultaneously.
* **Evidence:** Confirms Agent Nudge Architecture.

## 7. Preventing Loops
* **Rule:** Implement hard stop conditions (max iterations, identical repeated failure, or hitting a human gate).
* **Scope:** [PERSONAL DEFAULT]
* **Why it works:** LLMs stuck in a lint/fix loop will burn credits and corrupt code trying wilder fixes.
* **When to use:** Anytime an agent is given terminal/execution access.
* **Example:** "If `npm run build` fails twice with the same error, STOP and write the error to `DECISION_STRIP.md`."
* **Evidence:** Confirms MAZos loop rules; supported by Reddit Practitioner consensus on loop prevention.

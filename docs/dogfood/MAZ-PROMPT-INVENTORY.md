# Maz Prompt Inventory

Inventory of agent-facing prompts and system instructions discovered across Maz's repositories.

## 1. Unified Vault instructions (AGENTS.md)

- **Repository:** `manazoid4/claude-obsidian` (Unified Vault)
- **Path:** `C:\Users\manaz\claude-obsidian\AGENTS.md` (and mirrored in `C:\Users\manaz\Desktop\Obsidian Main Vault\AGENTS.md`)
- **Prompt Family:** Vault Setup & Navigation
- **Mode:** Standing Orders
- **Intended Agent:** All local agents (Claude Code, Codex, OpenCode, Hermes)
- **Status:** Active
- **Scope:** [PERSONAL DEFAULT] / [TOOL-SPECIFIC]
- **Strongest Reusable Pattern:** Folder-based workflow routing. Declares strict read order (AGENTS.md -> Vault Map -> Daily Brief -> Projects) and enforces symlink setups to ~/.codex/skills.
- **Evidence of Outcome:** Seamless multi-agent knowledge persistence across sessions using Andrej Karpathy's LLM Wiki pattern.
- **Reason for Inclusion:** Sets the foundation for how agents must discover and navigate project and personal files.

## 2. MAZos v2 Loop Cockpit rules (AGENTS.md)

- **Repository:** `manazoid4/mazos-ui`
- **Path:** `C:\Users\manaz\Projects\mazos-ui\AGENTS.md`
- **Prompt Family:** Loop Execution
- **Mode:** Workflow Rules
- **Intended Agent:** Hermes / Claude / Codex / OpenCode
- **Status:** Active
- **Scope:** [PROJECT-SPECIFIC] / [PERSONAL DEFAULT]
- **Strongest Reusable Pattern:** Separating the PLAN pass (analysis only, rewrite plan.md, no commits) from the BUILD pass (exactly one unchecked plan item, smallest diff, verify, commit). Enforces hard stop conditions (max iterations, no progress).
- **Evidence of Outcome:** Used inside Loop Cockpit cards where Maz copies/pastes tasks. Ensures tight, predictable iterations without agent runaway.
- **Reason for Inclusion:** Defines the execution loop phase constraints, which is crucial for compiling a structured brief.

## 3. Agent Nudge Super x10 Build Prompt

- **Repository:** `manazoid4/claude-obsidian`
- **Path:** `02-PROJECTS/Agent Nudge/2026-07-20-agent-nudge-super-x10-build-prompt.md`
- **Prompt Family:** One-Batch Bootstrap
- **Mode:** Build
- **Intended Agent:** Claude Code / Codex (fresh session)
- **Status:** Stale (v0.4.0 is now shipped, but this remains a premium historical reference for one-batch bootstrapping)
- **Scope:** [HISTORICAL / STALE]
- **Strongest Reusable Pattern:** Fully autonomous operating mode boundaries (make conservative assumptions, ask only when blocked by spending money / deleting data / security) combined with non-negotiable product laws and explicit success scenarios.
- **Evidence of Outcome:** Successfully bootstrapped the entire Agent Nudge project structure, schemas, and MVP in a clean mono-repo workspace on Windows.
- **Reason for Inclusion:** Represents the structural baseline of how Maz prompts for major codebase features.

## 4. Recall Agent Rules

- **Repository:** `manazoid4/recall`
- **Path:** `C:\Users\manaz\Projects\recall\AGENTS.md`
- **Prompt Family:** Project-specific constraints
- **Mode:** Workflow Rules
- **Intended Agent:** Claude / Codex
- **Status:** Active
- **Scope:** [PROJECT-SPECIFIC] / [PERSONAL DEFAULT]
- **Strongest Reusable Pattern:** Declares clear source of truth priority (README/STATE.md > Repo Code > Obsidian Notes > session summaries) and flags stale directories to avoid (`C:\Users\manaz\saved-brain` is stale).
- **Evidence of Outcome:** Enforced privacy-first constraints and verification loops on Next.js/Chrome Extension tasks.
- **Reason for Inclusion:** Standardizes clean-room testing and verification commands.

## 5. FlowLens apps/web Agent Rules

- **Repository:** `manazoid4/flowlens`
- **Path:** `C:\Users\manaz\flowlens\apps\web\AGENTS.md`
- **Prompt Family:** Framework Warning
- **Mode:** Development
- **Intended Agent:** Next.js developer agent
- **Status:** Active
- **Scope:** [PROJECT-SPECIFIC]
- **Strongest Reusable Pattern:** Warnings about breaking changes in the framework ("This is NOT the Next.js you know") to override default LLM training data.
- **Evidence of Outcome:** Keeps the agent from hallucinating deprecated Next.js app router patterns.
- **Reason for Inclusion:** Demonstrates the value of framework override rules.

## 6. OpenFlowKit Codex System Instructions

- **Repository:** `manazoid4/openflowkit`
- **Path:** `C:\Users\manaz\openflowkit\AGENTS.md`
- **Prompt Family:** Product Thesis
- **Mode:** Standing Orders / Product Roadmap
- **Intended Agent:** Codex
- **Status:** Active
- **Scope:** [PROJECT-SPECIFIC]
- **Strongest Reusable Pattern:** Outlining core product logic step-by-step (CAPTURE -> TRANSCRIBE -> REFINE -> PERSONALIZE -> INJECT -> SYNC) to steer the agent away from generic API wrapper implementations.
- **Evidence of Outcome:** Guides Codex toward building local-first voice productivity features instead of generic transcription wrappers.
- **Reason for Inclusion:** Exemplifies the "Pain -> Solution -> Control" copy framework applied to developer instructions.

## 7. SecureShift Agent Rules

- **Repository:** `manazoid4/SecureShift`
- **Path:** `C:\Users\manaz\SecureShift\AGENTS.md`
- **Prompt Family:** Product-specific constraints
- **Mode:** Development
- **Intended Agent:** Claude Code
- **Status:** Active
- **Scope:** [PROJECT-SPECIFIC]
- **Strongest Reusable Pattern:** Setting the business context (seeker Pro £9.99/mo | employer Agency plans £149/mo) and focusing the technical scope solely on "source-first" job signals via SEO, before building seeker traffic.
- **Evidence of Outcome:** Kept the agent from wasting time on complex frontend UI pages before database seeding was working.
- **Reason for Inclusion:** Shows how commercial value checks shape immediate task prioritization.

## 8. Site Audit + 3 New Features Prompt

- **Repository:** `manazoid4/JobFilter-Obsidian-Vault`
- **Path:** `System/Agent Prompts/2026-05-20 Site Audit + 3 New Features Prompt.md`
- **Prompt Family:** UI/UX Audit
- **Mode:** UI Polish & Feature Ideation
- **Intended Agent:** Claude Code
- **Status:** Stale (implemented in PR #252)
- **Scope:** [TEMPORARY TASK RULE]
- **Strongest Reusable Pattern:** Combining competitor analysis (Bark, Checkatrade) with brutalist UI parameters and list of free tools to recover.
- **Evidence of Outcome:** Successfully redesigned the homepage, recovered 9+ free tools, and added new SaaS subscription hooks.
- **Reason for Inclusion:** Perfect example of a high-complexity user prompt used mid-project.

---

## Appendix: Excluded Files

- **JobFilterV1/PRODUCT.md**
  - _Reason:_ Product spec, does not contain agent execution prompts.
- **agent-nudge/BUILD_PLAN.md**
  - _Reason:_ Task status checklist, not a prompt.
- **agent-nudge/BUILD_RECEIPT.md**
  - _Reason:_ Done-verification log, not a prompt.
- **agent-nudge/ISSUE.md**
  - _Reason:_ Problem statement, not a prompt.
- **flowlens/.agent-state/HANDOFF.md**
  - _Reason:_ Multi-session handoff log. Excluded because it registers outcome logs, not actionable prompts.
- **claude-obsidian/wiki/projects/jobfilter/STICKY-TODO.md**
  - _Reason:_ Founder task queue, not a prompt.

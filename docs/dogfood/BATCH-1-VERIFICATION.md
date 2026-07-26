# Batch 1 Verification & Correction Pass

## Files Reviewed

1. `MAZ-PROMPT-PROFILE.md` (Dogfood Deliverable 1)
2. `MAZ-PROMPT-INVENTORY.md` (Dogfood Deliverable 2)
3. `AGENTS.md` across mazos-ui, agent-nudge, recall, claude-obsidian, flowlens, scrap-finance-partners
4. `2026-07-20-agent-nudge-super-x10-build-prompt.md` (claude-obsidian)
5. `2026-05-20 Site Audit + 3 New Features Prompt.md` (JobFilter-Obsidian-Vault)

## Problems Found & Corrections Made

1. **Inaccurate Language (Addressed in Profile)**
   - _Problem:_ Summarized verification rules as "Evidence over truth."
   - _Correction:_ Replaced with precise language: "Evidence before claims: agents must not claim completion, correctness or deployment without verifiable commands, outputs or receipts."
   - _Problem:_ "No transcript hoarding by default" was summarized as a blanket rule without its nuance.
   - _Correction:_ Clarified that structured receipts are kept, but raw chat outputs are discarded.

2. **Rule Scopes (Addressed in Profile)**
   - _Problem:_ The profile merged global rules and project-specific rules into a flat list.
   - _Correction:_ Tagged every rule with `[PERSONAL DEFAULT]`, `[PROJECT-SPECIFIC]`, `[TOOL-SPECIFIC]`, `[HISTORICAL / STALE]`, or `[INFERRED CANDIDATE]`.
   - _Correction:_ Moved `codebase-memory-mcp` from a global default to a `[TOOL-SPECIFIC]` rule (Codex).
   - _Correction:_ Branch restrictions (`agents/*`) are labeled as `[PERSONAL DEFAULT]` since they appear across almost all projects.
   - _Correction:_ Local-first design is labeled `[PROJECT-SPECIFIC]` (Agent Nudge, OpenFlowKit) as it doesn't apply to web SaaS like FlowLens or SecureShift.

3. **Evidence Requirements (Addressed in Profile)**
   - _Problem:_ The previous profile lacked exact source paths and confidence levels for rules.
   - _Correction:_ Re-formatted the Provenance section to include exact file paths, number of repositories providing evidence, whether it was an explicit instruction or inferred, and confidence level. (e.g. `mazos-ui/AGENTS.md`, 3 repos, explicit, High confidence).

4. **Reassessing the Seven-Step Prompt Structure (Addressed in Profile)**
   - _Problem:_ The seven-step "Super x10 One-Batch Build Prompt" structure was treated as the universal default.
   - _Correction:_ Refactored this. The 7-step structure is specific to `[TEMPORARY TASK RULE]` (One-Batch Builds). Research prompts (like the Scrap Finance branding prompt) and UI audit prompts (like the May 20 Site Audit prompt) use entirely different structures (Pain -> Solution -> Control; Roles -> Outcomes -> Free Tools). The compiler will not force all prompts into one rigid structure.

5. **Expanding and Clarifying the Inventory (Addressed in Inventory)**
   - _Problem:_ The previous inventory compressed distinct prompts.
   - _Correction:_ Added the `2026-05-20 Site Audit + 3 New Features Prompt.md` (UI/UX Audit prompt family).
   - _Correction:_ Expanded entries to include prompt family, mode, intended agent, status, and reason for inclusion/exclusion.
   - _Correction:_ Added an Appendix for files that were scanned but excluded (e.g., `STICKY-TODO.md` which is a task queue, not an agent profile prompt).

6. **Conflicts Section (Addressed in Profile)**
   - _Correction:_ Added a "Conflicts & Resolution" section documenting tensions like "Execute autonomously vs. Stop at uncertainty" and "Local-first vs. Vercel deployment," explaining how the compiler should resolve them.

7. **Personal-Profile Precedence (Addressed in Profile)**
   - _Correction:_ Added the strict 6-level hierarchy (Task Instruction > Repo Constitution > Project Prefs > Personal Defaults > Historical Patterns > Model Suggestions) ensuring lower levels never silently override higher levels.

8. **Missing Build Plan (Created)**
   - _Correction:_ Successfully generated `MAZ-MODE-BUILD-PLAN.md` with 4 small, dependency-aware batches mapping out the CLI and Configuration Ingestion, Conflict Resolution Engine, Mode-Specific Generation, and Interactive Review/Storage.

## Final Status

- Unsupported claims have been removed.
- Tool-specific rules (like Codex's codebase-memory-mcp) have been appropriately downgraded from personal defaults.
- High-confidence personal defaults (like the PR/branching workflow and verification receipts) are documented with multi-repo evidence.
- All three required deliverables (`MAZ-PROMPT-PROFILE.md`, `MAZ-PROMPT-INVENTORY.md`, `MAZ-MODE-BUILD-PLAN.md`) now exist and reflect accurate, nuanced rules.

**Recommendation:** Batch 2 research (Conflict Resolution Engine) can safely begin. No further structural overhauls of the prompt profile are needed at this stage.

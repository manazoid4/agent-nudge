# Maz Prompt Profile

**Entity:** Maz (manazoid4)
**Context:** Cross-platform AI agent workflows (Claude Code, Codex, OpenCode, Hermes) across 11+ repositories on Windows.
**Purpose:** Dogfood specification for Agent Nudge's Agent Brief Compiler.

## 1. Prompt Structures by Mode

Maz does not use one universal rigid structure. Different tasks require different prompt families.

### [TEMPORARY TASK RULE] One-Batch Build Prompt (New Projects / Huge Refactors)

Used when bootstrapping (e.g., `agent-nudge-super-x10-build-prompt.md`).

1. **Metadata:** Target repo, agent role, objective.
2. **Operating Mode:** Explicit constraints on autonomy (Inspect -> Plan -> Implement -> Verify -> Review).
3. **Mission / Thesis:** Differentiating the product from competitors.
4. **Non-Negotiable Laws:** Numbered constraints (e.g., Local first).
5. **Success Scenarios:** End-to-end flows that must pass.
6. **Target Stack / Domain Model:** Allowed tech and TypeScript schemas.

### [TEMPORARY TASK RULE] Site Audit & UX Polish

Used for UI/Product reviews (e.g., `2026-05-20 Site Audit + 3 New Features Prompt.md`).

1. **Project Positioning:** "JobFilter is not a shared-lead marketplace..."
2. **Roles to Play:** Product Strategist, Conversion Copywriter, UX/UI Designer.
3. **Main Outcomes:** Numbered goals (e.g., "Make the homepage instantly understandable").
4. **Copy Angles & Free Tools:** Specific phrases to emphasize.
5. **Workflow & Strict Rules:** "Repo scan → Vault scan → Site audit... No fake testimonials."

### [TEMPORARY TASK RULE] Copywriting / Brand Voice

Used for content generation (e.g., `scrap-finance-partners/AGENTS.md`).

1. **Context & Tone:** "Speak like someone who has stood in the yard at 6am."
2. **Structure:** PAIN → SOLUTION → CONTROL.
3. **Forbidden Words & Required Phrases.**

## 2. Default Execution Rules & Verification

- **[PERSONAL DEFAULT] Evidence before claims:** Agents must not claim completion, correctness or deployment without verifiable commands, outputs or receipts. (High confidence, explicit instruction across `agent-nudge`, `recall`, `mazos-ui`).
- **[PERSONAL DEFAULT] Autonomy with explicit stop gates:** Work autonomously but stop and ask when blocked by credentials, spending money, destructive data operations, or deployment. (High confidence).
- **[PERSONAL DEFAULT] Surgical edits:** Touch only what must be touched. No abstractions for single-use code. (High confidence).
- **[PERSONAL DEFAULT] No transcript hoarding:** Store structured handoff receipts and excerpts, not raw chat outputs. (High confidence, explicit in `agent-nudge` and `JobFilter-Obsidian-Vault/AgentDock`).

## 3. Preferred Agent Roles & Use Cases

- **[TOOL-SPECIFIC] Hermes:** High-agency local execution, desktop automation, heavy research, and orchestration via tools.
- **[TOOL-SPECIFIC] Claude Code:** Project-specific implementation, planning loops, and feature building (often receives the "PLAN" or "BUILD" payload from MAZos).
- **[TOOL-SPECIFIC] Codex:** Code discovery, multi-agent squad implementation. Uses `codebase-memory-mcp` for codebase graph traversal.
- **[PROJECT-SPECIFIC] MAZos:** Acts as the "Loop cockpit" that orchestrates the human-to-agent handoff, but does _not_ launch agents itself.

## 4. Common Constraints & Prohibited Actions

- **[PERSONAL DEFAULT] Source control safety:** Work on `agents/*` branches. No force pushes. No pushing to `main` without explicit PR request. (High confidence, repeated in >4 repos).
- **[PERSONAL DEFAULT] UI/Brand Aesthetics:** Reject generic purple AI SaaS dashboards, glass cards, and gradient text. Prefer "Brutalist / DeWalt aesthetic" (hard shadows, 2px borders, industrial). (High confidence, JobFilter and Scrap Finance).
- **[PROJECT-SPECIFIC] Privacy:** Zawiya requires absolute privacy ("never put private spiritual content anywhere digital"). Recall requires "privacy-first: authorised/user-provided data only."
- **[PROJECT-SPECIFIC] Local-First:** Agent Nudge and OpenFlowKit are strictly local-first. Does not apply universally to web SaaS like FlowLens.

## 5. Research & Discovery Expectations

- **[TOOL-SPECIFIC] Code Discovery:** Codex should ALWAYS prefer MCP graph tools (`search_graph`, `trace_path`, `get_code_snippet`) over grep/glob.
- **[PERSONAL DEFAULT] Vault Discovery:** Read indexes first (`AGENTS.md`, `Vault Map.md`), targeted search after. NEVER load the whole Obsidian vault into context. (High confidence, `claude-obsidian`, `mazos-ui`).
- **[PERSONAL DEFAULT] Codebase Source of Truth:** Repo code beats old Obsidian notes.

## 6. Personal-Profile Precedence Hierarchy

Lower levels must never silently override higher levels:

1. **Explicit current task instruction.**
2. **Current repository constitution and safety rules** (e.g., `AGENTS.md` in the repo).
3. **Approved project preferences.**
4. **Approved Maz personal defaults.**
5. **Historical prompt patterns.**
6. **Model-generated suggestions.**

## 7. Conflicts & Resolution Engine

- **Execute Autonomously vs. Stop at Uncertainty:**
  _Resolution:_ Task mode dictates. In BUILD mode, stop at human gates (credentials, deployment). In PLAN mode, execute analysis autonomously.
- **Provider-Neutral vs. Tool-Specific Optimizations:**
  _Resolution:_ Tool-specific optimizations (like Codex `codebase-memory-mcp`) apply only when that specific agent is targeted. The architecture remains provider-neutral.
- **Commit/Push Expectations vs. Branch Safety:**
  _Resolution:_ Repo constitution overrides. `claude-obsidian` requires a push to `fork main` after every session. Application repos (`agent-nudge`, `mazos-ui`) strictly forbid pushes to `main` and require `agents/*` branches.

## 8. Provenance & Confidence

| Rule / Preference                                             | Source File                                                                                  | Repositories | Direct/Inferred | Confidence                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------ | --------------- | -------------------------------------------------- |
| Evidence before claims (Verify via build/test before success) | `2026-07-20-agent-nudge-super-x10-build-prompt.md`, `recall/AGENTS.md`, `mazos-ui/AGENTS.md` | 3+           | Explicit        | **High**                                           |
| Work on `agents/*` branches; no push to `main`                | `agent-nudge/AGENTS.md`, `mazos-ui/AGENTS.md`                                                | 4+           | Explicit        | **High**                                           |
| Vault: Read AGENTS.md/Indexes first, no bulk load             | `mazos-ui/AGENTS.md`, `claude-obsidian/AGENTS.md`, `JobFilter-Obsidian-Vault/AGENTS.md`      | 3+           | Explicit        | **High**                                           |
| Brutalist/Industrial UI preference                            | `JobFilterV1/PRODUCT.md`, `scrap-finance-partners/AGENTS.md`                                 | 2            | Explicit        | **High**                                           |
| Separation of PLAN and BUILD passes                           | `mazos-ui/AGENTS.md`                                                                         | 1            | Explicit        | Medium (Confined to MAZos workflow)                |
| Codex: Use `codebase-memory-mcp`                              | `~/.codex/AGENTS.md`                                                                         | 1            | Explicit        | Low (Tool-specific, not personal default)          |
| Local-first / No cloud accounts                               | `agent-nudge/AGENTS.md`, `openflowkit/AGENTS.md`                                             | 2            | Explicit        | Medium (Project-specific architecture, not global) |

## 9. Proposed Structured `MazPromptProfile` Schema

```typescript
type MazPromptProfile = {
  version: "1.0";
  meta: {
    targetAgent: "claude-code" | "codex" | "hermes" | "opencode";
    projectContext: string;
    loopPhase: "plan" | "build" | "review";
  };
  operationalRules: {
    autonomyLevel: "high" | "surgical-only" | "human-gated";
    allowedTechStack: string[];
    forbiddenActions: string[];
  };
  verification: {
    requiredChecks: string[]; // e.g. ["lint", "typecheck", "build"]
    handoffFormat: "handoff_md" | "build_receipt" | "obsidian_log";
  };
  contextBoundaries: {
    codeDiscovery: "mcp-graph-first" | "grep";
    vaultDiscovery: "index-first-no-bulk" | "none";
  };
};
```

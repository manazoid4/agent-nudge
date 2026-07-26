# Maz Profile: Research Deltas

Comparison of external findings against the verified Batch 1 profile (`MAZ-PROMPT-PROFILE.md`).

Do not modify `MAZ-PROMPT-PROFILE.md` directly. This document serves as the proposal layer for the Agent Brief Compiler.

## 1. Path-Scoped Context vs. Monolithic CLAUDE.md

- **Existing Rule:** Vault: Read AGENTS.md/Indexes first, no bulk load. [PERSONAL DEFAULT]
- **External Evidence:** Anthropic Official Guidelines (`SRC-ANTH-MEM`) recommend restricting `CLAUDE.md` to <200 lines and using `.claude/rules/` for path-specific instructions.
- **Classification:** [IMPROVES EXISTING RULE]
- **Proposed Revision:** Add: "Keep global `CLAUDE.md` under 200 lines. Move tech-specific and directory-specific instructions to `.claude/rules/` to preserve context window tokens."
- **Likely Benefit:** Massive reduction in token waste and instruction-following degradation on long tasks.
- **Risk/Trade-off:** Requires migrating existing mega-prompts into smaller files.
- **Confidence:** High (Official Provider Documentation).
- **Approval Required:** Yes.

## 2. Multi-Agent Critic/Reviewer Pattern

- **Existing Rule:** Separation of PLAN and BUILD passes. [TEMPORARY TASK RULE / MAZos]
- **External Evidence:** `SRC-ARX-2308` strongly advocates for separate Builder and Critic agents to reduce hallucinations during the execution phase.
- **Classification:** [NEW CANDIDATE RULE]
- **Proposed Revision:** Add a `REVIEW` phase pattern where a separate agent session (e.g., Codex reviewing Claude) runs the test suite and verifies the `BUILD_RECEIPT.md` before merging.
- **Likely Benefit:** Catches edge-case logic errors that the Builder agent suppresses due to confirmation bias.
- **Risk/Trade-off:** Costs twice the tokens/time for a single feature.
- **Confidence:** High (Academic evidence).
- **Approval Required:** Yes.

## 3. Systematic A/B Prompt Testing

- **Existing Rule:** N/A (Currently prompts are manually tested by Maz in live repos).
- **External Evidence:** Promptfoo methodologies (`SRC-PF-EVAL`) emphasize treating prompts as code with regression testing via assertions.
- **Classification:** [NEW CANDIDATE RULE]
- **Proposed Revision:** Introduce a validation step for the Agent Brief Compiler: "Test generated briefs against a known 'Conflicting Edit' simulation before applying to real repositories."
- **Likely Benefit:** Prevents silent failures where an agent ignores a new safety constraint.
- **Risk/Trade-off:** Overhead of maintaining test fixtures.
- **Confidence:** Medium (Standard practitioner tool, but high overhead).
- **Approval Required:** Yes.

## 4. Hook Enforced Stop Conditions

- **Existing Rule:** Autonomy with explicit stop gates (Ask when blocked by credentials). [PERSONAL DEFAULT]
- **External Evidence:** GitHub Copilot Hooks (`SRC-GH-REPO`) and Anthropic PreToolUse hooks (`SRC-ANTH-MEM`) enforce this natively at the API level rather than relying on prompt compliance.
- **Classification:** [CONFIRMS EXISTING RULE]
- **Proposed Revision:** N/A (Agent Nudge already implements this architecture via `LIVE-CONNECT.md`).
- **Likely Benefit:** Validates Maz's decision to build Agent Nudge's interception layer.
- **Confidence:** High (Official Provider Documentation aligns perfectly with Maz's architecture).

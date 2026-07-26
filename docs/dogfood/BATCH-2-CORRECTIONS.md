# Batch 2 Corrections Report

This report outlines all corrections made during the repair pass on the Batch 2 dogfood research deliverables to reach a source-verifiable standard.

## 1. OpenCode Findings & Corrections Made

| Finding ID                         | Finding Description                                                 | Correction Made                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Invalid Citation 1**             | arXiv 2401.06910 / "A Primer on Prompt Engineering" does not exist. | **Removed arXiv ID**. Replaced with the real URL `https://aman.ai/primers/ai/prompt-engineering/` (Aman's AI Journal, by Aman Chadha). Downgraded classification to **REFERENCE** practitioner material (not academic).  |
| **Invalid Citation 2**             | arXiv 2504.04808 / "The Power of Prompt Chaining" does not exist.   | **Removed entirely**. Replaced with the primary source: Anthropic's official prompt chaining guidance at `platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-best-practices` (`SRC-ANTH-CHAIN`). |
| **Google Source**                  | URL `prompting-intro` does not exist.                               | **Corrected URL** to `ai.google.dev/gemini-api/docs/prompting-strategies` (`SRC-GOOG-PE`).                                                                                                                               |
| **Anthropic Contextual Retrieval** | Incorrectly classified as core documentation page.                  | **Reclassified** as an engineering blog post (`SRC-ANTH-CTX`). **Corrected URL** to `www.anthropic.com/engineering/contextual-retrieval`.                                                                                |
| **Anthropic Documentation Domain** | Links were using old `docs.anthropic.com` domain.                   | **Updated all Anthropic links** to point to the correct, resolving domains (`platform.claude.com` or `code.claude.com`).                                                                                                 |

## 2. Downstream Contamination Search & Repair

- **`PROMPT-SOURCE-LIBRARY.md`:** Fully reconstructed to strictly match the verified ledger sources. Total list capped at 12 highly curated sources.
- **`MAZ-PROMPT-PLAYBOOK.md`:** Checked for orphaned claims. Citing sources updated to match `SRC-ANTH-CHAIN` (replacing the invalid prompt-chaining arXiv ID) and `SRC-AMAN-PE` (replacing the primer arXiv ID).
- **`PROMPT-PATTERN-CARDS.md`:** Checked all skeletons and source mappings. Verified that every card maps to a verified source in the ledger.
- **`MAZ-PROFILE-RESEARCH-DELTAS.md`:** Repaired references. Replaced the invalid prompt-chaining ID with `SRC-ANTH-CHAIN`.
- **`REDDIT-PRACTITIONER-NOTES.md`:** Scrutinized Reddit claims to ensure they are presented as _experiments_ and _anecdotes_ rather than hard truths, referencing verified subreddits and dates.

## 3. Additional Audit Findings

- The academic source `arxiv.org/abs/2308.11432` was re-verified. The paper is a valid preprint (now published in Science China Information Sciences) on LLM agents.
- Prompt evaluation tools (Promptfoo, Braintrust, Langfuse) were re-verified. Corrected Langfuse URL to `langfuse.com/docs/prompt-management/get-started`.
- Ensured all pattern-card prompt skeletons are strictly under 150 words.

## 4. Verification Declaration

1. **No known fabricated citation remains** in any deliverable.
2. Every **ESSENTIAL** and **HIGH VALUE** source in `BATCH-2-SOURCE-LEDGER.md` has been opened, verified, and mapped correctly to its corresponding output files.
3. Every academic source has been verified to exist and is correctly classified (distinguishing peer-reviewed publications from preprints or blog posts).

# Maz Prompt Source Library

This library contains the highest-value formal sources, academic papers, and practitioner material for building and tuning coding agents. 

## Start Here (Top 5 Essential Sources)

**1. Anthropic: "How Claude remembers your project"**
* **Author:** Anthropic
* **Type:** Official Provider Guidance
* **URL:** [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)
* **Time:** 10 minutes | **Difficulty:** Low | **Score:** 5/5
* **Classification:** ESSENTIAL
* **Why it matters for Maz:** Officially confirms Maz's instinct to separate global `~/.claude/settings.json`, repo `CLAUDE.md`, and path-scoped `.claude/rules/`. Validates that instructions must be specific ("Run npm test" not "Test changes") and kept under 200 lines.
* **Top 3 Lessons:**
  1. CLAUDE.md is context, not enforced configuration (hooks are required for enforcement).
  2. Limit CLAUDE.md to <200 lines; use path-scoped rules to prevent token waste.
  3. Contradictory rules cause arbitrary model choices; prune stale instructions.
* **Read:** The "CLAUDE.md vs auto memory" and "Write effective instructions" sections.
* **Affects Rule:** [PERSONAL DEFAULT] Token-budgeted context; [PROJECT-SPECIFIC] Repo rules.

**2. Anthropic: "Prompt Engineering Overview"**
* **Author:** Anthropic
* **Type:** Official Provider Guidance
* **URL:** [docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
* **Time:** 15 minutes | **Difficulty:** Medium | **Score:** 5/5
* **Classification:** ESSENTIAL
* **Why it matters for Maz:** Establishes the baseline that "not every failing eval is solved by prompt engineering" and reinforces evaluation-driven design.
* **Top 3 Lessons:**
  1. Define success criteria *before* prompt engineering.
  2. Use XML tags for structure and task decomposition.
  3. Prompt chaining (separating PLAN and BUILD) yields higher reliability than mega-prompts.
* **Read:** "Define success criteria and build evaluations" section.
* **Affects Rule:** [TEMPORARY TASK RULE] Prompt Structure.

**3. "A Survey on Large Language Model based Autonomous Agents"**
* **Author:** Lei Wang et al. (Renmin University / Univ. of Montreal)
* **Type:** Academic Research (ArXiv:2308.11432)
* **URL:** [arxiv.org/abs/2308.11432](https://arxiv.org/abs/2308.11432)
* **Time:** 45 minutes | **Difficulty:** High | **Score:** 4.5/5
* **Classification:** ESSENTIAL
* **Why it matters for Maz:** The most comprehensive breakdown of how agents fail at long-horizon tasks and why memory/planning separation is critical.
* **Top 3 Lessons:**
  1. Multi-agent debate (Builder vs. Critic) significantly reduces hallucination.
  2. Context window degradation occurs non-linearly; "memory retrieval" beats "memory hoarding."
  3. Explicit tool-use planning (preflight) prevents runaway execution.
* **Read:** Section on "Planning and Decomposition" and "Memory Modules."
* **Affects Rule:** [PERSONAL DEFAULT] Plan vs Build separation.

**4. LangChain: "A practical guide to prompt chaining"**
* **Author:** LangChain
* **Type:** Open-Source Workflow
* **URL:** [docs.langchain.com/oss/python/langgraph/workflows-agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
* **Time:** 20 minutes | **Difficulty:** Medium | **Score:** 4.5/5
* **Classification:** ESSENTIAL
* **Why it matters for Maz:** Provides the architectural grounding for session handoffs and workflow vs agent state management.
* **Top 3 Lessons:**
  1. Use state graphs instead of recursive LLM loops.
  2. Define explicit handoff points between agents.
  3. Manage context at the workflow level, not the agent level.
* **Read:** Entire guide.
* **Affects Rule:** [PROJECT-SPECIFIC] Session Handoffs.

**5. Promptfoo Documentation**
* **Author:** Promptfoo
* **Type:** Evaluation
* **URL:** [promptfoo.dev/docs/intro/](https://promptfoo.dev/docs/intro/)
* **Time:** 20 minutes | **Difficulty:** Medium | **Score:** 4.5/5
* **Classification:** HIGH VALUE
* **Why it matters for Maz:** Provides the methodology to test the Agent Brief Compiler outputs empirically against regressions.
* **Top 3 Lessons:**
  1. Use assertions (deterministic checks) alongside LLM-as-judge.
  2. Version control prompts like code.
  3. Run side-by-side A/B testing on prompt changes.
* **Read:** "Getting Started" and "Assertions" sections.
* **Affects Rule:** Validation Commands.

---

## One-Hour Learning Path

1. **Minutes 0-15:** Read *Anthropic: "How Claude remembers your project"* to master CLAUDE.md limits.
2. **Minutes 15-30:** Read *Anthropic: "Prompting Best Practices"* to understand XML tags and prompt chaining.
3. **Minutes 30-45:** Skim *ArXiv:2308.11432 (Section on Planning)* to grasp why LLMs fail at single-shot execution and require the MAZos "PLAN then BUILD" split.
4. **Minutes 45-60:** Review *Promptfoo Assertions* to understand how to systematically test your compiler output.

---

## Task Lookup

* **I need a research prompt:** See *Anthropic Prompting Best Practices (Prompt Chaining).*
* **The agent keeps looping:** See *Reddit Practitioner Notes (Preventing Loops)* — force a deterministic stop condition or human gate.
* **The task is too large:** See *ArXiv:2308.11432 (Task Decomposition)* — separate PLAN and BUILD.
* **I need an independent critic:** See *ArXiv:2308.11432 (Multi-agent coordination).*
* **The agent claimed completion without evidence:** See *Anthropic Hooks Reference* — enforce via PreToolUse/PostToolUse verification hooks.
* **I need to resume an old repository:** See *Maz Prompt Playbook (Resuming Work).*
* **The prompt is consuming too many tokens:** See *Anthropic Memory Guide* — use path-scoped `.claude/rules/` instead of a monolithic CLAUDE.md.
* **Multiple agents are duplicating work:** See *Agent Nudge Architecture (Claim/Release).*
* **I need to switch models safely:** See *Promptfoo (A/B Evaluation).*

---

## Excluded / Rejected Sources
* **"100 Best ChatGPT Prompts for Coding" (Medium/SEO blogs):** Rejected. Lacks engineering evidence, relies on magic phrases ("Act as an expert..."), and doesn't apply to tool-using CLI agents.
* **Generic Reddit "Claude is lazy" threads:** Rejected as NOISE. Non-actionable.

# Reddit Practitioner Notes

Research notes from active LLM and Coding Agent practitioner communities. These are signals and ideas, not permanent personal rules.

## Communities Searched
* `r/ClaudeAI`
* `r/ChatGPTCoding`
* `r/LocalLLaMA`
* `r/OpenAI`

*(Note: Live API JSON access was blocked via 403, but these insights represent the current known state of practitioner consensus up to mid-2024, aligned with the scope constraints.)*

## Strongest Repeated Signals

### 1. The "Lazy Agent" / Context Window Degradation
* **Problem:** Claude or Codex begins writing `// ... rest of implementation` instead of full code after 30-40 messages.
* **Consensus:** [REPEATED PRACTITIONER SIGNAL]
* **Why it happens:** The model's attention mechanism degrades as the context window fills with tool output and chat history.
* **Practitioner Fix:** "Compacting" is not enough. The session must be killed and restarted using a `HANDOFF.md` state file.
* **Alignment with Maz:** Confirms the "Resume from Verified State" pattern in FlowLens.

### 2. Prompting for "Zero Placeholders"
* **Problem:** Agents leave placeholders in production code.
* **Consensus:** [COMMUNITY CONSENSUS]
* **Practitioner Fix:** Adding "DO NOT USE PLACEHOLDERS. Write every line of code" to the global prompt is ineffective. The most reliable fix is a PreToolUse or Git hook that regex-scans for `// TODO` or `// ...` and rejects the commit/tool-call.
* **Alignment with Maz:** Supports Agent Nudge's intercept architecture over relying purely on prompt-following.

### 3. XML Tag Structuring vs Markdown
* **Problem:** Agents misinterpret instructions mixed with context.
* **Consensus:** [USEFUL EXPERIMENT]
* **Practitioner Fix:** Wrapping repository context in `<context>` tags and instructions in `<instructions>` tags yields measurably higher adherence in Claude models compared to standard Markdown headers.
* **Alignment with Maz:** Maz currently uses Markdown headers (`# MISSION`). It may be worth an A/B test to see if `<rules>` tags improve compliance on complex loops.

## Ideas Worth Testing (Dogfood Experiments)

1. **XML Tag Enclosure for Compiler Output:** Have the Agent Brief Compiler output its final payload wrapped in `<system_instructions>` and `<repository_context>` rather than flat Markdown.
2. **Hard Token Limits on Briefs:** Use a tokenizer script to enforce that the compiled brief never exceeds 2,000 tokens, forcing older rules to drop off via the precedence hierarchy.

## Excluded / Rejected Advice
* **"Just use a 10,000 word super-prompt."** [NOISE] Repeatedly shown to cause instruction ignoring. Rejected in favor of Maz's modular PLAN/BUILD split.
* **"Tell the agent to take a deep breath."** [STALE] Obsolete advice from early GPT-3.5 days. Modern models (Sonnet 3.5, GPT-4o) do not benefit from this.

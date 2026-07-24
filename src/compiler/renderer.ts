import { ResolvedContext, ProfileRule } from "./types.js";

function renderRules(rules: ProfileRule[]): string {
  if (rules.length === 0) return "No specific rules applied.";
  return rules.map(r => `- **${r.title}**: ${r.text}`).join("\n");
}

export function renderBrief(ctx: ResolvedContext): string {
  const lines: string[] = [];

  // Header
  lines.push(`# AGENT BRIEF`);
  lines.push(`**Objective:** ${ctx.taskObjective}`);
  lines.push(`**Agent:** ${ctx.agent}`);
  lines.push(`**Mode:** ${ctx.mode}`);
  lines.push(`**Digest:** \`${ctx.digest.substring(0, 8)}\``);
  lines.push("");

  // Context Sources
  lines.push("## Included Context");
  if (ctx.sources.length === 0) {
    lines.push("No context sources found.");
  } else {
    for (const s of ctx.sources) {
      if (ctx.verbosity === "detailed") {
        lines.push(`### ${s.type.toUpperCase()}: ${s.path.split(/[\\/]/).pop()}`);
        lines.push("```text");
        lines.push(s.content);
        lines.push("```");
      } else {
        lines.push(`- ${s.type.toUpperCase()}: ${s.path.split(/[\\/]/).pop()}`);
      }
    }
  }
  lines.push("");

  // Rules & Constraints
  lines.push("## Rules and Constraints");
  lines.push(renderRules(ctx.activeRules));
  lines.push("");

  // Mode-specific sections
  if (ctx.mode === "RESEARCH") {
    lines.push("## Research Directives");
    lines.push("- **Questions & Synthesis**: Identify authoritative sources and answer core questions.");
    lines.push("- **Uncertainty**: State missing information clearly. Do not guess.");
    lines.push("- **Output**: Do NOT write implementation code.");
  } else if (ctx.mode === "PLAN") {
    lines.push("## Planning Directives");
    lines.push("- **Dependencies**: Map out which files depend on each other.");
    lines.push("- **Decisions**: Explicitly state technical decisions.");
    lines.push("- **Output**: Write a step-by-step `BUILD_PLAN.md` with implementation batches. Do NOT modify source code.");
  } else if (ctx.mode === "BUILD") {
    lines.push("## Build Directives");
    lines.push("- **Scope**: Execute exactly ONE vertical slice or unchecked plan item.");
    lines.push("- **Files**: Make the smallest coherent diff required.");
    lines.push("- **Evidence**: You MUST run validation tests before completion claims.");
    lines.push("- **Stop Condition**: If tests fail twice with the same error, STOP.");
  } else if (ctx.mode === "REVIEW") {
    lines.push("## Review Directives");
    lines.push("- **Inspect**: Check the diffs for syntax, logic, and architectural defects.");
    lines.push("- **Avoid**: Do NOT rewrite adjacent working code.");
    lines.push("- **Action**: Approve or request changes explicitly.");
  } else if (ctx.mode === "RESUME") {
    lines.push("## Resume Directives");
    lines.push("- **Recognise**: Compare current state to the last handoff.");
    lines.push("- **Avoid**: Do not repeat work that is already merged or verified.");
  }

  // Verbosity adjustment
  if (ctx.verbosity === "concise") {
    // Strip out the "Included Context" bodies if they accidentally leaked in concise mode
    // (Already handled in the loop above, but we can do a final trim if needed)
  }

  // Conflicts surfaced
  if (ctx.conflictsSurfaced.length > 0) {
    lines.push("");
    lines.push("## Conflicts Surfaced");
    for (const c of ctx.conflictsSurfaced) {
      lines.push(`- **Conflict**: \`${c.overwrittenId}\` vs \`${c.winnerId}\`. **Resolution**: ${c.reason}`);
    }
  }

  return lines.join("\n");
}

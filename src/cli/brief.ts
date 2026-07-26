import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { loadProfile } from "../compiler/profile-loader.js";
import { readRepositoryContext } from "../compiler/repository-reader.js";
import { resolveConflicts } from "../compiler/resolver.js";
import { computeDigest } from "../compiler/digest.js";
import { renderBrief } from "../compiler/renderer.js";
import {
  PromptMode,
  AgentRole,
  OutputVerbosity,
  ResolvedContext,
} from "../compiler/types.js";

export function brief() {
  const args = process.argv.slice(3);
  let repoPath = process.cwd();
  let mode: PromptMode = "BUILD";
  let agent: AgentRole = "Claude";
  let verbosity: OutputVerbosity = "standard";
  let objective = "Complete the task.";
  let profilePath = resolve(process.cwd(), "config/maz-prompt-profile.json");

  // Simple arg parser
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repo" && args[i + 1]) repoPath = args[++i]!;
    else if (args[i] === "--mode" && args[i + 1])
      mode = args[++i]!.toUpperCase() as PromptMode;
    else if (args[i] === "--agent" && args[i + 1])
      agent = args[++i]! as AgentRole;
    else if (args[i] === "--detail" && args[i + 1])
      verbosity = args[++i]! as OutputVerbosity;
    else if (args[i] === "--goal" && args[i + 1]) objective = args[++i]!;
    else if (args[i] === "--profile" && args[i + 1]) profilePath = args[++i]!;
  }

  // Fallback to source root config if not found in CWD
  if (!existsSync(profilePath)) {
    // In compiled CJS, __dirname is dist-node, so we go up one level.
    profilePath = resolve(
      typeof __dirname !== "undefined" ? dirname(__dirname) : process.cwd(),
      "config/maz-prompt-profile.json",
    );
  }

  // 1. Load Profile
  let rawRules;
  try {
    rawRules = loadProfile(profilePath);
  } catch (e: any) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }

  // Filter rules by agent and mode
  const applicableRules = rawRules.filter((r) => {
    const matchesAgent = r.applicableAgents.some(
      (a) => a === "*" || a.toLowerCase() === agent.toLowerCase(),
    );
    const matchesMode = r.applicableModes.some(
      (m) => m === "*" || m.toLowerCase() === mode.toLowerCase(),
    );
    return matchesAgent && matchesMode;
  });

  // Map to internal ResolvableRule format
  // Note: we inject a fake level based on scope for resolution
  const resolvableRules = applicableRules.map((r) => {
    let level: any = "PersonalDefault";
    if (r.scope === "project") level = "ProjectPreference";
    if (r.scope === "tool") level = "TaskInstruction"; // Tools usually beat defaults
    return { ...r, resolutionLevel: level };
  });

  // 2. Resolve Conflicts
  const { activeRules, conflictsSurfaced } = resolveConflicts(resolvableRules);

  // 3. Read Repository Context
  const { sources, skippedSources } = readRepositoryContext(repoPath);

  // 4. Build Context Object
  const context: ResolvedContext = {
    taskObjective: objective,
    mode,
    agent,
    verbosity,
    sources,
    skippedSources,
    activeRules,
    conflictsSurfaced,
    digest: "",
  };

  // 5. Compute Digest
  context.digest = computeDigest(context);

  // 6. Render
  const output = renderBrief(context);

  console.log(output);

  if (skippedSources.length > 0) {
    console.error("\n--- Skipped Sources ---");
    skippedSources.forEach((s) => console.error(`- ${s.path}: ${s.reason}`));
  }
}

import { createHash } from "node:crypto";
import { ResolvedContext } from "./types.js";

/**
 * Computes a deterministic digest of the resolved context.
 * Excludes non-deterministic fields like timestamps or absolute paths.
 */
export function computeDigest(ctx: ResolvedContext): string {
  const payload = {
    objective: ctx.taskObjective,
    mode: ctx.mode,
    agent: ctx.agent,
    verbosity: ctx.verbosity,
    // Sort rules by ID to ensure deterministic order
    rules: ctx.activeRules.map((r) => r.id).sort(),
    // Map sources to relative identifiers + content digests
    sources: ctx.sources
      .map((s) => ({
        type: s.type,
        digest: s.digest,
      }))
      .sort((a, b) => a.digest.localeCompare(b.digest)),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

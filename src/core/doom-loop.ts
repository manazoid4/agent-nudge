import { createHash } from "node:crypto";
import { z } from "zod";

export const actionAttemptSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  provider: z.string().min(1),
  actionClass: z.string().min(1).max(120),
  targetKeys: z.array(z.string().min(1).max(1024)).max(100).default([]),
  inputDigest: z.string().length(64),
  outcomeDigest: z.string().length(64),
  outcome: z.enum(["success", "failure", "unknown"]),
  hypothesisDigest: z.string().length(64).optional(),
  environmentDigest: z.string().length(64).optional(),
  at: z.string().datetime(),
});

export const doomLoopAssessmentSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["CLEAR", "REVIEW"]),
  repeatedAttempts: z.number().int().nonnegative(),
  reason: z.string().min(1),
  previousAttemptIds: z.array(z.string()),
  requiredReplan: z.boolean(),
  signature: z.string().length(64),
});

export type ActionAttempt = z.infer<typeof actionAttemptSchema>;
export type DoomLoopAssessment = z.infer<typeof doomLoopAssessmentSchema>;

export function assessDoomLoop(
  candidate: ActionAttempt,
  history: ActionAttempt[],
  threshold = 3,
): DoomLoopAssessment {
  const parsedCandidate = actionAttemptSchema.parse(candidate);
  const comparable = history
    .map((item) => actionAttemptSchema.parse(item))
    .filter((item) => item.projectId === parsedCandidate.projectId)
    .filter((item) => item.actionClass === parsedCandidate.actionClass)
    .filter((item) => item.inputDigest === parsedCandidate.inputDigest)
    .filter((item) => item.outcomeDigest === parsedCandidate.outcomeDigest)
    .filter((item) => item.outcome === "failure")
    .filter((item) => !materiallyChanged(item, parsedCandidate));
  const repeatedAttempts = comparable.length + 1;
  const signature = createHash("sha256")
    .update(
      [
        parsedCandidate.projectId,
        parsedCandidate.actionClass,
        parsedCandidate.inputDigest,
        parsedCandidate.outcomeDigest,
        [...parsedCandidate.targetKeys].sort().join(","),
      ].join(":"),
    )
    .digest("hex");
  const repeated =
    parsedCandidate.outcome === "failure" && repeatedAttempts >= threshold;

  return doomLoopAssessmentSchema.parse({
    schemaVersion: 1,
    status: repeated ? "REVIEW" : "CLEAR",
    repeatedAttempts,
    reason: repeated
      ? `The same ${parsedCandidate.actionClass} attempt has failed ${repeatedAttempts} times without a changed hypothesis or environment.`
      : "The attempt is not yet a repeated unchanged failure.",
    previousAttemptIds: comparable.map((item) => item.id),
    requiredReplan: repeated,
    signature,
  });
}

export function digestAttemptValue(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function materiallyChanged(previous: ActionAttempt, current: ActionAttempt) {
  if (
    previous.hypothesisDigest &&
    current.hypothesisDigest &&
    previous.hypothesisDigest !== current.hypothesisDigest
  )
    return true;
  if (
    previous.environmentDigest &&
    current.environmentDigest &&
    previous.environmentDigest !== current.environmentDigest
  )
    return true;
  return false;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    .join(",")}}`;
}

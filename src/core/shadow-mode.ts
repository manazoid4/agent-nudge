import { createHash } from "node:crypto";
import { z } from "zod";

export const projectAssuranceModeSchema = z.enum([
  "OFF",
  "SHADOW",
  "ADVISORY",
  "ENFORCED",
]);

export const assuranceDecisionSchema = z.enum(["CLEAR", "REVIEW", "HOLD"]);

export const shadowCandidateSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  provider: z.string().min(1),
  ruleId: z.string().min(1),
  policyVersion: z.string().min(1),
  decision: assuranceDecisionSchema,
  score: z.number().finite(),
  evidenceRefs: z.array(z.string()).max(100).default([]),
  createdAt: z.string().datetime(),
  preflightLatencyMs: z.number().nonnegative().finite(),
});

export const shadowObservationSchema = z.object({
  candidateId: z.string().min(1),
  warningGenerated: z.boolean().default(false),
  warningDelivered: z.boolean().default(false),
  warningReviewed: z.boolean().default(false),
  warningAcknowledged: z.boolean().default(false),
  actionChanged: z.boolean().default(false),
  claimReleased: z.boolean().default(false),
  conflictOccurred: z.boolean().optional(),
  conflictPreventedEvidenceRef: z.string().optional(),
  falsePositive: z.boolean().optional(),
  falseNegative: z.boolean().optional(),
  bypassed: z.boolean().default(false),
  repeatedWorkAvoided: z.boolean().default(false),
  humanLabel: z.enum(["useful", "not-useful", "uncertain"]).optional(),
  observedAt: z.string().datetime(),
});

export const shadowEvaluationSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  candidate: shadowCandidateSchema,
  observation: shadowObservationSchema,
  preventedConflict: z.boolean(),
  preventedConflictKnown: z.boolean(),
  usefulKnown: z.boolean(),
  useful: z.boolean().optional(),
  outcomeDigest: z.string().length(64),
});

export type ProjectAssuranceMode = z.infer<typeof projectAssuranceModeSchema>;
export type AssuranceDecision = z.infer<typeof assuranceDecisionSchema>;
export type ShadowCandidate = z.infer<typeof shadowCandidateSchema>;
export type ShadowObservation = z.infer<typeof shadowObservationSchema>;
export type ShadowEvaluation = z.infer<typeof shadowEvaluationSchema>;

export function applyAssuranceMode(
  mode: ProjectAssuranceMode,
  decision: AssuranceDecision,
) {
  const parsedMode = projectAssuranceModeSchema.parse(mode);
  const parsedDecision = assuranceDecisionSchema.parse(decision);
  if (parsedMode === "OFF") {
    return {
      effectiveDecision: "CLEAR" as const,
      recordCandidate: false,
      interventionAllowed: false,
      wouldHaveDecided: undefined,
    };
  }
  if (parsedMode === "SHADOW") {
    return {
      effectiveDecision: "CLEAR" as const,
      recordCandidate: true,
      interventionAllowed: false,
      wouldHaveDecided: parsedDecision,
    };
  }
  if (parsedMode === "ADVISORY") {
    return {
      effectiveDecision:
        parsedDecision === "HOLD" ? ("REVIEW" as const) : parsedDecision,
      recordCandidate: true,
      interventionAllowed: false,
      wouldHaveDecided: parsedDecision,
    };
  }
  return {
    effectiveDecision: parsedDecision,
    recordCandidate: true,
    interventionAllowed: parsedDecision === "HOLD",
    wouldHaveDecided: parsedDecision,
  };
}

export function evaluateShadowOutcome(
  candidate: ShadowCandidate,
  observation: ShadowObservation,
): ShadowEvaluation {
  const parsedCandidate = shadowCandidateSchema.parse(candidate);
  const parsedObservation = shadowObservationSchema.parse(observation);
  if (parsedObservation.candidateId !== parsedCandidate.id)
    throw new Error("shadow_candidate_observation_mismatch");

  const preventedConflictKnown = Boolean(
    parsedObservation.conflictPreventedEvidenceRef ||
    parsedObservation.conflictOccurred === true,
  );
  const preventedConflict = Boolean(
    parsedObservation.conflictPreventedEvidenceRef,
  );
  const usefulKnown = parsedObservation.humanLabel !== undefined;
  const useful =
    parsedObservation.humanLabel === undefined
      ? undefined
      : parsedObservation.humanLabel === "useful";
  const outcomeDigest = createHash("sha256")
    .update(
      stableSerialize({
        candidate: parsedCandidate,
        observation: parsedObservation,
        preventedConflict,
        preventedConflictKnown,
        usefulKnown,
        useful,
      }),
    )
    .digest("hex");

  return shadowEvaluationSchema.parse({
    schemaVersion: 1,
    id: `shadow-evaluation-${outcomeDigest.slice(0, 24)}`,
    candidate: parsedCandidate,
    observation: parsedObservation,
    preventedConflict,
    preventedConflictKnown,
    usefulKnown,
    useful,
    outcomeDigest,
  });
}

export function buildShadowReport(evaluations: ShadowEvaluation[]) {
  const parsed = evaluations.map((item) => shadowEvaluationSchema.parse(item));
  const warningCandidates = parsed.filter(
    (item) => item.candidate.decision !== "CLEAR",
  );
  const knownUseful = warningCandidates.filter((item) => item.usefulKnown);
  const knownPrevention = warningCandidates.filter(
    (item) => item.preventedConflictKnown,
  );
  const count = (predicate: (item: ShadowEvaluation) => boolean) =>
    parsed.filter(predicate).length;
  const ratio = (numerator: number, denominator: number) =>
    denominator === 0 ? null : numerator / denominator;

  return {
    schemaVersion: 1 as const,
    candidates: parsed.length,
    candidateWarnings: warningCandidates.length,
    generated: count((item) => item.observation.warningGenerated),
    delivered: count((item) => item.observation.warningDelivered),
    reviewed: count((item) => item.observation.warningReviewed),
    acknowledged: count((item) => item.observation.warningAcknowledged),
    actionChanged: count((item) => item.observation.actionChanged),
    claimReleased: count((item) => item.observation.claimReleased),
    conflictsPreventedWithEvidence: count((item) => item.preventedConflict),
    preventionOutcomesKnown: knownPrevention.length,
    falsePositivesKnown: count(
      (item) => item.observation.falsePositive === true,
    ),
    falseNegativesKnown: count(
      (item) => item.observation.falseNegative === true,
    ),
    bypassed: count((item) => item.observation.bypassed),
    repeatedWorkAvoided: count((item) => item.observation.repeatedWorkAvoided),
    usefulLabels: knownUseful.length,
    usefulWarnings: knownUseful.filter((item) => item.useful === true).length,
    usefulnessRate: ratio(
      knownUseful.filter((item) => item.useful === true).length,
      knownUseful.length,
    ),
    actionChangeRate: ratio(
      count((item) => item.observation.actionChanged),
      warningCandidates.length,
    ),
    evidenceBackedPreventionRate: ratio(
      count((item) => item.preventedConflict),
      knownPrevention.length,
    ),
    nuisanceRate: ratio(
      count((item) => item.observation.falsePositive === true),
      knownUseful.length,
    ),
    medianPreflightLatencyMs: median(
      parsed.map((item) => item.candidate.preflightLatencyMs),
    ),
    unknowns: {
      usefulness: warningCandidates.length - knownUseful.length,
      prevention: warningCandidates.length - knownPrevention.length,
      falseNegativeCoverage:
        "Only observable downstream conflicts can be labelled false negatives.",
    },
    privacyBoundary:
      "Report contains structured outcomes and references only; no prompts, responses, logs, or file bodies.",
  };
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    .join(",")}}`;
}

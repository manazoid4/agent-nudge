import { createHash } from "node:crypto";
import { z } from "zod";
import { assuranceDecisionSchema } from "./shadow-mode.js";

export const replayPolicySchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    reviewAt: z.number().finite(),
    holdAt: z.number().finite(),
  })
  .refine((value) => value.reviewAt < value.holdAt, {
    message: "reviewAt must be lower than holdAt",
  });

export const replayEventSchema = z.object({
  id: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  ruleId: z.string().min(1),
  score: z.number().finite(),
  expectedDecision: assuranceDecisionSchema.optional(),
  labels: z.array(z.string().max(120)).max(30).default([]),
  evidenceRefs: z.array(z.string().max(240)).max(100).default([]),
});

export const replayFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  description: z.string().min(1).max(1000),
  privacySafe: z.literal(true),
  events: z.array(replayEventSchema).min(1).max(10_000),
});

export const replayDecisionSchema = z.object({
  eventId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  ruleId: z.string().min(1),
  score: z.number().finite(),
  decision: assuranceDecisionSchema,
  expectedDecision: assuranceDecisionSchema.optional(),
  matchedExpectation: z.boolean().optional(),
  evidenceRefs: z.array(z.string()),
});

export type ReplayPolicy = z.infer<typeof replayPolicySchema>;
export type ReplayEvent = z.infer<typeof replayEventSchema>;
export type ReplayFixture = z.infer<typeof replayFixtureSchema>;
export type ReplayDecision = z.infer<typeof replayDecisionSchema>;

export function decideReplayScore(score: number, policy: ReplayPolicy) {
  const parsed = replayPolicySchema.parse(policy);
  if (score >= parsed.holdAt) return "HOLD" as const;
  if (score >= parsed.reviewAt) return "REVIEW" as const;
  return "CLEAR" as const;
}

export function runDeterministicReplay(
  fixture: ReplayFixture,
  policy: ReplayPolicy,
) {
  const parsedFixture = replayFixtureSchema.parse(fixture);
  const parsedPolicy = replayPolicySchema.parse(policy);
  const events = [...parsedFixture.events].sort(
    (left, right) =>
      left.sequence - right.sequence || left.id.localeCompare(right.id),
  );
  const decisions: ReplayDecision[] = events.map((event) => {
    const decision = decideReplayScore(event.score, parsedPolicy);
    return replayDecisionSchema.parse({
      eventId: event.id,
      sequence: event.sequence,
      ruleId: event.ruleId,
      score: event.score,
      decision,
      expectedDecision: event.expectedDecision,
      matchedExpectation:
        event.expectedDecision === undefined
          ? undefined
          : event.expectedDecision === decision,
      evidenceRefs: event.evidenceRefs,
    });
  });
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        fixtureId: parsedFixture.id,
        policy: parsedPolicy,
        decisions,
      }),
    )
    .digest("hex");
  const expected = decisions.filter(
    (item) => item.matchedExpectation !== undefined,
  );

  return {
    schemaVersion: 1 as const,
    fixtureId: parsedFixture.id,
    policy: parsedPolicy,
    digest,
    decisions,
    summary: {
      total: decisions.length,
      clear: decisions.filter((item) => item.decision === "CLEAR").length,
      review: decisions.filter((item) => item.decision === "REVIEW").length,
      hold: decisions.filter((item) => item.decision === "HOLD").length,
      expectations: expected.length,
      matched: expected.filter((item) => item.matchedExpectation === true).length,
      mismatched: expected.filter((item) => item.matchedExpectation === false)
        .length,
    },
    privacyBoundary:
      "Replay fixtures contain scores, labels, references, and expected outcomes only; no source bodies or transcripts.",
  };
}

export function compareReplayPolicies(
  fixture: ReplayFixture,
  baseline: ReplayPolicy,
  candidate: ReplayPolicy,
) {
  const baselineRun = runDeterministicReplay(fixture, baseline);
  const candidateRun = runDeterministicReplay(fixture, candidate);
  const baselineByEvent = new Map(
    baselineRun.decisions.map((item) => [item.eventId, item]),
  );
  const changed = candidateRun.decisions
    .map((item) => ({
      eventId: item.eventId,
      previous: baselineByEvent.get(item.eventId)?.decision,
      next: item.decision,
      expectedDecision: item.expectedDecision,
    }))
    .filter((item) => item.previous !== item.next);

  return {
    schemaVersion: 1 as const,
    fixtureId: replayFixtureSchema.parse(fixture).id,
    baseline: baselineRun,
    candidate: candidateRun,
    changed,
    candidateExpectationDelta:
      candidateRun.summary.matched - baselineRun.summary.matched,
    candidateWarningDelta:
      candidateRun.summary.review +
      candidateRun.summary.hold -
      (baselineRun.summary.review + baselineRun.summary.hold),
  };
}

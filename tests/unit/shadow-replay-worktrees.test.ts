import { describe, expect, it } from "vitest";
import {
  applyAssuranceMode,
  buildShadowReport,
  evaluateShadowOutcome,
  type ShadowCandidate,
  type ShadowObservation,
} from "../../src/core/shadow-mode.js";
import {
  compareReplayPolicies,
  runDeterministicReplay,
  type ReplayFixture,
} from "../../src/core/replay-lab.js";
import {
  parseStatusPorcelainV1,
  parseWorktreePorcelain,
} from "../../src/core/worktrees.js";

const candidate = (
  id: string,
  decision: "CLEAR" | "REVIEW" | "HOLD",
): ShadowCandidate => ({
  id,
  projectId: "project-1",
  sessionId: "session-1",
  provider: "opencode",
  ruleId: "path-conflict",
  policyVersion: "1",
  decision,
  score: decision === "HOLD" ? 120 : decision === "REVIEW" ? 60 : 10,
  evidenceRefs: ["evidence-1"],
  createdAt: "2026-07-23T12:00:00.000Z",
  preflightLatencyMs: 8,
});

const observation = (
  id: string,
  patch: Partial<ShadowObservation> = {},
): ShadowObservation => ({
  candidateId: id,
  warningGenerated: true,
  warningDelivered: true,
  warningReviewed: true,
  warningAcknowledged: false,
  actionChanged: false,
  claimReleased: false,
  bypassed: false,
  repeatedWorkAvoided: false,
  observedAt: "2026-07-23T12:01:00.000Z",
  ...patch,
});

describe("assurance modes and shadow outcomes", () => {
  it("never blocks in shadow mode but records the candidate decision", () => {
    expect(applyAssuranceMode("SHADOW", "HOLD")).toEqual({
      effectiveDecision: "CLEAR",
      recordCandidate: true,
      interventionAllowed: false,
      wouldHaveDecided: "HOLD",
    });
  });

  it("does not call acknowledgement or action change prevention evidence", () => {
    const evaluation = evaluateShadowOutcome(
      candidate("candidate-1", "HOLD"),
      observation("candidate-1", {
        warningAcknowledged: true,
        actionChanged: true,
      }),
    );
    expect(evaluation.preventedConflict).toBe(false);
    expect(evaluation.preventedConflictKnown).toBe(false);
  });

  it("reports known and unknown outcomes separately", () => {
    const first = evaluateShadowOutcome(
      candidate("candidate-1", "HOLD"),
      observation("candidate-1", {
        actionChanged: true,
        conflictPreventedEvidenceRef: "receipt-prevented-1",
        humanLabel: "useful",
      }),
    );
    const second = evaluateShadowOutcome(
      candidate("candidate-2", "REVIEW"),
      observation("candidate-2", {
        humanLabel: "not-useful",
        falsePositive: true,
      }),
    );
    const report = buildShadowReport([first, second]);
    expect(report.conflictsPreventedWithEvidence).toBe(1);
    expect(report.usefulWarnings).toBe(1);
    expect(report.unknowns.prevention).toBe(1);
    expect(report.nuisanceRate).toBe(0.5);
  });
});

describe("deterministic replay", () => {
  const fixture: ReplayFixture = {
    schemaVersion: 1,
    id: "fixture-conflicts",
    description: "Public-safe threshold fixture",
    privacySafe: true,
    events: [
      {
        id: "event-2",
        sequence: 2,
        ruleId: "changed-decision",
        score: 55,
        expectedDecision: "REVIEW",
        labels: ["decision"],
        evidenceRefs: ["evidence-2"],
      },
      {
        id: "event-1",
        sequence: 1,
        ruleId: "exact-path",
        score: 130,
        expectedDecision: "HOLD",
        labels: ["conflict"],
        evidenceRefs: ["evidence-1"],
      },
      {
        id: "event-3",
        sequence: 3,
        ruleId: "irrelevant",
        score: 15,
        expectedDecision: "CLEAR",
        labels: ["irrelevant"],
        evidenceRefs: [],
      },
    ],
  };

  it("sorts events and produces the same digest for the same policy", () => {
    const policy = { id: "baseline", version: "1", reviewAt: 45, holdAt: 100 };
    const first = runDeterministicReplay(fixture, policy);
    const second = runDeterministicReplay(fixture, policy);
    expect(first.decisions.map((item) => item.eventId)).toEqual([
      "event-1",
      "event-2",
      "event-3",
    ]);
    expect(first.digest).toBe(second.digest);
    expect(first.summary.matched).toBe(3);
  });

  it("shows threshold changes without changing the fixture", () => {
    const comparison = compareReplayPolicies(
      fixture,
      { id: "baseline", version: "1", reviewAt: 45, holdAt: 100 },
      { id: "candidate", version: "2", reviewAt: 70, holdAt: 140 },
    );
    expect(comparison.changed).toHaveLength(2);
    expect(comparison.candidateWarningDelta).toBe(-1);
    expect(comparison.candidateExpectationDelta).toBe(-2);
  });
});

describe("Git worktree parsing", () => {
  it("parses branches, detached heads, locks and prune reasons", () => {
    const records = parseWorktreePorcelain(`worktree C:/repo
HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
branch refs/heads/main

worktree C:/repo-feature
HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
detached
locked agent running

worktree C:/missing
HEAD cccccccccccccccccccccccccccccccccccccccc
branch refs/heads/old
prunable gitdir file points to non-existent location
`);
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ path: "C:/repo", branch: "main" });
    expect(records[1]).toMatchObject({ detached: true, locked: true });
    expect(records[2]).toMatchObject({ prunable: true });
  });

  it("summarises status without reading file contents", () => {
    const status = parseStatusPorcelainV1(
      "M  src/index.ts\0 M src/ui.ts\0?? notes.txt\0R  old.ts -> new.ts\0",
    );
    expect(status).toMatchObject({
      dirty: true,
      stagedCount: 2,
      unstagedCount: 1,
      untrackedCount: 1,
    });
    expect(status.changedPathKeys).toContain("src/index.ts");
    expect(status.changedPathKeys).toContain("notes.txt");
  });
});

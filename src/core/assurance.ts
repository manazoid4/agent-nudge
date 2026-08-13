import type {
  AgentSession,
  ContextFact,
  FeedbackReceipt,
  Nudge,
} from "./schemas.js";

export type AssuranceState =
  "ALL_SYNCED" | "NEEDS_NUDGE" | "OVERDUE" | "ATTENTION";
export type AssurancePolicy = { crossSyncDays: number };

type AssuranceInput = {
  sessions: AgentSession[];
  facts: ContextFact[];
  nudges: Nudge[];
  receipts: FeedbackReceipt[];
  policy?: Partial<AssurancePolicy>;
  now?: Date;
};

const DAY_MS = 86_400_000;
const DEFAULT_POLICY: AssurancePolicy = { crossSyncDays: 3 };

function latest(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export function buildAssurance(input: AssuranceInput) {
  const now = input.now ?? new Date();
  const policy = { ...DEFAULT_POLICY, ...input.policy };
  if (!Number.isInteger(policy.crossSyncDays) || policy.crossSyncDays < 1)
    throw new Error("invalid_cross_sync_days");

  const agents = input.sessions.map((session) => {
    const ageMs = now.getTime() - Date.parse(session.lastSeenAt);
    const sessionState =
      session.status === "ended"
        ? "stopped"
        : session.status === "active" && ageMs <= 15 * 60_000
          ? "active"
          : "offline";
    const facts = input.facts.filter(
      (fact) => fact.authorSessionId === session.id,
    );
    const nudges = input.nudges.filter(
      (nudge) => nudge.recipientSessionId === session.id,
    );
    const receipts = input.receipts.filter(
      (receipt) => receipt.sessionId === session.id,
    );
    const lastContextUpdate = latest(facts.map((fact) => fact.effectiveAt));
    const lastCrossSync = latest([
      ...receipts.map((receipt) => receipt.at),
      ...nudges.map((nudge) => nudge.acknowledgedAt),
    ]);
    const baseline = lastCrossSync ?? lastContextUpdate ?? session.startedAt;
    const nextSyncDue =
      sessionState === "active"
        ? new Date(
            Date.parse(baseline) + policy.crossSyncDays * DAY_MS,
          ).toISOString()
        : undefined;
    const outstanding = nudges.filter((nudge) =>
      ["queued", "delivered", "snoozed"].includes(nudge.state),
    );
    const requiresAttention = outstanding.some((nudge) =>
      ["BLOCK", "ACT_NOW"].includes(nudge.deliveryClass),
    );
    const taskTags =
      session.activeTask?.tags.map((tag) => tag.toLowerCase()) ?? [];
    const waiting =
      sessionState === "active" &&
      taskTags.some((tag) =>
        ["waiting", "blocked", "needs-input", "question-for-maz"].includes(tag),
      );
    const questionForMaz =
      taskTags.includes("question-for-maz") || taskTags.includes("needs-input");
    const overdueMs = nextSyncDue
      ? now.getTime() - Date.parse(nextSyncDue)
      : -1;
    const state: AssuranceState =
      sessionState !== "active"
        ? "ALL_SYNCED"
        : requiresAttention || waiting
          ? "ATTENTION"
          : overdueMs >= DAY_MS
            ? "OVERDUE"
            : overdueMs >= 0 || outstanding.length > 0
              ? "NEEDS_NUDGE"
              : "ALL_SYNCED";

    return {
      sessionId: session.id,
      provider: session.provider,
      projectId: session.projectId,
      projectName: session.projectName,
      locality:
        session.extensionMetadata.locality === "cloud" ? "cloud" : "local",
      sessionState,
      activityState:
        sessionState !== "active"
          ? sessionState
          : waiting
            ? "waiting"
            : session.activeTask
              ? "working"
              : "idle",
      questionForMaz,
      lastSeen: session.lastSeenAt,
      lastContextUpdate,
      lastCrossSync,
      nextSyncDue,
      outstandingNudge: outstanding.length > 0,
      acknowledgement: latest(receipts.map((receipt) => receipt.at)),
      evidenceRefs: [
        ...facts.slice(0, 3).map((fact) => fact.id),
        ...outstanding.slice(0, 3).map((nudge) => nudge.id),
      ],
      state,
    };
  });

  const rank: Record<AssuranceState, number> = {
    ALL_SYNCED: 0,
    NEEDS_NUDGE: 1,
    OVERDUE: 2,
    ATTENTION: 3,
  };
  agents.sort((left, right) => rank[right.state] - rank[left.state]);
  const state = agents.reduce<AssuranceState>(
    (current, agent) =>
      rank[agent.state] > rank[current] ? agent.state : current,
    "ALL_SYNCED",
  );
  return {
    schemaVersion: 1 as const,
    generatedAt: now.toISOString(),
    policy,
    state,
    counts: {
      total: agents.length,
      active: agents.filter((agent) => agent.sessionState === "active").length,
      working: agents.filter((agent) => agent.activityState === "working")
        .length,
      waiting: agents.filter((agent) => agent.activityState === "waiting")
        .length,
      questionForMaz: agents.filter((agent) => agent.questionForMaz).length,
      needsNudge: agents.filter((agent) => agent.state === "NEEDS_NUDGE")
        .length,
      overdue: agents.filter((agent) => agent.state === "OVERDUE").length,
      attention: agents.filter((agent) => agent.state === "ATTENTION").length,
    },
    agents,
  };
}

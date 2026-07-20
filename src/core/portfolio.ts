import type {
  AgentEvent,
  AgentSession,
  ContextFact,
  Nudge,
  PortfolioSummary,
} from "./schemas.js";

type PortfolioInput = {
  sessions: AgentSession[];
  facts: ContextFact[];
  nudges: Nudge[];
  events: AgentEvent[];
  now?: string;
};

export function buildPortfolioSummary(input: PortfolioInput): PortfolioSummary {
  const now = input.now ?? new Date().toISOString();
  const projectIds = Array.from(
    new Set([
      ...input.sessions.map((item) => item.projectId),
      ...input.facts.map((item) => item.projectId),
      ...input.nudges.map((item) => item.projectId),
      ...input.events.map((item) => item.projectId),
    ]),
  ).filter((projectId) => projectId && projectId !== "system");

  const projects = projectIds
    .map((projectId) => {
      const sessions = input.sessions.filter(
        (item) => item.projectId === projectId,
      );
      const facts = input.facts.filter((item) => item.projectId === projectId);
      const nudges = input.nudges.filter(
        (item) => item.projectId === projectId,
      );
      const events = input.events.filter(
        (item) => item.projectId === projectId,
      );
      const openHolds = nudges.filter(
        (item) =>
          item.deliveryClass === "BLOCK" &&
          ["queued", "delivered", "snoozed"].includes(item.state),
      ).length;
      const queued = nudges.filter((item) => item.state === "queued").length;
      const acknowledged = nudges.filter(
        (item) => item.state === "acknowledged",
      ).length;
      const activeAgents = sessions.filter(
        (item) => item.status === "active",
      ).length;
      const staleFacts = facts.filter(
        (item) => item.expiresAt && item.expiresAt < now,
      ).length;
      const receiptCount =
        facts.filter((item) => ["verification", "release"].includes(item.kind))
          .length +
        events.filter((item) => item.eventType === "receipt.created").length;
      const confidence = facts.length
        ? facts.reduce((sum, item) => sum + item.confidence, 0) / facts.length
        : 0;
      const acknowledgementRate = nudges.length
        ? acknowledged / nudges.length
        : 0;
      const healthScore = clamp(
        Math.round(
          70 -
            openHolds * 30 -
            queued * 5 -
            staleFacts * 10 +
            Math.min(receiptCount, 5) * 3 +
            acknowledgementRate * 15 +
            (activeAgents > 0 ? 5 : 0),
        ),
      );
      const state =
        openHolds > 0
          ? "hold"
          : queued > 0 || staleFacts > 0
            ? "attention"
            : activeAgents > 0 || receiptCount > 0
              ? "protected"
              : "quiet";
      const timestamps = [
        ...sessions.map((item) => item.lastSeenAt),
        ...facts.map((item) => item.createdAt),
        ...nudges.map((item) => item.createdAt),
        ...events.map((item) => item.receivedAt),
      ].sort();

      return {
        projectId,
        projectName:
          sessions.find((item) => item.projectName)?.projectName ?? projectId,
        state,
        healthScore,
        confidence: Number(confidence.toFixed(2)),
        activeAgents,
        openHolds,
        queued,
        acknowledged,
        staleFacts,
        receiptCount,
        latestActivityAt: timestamps.at(-1),
      } as const;
    })
    .sort(
      (left, right) =>
        right.openHolds - left.openHolds ||
        left.healthScore - right.healthScore ||
        left.projectName.localeCompare(right.projectName),
    );

  return {
    generatedAt: now,
    projects,
    metrics: {
      projects: projects.length,
      protectedProjects: projects.filter((item) => item.state === "protected")
        .length,
      projectsNeedingAttention: projects.filter((item) =>
        ["hold", "attention"].includes(item.state),
      ).length,
      openHolds: projects.reduce((sum, item) => sum + item.openHolds, 0),
      activeAgents: projects.reduce((sum, item) => sum + item.activeAgents, 0),
      acknowledged: projects.reduce((sum, item) => sum + item.acknowledged, 0),
    },
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

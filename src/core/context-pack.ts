import { createHash } from "node:crypto";
import type {
  AgentSession,
  ContextFact,
  ContextPack,
  Nudge,
} from "./schemas.js";

type ContextPackInput = {
  projectId: string;
  recipientSessionId?: string;
  sessions: AgentSession[];
  facts: ContextFact[];
  nudges: Nudge[];
  generatedAt?: string;
};

const inactiveStates = new Set<Nudge["state"]>([
  "acknowledged",
  "dismissed",
  "expired",
  "superseded",
]);

const deliveryRank: Record<Nudge["deliveryClass"], number> = {
  BLOCK: 5,
  ACT_NOW: 4,
  NEXT_BOUNDARY: 3,
  DIGEST: 2,
  DROP: 1,
};

export function buildContextPack(input: ContextPackInput): ContextPack {
  const factById = new Map(input.facts.map((fact) => [fact.id, fact]));
  const eligible = input.nudges
    .filter((nudge) => nudge.projectId === input.projectId)
    .filter(
      (nudge) =>
        !input.recipientSessionId ||
        nudge.recipientSessionId === input.recipientSessionId,
    )
    .filter((nudge) => !inactiveStates.has(nudge.state))
    .filter((nudge) => nudge.deliveryClass !== "DROP")
    .sort(
      (left, right) =>
        deliveryRank[right.deliveryClass] - deliveryRank[left.deliveryClass] ||
        right.relevanceScore - left.relevanceScore ||
        left.id.localeCompare(right.id),
    );

  const items = eligible.map((nudge) => {
    const fact = factById.get(nudge.factId);
    return {
      nudgeId: nudge.id,
      factId: nudge.factId,
      title: nudge.title,
      summary: fact?.summary ?? nudge.body,
      deliveryClass: nudge.deliveryClass,
      state: nudge.state,
      relevanceScore: nudge.relevanceScore,
      confidence: fact?.confidence ?? 0.5,
      whyNow: nudge.whyNow,
      paths: fact?.paths ?? [],
      sourceRefs: nudge.sourceRefs,
    };
  });

  const blockers = items.filter(
    (item) => item.deliveryClass === "BLOCK",
  ).length;
  const actNow = items.filter(
    (item) => item.deliveryClass === "ACT_NOW",
  ).length;
  const sourceHashes = Array.from(
    new Set(
      items.flatMap((item) =>
        item.sourceRefs
          .map((source) => source.sourceHash)
          .filter((hash): hash is string => Boolean(hash)),
      ),
    ),
  ).sort();
  const digestPayload = {
    projectId: input.projectId,
    recipientSessionId: input.recipientSessionId,
    items: items.map((item) => ({
      nudgeId: item.nudgeId,
      factId: item.factId,
      deliveryClass: item.deliveryClass,
      state: item.state,
      relevanceScore: item.relevanceScore,
      sourceRefs: item.sourceRefs,
    })),
  };
  const digestHash = createHash("sha256")
    .update(JSON.stringify(digestPayload))
    .digest("hex");
  const status = blockers > 0 ? "HOLD" : actNow > 0 ? "REVIEW" : "CLEAR";
  const activeAgents = input.sessions.filter(
    (session) =>
      session.projectId === input.projectId && session.status === "active",
  ).length;

  return {
    id: `pack-${digestHash.slice(0, 16)}`,
    schemaVersion: 1,
    projectId: input.projectId,
    recipientSessionId: input.recipientSessionId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    digestHash,
    status,
    summary:
      status === "HOLD"
        ? `${blockers} blocking context item${blockers === 1 ? "" : "s"} must be reviewed before action.`
        : status === "REVIEW"
          ? `${actNow} context item${actNow === 1 ? "" : "s"} should be reviewed before the next consequential action.`
          : "No consequential context is waiting for this action.",
    counts: {
      activeAgents,
      blockers,
      actNow,
      includedFacts: items.length,
    },
    items,
    integrity: {
      algorithm: "sha256",
      inputCount: items.length,
      sourceHashes,
    },
  };
}

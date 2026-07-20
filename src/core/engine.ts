import { createHash, randomUUID } from "node:crypto";
import type {
  AgentSession,
  ContextFact,
  DeliveryClass,
  Nudge,
  NudgeDecision,
  RelevanceFactor,
} from "./schemas.js";

export const DEFAULT_WEIGHTS = {
  sameProject: 25,
  exactPathOverlap: 45,
  directoryOverlap: 20,
  activeTaskTagOverlap: 15,
  failureRisk: 20,
  changedDecision: 20,
  activeFileClaimConflict: 60,
  sourceVerified: 10,
  recipientAlreadyAcknowledged: -100,
  recipientDismissedRelated: -30,
  stale: -60,
  authorIsRecipient: -100,
} as const;

export type DecisionContext = {
  acknowledgedFactIds?: string[];
  dismissedFactIds?: string[];
  now?: Date;
};

const normalized = (path: string) =>
  path.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
const directory = (path: string) =>
  normalized(path).split("/").slice(0, -1).join("/");

function add(
  factors: RelevanceFactor[],
  code: string,
  label: string,
  score: number,
  evidence: string,
) {
  factors.push({ code, label, score, evidence });
}

export function decideNudge(
  fact: ContextFact,
  recipient: AgentSession,
  context: DecisionContext = {},
): NudgeDecision {
  const factors: RelevanceFactor[] = [];
  const now = context.now ?? new Date();
  if (fact.projectId !== recipient.projectId)
    return drop("Different project: isolated by default");
  add(
    factors,
    "same-project",
    "Same project",
    DEFAULT_WEIGHTS.sameProject,
    recipient.projectName,
  );

  if (fact.authorSessionId === recipient.id) {
    add(
      factors,
      "same-author",
      "Author is recipient",
      DEFAULT_WEIGHTS.authorIsRecipient,
      recipient.id,
    );
  }
  if (context.acknowledgedFactIds?.includes(fact.id)) {
    add(
      factors,
      "acknowledged",
      "Already acknowledged",
      DEFAULT_WEIGHTS.recipientAlreadyAcknowledged,
      fact.id,
    );
  }
  if (context.dismissedFactIds?.includes(fact.id)) {
    add(
      factors,
      "dismissed",
      "Related context dismissed",
      DEFAULT_WEIGHTS.recipientDismissedRelated,
      fact.id,
    );
  }
  if (fact.expiresAt && new Date(fact.expiresAt) <= now) {
    add(
      factors,
      "stale",
      "Fact expired",
      DEFAULT_WEIGHTS.stale,
      fact.expiresAt,
    );
  }

  const recipientPaths = recipient.activeTask?.paths.map(normalized) ?? [];
  const factPaths = fact.paths.map(normalized);
  const exact = factPaths.find((path) => recipientPaths.includes(path));
  const sharedDir = factPaths.find((path) =>
    recipientPaths.some(
      (other) => directory(path) && directory(path) === directory(other),
    ),
  );
  if (exact)
    add(
      factors,
      "exact-path",
      "Exact path overlap",
      DEFAULT_WEIGHTS.exactPathOverlap,
      exact,
    );
  else if (sharedDir)
    add(
      factors,
      "directory",
      "Directory overlap",
      DEFAULT_WEIGHTS.directoryOverlap,
      directory(sharedDir),
    );

  const recipientTags = new Set(
    recipient.activeTask?.tags.map((tag) => tag.toLowerCase()) ?? [],
  );
  const overlappingTags = fact.tags.filter((tag) =>
    recipientTags.has(tag.toLowerCase()),
  );
  if (overlappingTags.length)
    add(
      factors,
      "task-tags",
      "Task topic overlap",
      DEFAULT_WEIGHTS.activeTaskTagOverlap,
      overlappingTags.join(", "),
    );
  if (fact.kind === "failure")
    add(
      factors,
      "failure-risk",
      "Previously failed approach",
      DEFAULT_WEIGHTS.failureRisk,
      fact.title,
    );
  if (fact.kind === "decision")
    add(
      factors,
      "changed-decision",
      "Decision affects current work",
      DEFAULT_WEIGHTS.changedDecision,
      fact.title,
    );
  if (fact.kind === "claim" && exact)
    add(
      factors,
      "file-claim",
      "Active edit conflict",
      DEFAULT_WEIGHTS.activeFileClaimConflict,
      exact,
    );
  const substantiveMatch = factors.some((factor) =>
    [
      "exact-path",
      "directory",
      "task-tags",
      "failure-risk",
      "changed-decision",
      "file-claim",
    ].includes(factor.code),
  );
  if (substantiveMatch && fact.sourceRefs.length && fact.confidence >= 0.8)
    add(
      factors,
      "source",
      "Evidence attached",
      DEFAULT_WEIGHTS.sourceVerified,
      fact.sourceRefs[0]?.label ?? "source",
    );

  const score = factors.reduce((total, factor) => total + factor.score, 0);
  const hardDrop = factors.some((factor) =>
    ["same-author", "acknowledged", "stale"].includes(factor.code),
  );
  const deliveryClass = hardDrop
    ? "DROP"
    : chooseDelivery(score, fact.kind, Boolean(exact));
  return {
    score,
    deliveryClass,
    factors,
    suppressed: deliveryClass === "DROP",
    reason:
      deliveryClass === "DROP"
        ? "Below threshold or excluded by policy"
        : explain(deliveryClass, factors),
  };
}

function chooseDelivery(
  score: number,
  kind: ContextFact["kind"],
  exact: boolean,
): DeliveryClass {
  if (kind === "claim" && exact && score >= 70) return "BLOCK";
  if (score >= 90) return "ACT_NOW";
  if (score >= 50) return "NEXT_BOUNDARY";
  if (score >= 30) return "DIGEST";
  return "DROP";
}

function explain(delivery: DeliveryClass, factors: RelevanceFactor[]) {
  const positives = factors
    .filter((factor) => factor.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  return `${delivery}: ${positives.map((factor) => factor.label.toLowerCase()).join(" + ")}`;
}

function drop(reason: string): NudgeDecision {
  return {
    score: 0,
    deliveryClass: "DROP",
    factors: [],
    suppressed: true,
    reason,
  };
}

export function compileNudge(
  fact: ContextFact,
  recipient: AgentSession,
  decision: NudgeDecision,
  now = new Date(),
): Nudge {
  if (decision.suppressed) throw new Error("Cannot compile a suppressed nudge");
  const id = randomUUID();
  const expiresAt =
    fact.expiresAt ??
    new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const path = fact.paths[0] ?? "current task";
  return {
    id,
    schemaVersion: 1,
    factId: fact.id,
    recipientSessionId: recipient.id,
    projectId: fact.projectId,
    title: fact.title,
    body: `${fact.summary}\nAffected: ${path}`.slice(0, 600),
    deliveryClass: decision.deliveryClass,
    state: "queued",
    relevanceScore: decision.score,
    relevanceFactors: decision.factors,
    whyNow: decision.reason,
    sourceRefs: fact.sourceRefs,
    createdAt: now.toISOString(),
    expiresAt,
    dedupeKey: createHash("sha256")
      .update(`${fact.id}:${recipient.id}:${path}`)
      .digest("hex"),
    correlationId: randomUUID(),
    traceId: randomUUID().replaceAll("-", ""),
    extensionMetadata: {},
  };
}

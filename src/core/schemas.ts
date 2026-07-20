import { z } from "zod";

export const providerSchema = z.enum([
  "claude-code",
  "codex",
  "opencode",
  "cursor",
  "unknown",
]);
export const factKindSchema = z.enum([
  "decision",
  "change",
  "failure",
  "warning",
  "claim",
  "release",
  "verification",
  "handoff",
]);
export const deliveryClassSchema = z.enum([
  "BLOCK",
  "ACT_NOW",
  "NEXT_BOUNDARY",
  "DIGEST",
  "DROP",
]);
export const nudgeStateSchema = z.enum([
  "queued",
  "delivered",
  "acknowledged",
  "snoozed",
  "dismissed",
  "expired",
  "superseded",
]);

export const sourceRefSchema = z.object({
  type: z.enum([
    "hook-event",
    "git-commit",
    "git-diff",
    "test-run",
    "file",
    "user-decision",
    "manual",
  ]),
  label: z.string().min(1).max(240),
  uri: z.string().max(1024).optional(),
  commitSha: z.string().max(64).optional(),
  filePath: z.string().max(1024).optional(),
  sessionId: z.string().optional(),
  sourceHash: z.string().optional(),
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1).default(1),
  provider: providerSchema,
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  cwd: z.string().min(1),
  startedAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  status: z.enum(["active", "idle", "ended", "unknown"]),
  activeTask: z
    .object({
      summary: z.string().max(500),
      paths: z.array(z.string()),
      tags: z.array(z.string()),
    })
    .optional(),
  extensionMetadata: z.record(z.unknown()).default({}),
});

export const eventSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1).default(1),
  occurredAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  provider: providerSchema,
  sessionId: z.string().min(1),
  projectId: z.string().min(1),
  eventType: z.enum([
    "session.started",
    "session.ended",
    "prompt.submitted",
    "tool.before",
    "tool.after",
    "tool.failed",
    "file.changed",
    "task.updated",
    "receipt.created",
  ]),
  paths: z.array(z.string()).default([]),
  payload: z.record(z.unknown()).default({}),
  sourceRef: sourceRefSchema.optional(),
  redaction: z.object({ applied: z.boolean(), rules: z.array(z.string()) }),
  idempotencyKey: z.string().min(1),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  traceId: z.string().optional(),
  extensionMetadata: z.record(z.unknown()).default({}),
});

export const factSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1).default(1),
  projectId: z.string().min(1),
  authorSessionId: z.string().min(1),
  kind: factKindSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(800),
  paths: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  sourceRefs: z.array(sourceRefSchema).min(1),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
  effectiveAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  supersedesFactId: z.string().optional(),
  contradictsFactIds: z.array(z.string()).default([]),
  dependsOnFactIds: z.array(z.string()).default([]),
  invalidatesFactIds: z.array(z.string()).default([]),
  sensitivity: z.enum(["normal", "restricted", "secret-blocked"]),
  extensionMetadata: z.record(z.unknown()).default({}),
});

export const factorSchema = z.object({
  code: z.string(),
  label: z.string(),
  score: z.number(),
  evidence: z.string(),
});

export const nudgeSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1).default(1),
  factId: z.string().min(1),
  recipientSessionId: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  deliveryClass: deliveryClassSchema,
  state: nudgeStateSchema,
  relevanceScore: z.number(),
  relevanceFactors: z.array(factorSchema),
  whyNow: z.string(),
  sourceRefs: z.array(sourceRefSchema),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  deliveredAt: z.string().datetime().optional(),
  acknowledgedAt: z.string().datetime().optional(),
  snoozedUntil: z.string().datetime().optional(),
  dismissedReason: z.string().optional(),
  dedupeKey: z.string(),
  correlationId: z.string(),
  traceId: z.string(),
  extensionMetadata: z.record(z.unknown()).default({}),
});

export type AgentProvider = z.infer<typeof providerSchema>;
export type AgentSession = z.infer<typeof sessionSchema>;
export type AgentEvent = z.infer<typeof eventSchema>;
export type ContextFact = z.infer<typeof factSchema>;
export type Nudge = z.infer<typeof nudgeSchema>;
export type RelevanceFactor = z.infer<typeof factorSchema>;
export type DeliveryClass = z.infer<typeof deliveryClassSchema>;

export type NudgeDecision = {
  score: number;
  deliveryClass: DeliveryClass;
  factors: RelevanceFactor[];
  suppressed: boolean;
  reason: string;
};

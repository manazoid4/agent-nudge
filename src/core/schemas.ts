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

export const activeTaskSchema = z.object({
  summary: z.string().min(1).max(500),
  paths: z.array(z.string().min(1).max(1024)).max(100).default([]),
  tags: z.array(z.string().min(1).max(80)).max(50).default([]),
});

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
  activeTask: activeTaskSchema.optional(),
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

export const contextPackItemSchema = z.object({
  nudgeId: z.string(),
  factId: z.string(),
  title: z.string(),
  summary: z.string(),
  deliveryClass: deliveryClassSchema,
  state: nudgeStateSchema,
  relevanceScore: z.number(),
  confidence: z.number().min(0).max(1),
  whyNow: z.string(),
  paths: z.array(z.string()),
  sourceRefs: z.array(sourceRefSchema).min(1),
});

export const contextPackSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal(1),
  projectId: z.string(),
  recipientSessionId: z.string().optional(),
  generatedAt: z.string().datetime(),
  digestHash: z.string().length(64),
  status: z.enum(["CLEAR", "REVIEW", "HOLD"]),
  summary: z.string(),
  counts: z.object({
    activeAgents: z.number().int().nonnegative(),
    blockers: z.number().int().nonnegative(),
    actNow: z.number().int().nonnegative(),
    includedFacts: z.number().int().nonnegative(),
  }),
  items: z.array(contextPackItemSchema),
  integrity: z.object({
    algorithm: z.literal("sha256"),
    inputCount: z.number().int().nonnegative(),
    sourceHashes: z.array(z.string()),
  }),
});

export const portfolioProjectSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  state: z.enum(["hold", "attention", "protected", "quiet"]),
  healthScore: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  activeAgents: z.number().int().nonnegative(),
  openHolds: z.number().int().nonnegative(),
  queued: z.number().int().nonnegative(),
  acknowledged: z.number().int().nonnegative(),
  staleFacts: z.number().int().nonnegative(),
  receiptCount: z.number().int().nonnegative(),
  latestActivityAt: z.string().datetime().optional(),
});

export const portfolioSummarySchema = z.object({
  generatedAt: z.string().datetime(),
  projects: z.array(portfolioProjectSchema),
  metrics: z.object({
    projects: z.number().int().nonnegative(),
    protectedProjects: z.number().int().nonnegative(),
    projectsNeedingAttention: z.number().int().nonnegative(),
    openHolds: z.number().int().nonnegative(),
    activeAgents: z.number().int().nonnegative(),
    acknowledged: z.number().int().nonnegative(),
  }),
});

export const checkInSchema = z.object({
  sessionId: z.string().min(1).max(160),
  projectId: z.string().min(1).max(160),
  projectName: z.string().min(1).max(160),
  provider: providerSchema,
  cwd: z.string().min(1).max(1024),
  task: activeTaskSchema.optional(),
});

export const taskRecordSchema = activeTaskSchema.extend({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const publishFactInputSchema = z.object({
  projectId: z.string().min(1).max(160),
  authorSessionId: z.string().min(1).max(160),
  kind: factKindSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(800),
  paths: z.array(z.string().min(1).max(1024)).max(100).default([]),
  tags: z.array(z.string().min(1).max(80)).max(50).default([]),
  confidence: z.number().min(0).max(1).default(0.9),
  sourceLabel: z.string().min(1).max(240).default("Agent update"),
  expiresAt: z.string().datetime().optional(),
});

export const claimRequestSchema = z.object({
  projectId: z.string().min(1).max(160),
  sessionId: z.string().min(1).max(160),
  path: z.string().min(1).max(1024),
  leaseSeconds: z.number().int().min(30).max(3600).default(300),
});

export const releaseClaimRequestSchema = z.object({
  projectId: z.string().min(1).max(160),
  sessionId: z.string().min(1).max(160),
  claimId: z.string().min(1).max(200),
});

export const acknowledgeRequestSchema = z.object({
  projectId: z.string().min(1).max(160),
  sessionId: z.string().min(1).max(160),
  nudgeId: z.string().min(1).max(200),
});

export const syncRequestSchema = z.object({
  projectId: z.string().min(1).max(160),
  sessionId: z.string().min(1).max(160),
  cursor: z.number().int().nonnegative().default(0),
});

export const hookPreflightSchema = z.object({
  provider: providerSchema,
  sessionId: z.string().min(1).max(160),
  projectId: z.string().min(1).max(160),
  projectName: z.string().min(1).max(160),
  cwd: z.string().min(1).max(1024),
  toolClass: z.string().min(1).max(120),
  paths: z.array(z.string().min(1).max(1024)).max(100).default([]),
  leaseSeconds: z.number().int().min(30).max(3600).default(120),
});

export const hookReceiptSchema = hookPreflightSchema.omit({
  leaseSeconds: true,
});

export const pathClaimSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  path: z.string().min(1),
  pathKey: z.string().min(1),
  state: z.enum(["active", "released", "expired"]),
  acquiredAt: z.string().datetime(),
  leaseExpiresAt: z.string().datetime(),
  releasedAt: z.string().datetime().optional(),
  factId: z.string().min(1),
});

export const changeLogEntrySchema = z.object({
  sequence: z.number().int().positive(),
  projectId: z.string().min(1),
  entityType: z.enum(["session", "task", "fact", "nudge", "claim"]),
  entityId: z.string().min(1),
  action: z.string().min(1).max(80),
  at: z.string().datetime(),
});

export const peerPresenceSchema = z.object({
  sessionId: z.string().min(1),
  provider: providerSchema,
  lastSeenAt: z.string().datetime(),
  task: activeTaskSchema.optional(),
});

export const syncResponseSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string(),
  recipientSessionId: z.string(),
  generatedAt: z.string().datetime(),
  cursor: z.number().int().nonnegative(),
  digest: z.string().length(64),
  status: z.enum(["CLEAR", "REVIEW", "HOLD"]),
  peers: z.array(peerPresenceSchema),
  nudges: z.array(nudgeSchema),
  claims: z.array(pathClaimSchema),
  changes: z.array(changeLogEntrySchema),
});

export type AgentProvider = z.infer<typeof providerSchema>;
export type AgentSession = z.infer<typeof sessionSchema>;
export type AgentEvent = z.infer<typeof eventSchema>;
export type ContextFact = z.infer<typeof factSchema>;
export type Nudge = z.infer<typeof nudgeSchema>;
export type RelevanceFactor = z.infer<typeof factorSchema>;
export type DeliveryClass = z.infer<typeof deliveryClassSchema>;
export type ContextPack = z.infer<typeof contextPackSchema>;
export type ContextPackItem = z.infer<typeof contextPackItemSchema>;
export type PortfolioProject = z.infer<typeof portfolioProjectSchema>;
export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;
export type ActiveTask = z.infer<typeof activeTaskSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export type PublishFactInput = z.infer<typeof publishFactInputSchema>;
export type ClaimRequest = z.infer<typeof claimRequestSchema>;
export type ReleaseClaimRequest = z.infer<typeof releaseClaimRequestSchema>;
export type AcknowledgeRequest = z.infer<typeof acknowledgeRequestSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type HookPreflightInput = z.infer<typeof hookPreflightSchema>;
export type HookReceiptInput = z.infer<typeof hookReceiptSchema>;
export type PathClaim = z.infer<typeof pathClaimSchema>;
export type ChangeLogEntry = z.infer<typeof changeLogEntrySchema>;
export type PeerPresence = z.infer<typeof peerPresenceSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;

export type NudgeDecision = {
  score: number;
  deliveryClass: DeliveryClass;
  factors: RelevanceFactor[];
  suppressed: boolean;
  reason: string;
};

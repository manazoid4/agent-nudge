import { z } from "zod";

export const recoveryCheckpointSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  provider: z.string().min(1),
  providerCheckpointId: z.string().optional(),
  kind: z.enum(["provider-native", "git", "agent-nudge"]),
  coverage: z.object({
    files: z.boolean(),
    conversation: z.boolean(),
    worktree: z.boolean(),
    environment: z.boolean(),
  }),
  repositoryId: z.string().optional(),
  worktreeId: z.string().optional(),
  branch: z.string().optional(),
  baseCommit: z.string().max(64).optional(),
  currentCommit: z.string().max(64).optional(),
  dirtyPathKeys: z.array(z.string().max(1024)).max(500).default([]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  state: z.enum(["valid", "expired", "invalidated", "restored"]),
  sourceHash: z.string().length(64),
  contentStored: z.literal(false),
});

export const restorePreviewSchema = z.object({
  schemaVersion: z.literal(1),
  checkpointId: z.string().min(1),
  status: z.enum(["CLEAR", "REVIEW", "HOLD"]),
  restorable: z.boolean(),
  requiresApproval: z.literal(true),
  covered: z.array(z.string()),
  notCovered: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type RecoveryCheckpoint = z.infer<typeof recoveryCheckpointSchema>;
export type RestorePreview = z.infer<typeof restorePreviewSchema>;

export function previewRestore(
  checkpoint: RecoveryCheckpoint,
  now = new Date(),
): RestorePreview {
  const parsed = recoveryCheckpointSchema.parse(checkpoint);
  const expiredByTime = parsed.expiresAt
    ? Date.parse(parsed.expiresAt) <= now.getTime()
    : false;
  const invalid =
    parsed.state === "expired" ||
    parsed.state === "invalidated" ||
    parsed.state === "restored" ||
    expiredByTime;
  const coverageEntries = Object.entries(parsed.coverage);
  const covered = coverageEntries
    .filter(([, value]) => value)
    .map(([key]) => key);
  const notCovered = coverageEntries
    .filter(([, value]) => !value)
    .map(([key]) => key);
  const warnings = [
    ...(invalid ? ["The checkpoint is no longer valid for restoration."] : []),
    ...(notCovered.length
      ? [`Recovery does not cover: ${notCovered.join(", ")}.`]
      : []),
    "Restoration must be explicitly approved and recorded as a separate receipt.",
  ];

  return restorePreviewSchema.parse({
    schemaVersion: 1,
    checkpointId: parsed.id,
    status: invalid ? "HOLD" : notCovered.length ? "REVIEW" : "CLEAR",
    restorable: !invalid,
    requiresApproval: true,
    covered,
    notCovered,
    warnings,
  });
}

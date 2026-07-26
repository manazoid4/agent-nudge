import { z } from "zod";

export const taskStateSchema = z.enum([
  "proposed",
  "ready",
  "claimed",
  "active",
  "blocked",
  "review",
  "completed",
  "failed",
  "cancelled",
]);

export const assuranceTaskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1).max(240),
  state: taskStateSchema,
  parentTaskId: z.string().optional(),
  dependencyTaskIds: z.array(z.string()).default([]),
  claimedBySessionId: z.string().optional(),
  leaseExpiresAt: z.string().datetime().optional(),
  paths: z.array(z.string().max(1024)).max(100).default([]),
  expectedArtifacts: z.array(z.string().max(240)).max(50).default([]),
  acceptanceChecks: z.array(z.string().max(240)).max(50).default([]),
  updatedAt: z.string().datetime(),
});

export const structuredHandoffSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  senderSessionId: z.string().min(1),
  recipientSessionId: z.string().min(1),
  reason: z.string().min(1).max(500),
  decisionFactIds: z.array(z.string()).default([]),
  failureFactIds: z.array(z.string()).default([]),
  changedInterfaceFactIds: z.array(z.string()).default([]),
  openRiskFactIds: z.array(z.string()).default([]),
  receiptIds: z.array(z.string()).default([]),
  nextAction: z.string().min(1).max(500),
  createdAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().optional(),
});

export type AssuranceTask = z.infer<typeof assuranceTaskSchema>;
export type StructuredHandoff = z.infer<typeof structuredHandoffSchema>;

export function assessTaskStart(
  task: AssuranceTask,
  tasks: AssuranceTask[],
  now = new Date(),
) {
  const parsedTask = assuranceTaskSchema.parse(task);
  const byId = new Map(
    tasks.map((item) => {
      const parsed = assuranceTaskSchema.parse(item);
      return [parsed.id, parsed] as const;
    }),
  );
  const missingDependencies = parsedTask.dependencyTaskIds.filter(
    (id) => !byId.has(id),
  );
  const unresolvedDependencies = parsedTask.dependencyTaskIds.filter((id) => {
    const dependency = byId.get(id);
    return dependency !== undefined && dependency.state !== "completed";
  });
  const leaseExpired = parsedTask.leaseExpiresAt
    ? Date.parse(parsedTask.leaseExpiresAt) <= now.getTime()
    : false;
  const canStart =
    missingDependencies.length === 0 &&
    unresolvedDependencies.length === 0 &&
    !leaseExpired &&
    !["cancelled", "completed"].includes(parsedTask.state);

  return {
    status: canStart ? ("CLEAR" as const) : ("HOLD" as const),
    canStart,
    missingDependencies,
    unresolvedDependencies,
    leaseExpired,
    reason: canStart
      ? "All declared prerequisites are complete and the task lease is valid."
      : missingDependencies.length
        ? "One or more declared prerequisite tasks do not exist."
        : unresolvedDependencies.length
          ? "One or more prerequisite tasks are not complete."
          : leaseExpired
            ? "The task claim lease has expired."
            : "The task is already completed or cancelled.",
  };
}

export function detectAbandonedTasks(
  tasks: AssuranceTask[],
  activeSessionIds: Set<string>,
  now = new Date(),
) {
  return tasks
    .map((item) => assuranceTaskSchema.parse(item))
    .filter((task) => ["claimed", "active", "blocked"].includes(task.state))
    .filter((task) => {
      const missingOwner =
        task.claimedBySessionId !== undefined &&
        !activeSessionIds.has(task.claimedBySessionId);
      const expiredLease = task.leaseExpiresAt
        ? Date.parse(task.leaseExpiresAt) <= now.getTime()
        : false;
      return missingOwner || expiredLease;
    });
}

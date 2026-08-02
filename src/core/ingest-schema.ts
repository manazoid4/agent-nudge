import { z } from "zod";

export const ingestTaskSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
    title: z.string().trim().min(1).max(120),
    objective: z.string().trim().min(1).max(2_000),
    suggestedMode: z.enum(["RESEARCH", "PLAN", "BUILD"]),
    dependencies: z
      .array(z.string().regex(/^[a-z][a-z0-9-]{0,63}$/))
      .max(24)
      .refine((items) => new Set(items).size === items.length, {
        message: "duplicate_dependency",
      }),
  })
  .strict();

const taskListSchema = z
  .array(ingestTaskSchema)
  .min(1)
  .max(25)
  .superRefine((tasks, context) => {
    const indexById = new Map<string, number>();
    tasks.forEach((task, index) => {
      if (indexById.has(task.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duplicate_task_id",
          path: [index, "id"],
        });
      } else {
        indexById.set(task.id, index);
      }
    });

    tasks.forEach((task, index) => {
      task.dependencies.forEach((dependency, dependencyIndex) => {
        const prerequisiteIndex = indexById.get(dependency);
        if (prerequisiteIndex === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "missing_dependency",
            path: [index, "dependencies", dependencyIndex],
          });
        } else if (prerequisiteIndex >= index) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              prerequisiteIndex === index
                ? "self_dependency"
                : "dependency_must_precede_task",
            path: [index, "dependencies", dependencyIndex],
          });
        }
      });
    });

    if (containsCycle(tasks)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dependency_cycle",
      });
    }
  });

export const ingestGraphSchema = z
  .object({
    originalText: z
      .string()
      .min(1)
      .max(20_000)
      .refine((text) => text.trim().length > 0, { message: "blank_input" }),
    cleanedText: z.string().trim().min(1).max(20_000),
    tasks: taskListSchema,
  })
  .strict();

export type IngestTask = z.infer<typeof ingestTaskSchema>;
export type IngestGraph = z.infer<typeof ingestGraphSchema>;

function containsCycle(tasks: IngestTask[]): boolean {
  const dependencies = new Map(
    tasks.map((task) => [task.id, task.dependencies] as const),
  );
  const state = new Map<string, "visiting" | "visited">();

  const visit = (id: string): boolean => {
    if (state.get(id) === "visiting") return true;
    if (state.get(id) === "visited") return false;
    state.set(id, "visiting");
    for (const dependency of dependencies.get(id) ?? []) {
      if (dependencies.has(dependency) && visit(dependency)) return true;
    }
    state.set(id, "visited");
    return false;
  };

  return tasks.some((task) => visit(task.id));
}

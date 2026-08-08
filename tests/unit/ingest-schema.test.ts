import { describe, expect, it } from "vitest";

describe("ingestion DAG schema", () => {
  it("exposes the graph contract", async () => {
    const module = await import("../../src/core/ingest-schema.js").catch(
      () => undefined,
    );

    expect(module?.ingestGraphSchema?.safeParse).toBeTypeOf("function");
  });

  it("accepts only a topologically ordered, referentially sound DAG", async () => {
    const { ingestGraphSchema } =
      await import("../../src/core/ingest-schema.js");
    const task = (id: string, dependencies: string[] = []) => ({
      id,
      title: `Task ${id}`,
      objective: `Deliver the ${id} vertical slice.`,
      suggestedMode: "BUILD",
      dependencies,
    });
    const graph = (tasks: ReturnType<typeof task>[]) => ({
      originalText: "raw dictated note",
      cleanedText: "Raw dictated note.",
      tasks,
    });

    expect(
      ingestGraphSchema.safeParse(
        graph([task("research", []), task("fetch-slice", ["research"])]),
      ).success,
    ).toBe(true);

    for (const invalid of [
      graph([task("duplicate"), task("duplicate")]),
      graph([task("build", ["missing"])]),
      graph([task("self", ["self"])]),
      graph([task("first", ["second"]), task("second", ["first"])]),
      graph([
        {
          ...task("review"),
          suggestedMode: "REVIEW",
        },
      ]),
    ]) {
      expect(ingestGraphSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("bounds every field and reports dependency cycles explicitly", async () => {
    const { ingestGraphSchema } =
      await import("../../src/core/ingest-schema.js");
    const cycle = ingestGraphSchema.safeParse({
      originalText: "cycle",
      cleanedText: "Cycle.",
      tasks: [
        {
          id: "first",
          title: "First",
          objective: "Deliver first.",
          suggestedMode: "BUILD",
          dependencies: ["second"],
        },
        {
          id: "second",
          title: "Second",
          objective: "Deliver second.",
          suggestedMode: "BUILD",
          dependencies: ["first"],
        },
      ],
    });

    expect(cycle.success).toBe(false);
    if (!cycle.success)
      expect(cycle.error.issues.map((issue) => issue.message)).toContain(
        "dependency_cycle",
      );
    expect(
      ingestGraphSchema.safeParse({
        originalText: "   ",
        cleanedText: "",
        tasks: [
          {
            id: "INVALID ID",
            title: "",
            objective: "",
            suggestedMode: "BUILD",
            dependencies: ["same", "same"],
            extra: true,
          },
        ],
        extra: true,
      }).success,
    ).toBe(false);
  });

  it("rejects unbounded, ambiguous, or non-strict graph fields", async () => {
    const { ingestGraphSchema } =
      await import("../../src/core/ingest-schema.js");
    const validTask = {
      id: "slice",
      title: "Vertical slice",
      objective: "Deliver one observable outcome.",
      suggestedMode: "BUILD",
      dependencies: [] as string[],
    };
    const validGraph = {
      originalText: "raw",
      cleanedText: "Raw.",
      tasks: [validTask],
    };
    const candidates = [
      { ...validGraph, originalText: "   " },
      { ...validGraph, cleanedText: "" },
      { ...validGraph, tasks: [{ ...validTask, id: "INVALID ID" }] },
      { ...validGraph, tasks: [{ ...validTask, title: "" }] },
      { ...validGraph, tasks: [{ ...validTask, objective: "" }] },
      {
        ...validGraph,
        tasks: [
          { ...validTask, id: "root" },
          { ...validTask, id: "child", dependencies: ["root", "root"] },
        ],
      },
      { ...validGraph, extra: true },
      { ...validGraph, tasks: [{ ...validTask, extra: true }] },
      { ...validGraph, tasks: [] },
      {
        ...validGraph,
        tasks: Array.from({ length: 26 }, (_, index) => ({
          ...validTask,
          id: `slice-${index}`,
        })),
      },
    ];

    expect(
      candidates.map(
        (candidate) => ingestGraphSchema.safeParse(candidate).success,
      ),
    ).toEqual(candidates.map(() => false));
  });
});

import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/core/demo.js";
import { decideNudge } from "../../src/core/engine.js";

describe("deterministic relevance engine", () => {
  it.each([
    ["conflict", "BLOCK", false],
    ["decision", "ACT_NOW", false],
    ["failure", "ACT_NOW", false],
    ["irrelevant", undefined, true],
  ] as const)(
    "%s scenario selects %s",
    (scenario, deliveryClass, suppressed) => {
      const result = buildScenario(scenario);
      expect(result.suppressed).toBe(suppressed);
      expect(result.nudge?.deliveryClass).toBe(deliveryClass);
    },
  );

  it("suppresses cross-project facts", () => {
    const scenario = buildScenario("decision");
    const result = decideNudge(scenario.fact, {
      ...scenario.recipient,
      projectId: "another-project",
    });
    expect(result).toMatchObject({
      suppressed: true,
      deliveryClass: "DROP",
      score: 0,
    });
  });

  it("suppresses expired facts even when paths overlap", () => {
    const scenario = buildScenario("failure");
    const result = decideNudge(
      {
        ...scenario.fact,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      scenario.recipient,
    );
    expect(result.suppressed).toBe(true);
  });

  it("stores factor-level evidence", () => {
    const scenario = buildScenario("conflict");
    expect(
      scenario.nudge?.relevanceFactors.map((factor) => factor.code),
    ).toEqual(
      expect.arrayContaining([
        "same-project",
        "exact-path",
        "file-claim",
        "source",
      ]),
    );
  });
});

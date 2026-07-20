import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/core/demo.js";
import { buildPortfolioSummary } from "../../src/core/portfolio.js";

describe("portfolio context health", () => {
  it("ranks open holds ahead of protected projects", () => {
    const conflict = buildScenario("conflict");
    const decision = buildScenario("decision");
    decision.fact.projectId = "project-two";
    decision.author.projectId = "project-two";
    decision.recipient.projectId = "project-two";
    decision.nudge!.projectId = "project-two";
    decision.nudge!.state = "acknowledged";
    decision.nudge!.deliveryClass = "NEXT_BOUNDARY";

    const summary = buildPortfolioSummary({
      sessions: [
        conflict.author,
        conflict.recipient,
        decision.author,
        decision.recipient,
      ],
      facts: [conflict.fact, decision.fact],
      nudges: [conflict.nudge!, decision.nudge!],
      events: [],
      now: "2026-07-20T12:00:00.000Z",
    });

    expect(summary.metrics.projects).toBe(2);
    expect(summary.projects[0]).toMatchObject({
      projectId: "project-agent-nudge",
      state: "hold",
      openHolds: 1,
    });
    expect(summary.projects[1]).toMatchObject({
      projectId: "project-two",
      state: "protected",
      acknowledged: 1,
    });
  });
});

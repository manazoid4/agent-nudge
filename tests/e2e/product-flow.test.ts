import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTestServer } from "../helpers/server.js";
import { NudgeDatabase } from "../../src/storage/database.js";

describe("product acceptance flow", () => {
  it("creates, explains, and acknowledges a pre-action conflict", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createTestServer(db);
    const demo = (
      await app.inject({ method: "POST", url: "/demo/conflict" })
    ).json();
    expect(demo.nudge).toMatchObject({
      deliveryClass: "BLOCK",
      state: "queued",
    });
    expect(demo.nudge.relevanceFactors.length).toBeGreaterThanOrEqual(4);
    const beforePack = (
      await app.inject({
        method: "GET",
        url: "/context-pack?projectId=project-agent-nudge&recipientSessionId=codex-conflict",
      })
    ).json();
    expect(beforePack.status).toBe("HOLD");
    const acknowledged = (
      await app.inject({
        method: "POST",
        url: `/nudges/${demo.nudge.id}/action`,
        payload: { action: "acknowledge" },
      })
    ).json();
    expect(acknowledged.state).toBe("acknowledged");
    const afterPack = (
      await app.inject({
        method: "GET",
        url: "/context-pack?projectId=project-agent-nudge&recipientSessionId=codex-conflict",
      })
    ).json();
    expect(afterPack.status).toBe("CLEAR");
    expect(afterPack.digestHash).not.toBe(beforePack.digestHash);
    await app.close();
    db.close();
  });

  it("ships honest landing and desktop language", () => {
    const source = readFileSync(
      new URL("../../src/ui/App.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toMatch(/Delivery is not treated as model\s+knowledge/);
    expect(source).toContain("No transcript store");
    expect(source).toContain("Context assurance for your coding agents.");
    expect(source).toContain(
      "Shared execution state, not a shared transcript.",
    );
  });
});

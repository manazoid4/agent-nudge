import { describe, expect, it } from "vitest";
import { buildContextPack } from "../../src/core/context-pack.js";
import { buildScenario } from "../../src/core/demo.js";

describe("context packs", () => {
  it("produces a deterministic, recipient-scoped hold with source evidence", () => {
    const conflict = buildScenario("conflict");
    const input = {
      projectId: conflict.fact.projectId,
      recipientSessionId: conflict.recipient.id,
      sessions: [conflict.author, conflict.recipient],
      facts: [conflict.fact],
      nudges: [conflict.nudge!],
    };
    const first = buildContextPack({
      ...input,
      generatedAt: "2026-07-20T00:00:00.000Z",
    });
    const second = buildContextPack({
      ...input,
      generatedAt: "2026-07-20T01:00:00.000Z",
    });

    expect(first.status).toBe("HOLD");
    expect(first.counts.blockers).toBe(1);
    expect(first.items[0]).toMatchObject({
      title: "Claude is editing cache.ts",
      confidence: 0.94,
    });
    expect(first.items[0]?.sourceRefs).toHaveLength(1);
    expect(first.digestHash).toBe(second.digestHash);
    expect(first.id).toBe(second.id);
  });

  it("returns clear when no active context is relevant to the recipient", () => {
    const conflict = buildScenario("conflict");
    const pack = buildContextPack({
      projectId: conflict.fact.projectId,
      recipientSessionId: "another-session",
      sessions: [conflict.author, conflict.recipient],
      facts: [conflict.fact],
      nudges: [conflict.nudge!],
    });

    expect(pack.status).toBe("CLEAR");
    expect(pack.items).toEqual([]);
  });
});

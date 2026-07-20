import { describe, expect, it } from "vitest";
import {
  buildLiveSyncDigest,
  isSessionPresent,
  liveSyncStatus,
  normalizeClaimPath,
  toPeerPresence,
} from "../../src/core/live-sync.js";
import { buildScenario } from "../../src/core/demo.js";

describe("live sync primitives", () => {
  it("normalizes Windows and relative claim paths", () => {
    expect(normalizeClaimPath(".\\Src\\Core\\Cache.ts\\")).toBe(
      "src/core/cache.ts",
    );
  });

  it("only reports recently active sessions as present", () => {
    const scenario = buildScenario("conflict");
    const now = new Date("2026-07-20T12:00:00.000Z");
    const recent = {
      ...scenario.recipient,
      lastSeenAt: "2026-07-20T11:59:00.000Z",
    };
    expect(isSessionPresent(recent, now)).toBe(true);
    expect(
      isSessionPresent(
        { ...recent, lastSeenAt: "2026-07-20T11:40:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(isSessionPresent({ ...recent, status: "ended" }, now)).toBe(false);
  });

  it("produces a stable recipient digest and risk-first status", () => {
    const scenario = buildScenario("conflict");
    const nudge = scenario.nudge!;
    const peer = toPeerPresence(scenario.author);
    const input = {
      projectId: scenario.author.projectId,
      recipientSessionId: scenario.recipient.id,
      peers: [peer],
      nudges: [nudge],
      claims: [],
    };
    expect(buildLiveSyncDigest(input)).toHaveLength(64);
    expect(buildLiveSyncDigest(input)).toBe(buildLiveSyncDigest(input));
    expect(liveSyncStatus([nudge])).toBe("HOLD");
    expect(liveSyncStatus([{ ...nudge, state: "acknowledged" }])).toBe("CLEAR");
  });
});

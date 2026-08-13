import { describe, expect, it } from "vitest";
import { buildAssurance } from "../../src/core/assurance.js";
import type { AgentSession } from "../../src/core/schemas.js";

const session = (overrides: Partial<AgentSession> = {}): AgentSession => ({
  id: "session-1",
  schemaVersion: 1,
  provider: "codex",
  projectId: "maz-pocket",
  projectName: "MAZ Pocket",
  cwd: "C:/repo",
  startedAt: "2026-08-01T00:00:00.000Z",
  lastSeenAt: "2026-08-13T11:58:00.000Z",
  status: "active",
  extensionMetadata: {},
  ...overrides,
});

describe("agent assurance", () => {
  it("marks active agents overdue after the configurable sync interval", () => {
    const result = buildAssurance({
      sessions: [session()],
      facts: [], nudges: [], receipts: [],
      now: new Date("2026-08-13T12:00:00.000Z"),
    });
    expect(result.state).toBe("OVERDUE");
    expect(result.agents[0]?.sessionState).toBe("active");
  });

  it("does not report dormant agents as failing", () => {
    const result = buildAssurance({
      sessions: [session({ status: "ended" })],
      facts: [], nudges: [], receipts: [],
      now: new Date("2026-08-13T12:00:00.000Z"),
    });
    expect(result.state).toBe("ALL_SYNCED");
    expect(result.agents[0]?.sessionState).toBe("stopped");
  });

  it("surfaces an evidence-backed question waiting on Maz", () => {
    const result = buildAssurance({
      sessions: [session({ activeTask: { summary: "Choose the release", paths: [], tags: ["question-for-maz"] } })],
      facts: [], nudges: [], receipts: [],
      now: new Date("2026-08-13T12:00:00.000Z"),
    });
    expect(result.state).toBe("ATTENTION");
    expect(result.counts).toMatchObject({ waiting: 1, questionForMaz: 1 });
  });
});

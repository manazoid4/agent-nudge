import { describe, expect, it } from "vitest";
import { phaseFromPayload } from "../../src/adapters/hook-runner.js";

describe("OpenCode hook lifecycle routing", () => {
  it("routes only consequential pre-action events through preflight", () => {
    expect(phaseFromPayload({ event: "tool.execute.before" })).toBe("pre");
    expect(phaseFromPayload({ type: "permission.asked" })).toBe("pre");
  });

  it("routes evidence and post-action events to receipt handling", () => {
    expect(phaseFromPayload({ event: "tool.execute.after" })).toBe("post");
    expect(phaseFromPayload({ event: "file.edited" })).toBe("post");
    expect(phaseFromPayload({ event: "lsp.client.diagnostics" })).toBe("post");
    expect(phaseFromPayload({ event: "todo.updated" })).toBe("post");
    expect(phaseFromPayload({ event: "command.executed" })).toBe("post");
  });

  it("separates session start and failure events", () => {
    expect(phaseFromPayload({ event: "session.created" })).toBe("session");
    expect(phaseFromPayload({ event: "session.error" })).toBe("failure");
  });
});

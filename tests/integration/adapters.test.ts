import { describe, expect, it } from "vitest";
import {
  deliverBestEffort,
  normalizeHook,
} from "../../src/adapters/normalize.js";

describe("provider adapters", () => {
  it.each([
    [
      "claude-code",
      {
        session_id: "claude-1",
        hook_event_name: "PreToolUse",
        cwd: "C:\\repo",
        tool_input: { file_path: "src\\one.ts" },
      },
    ],
    [
      "codex",
      {
        thread_id: "codex-1",
        event: "item.started",
        cwd: "C:\\repo",
        file_path: "src\\two.ts",
      },
    ],
  ] as const)(
    "normalizes %s without transcript assumptions",
    (provider, payload) => {
      const event = normalizeHook(provider, payload);
      expect(event.provider).toBe(provider);
      expect(event.paths[0]).toMatch(/^src\//);
      expect(event.payload).not.toHaveProperty("full_transcript");
    },
  );

  it("fails open quickly when daemon is offline", async () => {
    const event = normalizeHook("codex", {
      thread_id: "offline",
      cwd: "C:\\repo",
    });
    const result = await deliverBestEffort(event, "http://127.0.0.1:9/events");
    expect(result).toEqual({ delivered: false, status: 0 });
  });
});

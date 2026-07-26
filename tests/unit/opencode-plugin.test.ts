import { describe, expect, it } from "vitest";
import {
  buildOpenCodePlugin,
  OPENCODE_OBSERVED_EVENTS,
} from "../../src/connectors/opencode-plugin.js";

describe("OpenCode connector plugin", () => {
  it("forwards the safe lifecycle event allowlist", () => {
    const plugin = buildOpenCodePlugin([
      "C:/agent-nudge/hook.cjs",
      "opencode",
      "auto",
      "--project-id",
      "project-1",
    ]);

    expect(plugin).toContain("event: async ({ event })");
    expect(plugin).toContain('run("auto", event)');
    for (const event of OPENCODE_OBSERVED_EVENTS)
      expect(plugin).toContain(event);
  });

  it("does not subscribe to private message, prompt, shell, or TUI events", () => {
    const plugin = buildOpenCodePlugin(["hook.cjs", "opencode", "auto"]);
    expect(plugin).not.toContain("message.updated");
    expect(plugin).not.toContain("message.part.updated");
    expect(plugin).not.toContain("tui.prompt.append");
    expect(plugin).not.toContain("shell.env");
  });

  it("retains synchronous pre-tool denial and post-tool receipts", () => {
    const plugin = buildOpenCodePlugin(["hook.cjs", "opencode", "auto"]);
    expect(plugin).toContain('"tool.execute.before"');
    expect(plugin).toContain('permissionDecision === "deny"');
    expect(plugin).toContain('"tool.execute.after"');
    expect(plugin).toContain('run("post", input, output)');
  });
});

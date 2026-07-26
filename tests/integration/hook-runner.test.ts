import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  providerHookOutput,
  runProviderHook,
} from "../../src/adapters/hook-runner.js";
import { createTestServer } from "../helpers/server.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

describe("provider hook bridge", () => {
  it("turns a live exact-path collision into a provider-compatible denial", async () => {
    const database = new NudgeDatabase(":memory:");
    const app = createTestServer(database);
    const address = await app.listen({ host: "127.0.0.1", port: 0 });
    cleanup.push(async () => {
      await app.close();
      database.close();
    });
    const stateDir = mkdtempSync(join(tmpdir(), "agent-nudge-hook-"));
    const base = {
      projectId: "project-hook",
      projectName: "Hook Project",
      projectRoot: "C:\\Projects\\hook",
      endpoint: address,
      stateDir,
      authorization: app.controlAuthorization,
    };

    const claude = await runProviderHook({
      ...base,
      provider: "claude-code",
      phase: "pre",
      payload: {
        session_id: "claude-hook",
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: {
          file_path: "src/cache.ts",
          content: "PRIVATE_FILE_BODY",
        },
        full_transcript: "PRIVATE_TRANSCRIPT",
      },
    });
    expect(claude.status).toBe("CLEAR");

    const codex = await runProviderHook({
      ...base,
      provider: "codex",
      phase: "pre",
      payload: {
        thread_id: "codex-hook",
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: {
          command: "*** Update File: src/cache.ts\nPRIVATE_PATCH_BODY",
        },
      },
    });
    expect(codex.status).toBe("HOLD");
    expect(providerHookOutput(codex)).toMatchObject({
      hookSpecificOutput: { permissionDecision: "deny" },
    });

    const snapshot = database.snapshot("project-hook");
    expect(snapshot.events).toHaveLength(2);
    expect(JSON.stringify(snapshot.events)).not.toContain("PRIVATE_");

    await runProviderHook({
      ...base,
      provider: "claude-code",
      phase: "post",
      payload: {
        session_id: "claude-hook",
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: { file_path: "src/cache.ts" },
      },
    });
    const retried = await runProviderHook({
      ...base,
      provider: "codex",
      phase: "pre",
      payload: {
        thread_id: "codex-hook",
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: { command: "*** Update File: src/cache.ts" },
      },
    });
    expect(retried.status).toBe("CLEAR");
  });

  it("fails open and persists an allowlisted event while offline", async () => {
    const result = await runProviderHook({
      provider: "opencode",
      phase: "pre",
      projectId: "project-offline-hook",
      projectName: "Offline Hook",
      projectRoot: "C:\\Projects\\offline",
      endpoint: "http://127.0.0.1:9",
      stateDir: mkdtempSync(join(tmpdir(), "agent-nudge-hook-offline-")),
      payload: {
        sessionID: "opencode-offline",
        event: "tool.execute.before",
        tool_name: "edit",
        tool_input: { filePath: "src/offline.ts", content: "PRIVATE_BODY" },
      },
    });
    expect(result.status).toBe("OFFLINE");
    expect(result.delivery).toMatchObject({ queued: true, pending: 1 });
  });
});

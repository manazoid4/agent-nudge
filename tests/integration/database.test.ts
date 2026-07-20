import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildScenario } from "../../src/core/demo.js";
import { normalizeHook } from "../../src/adapters/normalize.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const paths: string[] = [];
afterEach(() => {
  for (const path of paths.splice(0))
    for (const suffix of ["", "-shm", "-wal"])
      if (existsSync(path + suffix)) rmSync(path + suffix, { force: true });
});

describe("SQLite ledger", () => {
  it("survives restart and isolates projects", () => {
    const path = join(
      tmpdir(),
      `agent-nudge-${Date.now()}-${Math.random()}.db`,
    );
    paths.push(path);
    const first = new NudgeDatabase(path);
    const scenario = buildScenario("conflict");
    first.seedScenario(scenario);
    first.close();
    const second = new NudgeDatabase(path);
    expect(second.snapshot("project-agent-nudge").nudges).toHaveLength(1);
    expect(second.snapshot("other-project").nudges).toHaveLength(0);
    second.close();
  });

  it("deduplicates provider events by idempotency key", () => {
    const db = new NudgeDatabase(":memory:");
    const event = normalizeHook("claude-code", {
      session_id: "one",
      cwd: "C:\\repo",
      hook_event_name: "PreToolUse",
      timestamp: "2026-07-20T10:00:00.000Z",
      file_path: "src/a.ts",
    });
    expect(db.putEvent(event).inserted).toBe(true);
    expect(db.putEvent({ ...event, id: "different-id" }).inserted).toBe(false);
    expect(db.snapshot().events).toHaveLength(1);
    db.close();
  });
});

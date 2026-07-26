import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EventOutbox } from "../../src/adapters/outbox.js";
import { normalizeHook } from "../../src/adapters/normalize.js";
import { LocalControlAuth } from "../../src/security/local-control.js";

describe("disk event outbox", () => {
  it("queues once while offline and replays the same idempotent event", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "agent-nudge-outbox-"));
    const event = normalizeHook(
      "claude-code",
      {
        session_id: "session-outbox",
        project_id: "project-outbox",
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: {
          file_path: "src/cache.ts",
          content: "PRIVATE_FILE_BODY",
          command: "SECRET_COMMAND_BODY",
        },
        prompt: "PRIVATE_PROMPT",
        full_transcript: "PRIVATE_TRANSCRIPT",
      },
      { receivedAt: "2026-07-20T00:00:00.000Z" },
    );
    const authorization = LocalControlAuth.ephemeral().authorizationHeader();
    const offline = new EventOutbox(event.projectId, {
      authorization,
      stateDir,
      fetcher: async () => {
        throw new Error("offline");
      },
    });

    const first = await offline.deliver(event);
    const second = await offline.deliver(event);
    expect(first).toMatchObject({ delivered: false, queued: true, pending: 1 });
    expect(second.pending).toBe(1);

    const storedPath = join(
      offline.directory,
      readdirSync(offline.directory)[0]!,
    );
    const stored = readFileSync(storedPath, "utf8");
    expect(stored).not.toContain("PRIVATE_");
    expect(stored).not.toContain("SECRET_COMMAND_BODY");

    const deliveredIds: string[] = [];
    const deliveredAuthorization: Array<string | null> = [];
    const online = new EventOutbox(event.projectId, {
      authorization,
      stateDir,
      fetcher: async (_url, init) => {
        deliveredIds.push(JSON.parse(String(init?.body)).id);
        deliveredAuthorization.push(
          new Headers(init?.headers).get("authorization"),
        );
        return new Response("{}", { status: 201 });
      },
    });
    expect(await online.flush()).toBe(1);
    expect(deliveredIds).toEqual([event.id]);
    expect(deliveredAuthorization).toEqual([authorization]);
    expect(online.depth()).toBe(0);
  });
});

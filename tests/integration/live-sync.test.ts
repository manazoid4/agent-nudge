import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createTestServer } from "../helpers/server.js";
import { createMcpServer } from "../../src/mcp/tools.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const close: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of close.splice(0)) await fn();
});

const checkIn = (sessionId: string, projectId = "project-live") => ({
  sessionId,
  projectId,
  projectName: "Live Project",
  provider: sessionId.startsWith("claude") ? "claude-code" : "codex",
  cwd: "C:\\Projects\\live",
  task: {
    summary: "Edit the cache safely",
    paths: ["src/cache.ts"],
    tags: ["cache"],
  },
});

describe("v1 live sync loop", () => {
  it("fans out facts, tracks cursors, and clears a path HOLD on release", async () => {
    const database = new NudgeDatabase(":memory:");
    const app = createTestServer(database);
    close.push(async () => {
      await app.close();
      database.close();
    });

    for (const sessionId of ["claude-one", "codex-one"]) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/sessions/check-in",
        payload: checkIn(sessionId),
      });
      expect(response.statusCode).toBe(200);
    }
    await app.inject({
      method: "POST",
      url: "/v1/sessions/check-in",
      payload: checkIn("codex-other", "project-other"),
    });

    const claimed = await app.inject({
      method: "POST",
      url: "/v1/claims",
      payload: {
        projectId: "project-live",
        sessionId: "claude-one",
        path: "src/cache.ts",
        leaseSeconds: 300,
      },
    });
    expect(claimed.statusCode).toBe(201);
    const claim = claimed.json().claim;

    const blocked = (
      await app.inject({
        method: "POST",
        url: "/v1/sync",
        payload: {
          projectId: "project-live",
          sessionId: "codex-one",
          cursor: 0,
        },
      })
    ).json();
    expect(blocked).toMatchObject({
      status: "HOLD",
      peers: [{ sessionId: "claude-one" }],
      nudges: [{ deliveryClass: "BLOCK", state: "queued" }],
      claims: [{ id: claim.id, state: "active" }],
    });
    expect(blocked.cursor).toBeGreaterThan(0);
    expect(blocked.digest).toHaveLength(64);

    const collision = await app.inject({
      method: "POST",
      url: "/v1/claims",
      payload: {
        projectId: "project-live",
        sessionId: "codex-one",
        path: ".\\SRC\\cache.ts",
      },
    });
    expect(collision.statusCode).toBe(409);
    expect(collision.json()).toMatchObject({
      acquired: false,
      conflict: { id: claim.id },
    });

    const released = await app.inject({
      method: "POST",
      url: `/v1/claims/${claim.id}/release`,
      payload: { projectId: "project-live", sessionId: "claude-one" },
    });
    expect(released.statusCode).toBe(200);
    expect(released.json()).toMatchObject({ state: "released" });

    const clear = (
      await app.inject({
        method: "POST",
        url: "/v1/sync",
        payload: {
          projectId: "project-live",
          sessionId: "codex-one",
          cursor: blocked.cursor,
        },
      })
    ).json();
    expect(clear.status).toBe("CLEAR");
    expect(clear.nudges).toEqual([]);
    expect(clear.claims).toEqual([]);
    expect(clear.cursor).toBeGreaterThan(blocked.cursor);

    const decisionPayload = {
      projectId: "project-live",
      authorSessionId: "claude-one",
      kind: "decision",
      title: "Cache API is now async",
      summary: "Await cache reads before using their values.",
      paths: ["src/cache.ts"],
      tags: ["cache"],
      sourceLabel: "Architecture decision",
    };
    const published = await app.inject({
      method: "POST",
      url: "/v1/facts",
      payload: decisionPayload,
    });
    expect(published.statusCode).toBe(201);
    expect(published.json().nudges).toHaveLength(1);
    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/facts",
      payload: decisionPayload,
    });
    expect(duplicate.json()).toMatchObject({
      fact: { id: published.json().fact.id },
      nudges: [{ id: published.json().nudges[0].id }],
    });

    const review = (
      await app.inject({
        method: "POST",
        url: "/v1/sync",
        payload: {
          projectId: "project-live",
          sessionId: "codex-one",
          cursor: clear.cursor,
        },
      })
    ).json();
    expect(review.status).toBe("REVIEW");
    const decisionNudge = review.nudges[0];

    const acknowledged = await app.inject({
      method: "POST",
      url: `/v1/nudges/${decisionNudge.id}/receipts/acknowledge`,
      payload: {
        projectId: "project-live",
        sessionId: "codex-one",
        clientId: "live-sync-test",
        idempotencyKey: "live-sync-acknowledgement-0001",
      },
    });
    expect(acknowledged.statusCode).toBe(201);
    expect(acknowledged.json().nudge).toMatchObject({ state: "acknowledged" });

    const otherProject = (
      await app.inject({
        method: "POST",
        url: "/v1/sync",
        payload: {
          projectId: "project-other",
          sessionId: "codex-other",
          cursor: 0,
        },
      })
    ).json();
    expect(otherProject).toMatchObject({
      status: "CLEAR",
      peers: [],
      nudges: [],
      claims: [],
    });
  });

  it("exposes the live loop through MCP tools", async () => {
    const database = new NudgeDatabase(":memory:");
    const server = createMcpServer(database);
    const client = new Client({ name: "live-sync-test", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    close.push(async () => {
      await client.close();
      await server.close();
      database.close();
    });

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "agent_nudge_sync",
        "agent_nudge_publish_fact",
        "agent_nudge_claim",
        "agent_nudge_release_claim",
        "agent_nudge_acknowledge",
      ]),
    );

    for (const [sessionId, provider] of [
      ["claude-mcp", "claude-code"],
      ["codex-mcp", "codex"],
    ] as const) {
      await client.callTool({
        name: "agent_nudge_sync",
        arguments: {
          projectId: "project-mcp",
          sessionId,
          provider,
          projectName: "MCP Project",
          cwd: "C:\\Projects\\mcp",
          taskSummary: "Coordinate cache edits",
          paths: ["src/cache.ts"],
          tags: ["cache"],
        },
      });
    }

    const claimed = await client.callTool({
      name: "agent_nudge_claim",
      arguments: {
        projectId: "project-mcp",
        sessionId: "claude-mcp",
        path: "src/cache.ts",
      },
    });
    const claim = JSON.parse(
      (claimed.content as Array<{ text: string }>)[0]!.text,
    ).claim;
    const synced = await client.callTool({
      name: "agent_nudge_sync",
      arguments: {
        projectId: "project-mcp",
        sessionId: "codex-mcp",
      },
    });
    const state = JSON.parse(
      (synced.content as Array<{ text: string }>)[0]!.text,
    );
    expect(state).toMatchObject({ status: "HOLD" });

    await client.callTool({
      name: "agent_nudge_release_claim",
      arguments: {
        projectId: "project-mcp",
        sessionId: "claude-mcp",
        claimId: claim.id,
      },
    });
    const cleared = await client.callTool({
      name: "agent_nudge_sync",
      arguments: {
        projectId: "project-mcp",
        sessionId: "codex-mcp",
        cursor: state.cursor,
      },
    });
    expect(
      JSON.parse((cleared.content as Array<{ text: string }>)[0]!.text).status,
    ).toBe("CLEAR");

    const published = await client.callTool({
      name: "agent_nudge_publish_fact",
      arguments: {
        projectId: "project-mcp",
        authorSessionId: "claude-mcp",
        kind: "decision",
        title: "Cache reads are async",
        summary: "Await the cache result before continuing.",
        paths: ["src/cache.ts"],
        tags: ["cache"],
      },
    });
    const publication = JSON.parse(
      (published.content as Array<{ text: string }>)[0]!.text,
    );
    expect(publication.nudges).toHaveLength(1);

    const acknowledged = await client.callTool({
      name: "agent_nudge_acknowledge",
      arguments: {
        projectId: "project-mcp",
        sessionId: "codex-mcp",
        nudgeId: publication.nudges[0].id,
      },
    });
    expect(
      JSON.parse((acknowledged.content as Array<{ text: string }>)[0]!.text)
        .nudge.state,
    ).toBe("acknowledged");
  });
});

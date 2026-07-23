import { afterEach, describe, expect, it } from "vitest";
import { normalizeOpenCodeEvent } from "../../src/adapters/opencode-v2.js";
import { createServer } from "../../src/daemon/server.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const close: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of close.splice(0)) await fn();
});

describe("localhost API", () => {
  it("runs all proof scenarios through the real API and storage", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });
    const response = await app.inject({ method: "POST", url: "/demo" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(
      body.results.map((item: any) => item.nudge?.deliveryClass ?? "DROP"),
    ).toEqual(["BLOCK", "ACT_NOW", "ACT_NOW", "DROP"]);
    expect(body.snapshot.nudges).toHaveLength(3);
  });

  it("updates acknowledgement separately from delivery", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });
    const demo = (
      await app.inject({ method: "POST", url: "/demo/conflict" })
    ).json();
    const response = await app.inject({
      method: "POST",
      url: `/nudges/${demo.nudge.id}/action`,
      payload: { action: "acknowledge" },
    });
    expect(response.json()).toMatchObject({ state: "acknowledged" });
  });

  it("exposes deterministic context packs and portfolio health", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });
    await app.inject({ method: "POST", url: "/demo/conflict" });

    const first = (
      await app.inject({
        method: "GET",
        url: "/context-pack?projectId=project-agent-nudge&recipientSessionId=codex-conflict",
      })
    ).json();
    const second = (
      await app.inject({
        method: "GET",
        url: "/context-pack?projectId=project-agent-nudge&recipientSessionId=codex-conflict",
      })
    ).json();
    expect(first).toMatchObject({ status: "HOLD", counts: { blockers: 1 } });
    expect(first.digestHash).toBe(second.digestHash);

    const portfolio = (
      await app.inject({ method: "GET", url: "/portfolio" })
    ).json();
    expect(portfolio.projects[0]).toMatchObject({
      projectId: "project-agent-nudge",
      state: "hold",
    });
  });

  it("exposes provider capability truth", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.schemaVersion).toBe(1);
    expect(body.providers.map((item: any) => item.provider)).toEqual([
      "opencode",
      "claude-code",
      "codex",
    ]);
    expect(body.providers[0].events["tool.execute.before"]).toBe("enforced");
  });

  it("derives and retrieves structured evidence from allowlisted events", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });

    const event = normalizeOpenCodeEvent(
      {
        event: "lsp.client.diagnostics",
        projectID: "project-evidence",
        sessionID: "opencode-evidence",
        timestamp: "2026-07-23T12:00:00.000Z",
        properties: {
          path: "src/index.ts",
          diagnosticCount: 3,
          prompt: "privacy-canary-prompt",
          output: "privacy-canary-output",
        },
      },
      { receivedAt: "2026-07-23T12:00:01.000Z" },
    );

    const created = await app.inject({
      method: "POST",
      url: "/events",
      payload: event,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().evidence).toMatchObject({
      kind: "lsp-diagnostic",
      projectId: "project-evidence",
      contentStored: false,
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/evidence?projectId=project-evidence",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.evidence).toHaveLength(1);
    expect(body.evidence[0].attributes.diagnosticCount).toBe(3);
    expect(JSON.stringify(body)).not.toContain("privacy-canary-prompt");
    expect(JSON.stringify(body)).not.toContain("privacy-canary-output");
  });
});

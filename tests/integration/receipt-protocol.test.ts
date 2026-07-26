import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentSession, FeedbackReceipt } from "../../src/core/schemas.js";
import { NudgeDatabase } from "../../src/storage/database.js";
import { createTestServer } from "../helpers/server.js";

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

function fixture() {
  const database = new NudgeDatabase(":memory:");
  const app = createTestServer(database);
  cleanup.push(async () => {
    await app.close();
    database.close();
  });
  return { app, database };
}

async function seedConflict(app: ReturnType<typeof createTestServer>) {
  return (await app.inject({ method: "POST", url: "/demo/conflict" })).json();
}

function receiptPayload(
  demo: Awaited<ReturnType<typeof seedConflict>>,
  idempotencyKey: string,
) {
  return {
    projectId: demo.nudge.projectId,
    sessionId: demo.nudge.recipientSessionId,
    clientId: "receipt-protocol-test",
    idempotencyKey,
    snoozeMinutes: 15,
  };
}

describe("v1 nudge receipt protocol", () => {
  it.each([
    ["acknowledge", "acknowledged"],
    ["dismiss", "dismissed"],
    ["snooze", "snoozed"],
    ["wrong", "dismissed"],
    ["stale", "dismissed"],
    ["used", "acknowledged"],
  ] as const)(
    "records %s as one atomic %s transition",
    async (action, state) => {
      const { app, database } = fixture();
      const demo = await seedConflict(app);
      const response = await app.inject({
        method: "POST",
        url: `/v1/nudges/${demo.nudge.id}/receipts/${action}`,
        payload: receiptPayload(demo, `receipt-action-${action}-0001`),
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        replayed: false,
        receipt: {
          schemaVersion: 1,
          action,
          projectId: demo.nudge.projectId,
          sessionId: demo.nudge.recipientSessionId,
          stateAfter: state,
        },
        nudge: { id: demo.nudge.id, state },
      });
      expect(database.list<FeedbackReceipt>("feedback")).toHaveLength(1);
      const sync = database.sync({
        projectId: demo.nudge.projectId,
        sessionId: demo.nudge.recipientSessionId,
        cursor: 0,
      });
      expect(sync.changes).toEqual([
        expect.objectContaining({
          entityId: demo.nudge.id,
          action: `receipt_${action}`,
        }),
      ]);
    },
  );

  it("makes exact retries idempotent and rejects replayed keys with changed intent", async () => {
    const { app, database } = fixture();
    const demo = await seedConflict(app);
    const payload = receiptPayload(demo, "receipt-idempotent-replay-0001");
    const first = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/snooze`,
      payload,
    });
    const replay = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/snooze`,
      payload,
    });
    const mismatch = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/dismiss`,
      payload,
    });
    const changedSnooze = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/snooze`,
      payload: { ...payload, snoozeMinutes: 30 },
    });

    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toMatchObject({ replayed: true });
    expect(replay.json().receipt.id).toBe(first.json().receipt.id);
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.json()).toEqual({ error: "receipt_replay_mismatch" });
    expect(changedSnooze.statusCode).toBe(409);
    expect(changedSnooze.json()).toEqual({
      error: "receipt_replay_mismatch",
    });
    expect(database.list<FeedbackReceipt>("feedback")).toHaveLength(1);
  });

  it("rejects cross-project, wrong-recipient, and terminal-state transitions", async () => {
    const { app, database } = fixture();
    const demo = await seedConflict(app);
    await app.inject({
      method: "POST",
      url: "/v1/sessions/check-in",
      payload: {
        sessionId: "other-project-session",
        projectId: "other-project",
        projectName: "Other Project",
        provider: "codex",
        cwd: "C:\\Projects\\other",
      },
    });

    const crossProject = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/used`,
      payload: {
        ...receiptPayload(demo, "receipt-cross-project-0001"),
        projectId: "other-project",
        sessionId: "other-project-session",
      },
    });
    const wrongRecipient = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/used`,
      payload: {
        ...receiptPayload(demo, "receipt-wrong-recipient-0001"),
        sessionId: demo.author.id,
      },
    });
    const accepted = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/used`,
      payload: receiptPayload(demo, "receipt-terminal-first-0001"),
    });
    const terminalReplay = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/dismiss`,
      payload: receiptPayload(demo, "receipt-terminal-second-0001"),
    });

    expect(crossProject.statusCode).toBe(404);
    expect(wrongRecipient.statusCode).toBe(403);
    expect(accepted.statusCode).toBe(201);
    expect(terminalReplay.statusCode).toBe(409);
    expect(terminalReplay.json()).toEqual({
      error: "invalid_nudge_transition",
    });
    expect(database.list<FeedbackReceipt>("feedback")).toHaveLength(1);
  });

  it("rejects receipts from an inactive recipient session", async () => {
    const { app, database } = fixture();
    const demo = await seedConflict(app);
    const session = database.get<AgentSession>(
      "sessions",
      demo.nudge.recipientSessionId,
    );
    expect(session).toBeDefined();
    const endedSession: AgentSession = { ...session!, status: "ended" };
    database.put("sessions", endedSession);

    const response = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/acknowledge`,
      payload: receiptPayload(demo, "receipt-inactive-session-0001"),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "session_not_active" });
    expect(database.list<FeedbackReceipt>("feedback")).toHaveLength(0);
    expect(
      database.get<{ state: string }>("nudges", demo.nudge.id)?.state,
    ).toBe("queued");
  });

  it("rolls back the nudge when receipt persistence fails", async () => {
    const { app, database } = fixture();
    const demo = await seedConflict(app);
    const idempotencyKey = "receipt-atomic-failure-0001";
    const clientId = "atomicity-test";
    database.put("feedback", {
      id: "fault-injection-receipt",
      projectId: demo.nudge.projectId,
      at: new Date().toISOString(),
      storageIdempotencyKey: `receipt-${createHash("sha256")
        .update(
          JSON.stringify([demo.nudge.projectId, clientId, idempotencyKey]),
        )
        .digest("hex")}`,
    });

    expect(() =>
      database.recordReceipt({
        projectId: demo.nudge.projectId,
        sessionId: demo.nudge.recipientSessionId,
        nudgeId: demo.nudge.id,
        action: "acknowledge",
        clientId,
        idempotencyKey,
        snoozeMinutes: 15,
      }),
    ).toThrow("receipt_persistence_conflict");
    expect(
      database.get<{ state: string }>("nudges", demo.nudge.id)?.state,
    ).toBe("queued");
    expect(database.list<FeedbackReceipt>("feedback")).toHaveLength(1);
  });

  it("strips privacy-canary fields and retires both legacy mutation routes", async () => {
    const { app, database } = fixture();
    const demo = await seedConflict(app);
    const privacyCanary = "PRIVACY_CANARY_RECEIPT_CONTENT";
    const receiptSecret = "receipt-secret-value-123456789";
    const response = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/receipts/acknowledge`,
      payload: {
        ...receiptPayload(demo, "receipt-privacy-canary-0001"),
        prompt: privacyCanary,
        transcript: privacyCanary,
        reason: `token=${receiptSecret}`,
      },
    });
    const oldV1 = await app.inject({
      method: "POST",
      url: `/v1/nudges/${demo.nudge.id}/acknowledge`,
      payload: receiptPayload(demo, "receipt-old-v1-0001"),
    });
    const unversioned = await app.inject({
      method: "POST",
      url: `/nudges/${demo.nudge.id}/action`,
      payload: { action: "dismiss" },
    });

    expect(response.statusCode).toBe(201);
    expect(oldV1.statusCode).toBe(410);
    expect(unversioned.statusCode).toBe(410);
    expect(JSON.stringify(database.exportAll())).not.toContain(privacyCanary);
    expect(JSON.stringify(database.exportAll())).not.toContain(receiptSecret);
    expect(response.body).not.toContain(privacyCanary);
    expect(response.body).not.toContain(receiptSecret);
  });
});

import { randomUUID } from "node:crypto";
import Fastify, { type FastifyReply } from "fastify";
import { z } from "zod";
import {
  buildAllScenarios,
  buildScenario,
  type DemoScenario,
} from "../core/demo.js";
import {
  acknowledgeRequestSchema,
  activeTaskSchema,
  checkInSchema,
  claimRequestSchema,
  eventSchema,
  factSchema,
  hookPreflightSchema,
  hookReceiptSchema,
  publishFactInputSchema,
  releaseClaimRequestSchema,
  sessionSchema,
  syncRequestSchema,
} from "../core/schemas.js";
import type { Nudge } from "../core/schemas.js";
import { sanitizeObject } from "../core/redaction.js";
import { NudgeDatabase } from "../storage/database.js";

export const DEFAULT_PORT = 47831;

export function createServer(database: NudgeDatabase) {
  const app = Fastify({ logger: false, bodyLimit: 256 * 1024 });

  app.get("/health", async () => ({
    ok: true,
    service: "agent-nudge",
    version: "0.4.0",
    localOnly: true,
    at: new Date().toISOString(),
  }));
  app.get("/snapshot", async (request) =>
    database.snapshot((request.query as { projectId?: string }).projectId),
  );
  app.get("/context-pack", async (request, reply) => {
    const query = request.query as {
      projectId?: string;
      recipientSessionId?: string;
    };
    if (!query.projectId)
      return reply.code(400).send({ error: "project_id_required" });
    return database.contextPack(query.projectId, query.recipientSessionId);
  });
  app.get("/portfolio", async () => database.portfolioSummary());
  app.get("/export", async () => database.exportAll());
  app.get("/purge/preview", async () => database.purgePreview());

  app.post("/v1/sessions/check-in", async (request, reply) => {
    const parsed = checkInSchema.safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_check_in", details: parsed.error.flatten() });
    try {
      return reply.code(200).send(database.checkIn(parsed.data));
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/sessions/:id/heartbeat", async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = z
      .object({
        projectId: z.string().min(1).max(160),
        task: activeTaskSchema.optional(),
      })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_heartbeat", details: parsed.error.flatten() });
    try {
      return database.heartbeat(
        parsed.data.projectId,
        params.id,
        parsed.data.task,
      );
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/facts", async (request, reply) => {
    const parsed = publishFactInputSchema.safeParse(
      sanitizeObject(request.body),
    );
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_fact", details: parsed.error.flatten() });
    try {
      return reply.code(201).send(database.publishFact(parsed.data));
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/sync", async (request, reply) => {
    const parsed = syncRequestSchema.safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_sync", details: parsed.error.flatten() });
    try {
      return database.sync(parsed.data);
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/claims", async (request, reply) => {
    const parsed = claimRequestSchema.safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_claim", details: parsed.error.flatten() });
    try {
      const result = database.acquireClaim(parsed.data);
      return reply.code(result.acquired ? 201 : 409).send(result);
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/claims/:id/release", async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = releaseClaimRequestSchema
      .omit({ claimId: true })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_release", details: parsed.error.flatten() });
    try {
      return database.releaseClaim({ ...parsed.data, claimId: params.id });
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/nudges/:id/acknowledge", async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = acknowledgeRequestSchema
      .omit({ nudgeId: true })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({
        error: "invalid_acknowledgement",
        details: parsed.error.flatten(),
      });
    try {
      return database.acknowledge({ ...parsed.data, nudgeId: params.id });
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/hooks/preflight", async (request, reply) => {
    const parsed = hookPreflightSchema.safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({
        error: "invalid_hook_preflight",
        details: parsed.error.flatten(),
      });
    try {
      const input = parsed.data;
      database.checkIn({
        sessionId: input.sessionId,
        provider: input.provider,
        projectId: input.projectId,
        projectName: input.projectName,
        cwd: input.cwd,
        task: {
          summary: `Preflight ${input.toolClass}`,
          paths: input.paths,
          tags: ["provider-hook"],
        },
      });
      const acquired = [];
      const conflicts = [];
      for (const path of input.paths) {
        const result = database.acquireClaim({
          projectId: input.projectId,
          sessionId: input.sessionId,
          path,
          leaseSeconds: input.leaseSeconds,
        });
        if (result.acquired) acquired.push(result.claim);
        else conflicts.push(result.conflict);
      }
      const sync = database.sync({
        projectId: input.projectId,
        sessionId: input.sessionId,
        cursor: 0,
      });
      const status = conflicts.length > 0 ? "HOLD" : sync.status;
      if (status === "HOLD" && acquired.length > 0)
        database.releaseSessionClaims(
          input.projectId,
          input.sessionId,
          acquired.map((claim) => claim.path),
        );
      return {
        schemaVersion: 1,
        status,
        reason:
          status === "HOLD"
            ? "Agent Nudge found an active conflicting claim or blocking constraint."
            : status === "REVIEW"
              ? "Relevant context is available; review it before continuing."
              : "No blocking context is active for this action.",
        claims: acquired.map((claim) => ({
          id: claim.id,
          path: claim.path,
          leaseExpiresAt: claim.leaseExpiresAt,
        })),
        conflicts: conflicts.map((claim) => ({
          id: claim.id,
          path: claim.path,
          leaseExpiresAt: claim.leaseExpiresAt,
        })),
        nudgeIds: sync.nudges.map((nudge) => nudge.id),
        digest: sync.digest,
      };
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/hooks/receipt", async (request, reply) => {
    const parsed = hookReceiptSchema.safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({
        error: "invalid_hook_receipt",
        details: parsed.error.flatten(),
      });
    try {
      const input = parsed.data;
      database.heartbeat(input.projectId, input.sessionId, {
        summary: `Completed ${input.toolClass}`,
        paths: input.paths,
        tags: ["provider-hook", "receipt"],
      });
      const released = database.releaseSessionClaims(
        input.projectId,
        input.sessionId,
        input.paths,
      );
      return {
        schemaVersion: 1,
        status: "recorded",
        releasedClaimIds: released.map((claim) => claim.id),
      };
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/sessions", async (request, reply) => {
    const parsed = sessionSchema.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_session", details: parsed.error.flatten() });
    database.put("sessions", parsed.data);
    return reply.code(201).send(parsed.data);
  });

  app.post("/events", async (request, reply) => {
    const clean = sanitizeObject(request.body);
    const parsed = eventSchema.safeParse(clean);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_event", details: parsed.error.flatten() });
    const result = database.putEvent(parsed.data);
    return reply.code(result.inserted ? 201 : 200).send(result);
  });

  app.post("/facts", async (request, reply) => {
    const clean = sanitizeObject(request.body);
    const parsed = factSchema.safeParse(clean);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "invalid_fact", details: parsed.error.flatten() });
    if (parsed.data.sensitivity === "secret-blocked")
      return reply.code(400).send({ error: "secret_fact_rejected" });
    try {
      return reply.code(201).send(database.recordAndFanOutFact(parsed.data));
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/nudges/:id/action", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const body = request.body as { action?: string; reason?: string };
    const stateMap: Record<string, Nudge["state"]> = {
      acknowledge: "acknowledged",
      snooze: "snoozed",
      dismiss: "dismissed",
      used: "acknowledged",
      stale: "dismissed",
      wrong: "dismissed",
    };
    const state = body.action ? stateMap[body.action] : undefined;
    if (!state) return reply.code(400).send({ error: "invalid_action" });
    try {
      const now = new Date().toISOString();
      const updated = database.updateNudge(id, {
        state,
        acknowledgedAt: state === "acknowledged" ? now : undefined,
        snoozedUntil:
          state === "snoozed"
            ? new Date(Date.now() + 15 * 60_000).toISOString()
            : undefined,
        dismissedReason:
          state === "dismissed" ? (body.reason ?? body.action) : undefined,
      });
      database.put("feedback", {
        id: randomUUID(),
        projectId: updated.projectId,
        nudgeId: id,
        action: body.action,
        at: now,
      } as any);
      return updated;
    } catch (error) {
      return reply.code(404).send({ error: String(error) });
    }
  });

  app.post("/demo/:scenario", async (request, reply) => {
    const scenario = (request.params as { scenario: DemoScenario }).scenario;
    if (!["conflict", "decision", "failure", "irrelevant"].includes(scenario))
      return reply.code(404).send({ error: "unknown_scenario" });
    const result = buildScenario(scenario);
    database.seedScenario(result);
    return result;
  });

  app.post("/demo", async () => {
    const results = buildAllScenarios();
    results.forEach((result) => database.seedScenario(result));
    return { results, snapshot: database.snapshot("project-agent-nudge") };
  });

  return app;
}

function sendLiveSyncError(reply: FastifyReply, error: unknown) {
  const code = error instanceof Error ? error.message : String(error);
  const status = code.endsWith("_not_found")
    ? 404
    : code.endsWith("_not_owned") || code === "session_project_mismatch"
      ? 403
      : 409;
  return reply.code(status).send({ error: code });
}

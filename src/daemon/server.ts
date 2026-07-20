import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import {
  buildAllScenarios,
  buildScenario,
  type DemoScenario,
} from "../core/demo.js";
import { eventSchema, factSchema, sessionSchema } from "../core/schemas.js";
import type { Nudge } from "../core/schemas.js";
import { sanitizeObject } from "../core/redaction.js";
import { NudgeDatabase } from "../storage/database.js";

export const DEFAULT_PORT = 47831;

export function createServer(database: NudgeDatabase) {
  const app = Fastify({ logger: false, bodyLimit: 256 * 1024 });

  app.get("/health", async () => ({
    ok: true,
    service: "agent-nudge",
    version: "0.2.0",
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
    database.put("facts", parsed.data);
    return reply.code(201).send(parsed.data);
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

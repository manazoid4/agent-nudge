import { join } from "node:path";
import Fastify, { type FastifyReply } from "fastify";
import { z } from "zod";
import { generateChangelog } from "../changelog/index.js";
import {
  createContextReceipt,
  inspectContextHealth,
  repositoryKey,
  type ContextReceipt,
} from "../context-health/index.js";
import { listProviderCapabilities } from "../core/capabilities.js";
import {
  buildAllScenarios,
  buildScenario,
  type DemoScenario,
} from "../core/demo.js";
import {
  evidenceFromAgentEvent,
  type StructuredEvidence,
} from "../core/evidence.js";
import {
  activeTaskSchema,
  checkInSchema,
  claimRequestSchema,
  eventSchema,
  factSchema,
  hookPreflightSchema,
  hookReceiptSchema,
  publishFactInputSchema,
  receiptActionSchema,
  receiptRequestSchema,
  releaseClaimRequestSchema,
  sessionSchema,
  syncRequestSchema,
} from "../core/schemas.js";
import { sanitizeObject } from "../core/redaction.js";
import { resolveAgentNudgeHome } from "../core/paths.js";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadProfile } from "../compiler/profile-loader.js";
import { readRepositoryContext } from "../compiler/repository-reader.js";
import { resolveConflicts } from "../compiler/resolver.js";
import { computeDigest } from "../compiler/digest.js";
import { renderBrief } from "../compiler/renderer.js";
import type {
  PromptMode,
  AgentRole,
  OutputVerbosity,
  ResolvedContext,
} from "../compiler/types.js";
import { LicenseService } from "../licensing/index.js";
import { bootstrapRepository } from "../onboarding/bootstrap.js";
import { RunnerService, type RunnerProvider } from "../runners/service.js";
import { LocalControlAuth } from "../security/local-control.js";

import { NudgeDatabase } from "../storage/database.js";

export const DEFAULT_PORT = 47831;
const runnerRequestSchema = z.object({
  provider: z.enum(["claude", "codex", "aider"]) as z.ZodType<RunnerProvider>,
  repo: z.string().min(1).max(2_048),
  brief: z
    .string()
    .min(1)
    .max(256 * 1024),
});
const evidenceStorageKind = "evidence" as Parameters<NudgeDatabase["put"]>[0];
const assurancePolicySchema = z.object({
  crossSyncDays: z.coerce.number().int().min(1).max(30).default(3),
});

export function createServer(
  database: NudgeDatabase,
  services: {
    license?: LicenseService;
    runners?: RunnerService;
    auth?: LocalControlAuth;
  } = {},
) {
  const license =
    services.license ??
    new LicenseService({
      statePath: join(resolveAgentNudgeHome(), "license.json"),
    });
  const runners = services.runners ?? new RunnerService();
  const auth = services.auth ?? LocalControlAuth.loadOrCreate();
  const app = Fastify({ logger: false, bodyLimit: 256 * 1024 });

  const allowedOrigins = new Set([
    "http://127.0.0.1:4173",
    "http://localhost:4173",
  ]);
  app.addHook("onRequest", async (req, reply) => {
    const host = req.headers.host;
    if (!host || !isLoopbackHost(host))
      return reply.code(403).send({ error: "host_not_allowed" });
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin))
      return reply.code(403).send({ error: "origin_not_allowed" });
    if (origin) reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Vary", "Origin");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Agent-Nudge-Challenge",
    );
    if (req.method === "OPTIONS") return reply.code(204).send();
    if (!auth.authorize(req.headers.authorization))
      return reply.code(401).send({ error: "authentication_required" });
  });

  app.get("/v1/health", async (request, reply) => {
    const challenge = request.headers["x-agent-nudge-challenge"];
    if (typeof challenge !== "string")
      return reply.code(400).send({ error: "health_challenge_required" });
    try {
      return {
        ok: true,
        service: "agent-nudge",
        version: "0.5.1",
        protocolVersion: 1,
        localOnly: true,
        instanceId: auth.instanceId,
        challengeProof: auth.prove(challenge),
        at: new Date().toISOString(),
      };
    } catch {
      return reply.code(400).send({ error: "invalid_health_challenge" });
    }
  });
  app.post("/v1/auth/rotate", async () => {
    auth.rotate();
    return { rotated: true, restartRequired: false };
  });
  app.get("/v1/license/status", async () => license.status());
  app.post("/v1/license/activate", async (request, reply) => {
    const parsed = z
      .object({ token: z.string().min(32).max(16_384) })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_license_token" });
    try {
      return license.activate(parsed.data.token);
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });
  app.post("/v1/license/deactivate", async () => license.deactivate());

  app.get("/v1/context-health", async (request, reply) => {
    const parsed = z
      .object({
        repo: z.string().min(1).max(2_048),
        tokenBudget: z.coerce
          .number()
          .int()
          .min(1_000)
          .max(2_000_000)
          .optional(),
      })
      .safeParse(request.query);
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_context_health_query" });
    try {
      const key = repositoryKey(parsed.data.repo);
      const receipt = database.getSetting<ContextReceipt>(
        `compiler-receipt:${key}`,
      );
      return inspectContextHealth(
        parsed.data.repo,
        receipt,
        parsed.data.tokenBudget,
      );
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/bootstrap", async (request, reply) => {
    const parsed = z
      .object({
        repo: z.string().min(1).max(2_048),
        apply: z.boolean().default(false),
      })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_bootstrap_request" });
    try {
      return bootstrapRepository(parsed.data.repo, parsed.data.apply);
    } catch (error) {
      return reply.code(400).send({ error: errorMessage(error) });
    }
  });

  app.post("/v1/changelog", async (request, reply) => {
    const parsed = z
      .object({
        repo: z.string().min(1).max(2_048),
        since: z.string().min(1).max(240).optional(),
        to: z.string().min(1).max(240).optional(),
        applyPath: z.string().min(1).max(1_024).optional(),
      })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_changelog_request" });
    try {
      if (parsed.data.applyPath) license.require("changelog_write");
      return generateChangelog({
        repoPath: parsed.data.repo,
        since: parsed.data.since,
        to: parsed.data.to,
        applyPath: parsed.data.applyPath,
      });
    } catch (error) {
      return sendProductError(reply, error);
    }
  });

  app.get("/v1/runners", async () => ({ runners: runners.list() }));
  app.post("/v1/runs/preview", async (request, reply) => {
    const parsed = runnerRequestSchema
      .omit({ brief: true })
      .safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_runner_preview" });
    try {
      return runners.preview(parsed.data.provider, parsed.data.repo);
    } catch (error) {
      return sendProductError(reply, error);
    }
  });
  app.post("/v1/runs", async (request, reply) => {
    const parsed = runnerRequestSchema.safeParse(sanitizeObject(request.body));
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_runner_request" });
    try {
      license.require("agent_launch");
      return reply
        .code(202)
        .send(
          runners.start(
            parsed.data.provider,
            parsed.data.repo,
            parsed.data.brief,
          ),
        );
    } catch (error) {
      return sendProductError(reply, error);
    }
  });
  app.get("/v1/runs/:id", async (request, reply) => {
    try {
      return runners.get((request.params as { id: string }).id);
    } catch (error) {
      return sendProductError(reply, error);
    }
  });
  app.post("/v1/runs/:id/cancel", async (request, reply) => {
    try {
      license.require("agent_launch");
      return runners.cancel((request.params as { id: string }).id);
    } catch (error) {
      return sendProductError(reply, error);
    }
  });
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
  app.get("/export", async () => ({
    ...database.exportAll(),
    evidence: database.list<StructuredEvidence>(evidenceStorageKind),
  }));
  app.get("/purge/preview", async () => database.purgePreview());
  app.get("/v1/capabilities", async () => ({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    providers: listProviderCapabilities(),
  }));
  app.get("/v1/assurance", async (request, reply) => {
    const parsed = assurancePolicySchema.safeParse(request.query);
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_assurance_policy" });
    return database.assurance(parsed.data);
  });
  app.get("/v1/assurance/:sessionId", async (request, reply) => {
    const parsed = assurancePolicySchema.safeParse(request.query);
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_assurance_policy" });
    const sessionId = (request.params as { sessionId: string }).sessionId;
    const result = database.assurance(parsed.data);
    const agent = result.agents.find((item) => item.sessionId === sessionId);
    return agent
      ? { ...agent, generatedAt: result.generatedAt, policy: result.policy }
      : reply.code(404).send({ error: "session_not_found" });
  });
  app.post("/v1/assurance/:sessionId/nudge", async (request, reply) => {
    try {
      const sessionId = (request.params as { sessionId: string }).sessionId;
      return reply.code(201).send(database.requestAssuranceNudge(sessionId));
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });
  app.get("/v1/evidence", async (request, reply) => {
    const projectId = (request.query as { projectId?: string }).projectId;
    if (!projectId)
      return reply.code(400).send({ error: "project_id_required" });
    return {
      schemaVersion: 1,
      projectId,
      evidence: database.list<StructuredEvidence>(
        evidenceStorageKind,
        projectId,
      ),
    };
  });

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

  app.post("/v1/nudges/:id/receipts/:action", async (request, reply) => {
    const params = request.params as { id: string; action: string };
    const action = receiptActionSchema.safeParse(params.action);
    const body = receiptRequestSchema
      .omit({ nudgeId: true, action: true })
      .safeParse(sanitizeObject(request.body));
    if (!action.success || !body.success)
      return reply.code(400).send({
        error: "invalid_receipt",
        details: body.success ? undefined : body.error.flatten(),
      });
    try {
      const result = database.recordReceipt({
        ...body.data,
        nudgeId: params.id,
        action: action.data,
      });
      return reply.code(result.replayed ? 200 : 201).send(result);
    } catch (error) {
      return sendLiveSyncError(reply, error);
    }
  });

  app.post("/v1/nudges/:id/acknowledge", async (_request, reply) =>
    reply.code(410).send({
      error: "legacy_acknowledgement_removed",
      use: "/v1/nudges/:id/receipts/acknowledge",
    }),
  );

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
    const evidence = result.inserted
      ? evidenceFromAgentEvent(parsed.data)
      : undefined;
    if (evidence)
      database.put(evidenceStorageKind, {
        ...evidence,
        createdAt: evidence.observedAt,
      });
    return reply
      .code(result.inserted ? 201 : 200)
      .send({ ...result, evidence });
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

  app.post("/nudges/:id/action", async (_request, reply) =>
    reply.code(410).send({
      error: "legacy_nudge_action_removed",
      use: "/v1/nudges/:id/receipts/:action",
    }),
  );

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

  app.post("/v1/compile", async (request, reply) => {
    try {
      const body = request.body as any;
      const repoPath = body.repo || process.cwd();
      const mode = (body.mode || "BUILD").toUpperCase() as PromptMode;
      const agent = (body.agent || "Claude") as AgentRole;
      const verbosity = (body.verbosity || "standard") as OutputVerbosity;
      const objective = body.objective || "Complete the task.";

      let profilePath = resolve(
        process.cwd(),
        "config/maz-prompt-profile.json",
      );
      if (!existsSync(profilePath)) {
        // Fallback for when running via compiled CJS or different CWD
        profilePath = resolve(
          process.cwd(),
          "../config/maz-prompt-profile.json",
        );
      }

      const rawRules = loadProfile(profilePath);
      const applicableRules = rawRules.filter((r) => {
        const matchesAgent = r.applicableAgents.some(
          (a) => a === "*" || a.toLowerCase() === agent.toLowerCase(),
        );
        const matchesMode = r.applicableModes.some(
          (m) => m === "*" || m.toLowerCase() === mode.toLowerCase(),
        );
        return matchesAgent && matchesMode;
      });

      const resolvableRules = applicableRules.map((r) => {
        let level: any = "PersonalDefault";
        if (r.scope === "project") level = "ProjectPreference";
        if (r.scope === "tool") level = "TaskInstruction";
        return { ...r, resolutionLevel: level };
      });

      const { activeRules, conflictsSurfaced } =
        resolveConflicts(resolvableRules);
      const { sources, skippedSources } = readRepositoryContext(repoPath);

      const context: ResolvedContext = {
        taskObjective: objective,
        mode,
        agent,
        verbosity,
        sources,
        skippedSources,
        activeRules,
        conflictsSurfaced,
        digest: "",
      };

      context.digest = computeDigest(context);
      const output = renderBrief(context);
      const health = inspectContextHealth(repoPath);
      const receipt = createContextReceipt(health, context.digest);
      database.setSetting(`compiler-receipt:${receipt.repoKey}`, receipt);

      return {
        brief: output,
        digest: context.digest,
        health: inspectContextHealth(repoPath, receipt),
        sources: sources.map((s) => ({
          path: s.path,
          type: s.type,
          digest: s.digest,
        })),
        skipped: skippedSources,
        conflicts: conflictsSurfaced,
      };
    } catch (e: any) {
      return reply.code(500).send({ error: e.message });
    }
  });

  return app;
}

function isLoopbackHost(host: string) {
  const match = /^(127\.0\.0\.1|localhost|\[::1\])(?::(\d{1,5}))?$/.exec(host);
  if (!match) return false;
  const port = match[2];
  return !port || Number(port) <= 65_535;
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

function sendProductError(reply: FastifyReply, error: unknown) {
  const code = errorMessage(error);
  const status = code.startsWith("pro_required:")
    ? 402
    : code.endsWith("_not_found")
      ? 404
      : code.startsWith("runner_unavailable:")
        ? 409
        : 400;
  return reply.code(status).send({ error: code });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildScenario } from "../core/demo.js";
import type { AgentSession } from "../core/schemas.js";
import type { NudgeDatabase } from "../storage/database.js";

export function createMcpServer(database: NudgeDatabase) {
  const server = new McpServer({ name: "agent-nudge", version: "0.4.0" });

  server.tool(
    "agent_nudge_status",
    "Return the local Agent Nudge health and queue summary.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true, ...database.snapshot().metrics }),
        },
      ],
    }),
  );

  server.tool(
    "agent_nudge_record_demo",
    "Record a safe Agent Nudge proof scenario.",
    {
      scenario: z.enum(["conflict", "decision", "failure", "irrelevant"]),
    },
    async ({ scenario }) => {
      const result = buildScenario(scenario);
      database.seedScenario(result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              title: result.fact.title,
              deliveryClass: result.nudge?.deliveryClass ?? "DROP",
              suppressed: result.suppressed,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "agent_nudge_inbox",
    "Read queued nudges for a project.",
    {
      projectId: z.string().optional(),
    },
    async ({ projectId }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(database.snapshot(projectId).nudges),
        },
      ],
    }),
  );

  server.tool(
    "agent_nudge_context_pack",
    "Return the deterministic, project-scoped context pack an agent should review before a consequential action.",
    {
      projectId: z.string(),
      recipientSessionId: z.string().optional(),
    },
    async ({ projectId, recipientSessionId }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            database.contextPack(projectId, recipientSessionId),
          ),
        },
      ],
    }),
  );

  server.tool(
    "agent_nudge_portfolio",
    "Return context health across projects already known to the local ledger.",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(database.portfolioSummary()),
        },
      ],
    }),
  );

  server.tool(
    "agent_nudge_sync",
    "Check in or heartbeat, then return this agent's project-scoped changes, nudges, claims, and peer presence.",
    {
      projectId: z.string(),
      sessionId: z.string(),
      cursor: z.number().int().nonnegative().default(0),
      provider: z
        .enum(["claude-code", "codex", "opencode", "cursor", "unknown"])
        .optional(),
      projectName: z.string().optional(),
      cwd: z.string().optional(),
      taskSummary: z.string().max(500).optional(),
      paths: z.array(z.string()).max(100).default([]),
      tags: z.array(z.string()).max(50).default([]),
    },
    async ({
      projectId,
      sessionId,
      cursor,
      provider,
      projectName,
      cwd,
      taskSummary,
      paths,
      tags,
    }) => {
      const current = database.get<AgentSession>("sessions", sessionId);
      if (current && current.projectId !== projectId)
        throw new Error("session_project_mismatch");
      const task = taskSummary
        ? { summary: taskSummary, paths, tags }
        : current?.activeTask;
      if (current) database.heartbeat(projectId, sessionId, task);
      else
        database.checkIn({
          projectId,
          sessionId,
          provider: provider ?? "unknown",
          projectName: projectName ?? projectId,
          cwd: cwd ?? ".",
          task,
        });
      return textResult(database.sync({ projectId, sessionId, cursor }));
    },
  );

  server.tool(
    "agent_nudge_publish_fact",
    "Publish a concise sourced fact and fan it out only to relevant active agents in the same project.",
    {
      projectId: z.string(),
      authorSessionId: z.string(),
      kind: z.enum([
        "decision",
        "change",
        "failure",
        "warning",
        "claim",
        "release",
        "verification",
        "handoff",
      ]),
      title: z.string().max(160),
      summary: z.string().max(800),
      paths: z.array(z.string()).max(100).default([]),
      tags: z.array(z.string()).max(50).default([]),
      confidence: z.number().min(0).max(1).default(0.9),
      sourceLabel: z.string().max(240).default("Agent update"),
      expiresAt: z.string().datetime().optional(),
    },
    async (input) => textResult(database.publishFact(input)),
  );

  server.tool(
    "agent_nudge_claim",
    "Acquire or renew a bounded write lease for one project path; conflicts fail closed.",
    {
      projectId: z.string(),
      sessionId: z.string(),
      path: z.string().max(1024),
      leaseSeconds: z.number().int().min(30).max(3600).default(300),
    },
    async (input) => textResult(database.acquireClaim(input)),
  );

  server.tool(
    "agent_nudge_release_claim",
    "Release a path lease owned by this agent and clear its conflict hold.",
    {
      projectId: z.string(),
      sessionId: z.string(),
      claimId: z.string(),
    },
    async (input) => textResult(database.releaseClaim(input)),
  );

  server.tool(
    "agent_nudge_acknowledge",
    "Acknowledge one nudge addressed to this session.",
    {
      projectId: z.string(),
      sessionId: z.string(),
      nudgeId: z.string(),
    },
    async (input) => textResult(database.acknowledge(input)),
  );

  return server;
}

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

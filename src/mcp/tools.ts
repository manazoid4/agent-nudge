import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildScenario } from "../core/demo.js";
import type { NudgeDatabase } from "../storage/database.js";

export function createMcpServer(database: NudgeDatabase) {
  const server = new McpServer({ name: "agent-nudge", version: "0.1.0" });

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

  return server;
}

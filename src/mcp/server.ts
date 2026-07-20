#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NudgeDatabase } from "../storage/database.js";
import { createMcpServer } from "./tools.js";

const database = new NudgeDatabase(
  process.env.AGENT_NUDGE_DB ??
    join(homedir(), ".agent-nudge", "agent-nudge.db"),
);
const server = createMcpServer(database);

async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.on("SIGINT", () => {
    database.close();
    process.exit(0);
  });
}

void start().catch((error) => {
  console.error(error);
  database.close();
  process.exit(1);
});

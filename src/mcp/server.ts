#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveDatabasePath } from "../core/paths.js";
import { NudgeDatabase } from "../storage/database.js";
import { createMcpServer } from "./tools.js";

const database = new NudgeDatabase(resolveDatabasePath());
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

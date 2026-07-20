#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer, DEFAULT_PORT } from "./server.js";
import { NudgeDatabase } from "../storage/database.js";

const dbPath =
  process.env.AGENT_NUDGE_DB ??
  join(homedir(), ".agent-nudge", "agent-nudge.db");
const port = Number(process.env.AGENT_NUDGE_PORT ?? DEFAULT_PORT);
async function start() {
  const database = new NudgeDatabase(dbPath);
  const app = createServer(database);
  await app.listen({ host: "127.0.0.1", port });
  console.log(
    JSON.stringify({
      level: "info",
      event: "daemon.started",
      host: "127.0.0.1",
      port,
      database: dbPath,
    }),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      await app.close();
      database.close();
      process.exit(0);
    });
  }
}

void start().catch((error) => {
  console.error(error);
  process.exit(1);
});

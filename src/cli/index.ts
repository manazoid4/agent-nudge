#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { buildAllScenarios } from "../core/demo.js";
import { NudgeDatabase } from "../storage/database.js";

const command = process.argv[2] ?? "help";
const endpoint = process.env.AGENT_NUDGE_URL ?? "http://127.0.0.1:47831";

async function main() {
  if (command === "help" || command === "--help" || command === "-h")
    return help();
  if (command === "doctor") return doctor();
  if (command === "demo") return demo();
  if (command === "install") return installPreview();
  if (command === "context-pack") return contextPack();
  if (command === "portfolio") return portfolio();
  if (command === "export") return exportData();
  if (command === "purge") return purgePreview();
  console.error(`Unknown command: ${command}`);
  help();
  process.exitCode = 1;
}

function help() {
  console.log(`Agent Nudge CLI

Commands:
  doctor                    Check runtime and local daemon
  demo                      Run all four proof scenarios
  install [all] --dry-run   Preview safe Claude/Codex project integration
  context-pack <project> [session]  Read pre-action context from the daemon
  portfolio                 Show local cross-project context health
  export [path]             Export local ledger as JSON
  purge --preview           Show what would be removed
  help                      Show this help
`);
}

async function doctor() {
  let daemon = false;
  try {
    const response = await fetch(`${endpoint}/health`, {
      signal: AbortSignal.timeout(800),
    });
    daemon = response.ok;
  } catch {
    daemon = false;
  }
  const result = {
    ok: true,
    node: process.version,
    platform: process.platform,
    daemon,
    endpoint,
    dataDirWritable: ensureDataDir(),
  };
  console.log(JSON.stringify(result, null, 2));
}

async function demo() {
  try {
    const response = await fetch(`${endpoint}/demo`, {
      method: "POST",
      signal: AbortSignal.timeout(1500),
    });
    if (response.ok) {
      const body = await response.json();
      console.log(JSON.stringify(body, null, 2));
      return;
    }
  } catch {
    // Offline demo intentionally falls through to an isolated local database.
  }
  const path = join(tmpdir(), `agent-nudge-demo-${process.pid}.db`);
  const db = new NudgeDatabase(path);
  const results = buildAllScenarios();
  results.forEach((result) => db.seedScenario(result));
  console.log(
    JSON.stringify(
      {
        mode: "offline",
        results: results.map(summary),
        snapshot: db.snapshot("project-agent-nudge"),
      },
      null,
      2,
    ),
  );
  db.close();
}

function installPreview() {
  const dryRun =
    process.argv.includes("--dry-run") || !process.argv.includes("--apply");
  const cwd = process.cwd();
  const plan = {
    dryRun,
    scope: "project",
    target: cwd,
    changes: [
      {
        provider: "claude-code",
        file: join(cwd, ".claude", "settings.json"),
        action: "merge owned Agent Nudge hook block",
        backup: true,
      },
      {
        provider: "codex",
        file: join(cwd, ".codex", "config.toml"),
        action: "append owned Agent Nudge notification block",
        backup: true,
      },
    ],
    safety:
      "No files changed. Re-run with --apply only after reviewing the generated provider-specific plan.",
  };
  console.log(JSON.stringify(plan, null, 2));
  if (!dryRun) {
    console.error(
      "Apply mode is intentionally disabled in MVP. Use the documented manual project-scoped integration.",
    );
    process.exitCode = 2;
  }
}

async function exportData() {
  const response = await fetch(`${endpoint}/export`, {
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error(`Daemon export failed: ${response.status}`);
  const data = await response.json();
  const output =
    process.argv[3] ??
    join(process.cwd(), `agent-nudge-export-${Date.now()}.json`);
  writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, { flag: "wx" });
  console.log(output);
}

async function contextPack() {
  const projectId = process.argv[3];
  const recipientSessionId = process.argv[4];
  if (!projectId) {
    console.error("Usage: agent-nudge context-pack <project> [session]");
    process.exitCode = 2;
    return;
  }
  const query = new URLSearchParams({ projectId });
  if (recipientSessionId) query.set("recipientSessionId", recipientSessionId);
  const response = await fetch(`${endpoint}/context-pack?${query}`, {
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error(`Context pack failed: ${response.status}`);
  console.log(JSON.stringify(await response.json(), null, 2));
}

async function portfolio() {
  const response = await fetch(`${endpoint}/portfolio`, {
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok)
    throw new Error(`Portfolio read failed: ${response.status}`);
  console.log(JSON.stringify(await response.json(), null, 2));
}

async function purgePreview() {
  if (!process.argv.includes("--preview")) {
    console.error(
      "Destructive purge is not enabled. Use: agent-nudge purge --preview",
    );
    process.exitCode = 2;
    return;
  }
  const response = await fetch(`${endpoint}/purge/preview`, {
    signal: AbortSignal.timeout(1500),
  });
  console.log(JSON.stringify(await response.json(), null, 2));
}

function ensureDataDir() {
  const path = join(homedir(), ".agent-nudge");
  try {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function summary(item: ReturnType<typeof buildAllScenarios>[number]) {
  return {
    fact: item.fact.title,
    deliveryClass: item.nudge?.deliveryClass ?? "DROP",
    score: item.nudge?.relevanceScore ?? 0,
    suppressed: item.suppressed,
    reason: item.reason,
  };
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

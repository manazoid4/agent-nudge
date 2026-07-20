import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function resolveAgentNudgeHome(override?: string) {
  return resolve(
    override ?? process.env.AGENT_NUDGE_HOME ?? join(homedir(), ".agent-nudge"),
  );
}

export function resolveDatabasePath(override?: string) {
  return resolve(
    override ??
      process.env.AGENT_NUDGE_DB ??
      join(resolveAgentNudgeHome(), "agent-nudge.db"),
  );
}

export function resolveProjectStateDir(projectId: string, override?: string) {
  return join(
    resolveAgentNudgeHome(override),
    "projects",
    safeSegment(projectId),
  );
}

function safeSegment(value: string) {
  const segment = value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180);
  if (!segment || segment === "." || segment === "..")
    throw new Error("invalid_project_id");
  return segment;
}

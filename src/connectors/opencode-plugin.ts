export const OPENCODE_OBSERVED_EVENTS = [
  "session.created",
  "session.updated",
  "session.status",
  "session.idle",
  "session.error",
  "session.compacted",
  "session.diff",
  "session.deleted",
  "file.edited",
  "file.watcher.updated",
  "permission.asked",
  "permission.replied",
  "todo.updated",
  "lsp.client.diagnostics",
  "lsp.updated",
  "command.executed",
  "installation.updated",
  "server.connected",
] as const;

export function buildOpenCodePlugin(hookArgs: string[]) {
  return `// Owned by Agent Nudge. Remove with: agent-nudge disconnect opencode --apply
import { execFileSync } from "node:child_process";

const hookArgs = ${JSON.stringify(hookArgs)};
const observedEvents = new Set(${JSON.stringify(OPENCODE_OBSERVED_EVENTS)});

function run(phase, input, output) {
  try {
    const stdout = execFileSync("node", [hookArgs[0], hookArgs[1], phase, ...hookArgs.slice(3)], {
      input: JSON.stringify({ ...input, tool_input: output?.args }),
      encoding: "utf8",
      timeout: 1500,
      windowsHide: true,
    });
    return stdout ? JSON.parse(stdout) : undefined;
  } catch {
    return undefined;
  }
}

export const AgentNudge = async () => ({
  event: async ({ event }) => {
    if (event?.type && observedEvents.has(event.type)) run("auto", event);
  },
  "tool.execute.before": async (input, output) => {
    const result = run("pre", input, output);
    const decision = result?.hookSpecificOutput;
    if (decision?.permissionDecision === "deny") {
      throw new Error(decision.permissionDecisionReason || "Agent Nudge found blocking project context.");
    }
  },
  "tool.execute.after": async (input, output) => {
    run("post", input, output);
  },
});
`;
}

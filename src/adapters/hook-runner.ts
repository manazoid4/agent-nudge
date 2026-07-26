#!/usr/bin/env node
import { readFileSync } from "node:fs";
import type { AgentProvider } from "../core/schemas.js";
import { readLocalControlAuthorization } from "../security/local-control.js";
import {
  deliverBestEffort,
  normalizeHook,
  type HookPayload,
} from "./normalize.js";

type HookPhase = "session" | "pre" | "post" | "failure" | "auto";

export type HookRunnerInput = {
  provider: AgentProvider;
  phase: HookPhase;
  projectId: string;
  projectName: string;
  projectRoot: string;
  endpoint?: string;
  stateDir?: string;
  payload: HookPayload;
  fetcher?: typeof fetch;
  authorization?: string;
};

export async function runProviderHook(input: HookRunnerInput) {
  const phase =
    input.phase === "auto" ? phaseFromPayload(input.payload) : input.phase;
  const endpoint = input.endpoint ?? "http://127.0.0.1:47831";
  const event = normalizeHook(input.provider, input.payload, {
    projectId: input.projectId,
  });
  const delivery = await deliverBestEffort(event, `${endpoint}/events`, {
    stateDir: input.stateDir,
    fetcher: input.fetcher,
    authorization: input.authorization,
  });
  const common = {
    provider: input.provider,
    sessionId: event.sessionId,
    projectId: input.projectId,
    projectName: input.projectName,
    cwd: input.projectRoot,
    toolClass: String(
      event.payload.toolClass ?? event.payload.eventName ?? "unknown",
    ),
    paths: event.paths,
  };

  if (phase === "session") {
    await postJson(
      `${endpoint}/v1/sessions/check-in`,
      {
        sessionId: event.sessionId,
        provider: input.provider,
        projectId: input.projectId,
        projectName: input.projectName,
        cwd: input.projectRoot,
      },
      input.fetcher,
      input.authorization,
    );
    return { phase, delivery, status: "CLEAR" as const };
  }

  if (phase === "pre") {
    const response = await postJson(
      `${endpoint}/v1/hooks/preflight`,
      { ...common, leaseSeconds: 120 },
      input.fetcher,
      input.authorization,
    );
    if (!response)
      return {
        phase,
        delivery,
        status: "OFFLINE" as const,
      };
    const body = response as {
      status?: "HOLD" | "REVIEW" | "CLEAR";
      reason?: string;
      digest?: string;
    };
    return {
      phase,
      delivery,
      status: body.status ?? "CLEAR",
      reason: body.reason,
      digest: body.digest,
    };
  }

  const response = await postJson(
    `${endpoint}/v1/hooks/receipt`,
    common,
    input.fetcher,
    input.authorization,
  );
  return {
    phase,
    delivery,
    status: response ? ("RECORDED" as const) : ("OFFLINE" as const),
  };
}

export function phaseFromPayload(
  payload: HookPayload,
): Exclude<HookPhase, "auto"> {
  const name = String(
    payload.hook_event_name ?? payload.event ?? payload.type ?? "",
  ).toLowerCase();

  if (
    name.includes("failure") ||
    name.includes("failed") ||
    name === "session.error"
  )
    return "failure";

  if (
    name.includes("sessionstart") ||
    name.includes("thread.started") ||
    name === "session.created"
  )
    return "session";

  if (
    name.includes("pretool") ||
    name.includes("before") ||
    name === "permission.asked"
  )
    return "pre";

  return "post";
}

export function providerHookOutput(
  result: Awaited<ReturnType<typeof runProviderHook>>,
) {
  if (result.status === "HOLD")
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          result.reason ?? "Agent Nudge found blocking project context.",
      },
    };
  if (result.status === "REVIEW")
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext:
          result.reason ?? "Agent Nudge found relevant project context.",
      },
    };
  return undefined;
}

async function postJson(
  url: string,
  payload: unknown,
  fetcher = fetch,
  authorization = readLocalControlAuthorization(),
) {
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(500),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function readPayload() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw || raw.length > 256 * 1024) return {};
    return JSON.parse(raw) as HookPayload;
  } catch {
    return {};
  }
}

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const provider = process.argv[2] as AgentProvider | undefined;
  const phase = process.argv[3] as HookPhase | undefined;
  const projectId = arg("--project-id");
  const projectName = arg("--project-name");
  const projectRoot = arg("--project-root");
  const endpoint = arg("--endpoint");
  if (
    !provider ||
    !["claude-code", "codex", "opencode"].includes(provider) ||
    !phase ||
    !["session", "pre", "post", "failure", "auto"].includes(phase) ||
    !projectId ||
    !projectName ||
    !projectRoot
  )
    return;
  const result = await runProviderHook({
    provider,
    phase,
    projectId,
    projectName,
    projectRoot,
    endpoint,
    payload: readPayload(),
  });
  const output = providerHookOutput(result);
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
}

if (
  process.argv[1]?.endsWith("hook.cjs") ||
  process.argv[1]?.endsWith("hook.js")
)
  void main();

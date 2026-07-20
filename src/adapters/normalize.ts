import { createHash, randomUUID } from "node:crypto";
import type { AgentEvent, AgentProvider } from "../core/schemas.js";
import { redactText, sanitizeObject } from "../core/redaction.js";

export type HookPayload = {
  session_id?: string;
  thread_id?: string;
  cwd?: string;
  project_id?: string;
  hook_event_name?: string;
  event?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  file_path?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export function normalizeHook(
  provider: AgentProvider,
  payload: HookPayload,
): AgentEvent {
  const now = new Date().toISOString();
  const sessionId =
    payload.session_id ?? payload.thread_id ?? `${provider}-unknown`;
  const eventName = String(
    payload.hook_event_name ?? payload.event ?? "tool.after",
  ).toLowerCase();
  const eventType = mapEvent(eventName);
  const rawPaths = [
    payload.file_path,
    payload.tool_input?.file_path,
    payload.tool_input?.path,
  ]
    .filter((item): item is string => typeof item === "string")
    .map((path) => path.replaceAll("\\", "/"));
  const redactionProbe = redactText(JSON.stringify(payload));
  const clean = sanitizeObject(payload) as Record<string, unknown>;
  const occurredAt = validDate(payload.timestamp)
    ? new Date(payload.timestamp as string).toISOString()
    : now;
  const identity = `${provider}:${sessionId}:${eventType}:${occurredAt}:${rawPaths.join(",")}`;
  return {
    id: randomUUID(),
    schemaVersion: 1,
    occurredAt,
    receivedAt: now,
    provider,
    sessionId,
    projectId: payload.project_id ?? hashPath(payload.cwd ?? "unknown-project"),
    eventType,
    paths: rawPaths,
    payload: clean,
    redaction: { applied: redactionProbe.applied, rules: redactionProbe.rules },
    idempotencyKey: createHash("sha256").update(identity).digest("hex"),
    correlationId: randomUUID(),
    traceId: randomUUID().replaceAll("-", ""),
    extensionMetadata: {},
  };
}

function mapEvent(name: string): AgentEvent["eventType"] {
  if (name.includes("sessionstart") || name.includes("thread.started"))
    return "session.started";
  if (name.includes("sessionend") || name.includes("thread.completed"))
    return "session.ended";
  if (name.includes("before") || name.includes("pretool")) return "tool.before";
  if (name.includes("fail") || name.includes("error")) return "tool.failed";
  if (name.includes("prompt") || name.includes("userprompt"))
    return "prompt.submitted";
  if (name.includes("file")) return "file.changed";
  return "tool.after";
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function hashPath(path: string) {
  return `project-${createHash("sha256").update(path.toLowerCase()).digest("hex").slice(0, 12)}`;
}

export async function deliverBestEffort(
  event: AgentEvent,
  endpoint = "http://127.0.0.1:47831/events",
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 350);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    return { delivered: response.ok, status: response.status };
  } catch {
    return { delivered: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

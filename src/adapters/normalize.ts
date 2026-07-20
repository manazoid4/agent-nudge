import { createHash } from "node:crypto";
import type { AgentEvent, AgentProvider } from "../core/schemas.js";
import { EventOutbox, type EventOutboxOptions } from "./outbox.js";

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
  overrides: { projectId?: string; receivedAt?: string } = {},
): AgentEvent {
  const now = overrides.receivedAt ?? new Date().toISOString();
  const sessionId =
    payload.session_id ??
    payload.thread_id ??
    stringField(payload, "sessionID") ??
    stringField(payload, "sessionId") ??
    `${provider}-unknown`;
  const eventName = String(
    payload.hook_event_name ?? payload.event ?? "tool.after",
  ).toLowerCase();
  const eventType = mapEvent(eventName);
  const rawPaths = extractPaths(payload);
  const occurredAt = validDate(payload.timestamp)
    ? new Date(payload.timestamp as string).toISOString()
    : now;
  const toolClass =
    typeof payload.tool_name === "string"
      ? payload.tool_name.slice(0, 120)
      : "unknown";
  const projectId =
    overrides.projectId ??
    payload.project_id ??
    hashPath(payload.cwd ?? "unknown-project");
  const identity = `${projectId}:${provider}:${sessionId}:${eventType}:${occurredAt}:${toolClass}:${rawPaths.join(",")}`;
  const idempotencyKey = createHash("sha256").update(identity).digest("hex");
  return {
    id: `event-${idempotencyKey.slice(0, 32)}`,
    schemaVersion: 1,
    occurredAt,
    receivedAt: now,
    provider,
    sessionId,
    projectId,
    eventType,
    paths: rawPaths,
    payload: {
      hookEvent: eventName.slice(0, 120),
      toolClass,
    },
    sourceRef: {
      type: "hook-event",
      label: `${provider} ${eventType}`,
      sessionId,
      sourceHash: idempotencyKey,
    },
    redaction: { applied: true, rules: ["strict-hook-allowlist"] },
    idempotencyKey,
    correlationId: `corr-${idempotencyKey.slice(0, 24)}`,
    traceId: idempotencyKey.slice(0, 32),
    extensionMetadata: { ingestion: "provider-hook-v1" },
  };
}

function extractPaths(payload: HookPayload) {
  const candidates: unknown[] = [
    payload.file_path,
    payload.tool_input?.file_path,
    payload.tool_input?.path,
    payload.tool_input?.filePath,
  ];
  const command = payload.tool_input?.command;
  if (typeof command === "string") {
    for (const match of command.matchAll(
      /^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/gm,
    ))
      candidates.push(match[1]);
    for (const match of command.matchAll(/^\*\*\* Move to:\s*(.+)$/gm))
      candidates.push(match[1]);
  }
  return Array.from(
    new Set(
      candidates
        .filter((item): item is string => typeof item === "string")
        .map((path) => path.trim().replaceAll("\\", "/"))
        .filter((path) => path.length > 0 && path.length <= 1024),
    ),
  ).slice(0, 100);
}

function stringField(payload: HookPayload, key: string) {
  return typeof payload[key] === "string"
    ? (payload[key] as string)
    : undefined;
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
  options: Omit<EventOutboxOptions, "endpoint"> = {},
) {
  return new EventOutbox(event.projectId, { ...options, endpoint }).deliver(
    event,
  );
}

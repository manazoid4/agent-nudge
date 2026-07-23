import { createHash } from "node:crypto";
import type { AgentEvent } from "../core/schemas.js";

export type OpenCodeEventEnvelope = {
  event?: string;
  type?: string;
  timestamp?: string;
  sessionID?: string;
  sessionId?: string;
  projectID?: string;
  projectId?: string;
  parentSessionID?: string;
  parentSessionId?: string;
  agent?: string;
  model?: string;
  status?: string;
  permission?: string;
  tool?: string;
  toolName?: string;
  path?: string;
  filePath?: string;
  paths?: unknown;
  diagnosticCount?: number;
  errorCode?: string;
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

export type OpenCodeAssuranceSignal = {
  eventName: string;
  category:
    | "session"
    | "preflight"
    | "receipt"
    | "permission"
    | "evidence"
    | "task"
    | "installation";
  consequential: boolean;
  toolClass?: string;
  status?: string;
  permission?: string;
  parentSessionId?: string;
  agentMode?: string;
  modelId?: string;
  diagnosticCount?: number;
  errorCode?: string;
};

const safeEvents = new Set([
  "session.created",
  "session.updated",
  "session.status",
  "session.idle",
  "session.error",
  "session.compacted",
  "session.diff",
  "session.deleted",
  "tool.execute.before",
  "tool.execute.after",
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
]);

export function normalizeOpenCodeEvent(
  payload: OpenCodeEventEnvelope,
  overrides: { projectId?: string; receivedAt?: string } = {},
): AgentEvent {
  const now = overrides.receivedAt ?? new Date().toISOString();
  const eventName = normalizeEventName(payload.event ?? payload.type);
  const sessionId =
    firstString(payload.sessionID, payload.sessionId) ?? "opencode-unknown";
  const projectId =
    overrides.projectId ??
    firstString(payload.projectID, payload.projectId) ??
    "project-opencode-unknown";
  const paths = extractOpenCodePaths(payload);
  const occurredAt = validDate(payload.timestamp)
    ? new Date(payload.timestamp).toISOString()
    : now;
  const signal = classifyOpenCodeEvent(eventName, payload);
  const identity = [
    projectId,
    sessionId,
    eventName,
    occurredAt,
    signal.toolClass ?? "",
    paths.join(","),
  ].join(":");
  const hash = createHash("sha256").update(identity).digest("hex");

  return {
    id: `event-${hash.slice(0, 32)}`,
    schemaVersion: 1,
    occurredAt,
    receivedAt: now,
    provider: "opencode",
    sessionId,
    projectId,
    eventType: mapOpenCodeEventType(eventName),
    paths,
    payload: compactSignal(signal),
    sourceRef: {
      type: "hook-event",
      label: `OpenCode ${eventName}`,
      sessionId,
      sourceHash: hash,
    },
    redaction: {
      applied: true,
      rules: [
        "strict-opencode-allowlist-v2",
        "drop-prompts-responses-command-output-file-content",
      ],
    },
    idempotencyKey: hash,
    correlationId: `corr-${hash.slice(0, 24)}`,
    traceId: hash.slice(0, 32),
    extensionMetadata: {
      ingestion: "opencode-plugin-v2",
      providerEvent: eventName,
      consequential: signal.consequential,
    },
  };
}

export function classifyOpenCodeEvent(
  eventName: string,
  payload: OpenCodeEventEnvelope,
): OpenCodeAssuranceSignal {
  const toolClass = firstString(
    payload.tool,
    payload.toolName,
    stringAt(payload.properties, "tool"),
    stringAt(payload.payload, "tool"),
    stringAt(payload.payload, "toolName"),
  );
  const parentSessionId = firstString(
    payload.parentSessionID,
    payload.parentSessionId,
    stringAt(payload.properties, "parentSessionID"),
    stringAt(payload.properties, "parentSessionId"),
  );
  const status = firstString(
    payload.status,
    stringAt(payload.properties, "status"),
    stringAt(payload.payload, "status"),
  );
  const permission = firstString(
    payload.permission,
    stringAt(payload.properties, "permission"),
    stringAt(payload.payload, "permission"),
  );
  const diagnosticCount = firstFiniteNumber(
    payload.diagnosticCount,
    numberAt(payload.properties, "diagnosticCount"),
    numberAt(payload.properties, "count"),
    numberAt(payload.payload, "diagnosticCount"),
    numberAt(payload.payload, "count"),
  );
  const errorCode = firstString(
    payload.errorCode,
    stringAt(payload.properties, "errorCode"),
    stringAt(payload.payload, "errorCode"),
  );

  return {
    eventName,
    category: categoryFor(eventName),
    consequential:
      eventName === "tool.execute.before" ||
      eventName === "permission.asked" ||
      eventName === "file.edited" ||
      eventName === "command.executed",
    toolClass: limit(toolClass, 120),
    status: limit(status, 80),
    permission: limit(permission, 120),
    parentSessionId: limit(parentSessionId, 160),
    agentMode: limit(
      firstString(
        payload.agent,
        stringAt(payload.properties, "agent"),
        stringAt(payload.payload, "agent"),
      ),
      120,
    ),
    modelId: limit(
      firstString(
        payload.model,
        stringAt(payload.properties, "model"),
        stringAt(payload.payload, "model"),
      ),
      160,
    ),
    diagnosticCount:
      diagnosticCount === undefined
        ? undefined
        : Math.max(0, Math.min(100_000, Math.trunc(diagnosticCount))),
    errorCode: limit(errorCode, 160),
  };
}

export function extractOpenCodePaths(payload: OpenCodeEventEnvelope): string[] {
  const properties = payload.properties;
  const nested = payload.payload;
  const candidates: unknown[] = [
    payload.path,
    payload.filePath,
    payload.paths,
    properties?.path,
    properties?.filePath,
    properties?.paths,
    nested?.path,
    nested?.filePath,
    nested?.paths,
  ];

  return Array.from(
    new Set(
      candidates
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().replaceAll("\\", "/"))
        .filter((value) => value.length > 0 && value.length <= 1024),
    ),
  ).slice(0, 100);
}

function normalizeEventName(value: unknown): string {
  const eventName = typeof value === "string" ? value.trim().toLowerCase() : "";
  return safeEvents.has(eventName) ? eventName : "session.updated";
}

function mapOpenCodeEventType(name: string): AgentEvent["eventType"] {
  if (name === "session.created") return "session.started";
  if (name === "session.deleted") return "session.ended";
  if (name === "tool.execute.before" || name === "permission.asked")
    return "tool.before";
  if (name === "tool.execute.after" || name === "permission.replied")
    return "tool.after";
  if (name === "session.error") return "tool.failed";
  if (name === "file.edited" || name === "file.watcher.updated")
    return "file.changed";
  if (name === "todo.updated" || name.startsWith("session."))
    return "task.updated";
  return "receipt.created";
}

function categoryFor(name: string): OpenCodeAssuranceSignal["category"] {
  if (name.startsWith("session.")) return "session";
  if (name === "tool.execute.before") return "preflight";
  if (name === "tool.execute.after" || name === "command.executed")
    return "receipt";
  if (name.startsWith("permission.")) return "permission";
  if (name.startsWith("lsp.") || name.startsWith("file.")) return "evidence";
  if (name === "todo.updated") return "task";
  return "installation";
}

function compactSignal(
  signal: OpenCodeAssuranceSignal,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(signal).filter(([, value]) => value !== undefined),
  );
}

function stringAt(
  object: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = object?.[key];
  return typeof value === "string" ? value : undefined;
}

function numberAt(
  object: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = object?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  return values.find(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
}

function limit(value: string | undefined, length: number): string | undefined {
  return value?.slice(0, length);
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

import { createHash } from "node:crypto";
import { z } from "zod";
import type { AgentEvent } from "./schemas.js";

export const evidenceProvenanceSchema = z.enum([
  "self-reported",
  "hook-observed",
  "command-receipt",
  "test-verified",
  "git-verified",
  "human-confirmed",
  "signed-remote",
]);

export const structuredEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  projectId: z.string().min(1),
  sessionId: z.string().min(1),
  provider: z.string().min(1),
  kind: z.enum([
    "lsp-diagnostic",
    "test-run",
    "lint",
    "typecheck",
    "build",
    "ci-check",
    "runtime-error",
    "migration",
    "dependency-change",
    "browser-verification",
    "review-finding",
    "file-change",
    "tool-receipt",
  ]),
  summary: z.string().min(1).max(500),
  paths: z.array(z.string().max(1024)).max(100),
  observedAt: z.string().datetime(),
  provenance: evidenceProvenanceSchema,
  confidence: z.number().min(0).max(1),
  sourceHash: z.string().length(64),
  correlationId: z.string().optional(),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
  contentStored: z.literal(false),
});

export type EvidenceProvenance = z.infer<typeof evidenceProvenanceSchema>;
export type StructuredEvidence = z.infer<typeof structuredEvidenceSchema>;

export function evidenceFromAgentEvent(
  event: AgentEvent,
): StructuredEvidence | undefined {
  const kind = evidenceKind(event);
  if (!kind) return undefined;
  const sourceHash =
    event.sourceRef?.sourceHash ??
    createHash("sha256").update(event.idempotencyKey).digest("hex");
  const attributes = compactAttributes(event.payload);
  const summary = evidenceSummary(kind, event, attributes);

  return structuredEvidenceSchema.parse({
    schemaVersion: 1,
    id: `evidence-${sourceHash.slice(0, 32)}`,
    projectId: event.projectId,
    sessionId: event.sessionId,
    provider: event.provider,
    kind,
    summary,
    paths: event.paths,
    observedAt: event.occurredAt,
    provenance: provenanceFor(kind),
    confidence: confidenceFor(kind),
    sourceHash,
    correlationId: event.correlationId,
    attributes,
    contentStored: false,
  });
}

export function strongestProvenance(
  values: EvidenceProvenance[],
): EvidenceProvenance | undefined {
  const order: EvidenceProvenance[] = [
    "self-reported",
    "hook-observed",
    "command-receipt",
    "test-verified",
    "git-verified",
    "human-confirmed",
    "signed-remote",
  ];
  return values.reduce<EvidenceProvenance | undefined>((strongest, value) => {
    if (!strongest) return value;
    return order.indexOf(value) > order.indexOf(strongest) ? value : strongest;
  }, undefined);
}

function evidenceKind(
  event: AgentEvent,
): StructuredEvidence["kind"] | undefined {
  const providerEvent = String(event.extensionMetadata.providerEvent ?? "");
  const toolClass = String(event.payload.toolClass ?? "").toLowerCase();
  if (
    providerEvent.includes("lsp") ||
    event.payload.diagnosticCount !== undefined
  )
    return "lsp-diagnostic";
  if (providerEvent === "file.edited" || event.eventType === "file.changed")
    return "file-change";
  if (event.eventType === "tool.failed" || providerEvent === "session.error")
    return "runtime-error";
  if (toolClass.includes("test")) return "test-run";
  if (toolClass.includes("lint")) return "lint";
  if (toolClass.includes("typecheck") || toolClass.includes("tsc"))
    return "typecheck";
  if (toolClass.includes("build")) return "build";
  if (event.eventType === "tool.after" || event.eventType === "receipt.created")
    return "tool-receipt";
  return undefined;
}

function evidenceSummary(
  kind: StructuredEvidence["kind"],
  event: AgentEvent,
  attributes: Record<string, string | number | boolean>,
) {
  const pathSummary = event.paths.length
    ? ` for ${event.paths.slice(0, 3).join(", ")}`
    : "";
  const count =
    typeof attributes.diagnosticCount === "number"
      ? ` (${attributes.diagnosticCount} diagnostics)`
      : "";
  const status =
    typeof attributes.status === "string" ? `: ${attributes.status}` : "";
  return `${kind.replaceAll("-", " ")}${pathSummary}${count}${status}`.slice(
    0,
    500,
  );
}

function provenanceFor(kind: StructuredEvidence["kind"]): EvidenceProvenance {
  if (kind === "test-run" || kind === "lint" || kind === "typecheck")
    return "test-verified";
  if (kind === "ci-check") return "signed-remote";
  if (kind === "tool-receipt" || kind === "build") return "command-receipt";
  return "hook-observed";
}

function confidenceFor(kind: StructuredEvidence["kind"]) {
  if (kind === "test-run" || kind === "lint" || kind === "typecheck")
    return 0.92;
  if (kind === "ci-check") return 0.96;
  if (kind === "tool-receipt" || kind === "build") return 0.85;
  return 0.78;
}

function compactAttributes(
  payload: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const allowed = [
    "eventName",
    "category",
    "consequential",
    "toolClass",
    "status",
    "permission",
    "parentSessionId",
    "agentMode",
    "modelId",
    "diagnosticCount",
    "errorCode",
  ];
  const result: Record<string, string | number | boolean> = {};
  for (const key of allowed) {
    const value = payload[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    )
      result[key] = value;
  }
  return result;
}

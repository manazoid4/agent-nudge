import { z } from "zod";
import type { AgentProvider } from "./schemas.js";

export const capabilityLevelSchema = z.enum([
  "unsupported",
  "observed",
  "advisory",
  "enforced",
]);

export const providerTransportSchema = z.enum([
  "native-hook",
  "plugin",
  "extension",
  "acp",
  "mcp",
  "cli-wrapper",
]);

export const providerCapabilityManifestSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.string().min(1),
  displayName: z.string().min(1),
  versionRange: z.string().min(1),
  transport: providerTransportSchema,
  events: z.record(capabilityLevelSchema),
  permissions: z.object({
    file: z.boolean(),
    shell: z.boolean(),
    network: z.boolean(),
    externalDirectory: z.boolean(),
    mcpTools: z.boolean(),
  }),
  checkpoint: z.enum(["none", "provider-native", "agent-nudge"]),
  worktreeIdentity: z.boolean(),
  subagentIdentity: z.boolean(),
  taskGraph: z.boolean(),
  reversibleInstall: z.boolean(),
  source: z.string().url(),
  testedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  limitations: z.array(z.string()).default([]),
});

export type CapabilityLevel = z.infer<typeof capabilityLevelSchema>;
export type ProviderCapabilityManifest = z.infer<
  typeof providerCapabilityManifestSchema
>;

const testedAt = "2026-07-23T00:00:00.000Z";

export const providerCapabilityManifests = {
  opencode: providerCapabilityManifestSchema.parse({
    schemaVersion: 1,
    provider: "opencode",
    displayName: "OpenCode",
    versionRange: "current plugin API as tested 2026-07",
    transport: "plugin",
    events: {
      "session.created": "observed",
      "session.updated": "observed",
      "session.status": "observed",
      "session.idle": "observed",
      "session.error": "observed",
      "session.compacted": "observed",
      "session.diff": "observed",
      "session.deleted": "observed",
      "tool.execute.before": "enforced",
      "tool.execute.after": "observed",
      "file.edited": "observed",
      "file.watcher.updated": "observed",
      "permission.asked": "advisory",
      "permission.replied": "observed",
      "todo.updated": "observed",
      "lsp.client.diagnostics": "observed",
      "lsp.updated": "observed",
      "command.executed": "observed",
      "installation.updated": "observed",
      "server.connected": "observed",
    },
    permissions: {
      file: true,
      shell: true,
      network: false,
      externalDirectory: true,
      mcpTools: true,
    },
    checkpoint: "provider-native",
    worktreeIdentity: true,
    subagentIdentity: true,
    taskGraph: true,
    reversibleInstall: true,
    source: "https://opencode.ai/docs/plugins/",
    testedAt,
    confidence: 0.88,
    limitations: [
      "Enforcement applies only while the project plugin is installed, enabled, and reached by the covered action.",
      "Provider payload shapes are version-sensitive and must be conformance-tested before capability upgrades.",
      "Raw prompts, responses, command output, and file bodies are deliberately excluded.",
    ],
  }),
  "claude-code": providerCapabilityManifestSchema.parse({
    schemaVersion: 1,
    provider: "claude-code",
    displayName: "Claude Code",
    versionRange: "current hooks API as tested 2026-07",
    transport: "native-hook",
    events: {
      SessionStart: "observed",
      SessionEnd: "observed",
      PreToolUse: "enforced",
      PostToolUse: "observed",
      PostToolUseFailure: "observed",
      UserPromptSubmit: "observed",
      Stop: "observed",
      SubagentStart: "observed",
      SubagentStop: "observed",
    },
    permissions: {
      file: true,
      shell: true,
      network: false,
      externalDirectory: true,
      mcpTools: true,
    },
    checkpoint: "none",
    worktreeIdentity: true,
    subagentIdentity: true,
    taskGraph: true,
    reversibleInstall: true,
    source: "https://docs.anthropic.com/en/docs/claude-code/hooks",
    testedAt,
    confidence: 0.86,
    limitations: [
      "Hooks can be disabled, bypassed, or unavailable in some hosted and delegated execution paths.",
      "Agent Nudge does not infer hidden model state from hook delivery.",
    ],
  }),
  codex: providerCapabilityManifestSchema.parse({
    schemaVersion: 1,
    provider: "codex",
    displayName: "Codex",
    versionRange: "trusted project hooks as tested 2026-07",
    transport: "native-hook",
    events: {
      "thread.started": "observed",
      "thread.completed": "observed",
      "tool.before": "enforced",
      "tool.after": "observed",
      "tool.failed": "observed",
    },
    permissions: {
      file: true,
      shell: true,
      network: false,
      externalDirectory: false,
      mcpTools: false,
    },
    checkpoint: "none",
    worktreeIdentity: true,
    subagentIdentity: false,
    taskGraph: false,
    reversibleInstall: true,
    source: "https://developers.openai.com/codex/",
    testedAt,
    confidence: 0.74,
    limitations: [
      "Only trusted project hook paths are treated as potentially enforceable.",
      "Hosted, mobile, delegated, or uncovered actions may remain outside the local hook boundary.",
    ],
  }),
} as const satisfies Record<string, ProviderCapabilityManifest>;

export function listProviderCapabilities(): ProviderCapabilityManifest[] {
  return Object.values(providerCapabilityManifests);
}

export function getProviderCapability(
  provider: AgentProvider | string,
): ProviderCapabilityManifest | undefined {
  return providerCapabilityManifests[
    provider as keyof typeof providerCapabilityManifests
  ];
}

export function effectiveCapability(
  manifest: ProviderCapabilityManifest,
  event: string,
  context: {
    installed: boolean;
    enabled: boolean;
    trusted: boolean;
    drifted?: boolean;
    daemonAvailable?: boolean;
  },
): CapabilityLevel {
  const declared = manifest.events[event] ?? "unsupported";
  if (declared === "unsupported") return declared;
  if (!context.installed || !context.enabled || context.drifted) return "unsupported";
  if (declared === "enforced") {
    if (!context.trusted || context.daemonAvailable === false) return "advisory";
  }
  return declared;
}

export const CONNECTOR_PROVIDERS = [
  "claude-code",
  "codex",
  "opencode",
] as const;

export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

export const CONNECTOR_CAPABILITIES = {
  "claude-code": "ENFORCED",
  codex: "ENFORCED",
  opencode: "ENFORCED",
} as const satisfies Record<ConnectorProvider, "ENFORCED">;

export type ConnectorCapability =
  (typeof CONNECTOR_CAPABILITIES)[ConnectorProvider];

export const CONNECTOR_CAPABILITY_NOTES: Record<ConnectorProvider, string> = {
  "claude-code":
    "ENFORCED for covered tool actions while the project hook is enabled; host-disabled or bypassed hooks and actions outside hook coverage are not blocked.",
  codex:
    "ENFORCED for covered Bash, apply_patch, MCP, and local tool actions after the project hook is trusted; hosted or specialized tools and untrusted or disabled hooks remain outside coverage.",
  opencode:
    "ENFORCED for covered tool.execute.before actions while the project plugin is enabled; disabled plugins and actions outside plugin coverage are not blocked.",
};

export type ConnectorArtifact = {
  /** Command installed in a provider's PreToolUse hook. */
  command?: string;
  /** Complete JavaScript module installed for the OpenCode provider. */
  pluginContent?: string;
  /** Optional project-owned bridge used by the command or plugin. */
  bridge?: {
    content: string;
    relativePath?: string;
  };
};

export type ConnectorArtifacts = Partial<
  Record<ConnectorProvider, ConnectorArtifact>
>;

export type ConnectorFailurePoint = {
  operation: "write" | "delete";
  path: string;
  completedOperations: number;
};

export type ConnectorManagerOptions = {
  stateDir: string;
  artifacts: ConnectorArtifacts;
  /** Override the directory inspected for queued outbox entries. */
  outboxDir?: string | ((projectRoot: string) => string);
  /** Test/host fault injection. Throw to prove transaction rollback. */
  failureInjector?: (point: ConnectorFailurePoint) => void | Promise<void>;
  /** Shorthand fault injection used by deterministic tests. */
  failAfterOperation?: number;
  now?: () => Date;
};

export type ConnectorRequest = {
  projectPath: string;
  providers?: readonly ConnectorProvider[];
  provider?: ConnectorProvider;
};

export type ConnectorPlanAction = "create" | "update" | "delete" | "noop";

export type ConnectorPlanChange = {
  provider: ConnectorProvider;
  path: string;
  relativePath: string;
  action: ConnectorPlanAction;
  kind: "merged-json" | "owned-file" | "manifest";
  backup: boolean;
};

export type ConnectorPlan = {
  schemaVersion: 1;
  operation: "connect" | "disconnect";
  dryRun: true;
  projectRoot: string;
  providers: ConnectorProvider[];
  changes: ConnectorPlanChange[];
  capabilities: Array<{
    provider: ConnectorProvider;
    label: ConnectorCapability;
    note: string;
  }>;
  warnings: string[];
};

export type ConnectorManifestFile = {
  relativePath: string;
  kind: "json-hook" | "owned-file";
  installedHash: string;
  ownedValue?: unknown;
  ownedHooks?: Record<string, unknown>;
  hooksContainerCreated?: boolean;
  eventContainerCreated?: boolean;
  eventContainersCreated?: Record<string, boolean>;
  fileCreated?: boolean;
};

export type ConnectorManifest = {
  schemaVersion: 1;
  owner: "agent-nudge";
  projectRoot: string;
  projectKey: string;
  provider: ConnectorProvider;
  capability: ConnectorCapability;
  capabilityNote: string;
  installedAt: string;
  updatedAt: string;
  files: ConnectorManifestFile[];
};

export type ConnectorApplyResult = {
  applied: boolean;
  plan: ConnectorPlan;
  backupDir?: string;
  manifests: ConnectorManifest[];
};

export type ConnectorProviderStatus = {
  provider: ConnectorProvider;
  capability: ConnectorCapability;
  capabilityNote: string;
  status: "connected" | "disconnected" | "drifted";
  manifestPath: string;
  files: Array<{
    path: string;
    status: "ok" | "missing" | "modified";
  }>;
};

export type ConnectorInspection = {
  schemaVersion: 1;
  projectRoot: string;
  projectKey: string;
  outboxDepth: number;
  providers: ConnectorProviderStatus[];
};

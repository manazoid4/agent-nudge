import { createHash, randomUUID } from "node:crypto";
import {
  constants,
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  unlink,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  CONNECTOR_CAPABILITIES,
  CONNECTOR_CAPABILITY_NOTES,
  CONNECTOR_PROVIDERS,
  type ConnectorApplyResult,
  type ConnectorArtifact,
  type ConnectorInspection,
  type ConnectorManagerOptions,
  type ConnectorManifest,
  type ConnectorManifestFile,
  type ConnectorPlan,
  type ConnectorPlanChange,
  type ConnectorProvider,
  type ConnectorProviderStatus,
  type ConnectorRequest,
} from "./types.js";

const JSON_TARGETS: Partial<Record<ConnectorProvider, string>> = {
  "claude-code": ".claude/settings.local.json",
  codex: ".codex/hooks.json",
};
const OPENCODE_TARGET = ".opencode/plugins/agent-nudge.js";
const DEFAULT_BRIDGE_TARGET = (provider: ConnectorProvider) =>
  `.agent-nudge/${provider}-bridge.js`;
const HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
] as const;
const HOOK_STATUS = "Agent Nudge pre-action boundary";

type JsonObject = Record<string, unknown>;
type PlannedMutation = {
  provider: ConnectorProvider;
  absolutePath: string;
  relativePath: string;
  kind: ConnectorPlanChange["kind"];
  action: ConnectorPlanChange["action"];
  next?: Buffer;
  current?: Buffer;
};

type PreparedOperation = {
  plan: ConnectorPlan;
  mutations: PlannedMutation[];
  manifests: ConnectorManifest[];
  projectKey: string;
};

export class ConnectorManager {
  constructor(private readonly options: ConnectorManagerOptions) {
    if (!isAbsolute(options.stateDir)) {
      throw new Error("connector_state_dir_must_be_absolute");
    }
  }

  async planConnect(request: ConnectorRequest): Promise<ConnectorPlan> {
    return (await this.prepareConnect(request)).plan;
  }

  async connect(request: ConnectorRequest): Promise<ConnectorApplyResult> {
    const root = await resolveProjectRoot(request.projectPath);
    return this.withProjectLock(root, async () => {
      const prepared = await this.prepareConnect({
        ...request,
        projectPath: root,
      });
      return this.applyPrepared(prepared);
    });
  }

  async planDisconnect(request: ConnectorRequest): Promise<ConnectorPlan> {
    return (await this.prepareDisconnect(request)).plan;
  }

  async disconnect(request: ConnectorRequest): Promise<ConnectorApplyResult> {
    const root = await resolveProjectRoot(request.projectPath);
    return this.withProjectLock(root, async () => {
      const prepared = await this.prepareDisconnect({
        ...request,
        projectPath: root,
      });
      return this.applyPrepared(prepared);
    });
  }

  async inspect(projectPath: string): Promise<ConnectorInspection> {
    const projectRoot = await resolveProjectRoot(projectPath);
    const projectKey = hash(projectRootKey(projectRoot)).slice(0, 24);
    const providers: ConnectorProviderStatus[] = [];
    for (const provider of CONNECTOR_PROVIDERS) {
      const manifestPath = this.manifestPath(projectKey, provider);
      const manifest = await readManifestIfPresent(manifestPath);
      if (!manifest) {
        providers.push({
          provider,
          capability: CONNECTOR_CAPABILITIES[provider],
          capabilityNote: CONNECTOR_CAPABILITY_NOTES[provider],
          status: "disconnected",
          manifestPath,
          files: [],
        });
        continue;
      }
      validateManifest(manifest, projectRoot, projectKey, provider);
      const files = await Promise.all(
        manifest.files.map(async (entry) => {
          const absolutePath = await safeProjectTarget(
            projectRoot,
            entry.relativePath,
          );
          const status = await ownedEntryStatus(absolutePath, entry);
          return { path: absolutePath, status };
        }),
      );
      providers.push({
        provider,
        capability: CONNECTOR_CAPABILITIES[provider],
        capabilityNote: CONNECTOR_CAPABILITY_NOTES[provider],
        status: files.every((file) => file.status === "ok")
          ? "connected"
          : "drifted",
        manifestPath,
        files,
      });
    }
    const outboxDir =
      typeof this.options.outboxDir === "function"
        ? this.options.outboxDir(projectRoot)
        : (this.options.outboxDir ??
          join(this.options.stateDir, "outbox", projectKey));
    return {
      schemaVersion: 1,
      projectRoot,
      projectKey,
      outboxDepth: await countOutbox(outboxDir),
      providers,
    };
  }

  private async prepareConnect(
    request: ConnectorRequest,
  ): Promise<PreparedOperation> {
    const projectRoot = await resolveProjectRoot(request.projectPath);
    const projectKey = hash(projectRootKey(projectRoot)).slice(0, 24);
    const providers = normalizeProviders(request);
    const mutations: PlannedMutation[] = [];
    const manifests: ConnectorManifest[] = [];
    const now = (this.options.now ?? (() => new Date()))().toISOString();

    for (const provider of providers) {
      const artifact = requireArtifact(this.options.artifacts, provider);
      const manifestPath = this.manifestPath(projectKey, provider);
      const previous = await readManifestIfPresent(manifestPath);
      if (previous)
        validateManifest(previous, projectRoot, projectKey, provider);
      const files: ConnectorManifestFile[] = [];

      if (provider === "opencode") {
        if (!artifact.pluginContent) {
          throw new Error("connector_opencode_plugin_content_required");
        }
        await this.prepareOwnedFile({
          projectRoot,
          provider,
          relativePath: OPENCODE_TARGET,
          content: artifact.pluginContent,
          previous,
          files,
          mutations,
        });
      } else {
        if (!artifact.command?.trim()) {
          throw new Error(`connector_${provider}_command_required`);
        }
        await this.prepareJsonHook({
          projectRoot,
          provider,
          relativePath: JSON_TARGETS[provider]!,
          command: artifact.command,
          previous,
          files,
          mutations,
        });
      }

      if (artifact.bridge) {
        await this.prepareOwnedFile({
          projectRoot,
          provider,
          relativePath:
            artifact.bridge.relativePath ?? DEFAULT_BRIDGE_TARGET(provider),
          content: artifact.bridge.content,
          previous,
          files,
          mutations,
        });
      }

      const manifest: ConnectorManifest = {
        schemaVersion: 1,
        owner: "agent-nudge",
        projectRoot,
        projectKey,
        provider,
        capability: CONNECTOR_CAPABILITIES[provider],
        capabilityNote: CONNECTOR_CAPABILITY_NOTES[provider],
        installedAt: previous?.installedAt ?? now,
        updatedAt:
          previous && manifestsEquivalent(previous.files, files)
            ? previous.updatedAt
            : now,
        files,
      };
      manifests.push(manifest);
      const currentManifest = await readOptional(manifestPath);
      const nextManifest = jsonBuffer(manifest);
      mutations.push({
        provider,
        absolutePath: manifestPath,
        relativePath: relative(this.options.stateDir, manifestPath),
        kind: "manifest",
        action: buffersEqual(currentManifest, nextManifest)
          ? "noop"
          : currentManifest
            ? "update"
            : "create",
        current: currentManifest,
        next: nextManifest,
      });
    }

    return {
      projectKey,
      mutations,
      manifests,
      plan: buildPlan("connect", projectRoot, providers, mutations),
    };
  }

  private async prepareDisconnect(
    request: ConnectorRequest,
  ): Promise<PreparedOperation> {
    const projectRoot = await resolveProjectRoot(request.projectPath);
    const projectKey = hash(projectRootKey(projectRoot)).slice(0, 24);
    const providers = normalizeProviders(request);
    const mutations: PlannedMutation[] = [];
    const manifests: ConnectorManifest[] = [];

    for (const provider of providers) {
      const manifestPath = this.manifestPath(projectKey, provider);
      const manifest = await readManifestIfPresent(manifestPath);
      if (!manifest) {
        mutations.push({
          provider,
          absolutePath: manifestPath,
          relativePath: relative(this.options.stateDir, manifestPath),
          kind: "manifest",
          action: "noop",
        });
        continue;
      }
      validateManifest(manifest, projectRoot, projectKey, provider);
      manifests.push(manifest);
      for (const entry of [...manifest.files].reverse()) {
        const absolutePath = await safeProjectTarget(
          projectRoot,
          entry.relativePath,
        );
        const current = await readOptional(absolutePath);
        if (entry.kind === "owned-file") {
          if (!current || hash(current) !== entry.installedHash) {
            throw new Error(`connector_drift_refused:${entry.relativePath}`);
          }
          mutations.push({
            provider,
            absolutePath,
            relativePath: entry.relativePath,
            kind: "owned-file",
            action: "delete",
            current,
          });
          continue;
        }
        if (!current) {
          throw new Error(`connector_drift_refused:${entry.relativePath}`);
        }
        const parsed = parseJsonObject(current, absolutePath);
        if (!removeOwnedHooks(parsed, entry)) {
          throw new Error(`connector_drift_refused:${entry.relativePath}`);
        }
        cleanupOwnedContainers(parsed, entry);
        const shouldDelete =
          entry.fileCreated && Object.keys(parsed).length === 0;
        mutations.push({
          provider,
          absolutePath,
          relativePath: entry.relativePath,
          kind: "merged-json",
          action: shouldDelete ? "delete" : "update",
          current,
          next: shouldDelete ? undefined : jsonBuffer(parsed),
        });
      }
      const currentManifest = await readOptional(manifestPath);
      mutations.push({
        provider,
        absolutePath: manifestPath,
        relativePath: relative(this.options.stateDir, manifestPath),
        kind: "manifest",
        action: "delete",
        current: currentManifest,
      });
    }
    return {
      projectKey,
      mutations,
      manifests: [],
      plan: buildPlan("disconnect", projectRoot, providers, mutations),
    };
  }

  private async prepareJsonHook(input: {
    projectRoot: string;
    provider: ConnectorProvider;
    relativePath: string;
    command: string;
    previous?: ConnectorManifest;
    files: ConnectorManifestFile[];
    mutations: PlannedMutation[];
  }) {
    const absolutePath = await safeProjectTarget(
      input.projectRoot,
      input.relativePath,
    );
    const current = await readOptional(absolutePath);
    const parsed = current ? parseJsonObject(current, absolutePath) : {};
    const hooksExisted = isJsonObject(parsed.hooks);
    const hooks = hooksExisted ? (parsed.hooks as JsonObject) : {};
    const previousEntry = input.previous?.files.find(
      (entry) => entry.relativePath === input.relativePath,
    );
    if (previousEntry) {
      if (!removeOwnedHooks(parsed, previousEntry)) {
        throw new Error(`connector_drift_refused:${input.relativePath}`);
      }
    }
    const ownedHooks: Record<string, unknown> = {};
    const eventContainersCreated: Record<string, boolean> = {};
    const refreshedHooks = isJsonObject(parsed.hooks)
      ? (parsed.hooks as JsonObject)
      : hooks;
    for (const eventName of HOOK_EVENTS) {
      const eventExisted = Array.isArray(refreshedHooks[eventName]);
      const refreshedEvent = eventExisted
        ? (refreshedHooks[eventName] as unknown[])
        : [];
      const ownedValue = hookValue(input.command);
      ownedHooks[eventName] = ownedValue;
      eventContainersCreated[eventName] =
        previousEntry?.eventContainersCreated?.[eventName] ?? !eventExisted;
      if (!refreshedEvent.some((item) => deepEqual(item, ownedValue))) {
        refreshedEvent.push(ownedValue);
      } else if (!previousEntry) {
        throw new Error(`connector_ownership_ambiguous:${input.relativePath}`);
      }
      refreshedHooks[eventName] = refreshedEvent;
    }
    parsed.hooks = refreshedHooks;
    const next = jsonBuffer(parsed);
    const entry: ConnectorManifestFile = {
      relativePath: input.relativePath,
      kind: "json-hook",
      installedHash: hash(next),
      ownedHooks,
      hooksContainerCreated:
        previousEntry?.hooksContainerCreated ?? !hooksExisted,
      eventContainersCreated,
      fileCreated: previousEntry?.fileCreated ?? !current,
    };
    input.files.push(entry);
    input.mutations.push({
      provider: input.provider,
      absolutePath,
      relativePath: input.relativePath,
      kind: "merged-json",
      action: buffersEqual(current, next)
        ? "noop"
        : current
          ? "update"
          : "create",
      current,
      next,
    });
  }

  private async prepareOwnedFile(input: {
    projectRoot: string;
    provider: ConnectorProvider;
    relativePath: string;
    content: string;
    previous?: ConnectorManifest;
    files: ConnectorManifestFile[];
    mutations: PlannedMutation[];
  }) {
    const absolutePath = await safeProjectTarget(
      input.projectRoot,
      input.relativePath,
    );
    const current = await readOptional(absolutePath);
    const previousEntry = input.previous?.files.find(
      (entry) => entry.relativePath === input.relativePath,
    );
    if (current && !previousEntry) {
      throw new Error(`connector_owned_file_exists:${input.relativePath}`);
    }
    if (
      previousEntry &&
      (!current || hash(current) !== previousEntry.installedHash)
    ) {
      throw new Error(`connector_drift_refused:${input.relativePath}`);
    }
    const next = Buffer.from(normalizeText(input.content));
    input.files.push({
      relativePath: input.relativePath,
      kind: "owned-file",
      installedHash: hash(next),
      fileCreated: previousEntry?.fileCreated ?? !current,
    });
    input.mutations.push({
      provider: input.provider,
      absolutePath,
      relativePath: input.relativePath,
      kind: "owned-file",
      action: buffersEqual(current, next)
        ? "noop"
        : current
          ? "update"
          : "create",
      current,
      next,
    });
  }

  private async applyPrepared(
    prepared: PreparedOperation,
  ): Promise<ConnectorApplyResult> {
    const changed = prepared.mutations.filter((item) => item.action !== "noop");
    if (!changed.length) {
      return {
        applied: false,
        plan: prepared.plan,
        manifests: prepared.manifests,
      };
    }
    const transactionId = `${Date.now()}-${randomUUID()}`;
    const backupDir = join(
      this.options.stateDir,
      "backups",
      prepared.projectKey,
      transactionId,
    );
    await mkdir(backupDir, { recursive: true });
    await Promise.all(
      changed
        .filter((mutation) => mutation.current)
        .map(async (mutation, index) => {
          const backup = join(
            backupDir,
            `${index}-${safeBackupName(mutation.relativePath)}`,
          );
          await mkdir(dirname(backup), { recursive: true });
          await copyFile(
            mutation.absolutePath,
            backup,
            constants.COPYFILE_EXCL,
          );
        }),
    );

    let completedOperations = 0;
    const completedMutations: PlannedMutation[] = [];
    try {
      for (const mutation of changed) {
        const observed = await readOptional(mutation.absolutePath);
        if (!optionalBuffersEqual(observed, mutation.current)) {
          throw new Error(
            `connector_concurrent_modification_refused:${mutation.relativePath}`,
          );
        }
        if (mutation.action === "delete") {
          await unlink(mutation.absolutePath);
        } else {
          await atomicWrite(mutation.absolutePath, mutation.next!);
        }
        completedMutations.push(mutation);
        completedOperations += 1;
        if (this.options.failAfterOperation === completedOperations) {
          throw new Error("connector_injected_failure");
        }
        await this.options.failureInjector?.({
          operation: mutation.action === "delete" ? "delete" : "write",
          path: mutation.absolutePath,
          completedOperations,
        });
      }
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      for (const mutation of [...completedMutations].reverse()) {
        try {
          const observed = await readOptional(mutation.absolutePath);
          const expected =
            mutation.action === "delete" ? undefined : mutation.next;
          if (!optionalBuffersEqual(observed, expected)) {
            throw new Error(
              `connector_rollback_drift_refused:${mutation.relativePath}`,
            );
          }
          if (mutation.current)
            await atomicWrite(mutation.absolutePath, mutation.current);
          else await rm(mutation.absolutePath, { force: true });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length) {
        throw new AggregateError(
          [error, ...rollbackErrors],
          "connector_transaction_and_rollback_failed",
        );
      }
      throw error;
    }
    return {
      applied: true,
      plan: prepared.plan,
      backupDir,
      manifests: prepared.manifests,
    };
  }

  private manifestPath(projectKey: string, provider: ConnectorProvider) {
    return join(
      this.options.stateDir,
      "connectors",
      projectKey,
      `${provider}.json`,
    );
  }

  private async withProjectLock<T>(
    projectRoot: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const projectKey = hash(projectRootKey(projectRoot)).slice(0, 24);
    const lockPath = join(this.options.stateDir, "locks", `${projectKey}.lock`);
    await mkdir(dirname(lockPath), { recursive: true });
    let handle;
    try {
      handle = await open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error("connector_project_locked");
      }
      throw error;
    }
    try {
      return await operation();
    } finally {
      await handle.close();
      await rm(lockPath, { force: true });
    }
  }
}

export async function resolveProjectRoot(startPath: string) {
  let candidate = resolve(startPath);
  const inputStat = await stat(candidate).catch(() => undefined);
  if (!inputStat) throw new Error("connector_project_path_not_found");
  if (!inputStat.isDirectory()) candidate = dirname(candidate);
  candidate = await realpath(candidate);
  while (true) {
    const marker = join(candidate, ".git");
    const markerStat = await lstat(marker).catch(() => undefined);
    if (markerStat) {
      if (markerStat.isSymbolicLink()) {
        throw new Error("connector_git_marker_symlink_refused");
      }
      if (!markerStat.isDirectory() && !markerStat.isFile()) {
        throw new Error("connector_invalid_git_marker");
      }
      return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("connector_git_root_not_found");
    candidate = parent;
  }
}

export async function planConnect(
  request: ConnectorRequest,
  options: ConnectorManagerOptions,
) {
  return new ConnectorManager(options).planConnect(request);
}

export async function connectProject(
  request: ConnectorRequest,
  options: ConnectorManagerOptions,
) {
  return new ConnectorManager(options).connect(request);
}

export async function planDisconnect(
  request: ConnectorRequest,
  options: ConnectorManagerOptions,
) {
  return new ConnectorManager(options).planDisconnect(request);
}

export async function disconnectProject(
  request: ConnectorRequest,
  options: ConnectorManagerOptions,
) {
  return new ConnectorManager(options).disconnect(request);
}

export async function inspectProject(
  projectPath: string,
  options: ConnectorManagerOptions,
) {
  return new ConnectorManager(options).inspect(projectPath);
}

async function safeProjectTarget(projectRoot: string, relativePath: string) {
  if (!relativePath || isAbsolute(relativePath)) {
    throw new Error("connector_target_must_be_project_relative");
  }
  const root = await realpath(projectRoot);
  const target = resolve(root, relativePath);
  const pathFromRoot = relative(root, target);
  if (
    !pathFromRoot ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`connector_target_outside_project:${relativePath}`);
  }
  let cursor = root;
  for (const component of pathFromRoot.split(sep)) {
    cursor = join(cursor, component);
    const item = await lstat(cursor).catch(() => undefined);
    if (!item) break;
    if (item.isSymbolicLink()) {
      throw new Error(`connector_symlink_traversal_refused:${relativePath}`);
    }
  }
  const existing = await realpath(target).catch(() => undefined);
  if (existing) {
    const canonicalRelative = relative(root, existing);
    if (
      canonicalRelative === ".." ||
      canonicalRelative.startsWith(`..${sep}`) ||
      isAbsolute(canonicalRelative)
    ) {
      throw new Error(`connector_target_outside_project:${relativePath}`);
    }
  }
  return target;
}

function normalizeProviders(request: ConnectorRequest) {
  const requested =
    request.providers ?? (request.provider ? [request.provider] : []);
  if (!requested.length) throw new Error("connector_provider_required");
  const providers = [...new Set(requested)];
  for (const provider of providers) {
    if (!(CONNECTOR_PROVIDERS as readonly string[]).includes(provider)) {
      throw new Error(`connector_provider_unsupported:${provider}`);
    }
  }
  return providers;
}

function requireArtifact(
  artifacts: ConnectorManagerOptions["artifacts"],
  provider: ConnectorProvider,
): ConnectorArtifact {
  return artifacts[provider] ?? {};
}

function hookValue(command: string) {
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command,
        statusMessage: HOOK_STATUS,
      },
    ],
  };
}

function removeOwnedHooks(target: JsonObject, entry: ConnectorManifestFile) {
  if (!isJsonObject(target.hooks)) return false;
  const hooks = target.hooks;
  const ownedHooks =
    entry.ownedHooks ??
    (entry.ownedValue ? { PreToolUse: entry.ownedValue } : undefined);
  if (!ownedHooks) return false;
  for (const [eventName, ownedValue] of Object.entries(ownedHooks)) {
    if (!Array.isArray(hooks[eventName])) return false;
    const index = hooks[eventName].findIndex((value) =>
      deepEqual(value, ownedValue),
    );
    if (index < 0) return false;
    hooks[eventName].splice(index, 1);
  }
  return true;
}

function cleanupOwnedContainers(
  target: JsonObject,
  entry: ConnectorManifestFile,
) {
  if (!isJsonObject(target.hooks)) return;
  const hooks = target.hooks;
  const createdEvents =
    entry.eventContainersCreated ??
    (entry.eventContainerCreated ? { PreToolUse: true } : {});
  for (const [eventName, created] of Object.entries(createdEvents)) {
    if (
      created &&
      Array.isArray(hooks[eventName]) &&
      hooks[eventName].length === 0
    ) {
      delete hooks[eventName];
    }
  }
  if (entry.hooksContainerCreated && Object.keys(hooks).length === 0) {
    delete target.hooks;
  }
}

async function ownedEntryStatus(
  absolutePath: string,
  entry: ConnectorManifestFile,
): Promise<"ok" | "missing" | "modified"> {
  const current = await readOptional(absolutePath);
  if (!current) return "missing";
  if (entry.kind === "owned-file") {
    return hash(current) === entry.installedHash ? "ok" : "modified";
  }
  try {
    const parsed = parseJsonObject(current, absolutePath);
    if (!isJsonObject(parsed.hooks)) return "modified";
    const parsedHooks = parsed.hooks;
    const ownedHooks =
      entry.ownedHooks ??
      (entry.ownedValue ? { PreToolUse: entry.ownedValue } : undefined);
    if (!ownedHooks) return "modified";
    return Object.entries(ownedHooks).every(([eventName, ownedValue]) => {
      const values = parsedHooks[eventName];
      return (
        Array.isArray(values) &&
        values.some((value) => deepEqual(value, ownedValue))
      );
    })
      ? "ok"
      : "modified";
  } catch {
    return "modified";
  }
}

function buildPlan(
  operation: ConnectorPlan["operation"],
  projectRoot: string,
  providers: ConnectorProvider[],
  mutations: PlannedMutation[],
): ConnectorPlan {
  return {
    schemaVersion: 1,
    operation,
    dryRun: true,
    projectRoot,
    providers,
    changes: mutations.map((mutation) => ({
      provider: mutation.provider,
      path: mutation.absolutePath,
      relativePath: mutation.relativePath,
      action: mutation.action,
      kind: mutation.kind,
      backup: Boolean(mutation.current && mutation.action !== "noop"),
    })),
    capabilities: providers.map((provider) => ({
      provider,
      label: CONNECTOR_CAPABILITIES[provider],
      note: CONNECTOR_CAPABILITY_NOTES[provider],
    })),
    warnings: [
      "Connector enforcement is limited to provider-covered actions and requires enabled, trusted project hooks or plugins.",
      "Review this project-scoped plan before applying it.",
    ],
  };
}

function validateManifest(
  manifest: ConnectorManifest,
  projectRoot: string,
  projectKey: string,
  provider: ConnectorProvider,
) {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.owner !== "agent-nudge" ||
    manifest.projectRoot !== projectRoot ||
    manifest.projectKey !== projectKey ||
    manifest.provider !== provider
  ) {
    throw new Error(`connector_manifest_invalid:${provider}`);
  }
}

async function readManifestIfPresent(path: string) {
  const content = await readOptional(path);
  if (!content) return undefined;
  try {
    return JSON.parse(content.toString("utf8")) as ConnectorManifest;
  } catch {
    throw new Error(`connector_manifest_invalid_json:${path}`);
  }
}

function parseJsonObject(content: Buffer, path: string): JsonObject {
  try {
    const parsed: unknown = JSON.parse(content.toString("utf8"));
    if (!isJsonObject(parsed)) throw new Error("not_object");
    return parsed;
  } catch {
    throw new Error(`connector_invalid_json:${path}`);
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function manifestsEquivalent(
  left: ConnectorManifestFile[],
  right: ConnectorManifestFile[],
) {
  return deepEqual(left, right);
}

function jsonBuffer(value: unknown) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function normalizeText(value: string) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function hash(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function projectRootKey(value: string) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

async function readOptional(path: string) {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function buffersEqual(left: Buffer | undefined, right: Buffer) {
  return Boolean(left && left.equals(right));
}

function optionalBuffersEqual(
  left: Buffer | undefined,
  right: Buffer | undefined,
) {
  if (!left || !right) return left === right;
  return left.equals(right);
}

async function atomicWrite(path: string, content: Buffer) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${randomUUID()}.agent-nudge.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function safeBackupName(relativePath: string) {
  return relativePath.replaceAll("..", "_").replaceAll(/[\\/:]/g, "_");
}

async function countOutbox(path: string): Promise<number> {
  const directory = await stat(path).catch(() => undefined);
  if (!directory) return 0;
  if (!directory.isDirectory()) return 0;
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(path, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isFile()) count += 1;
    else if (entry.isDirectory())
      count += await countOutbox(join(path, entry.name));
  }
  return count;
}

import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectorManager } from "../../src/connectors/index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fixture() {
  const base = await mkdtemp(
    join(tmpdir(), "agent-nudge-connectors-integration-"),
  );
  temporaryDirectories.push(base);
  const project = join(base, "project");
  const stateDir = join(base, "state");
  await mkdir(join(project, ".git"), { recursive: true });
  return { base, project, stateDir };
}

function manager(stateDir: string, failAfterOperation?: number) {
  return new ConnectorManager({
    stateDir,
    failAfterOperation,
    artifacts: {
      "claude-code": { command: "agent-nudge hook claude-code" },
      codex: { command: "agent-nudge hook codex" },
      opencode: {
        pluginContent:
          "export const AgentNudgePlugin = async () => ({ 'tool.execute.before': async () => {} });",
      },
    },
  });
}

describe("connector transactions", () => {
  it("connects idempotently and disconnects only its merged hook", async () => {
    const { project, stateDir } = await fixture();
    const settingsPath = join(project, ".claude/settings.local.json");
    await mkdir(join(project, ".claude"));
    await writeFile(
      settingsPath,
      JSON.stringify({
        permissions: { allow: ["Read"] },
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "other" }] }],
        },
      }),
    );
    const connectors = manager(stateDir);
    const first = await connectors.connect({
      projectPath: project,
      provider: "claude-code",
    });
    expect(first.applied).toBe(true);
    const firstContent = await readFile(settingsPath, "utf8");
    const second = await connectors.connect({
      projectPath: project,
      provider: "claude-code",
    });
    expect(second.applied).toBe(false);
    expect(await readFile(settingsPath, "utf8")).toBe(firstContent);

    const parsed = JSON.parse(firstContent);
    parsed.unrelated = { remains: true };
    await writeFile(settingsPath, `${JSON.stringify(parsed, null, 2)}\n`);
    await connectors.disconnect({
      projectPath: project,
      provider: "claude-code",
    });
    const disconnected = JSON.parse(await readFile(settingsPath, "utf8"));
    expect(disconnected.permissions).toEqual({ allow: ["Read"] });
    expect(disconnected.hooks.Stop).toHaveLength(1);
    expect(disconnected.hooks.PreToolUse).toBeUndefined();
    expect(disconnected.hooks.PostToolUse).toBeUndefined();
    expect(disconnected.hooks.PostToolUseFailure).toBeUndefined();
    expect(disconnected.unrelated).toEqual({ remains: true });
  });

  it("installs all providers, writes manifests and reports outbox depth", async () => {
    const { project, stateDir } = await fixture();
    const connectors = manager(stateDir);
    const result = await connectors.connect({
      projectPath: project,
      providers: ["claude-code", "codex", "opencode"],
    });
    expect(result.manifests).toHaveLength(3);
    expect(
      await readFile(join(project, ".opencode/plugins/agent-nudge.js"), "utf8"),
    ).toContain("AgentNudgePlugin");
    const outbox = join(stateDir, "outbox", result.manifests[0]!.projectKey);
    await mkdir(join(outbox, "nested"), { recursive: true });
    await writeFile(join(outbox, "one.json"), "{}");
    await writeFile(join(outbox, "nested/two.json"), "{}");
    const inspection = await connectors.inspect(project);
    expect(inspection.outboxDepth).toBe(2);
    expect(
      inspection.providers.every((item) => item.status === "connected"),
    ).toBe(true);
    const backups = await readdir(
      join(stateDir, "backups", result.manifests[0]!.projectKey),
    );
    expect(backups).toHaveLength(1);
  });

  it("rolls back every project and manifest write after a partial failure", async () => {
    const { project, stateDir } = await fixture();
    const settingsPath = join(project, ".claude/settings.local.json");
    await mkdir(join(project, ".claude"));
    const original = '{"unrelated":true}\n';
    await writeFile(settingsPath, original);
    await expect(
      manager(stateDir, 1).connect({
        projectPath: project,
        providers: ["claude-code", "codex"],
      }),
    ).rejects.toThrow("connector_injected_failure");
    expect(await readFile(settingsPath, "utf8")).toBe(original);
    await expect(
      readFile(join(project, ".codex/hooks.json")),
    ).rejects.toThrow();
    const inspection = await manager(stateDir).inspect(project);
    expect(
      inspection.providers.every((item) => item.status === "disconnected"),
    ).toBe(true);
  });

  it("refuses to clobber an external edit that races rollback", async () => {
    const { project, stateDir } = await fixture();
    const settingsPath = join(project, ".claude/settings.local.json");
    const connectors = new ConnectorManager({
      stateDir,
      artifacts: {
        "claude-code": { command: "agent-nudge hook claude-code" },
      },
      failureInjector: async ({ path, completedOperations }) => {
        if (completedOperations !== 1) return;
        await writeFile(path, '{"external":true}\n');
        throw new Error("external_editor_won");
      },
    });
    await expect(
      connectors.connect({
        projectPath: project,
        provider: "claude-code",
      }),
    ).rejects.toThrow("connector_transaction_and_rollback_failed");
    expect(await readFile(settingsPath, "utf8")).toBe('{"external":true}\n');
  });

  it("refuses disconnect when an owned plugin or hook has drifted", async () => {
    const { project, stateDir } = await fixture();
    const connectors = manager(stateDir);
    await connectors.connect({
      projectPath: project,
      providers: ["claude-code", "opencode"],
    });
    await writeFile(
      join(project, ".opencode/plugins/agent-nudge.js"),
      "modified\n",
    );
    await expect(
      connectors.disconnect({ projectPath: project, provider: "opencode" }),
    ).rejects.toThrow("connector_drift_refused");

    const settingsPath = join(project, ".claude/settings.local.json");
    const settings = JSON.parse(await readFile(settingsPath, "utf8"));
    settings.hooks.PreToolUse[0].hooks[0].command = "changed";
    await writeFile(settingsPath, JSON.stringify(settings));
    await expect(
      connectors.disconnect({ projectPath: project, provider: "claude-code" }),
    ).rejects.toThrow("connector_drift_refused");
  });
});

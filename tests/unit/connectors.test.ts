import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CONNECTOR_CAPABILITIES,
  ConnectorManager,
  resolveProjectRoot,
} from "../../src/connectors/index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fixture() {
  const base = await mkdtemp(join(tmpdir(), "agent-nudge-connectors-unit-"));
  temporaryDirectories.push(base);
  const project = join(base, "project");
  const stateDir = join(base, "state");
  await mkdir(join(project, ".git"), { recursive: true });
  await mkdir(join(project, "src"));
  return { base, project, stateDir };
}

describe("connector planning", () => {
  it("resolves the canonical git root from a nested project path", async () => {
    const { project } = await fixture();
    expect(await resolveProjectRoot(join(project, "src"))).toBe(project);
  });

  it("returns an honest, non-mutating dry-run plan", async () => {
    const { project, stateDir } = await fixture();
    const manager = new ConnectorManager({
      stateDir,
      artifacts: {
        "claude-code": { command: "agent-nudge hook claude-code" },
      },
    });
    const plan = await manager.planConnect({
      projectPath: join(project, "src"),
      provider: "claude-code",
    });
    expect(plan.dryRun).toBe(true);
    expect(plan.capabilities).toEqual([
      expect.objectContaining({ provider: "claude-code", label: "ENFORCED" }),
    ]);
    expect(CONNECTOR_CAPABILITIES).toEqual({
      "claude-code": "ENFORCED",
      codex: "ENFORCED",
      opencode: "ENFORCED",
    });
    await expect(
      readFile(join(project, ".claude/settings.local.json")),
    ).rejects.toThrow();
    await expect(readFile(stateDir)).rejects.toThrow();
  });

  it("rejects a junction in a provider target path", async () => {
    const { base, project, stateDir } = await fixture();
    const outside = join(base, "outside");
    await mkdir(outside);
    await symlink(
      outside,
      join(project, ".claude"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const manager = new ConnectorManager({
      stateDir,
      artifacts: {
        "claude-code": { command: "agent-nudge hook claude-code" },
      },
    });
    await expect(
      manager.planConnect({ projectPath: project, provider: "claude-code" }),
    ).rejects.toThrow("connector_symlink_traversal_refused");
  });

  it("rejects invalid provider JSON instead of overwriting it", async () => {
    const { project, stateDir } = await fixture();
    await mkdir(join(project, ".codex"));
    await writeFile(join(project, ".codex/hooks.json"), "not-json");
    const manager = new ConnectorManager({
      stateDir,
      artifacts: { codex: { command: "agent-nudge hook codex" } },
    });
    await expect(
      manager.planConnect({ projectPath: project, provider: "codex" }),
    ).rejects.toThrow("connector_invalid_json");
  });
});

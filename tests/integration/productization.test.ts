import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../../src/daemon/server.js";
import { LicenseService } from "../../src/licensing/index.js";
import { RunnerService } from "../../src/runners/service.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const cleanup: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const action of cleanup.splice(0).reverse()) await action();
});

describe("commercial product API", () => {
  it("serves context health, compile receipts, onboarding, licensing, and changelog", async () => {
    const directory = mkdtempSync(join(tmpdir(), "agent-nudge-api-"));
    cleanup.push(() => rmSync(directory, { recursive: true, force: true }));
    git(directory, ["init"]);
    git(directory, ["config", "user.email", "api@agent-nudge.local"]);
    git(directory, ["config", "user.name", "Agent Nudge API"]);
    writeFileSync(join(directory, "AGENTS.md"), "# Rules\n\nRun tests.\n");
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ scripts: { test: "vitest run" } }),
    );
    git(directory, ["add", "."]);
    git(directory, ["commit", "-m", "feat: initialise product context"]);

    const database = new NudgeDatabase(":memory:");
    const license = new LicenseService({
      statePath: join(directory, "license-state.json"),
    });
    const app = createServer(database, {
      license,
      runners: new RunnerService(),
    });
    cleanup.push(async () => {
      await app.close();
      database.close();
    });

    const query = encodeURIComponent(directory);
    const before = await app.inject({
      method: "GET",
      url: `/v1/context-health?repo=${query}`,
    });
    expect(before.statusCode).toBe(200);
    const beforeBody = before.json();
    expect(beforeBody.repository).toMatchObject({ dirty: false });
    expect(
      beforeBody.sources.find(
        (source: { name: string }) => source.name === "AGENTS.md",
      ),
    ).toMatchObject({ present: true });

    const compiled = await app.inject({
      method: "POST",
      url: "/v1/compile",
      payload: {
        repo: directory,
        objective: "Verify product context",
        mode: "BUILD",
        agent: "Codex",
        verbosity: "concise",
      },
    });
    expect(compiled.statusCode).toBe(200);
    expect(compiled.json().health.sources[0].drift).toBe("current");

    const bootstrap = await app.inject({
      method: "POST",
      url: "/v1/bootstrap",
      payload: { repo: directory, apply: false },
    });
    expect(bootstrap.json().actions).toContainEqual(
      expect.objectContaining({ relativePath: "CLAUDE.md", state: "create" }),
    );

    const changelog = await app.inject({
      method: "POST",
      url: "/v1/changelog",
      payload: { repo: directory },
    });
    expect(changelog.json().markdown).toContain("## Added");

    expect(
      (await app.inject({ method: "GET", url: "/v1/license/status" })).json(),
    ).toMatchObject({ plan: "trial", active: true });
    expect(
      (await app.inject({ method: "GET", url: "/v1/runners" })).json().runners,
    ).toHaveLength(3);
  });

  it("rejects untrusted browser origins before local routes execute", async () => {
    const database = new NudgeDatabase(":memory:");
    const app = createServer(database);
    cleanup.push(async () => {
      await app.close();
      database.close();
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/bootstrap",
      headers: { origin: "https://malicious.example" },
      payload: { repo: process.cwd(), apply: false },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "origin_not_allowed" });
  });
});

function git(directory: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    windowsHide: true,
  });
}

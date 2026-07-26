import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateChangelog } from "../../src/changelog/index.js";
import {
  createProCheckout,
  signLicensePayload,
} from "../../src/commerce/stripe.js";
import {
  createContextReceipt,
  inspectContextHealth,
} from "../../src/context-health/index.js";
import {
  LicenseService,
  type LicensePayload,
  verifyLicenseToken,
} from "../../src/licensing/index.js";
import { bootstrapRepository } from "../../src/onboarding/bootstrap.js";
import { RunnerService } from "../../src/runners/service.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("commercial product utilities", () => {
  it("returns paid checkout to the license delivery screen", async () => {
    let successUrl = "";
    const stripe = {
      checkout: {
        sessions: {
          create: async (options: { success_url: string }) => {
            successUrl = options.success_url;
            return { id: "cs_test", url: "https://checkout.stripe.test" };
          },
        },
      },
    } as never;

    const checkout = await createProCheckout(
      "https://agent-nudge.test",
      stripe,
      "price_test",
    );
    expect(checkout.url).toBe("https://checkout.stripe.test");
    expect(successUrl).toContain("session_id={CHECKOUT_SESSION_ID}#license");
  });

  it("reports context health and digest drift", () => {
    const repo = tempRepo();
    writeFileSync(join(repo, "AGENTS.md"), "one\ntwo\n");
    writeFileSync(join(repo, "CLAUDE.md"), "three\n");
    commit(repo, "docs: add context");

    const initial = inspectContextHealth(repo);
    const receipt = createContextReceipt(initial, "brief-digest");
    expect(inspectContextHealth(repo, receipt).sources[0]).toMatchObject({
      name: "AGENTS.md",
      lines: 3,
      drift: "current",
    });

    writeFileSync(join(repo, "AGENTS.md"), "one\ntwo\nchanged\n");
    const changed = inspectContextHealth(repo, receipt);
    expect(changed.repository.dirty).toBe(true);
    expect(changed.repository.stagedFiles).toBe(0);
    expect(changed.sources[0]?.drift).toBe("changed");
  });

  it("bootstraps missing context files without overwriting existing files", () => {
    const repo = tempRepo();
    writeFileSync(join(repo, "AGENTS.md"), "keep me\n");
    const plan = bootstrapRepository(repo);
    expect(plan.applied).toBe(false);
    expect(plan.actions).toContainEqual(
      expect.objectContaining({ relativePath: "CLAUDE.md", state: "create" }),
    );

    bootstrapRepository(repo, true);
    expect(readFileSync(join(repo, "AGENTS.md"), "utf8")).toBe("keep me\n");
    expect(readFileSync(join(repo, "CLAUDE.md"), "utf8")).toContain(
      "Agent Nudge",
    );
  });

  it("generates and writes a deterministic grouped changelog", () => {
    const repo = tempRepo();
    writeFileSync(join(repo, "feature.txt"), "feature\n");
    commit(repo, "feat: add direct handoff");
    writeFileSync(join(repo, "feature.txt"), "fixed\n");
    commit(repo, "fix: prevent stale launch");

    const result = generateChangelog({
      repoPath: repo,
      applyPath: "CHANGELOG.md",
    });
    expect(result.markdown).toContain("## Added");
    expect(result.markdown).toContain("## Fixed");
    expect(readFileSync(join(repo, "CHANGELOG.md"), "utf8")).toBe(
      result.markdown,
    );
  });

  it("activates a signed offline Pro license", () => {
    const directory = temporaryDirectory();
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const payload: LicensePayload = {
      version: 1,
      licenseId: "license-test",
      plan: "pro",
      entitlements: ["agent_launch", "changelog_write"],
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2027-01-01T00:00:00.000Z",
    };
    const previousPrivateKey = process.env.AGENT_NUDGE_LICENSE_PRIVATE_KEY;
    process.env.AGENT_NUDGE_LICENSE_PRIVATE_KEY = privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    const token = signLicensePayload(payload);
    const service = new LicenseService({
      statePath: join(directory, "license.json"),
      publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      now: () => new Date("2026-07-26T00:00:00.000Z"),
    });

    expect(service.status().plan).toBe("trial");
    expect(service.activate(token)).toMatchObject({
      plan: "pro",
      active: true,
    });
    expect(service.has("agent_launch")).toBe(true);
    expect(
      verifyLicenseToken(
        token,
        publicKey.export({ type: "spki", format: "pem" }).toString(),
      ),
    ).toMatchObject({ licenseId: "license-test" });
    if (previousPrivateKey === undefined) {
      delete process.env.AGENT_NUDGE_LICENSE_PRIVATE_KEY;
    } else {
      process.env.AGENT_NUDGE_LICENSE_PRIVATE_KEY = previousPrivateKey;
    }
  });

  it("launches an allowlisted runner and captures bounded output", async () => {
    const repo = tempRepo();
    const service = new RunnerService([
      {
        provider: "claude",
        executable: process.execPath,
        args: [
          "-e",
          "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>process.stdout.write('received:'+s))",
        ],
        input: "stdin",
      },
    ]);
    const job = service.start("claude", repo, "verified brief");
    for (let attempts = 0; attempts < 50; attempts += 1) {
      if (service.get(job.id).state !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(service.get(job.id)).toMatchObject({
      state: "completed",
      exitCode: 0,
      output: "received:verified brief",
    });
  });
});

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "agent-nudge-product-"));
  directories.push(directory);
  return directory;
}

function tempRepo() {
  const directory = temporaryDirectory();
  git(directory, ["init"]);
  git(directory, ["config", "user.email", "tests@agent-nudge.local"]);
  git(directory, ["config", "user.name", "Agent Nudge Tests"]);
  writeFileSync(join(directory, ".gitignore"), ".agent-nudge/\n");
  commit(directory, "chore: initialise fixture");
  return directory;
}

function commit(directory: string, message: string) {
  git(directory, ["add", "."]);
  git(directory, ["commit", "--allow-empty", "-m", message]);
}

function git(directory: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    windowsHide: true,
  });
}

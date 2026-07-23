import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeOpenCodeEvent } from "../../src/adapters/opencode-v2.js";
import {
  effectiveCapability,
  providerCapabilityManifests,
} from "../../src/core/capabilities.js";
import { previewRestore } from "../../src/core/checkpoints.js";
import {
  assessDoomLoop,
  digestAttemptValue,
  type ActionAttempt,
} from "../../src/core/doom-loop.js";
import { evidenceFromAgentEvent } from "../../src/core/evidence.js";
import {
  compareInstructionProvenance,
  scanInstructionProvenance,
} from "../../src/core/instruction-provenance.js";
import { assessMergeRisk, classifyPathRisk } from "../../src/core/merge-risk.js";
import { assessTaskStart, type AssuranceTask } from "../../src/core/task-graph.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length) {
    const path = temporaryDirectories.pop();
    if (path) rmSync(path, { recursive: true, force: true });
  }
});

describe("provider capability honesty", () => {
  it("downgrades enforcement when trust or daemon availability is missing", () => {
    const manifest = providerCapabilityManifests.opencode;
    expect(
      effectiveCapability(manifest, "tool.execute.before", {
        installed: true,
        enabled: true,
        trusted: true,
        daemonAvailable: true,
      }),
    ).toBe("enforced");
    expect(
      effectiveCapability(manifest, "tool.execute.before", {
        installed: true,
        enabled: true,
        trusted: false,
        daemonAvailable: true,
      }),
    ).toBe("advisory");
    expect(
      effectiveCapability(manifest, "tool.execute.before", {
        installed: true,
        enabled: true,
        trusted: true,
        drifted: true,
      }),
    ).toBe("unsupported");
  });
});

describe("OpenCode adapter v2", () => {
  it("keeps structured assurance fields and drops private payload content", () => {
    const event = normalizeOpenCodeEvent(
      {
        event: "lsp.client.diagnostics",
        sessionID: "session-1",
        projectID: "project-1",
        timestamp: "2026-07-23T12:00:00.000Z",
        model: "example/model",
        properties: {
          path: "src\\index.ts",
          diagnosticCount: 4,
          prompt: "private prompt",
          response: "private response",
          output: "private command output",
        },
      },
      { receivedAt: "2026-07-23T12:00:01.000Z" },
    );

    expect(event.eventType).toBe("receipt.created");
    expect(event.paths).toEqual(["src/index.ts"]);
    expect(event.payload.diagnosticCount).toBe(4);
    expect(JSON.stringify(event)).not.toContain("private prompt");
    expect(JSON.stringify(event)).not.toContain("private response");
    expect(JSON.stringify(event)).not.toContain("private command output");

    const evidence = evidenceFromAgentEvent(event);
    expect(evidence?.kind).toBe("lsp-diagnostic");
    expect(evidence?.contentStored).toBe(false);
  });
});

describe("instruction provenance", () => {
  it("detects instruction drift without returning file contents", () => {
    const root = mkdtempSync(join(tmpdir(), "agent-nudge-provenance-"));
    temporaryDirectories.push(root);
    mkdirSync(join(root, ".opencode", "skills"), { recursive: true });
    writeFileSync(join(root, "AGENTS.md"), "First instruction");
    writeFileSync(join(root, ".opencode", "skills", "review.md"), "Review skill");

    const before = scanInstructionProvenance(
      root,
      "2026-07-23T12:00:00.000Z",
    );
    writeFileSync(join(root, "AGENTS.md"), "Changed instruction");
    const after = scanInstructionProvenance(
      root,
      "2026-07-23T12:01:00.000Z",
    );
    const drift = compareInstructionProvenance(before, after);

    expect(before.scannedFileCount).toBe(2);
    expect(before.contentStored).toBe(false);
    expect(drift.changed).toBe(true);
    expect(drift.modified.map((item) => item.path)).toContain("AGENTS.md");
    expect(JSON.stringify(after)).not.toContain("Changed instruction");
  });
});

describe("repeated failure assurance", () => {
  it("requires a replan on the third unchanged failure", () => {
    const inputDigest = digestAttemptValue({ command: "npm test" });
    const outcomeDigest = digestAttemptValue({ failure: "same-test" });
    const attempt = (id: string, minute: number): ActionAttempt => ({
      id,
      projectId: "project-1",
      sessionId: `session-${id}`,
      provider: "opencode",
      actionClass: "test",
      targetKeys: ["tests/unit/cache.test.ts"],
      inputDigest,
      outcomeDigest,
      outcome: "failure",
      at: `2026-07-23T12:0${minute}:00.000Z`,
    });

    const result = assessDoomLoop(attempt("3", 3), [
      attempt("1", 1),
      attempt("2", 2),
    ]);
    expect(result.status).toBe("REVIEW");
    expect(result.requiredReplan).toBe(true);
    expect(result.repeatedAttempts).toBe(3);
  });
});

describe("task, recovery, and merge contracts", () => {
  it("holds work until declared dependencies complete", () => {
    const base: AssuranceTask = {
      id: "task-base",
      projectId: "project-1",
      title: "Create API",
      state: "active",
      dependencyTaskIds: [],
      paths: ["src/api.ts"],
      expectedArtifacts: [],
      acceptanceChecks: [],
      updatedAt: "2026-07-23T12:00:00.000Z",
    };
    const consumer: AssuranceTask = {
      ...base,
      id: "task-consumer",
      title: "Use API",
      state: "ready",
      dependencyTaskIds: ["task-base"],
      paths: ["src/client.ts"],
    };
    expect(assessTaskStart(consumer, [base, consumer]).status).toBe("HOLD");
    expect(
      assessTaskStart(consumer, [{ ...base, state: "completed" }, consumer])
        .status,
    ).toBe("CLEAR");
  });

  it("never restores automatically and reports incomplete coverage", () => {
    const preview = previewRestore({
      schemaVersion: 1,
      id: "checkpoint-1",
      projectId: "project-1",
      sessionId: "session-1",
      provider: "opencode",
      kind: "provider-native",
      coverage: {
        files: true,
        conversation: false,
        worktree: true,
        environment: false,
      },
      dirtyPathKeys: [],
      createdAt: "2026-07-23T12:00:00.000Z",
      state: "valid",
      sourceHash: "a".repeat(64),
      contentStored: false,
    });
    expect(preview.status).toBe("REVIEW");
    expect(preview.requiresApproval).toBe(true);
    expect(preview.notCovered).toContain("conversation");
  });

  it("holds exact-path collisions and reviews shared lockfiles", () => {
    expect(classifyPathRisk("src/cache.ts", "src\\cache.ts").severity).toBe(
      "hold",
    );
    const report = assessMergeRisk({
      leftPaths: ["src/a.ts", "package-lock.json"],
      rightPaths: ["src/b.ts", "package-lock.json"],
    });
    expect(report.status).toBe("HOLD");
    expect(report.destructiveActionTaken).toBe(false);
  });
});

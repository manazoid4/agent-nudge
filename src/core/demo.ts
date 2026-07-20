import { randomUUID } from "node:crypto";
import { compileNudge, decideNudge } from "./engine.js";
import type { AgentSession, ContextFact, Nudge } from "./schemas.js";

const iso = (offsetMinutes = 0) =>
  new Date(Date.now() + offsetMinutes * 60_000).toISOString();

export type DemoScenario = "conflict" | "decision" | "failure" | "irrelevant";

export function buildScenario(kind: DemoScenario): {
  author: AgentSession;
  recipient: AgentSession;
  fact: ContextFact;
  nudge?: Nudge;
  suppressed: boolean;
  reason: string;
} {
  const projectId = "project-agent-nudge";
  const author = session(
    `claude-${kind}`,
    "claude-code",
    projectId,
    ["src/lib/cache.ts"],
    ["cache", "architecture"],
  );
  const recipientPaths =
    kind === "decision"
      ? ["src/auth/session.ts"]
      : kind === "irrelevant"
        ? ["src/payments/stripe.ts"]
        : ["src/lib/cache.ts"];
  const recipientTags =
    kind === "decision"
      ? ["auth", "sessions"]
      : kind === "irrelevant"
        ? ["payments"]
        : ["cache", "redis"];
  const recipient = session(
    `codex-${kind}`,
    "codex",
    projectId,
    recipientPaths,
    recipientTags,
  );
  const definitions: Record<
    DemoScenario,
    Pick<ContextFact, "kind" | "title" | "summary" | "paths" | "tags">
  > = {
    conflict: {
      kind: "claim",
      title: "Claude is editing cache.ts",
      summary:
        "Another active agent has claimed the same file. Coordinate before writing.",
      paths: ["src/lib/cache.ts"],
      tags: ["cache"],
    },
    decision: {
      kind: "decision",
      title: "Session storage decision changed",
      summary: "Use signed cookies, not localStorage, for session state.",
      paths: ["src/auth/session.ts"],
      tags: ["auth", "sessions"],
    },
    failure: {
      kind: "failure",
      title: "Redis caching approach failed",
      summary:
        "Integration tests exposed stale reads after invalidation. Do not repeat without addressing the receipt.",
      paths: ["src/lib/cache.ts"],
      tags: ["cache", "redis"],
    },
    irrelevant: {
      kind: "change",
      title: "Documentation punctuation updated",
      summary: "A changelog typo was corrected.",
      paths: ["docs/changelog.md"],
      tags: ["copy"],
    },
  };
  const data = definitions[kind];
  const fact: ContextFact = {
    id: `fact-${kind}-${randomUUID().slice(0, 8)}`,
    schemaVersion: 1,
    projectId,
    authorSessionId: author.id,
    ...data,
    sourceRefs: [
      {
        type: kind === "failure" ? "test-run" : "hook-event",
        label:
          kind === "failure"
            ? "integration/cache.test.ts · 3 failures"
            : "Claude session receipt",
        sessionId: author.id,
        filePath: data.paths[0],
        sourceHash: randomUUID().replaceAll("-", ""),
      },
    ],
    confidence: 0.94,
    createdAt: iso(-8),
    effectiveAt: iso(-8),
    expiresAt: iso(24 * 60),
    contradictsFactIds: [],
    dependsOnFactIds: [],
    invalidatesFactIds: [],
    sensitivity: "normal",
    extensionMetadata: {},
  };
  const decision = decideNudge(fact, recipient);
  return {
    author,
    recipient,
    fact,
    nudge: decision.suppressed
      ? undefined
      : compileNudge(fact, recipient, decision),
    suppressed: decision.suppressed,
    reason: decision.reason,
  };
}

function session(
  id: string,
  provider: AgentSession["provider"],
  projectId: string,
  paths: string[],
  tags: string[],
): AgentSession {
  return {
    id,
    schemaVersion: 1,
    provider,
    projectId,
    projectName: "Agent Nudge",
    cwd: "C:\\Users\\demo\\Projects\\agent-nudge",
    startedAt: iso(-40),
    lastSeenAt: iso(-1),
    status: "active",
    activeTask: { summary: `Working on ${tags.join(" ")}`, paths, tags },
    extensionMetadata: {},
  };
}

export function buildAllScenarios() {
  return (["conflict", "decision", "failure", "irrelevant"] as const).map(
    buildScenario,
  );
}

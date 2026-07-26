import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { redactText } from "../core/redaction.js";

export type ContextDrift =
  "current" | "changed" | "new" | "missing" | "untracked";

export type ContextReceipt = {
  repoKey: string;
  compiledAt: string;
  outputDigest: string;
  sourceDigests: Record<string, string>;
  tokenBudget: number;
};

export type ContextHealth = {
  repository: {
    key: string;
    name: string;
    path: string;
    branch: string;
    dirty: boolean;
    changedFiles: number;
    stagedFiles: number;
  };
  sources: Array<{
    name: string;
    path: string;
    present: boolean;
    lines: number;
    estimatedTokens: number;
    digest?: string;
    drift: ContextDrift;
    modifiedAt?: string;
  }>;
  totals: {
    lines: number;
    estimatedTokens: number;
    tokenBudget: number;
    budgetUsedPercent: number;
    changedSources: number;
  };
  lastCompiledAt?: string;
  outputDigest?: string;
};

const SOURCE_PATHS = [
  "AGENTS.md",
  "CLAUDE.md",
  "HANDOFF.md",
  ".agent-state/HANDOFF.md",
  "BUILD_PLAN.md",
  "plan.md",
  ".agent-nudge/rules.json",
] as const;

export function repositoryKey(repoPath: string) {
  const canonical = canonicalRepositoryPath(repoPath);
  const normalized =
    process.platform === "win32" ? canonical.toLowerCase() : canonical;
  return createHash("sha256").update(normalized).digest("hex").slice(0, 20);
}

export function inspectContextHealth(
  repoPath: string,
  receipt?: ContextReceipt,
  tokenBudget = 16_000,
): ContextHealth {
  const canonical = canonicalRepositoryPath(repoPath);
  const key = repositoryKey(canonical);
  const status = git(canonical, ["status", "--short"]);
  const changed = status ? status.split(/\r?\n/).filter(Boolean) : [];
  const branch =
    git(canonical, ["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";

  const sources = SOURCE_PATHS.map((relativePath) => {
    const path = join(canonical, relativePath);
    const previous = receipt?.sourceDigests[relativePath];
    if (!existsSync(path) || !statSync(path).isFile()) {
      return {
        name: relativePath,
        path,
        present: false,
        lines: 0,
        estimatedTokens: 0,
        drift: previous ? ("missing" as const) : ("untracked" as const),
      };
    }

    const stat = statSync(path);
    const content = redactText(readFileSync(path, "utf8")).value;
    const digest = createHash("sha256").update(content).digest("hex");
    const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;
    const drift: ContextDrift = !receipt
      ? "untracked"
      : !previous
        ? "new"
        : previous === digest
          ? "current"
          : "changed";
    return {
      name: relativePath,
      path,
      present: true,
      lines,
      estimatedTokens: Math.ceil(content.length / 4),
      digest,
      drift,
      modifiedAt: stat.mtime.toISOString(),
    };
  });

  const estimatedTokens = sources.reduce(
    (total, source) => total + source.estimatedTokens,
    0,
  );
  return {
    repository: {
      key,
      name: basename(canonical),
      path: canonical,
      branch,
      dirty: changed.length > 0,
      changedFiles: changed.length,
      stagedFiles: changed.filter(
        (line) => line[0] && line[0] !== " " && line[0] !== "?",
      ).length,
    },
    sources,
    totals: {
      lines: sources.reduce((total, source) => total + source.lines, 0),
      estimatedTokens,
      tokenBudget,
      budgetUsedPercent:
        tokenBudget > 0
          ? Math.min(999, Math.round((estimatedTokens / tokenBudget) * 100))
          : 0,
      changedSources: sources.filter((source) =>
        ["changed", "new", "missing"].includes(source.drift),
      ).length,
    },
    lastCompiledAt: receipt?.compiledAt,
    outputDigest: receipt?.outputDigest,
  };
}

export function createContextReceipt(
  health: ContextHealth,
  outputDigest: string,
  compiledAt = new Date().toISOString(),
): ContextReceipt {
  return {
    repoKey: health.repository.key,
    compiledAt,
    outputDigest,
    tokenBudget: health.totals.tokenBudget,
    sourceDigests: Object.fromEntries(
      health.sources
        .filter(
          (source): source is typeof source & { digest: string } =>
            source.present && Boolean(source.digest),
        )
        .map((source) => [source.name, source.digest]),
    ),
  };
}

function canonicalRepositoryPath(repoPath: string) {
  const candidate = resolve(repoPath);
  if (!existsSync(candidate)) throw new Error("repository_not_found");
  const canonical = realpathSync.native(candidate);
  const gitRoot = git(canonical, ["rev-parse", "--show-toplevel"]);
  return gitRoot ? realpathSync.native(gitRoot) : canonical;
}

function git(cwd: string, args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      timeout: 2_000,
      maxBuffer: 256 * 1024,
    }).trimEnd();
  } catch {
    return "";
  }
}

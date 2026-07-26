import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";

export const worktreeRecordSchema = z.object({
  path: z.string().min(1),
  head: z.string().max(64).optional(),
  branch: z.string().optional(),
  detached: z.boolean(),
  bare: z.boolean(),
  locked: z.boolean(),
  lockReason: z.string().optional(),
  prunable: z.boolean(),
  pruneReason: z.string().optional(),
  dirty: z.boolean(),
  stagedCount: z.number().int().nonnegative(),
  unstagedCount: z.number().int().nonnegative(),
  untrackedCount: z.number().int().nonnegative(),
  changedPathKeys: z.array(z.string().max(1024)).max(500),
});

export const worktreeInventorySchema = z.object({
  schemaVersion: z.literal(1),
  repositoryRoot: z.string().min(1),
  repositoryId: z.string().length(64),
  commonGitDirectory: z.string().min(1),
  generatedAt: z.string().datetime(),
  worktrees: z.array(worktreeRecordSchema),
  contentStored: z.literal(false),
  destructiveActionTaken: z.literal(false),
});

export type WorktreeRecord = z.infer<typeof worktreeRecordSchema>;
export type WorktreeInventory = z.infer<typeof worktreeInventorySchema>;

type ParsedWorktree = Omit<
  WorktreeRecord,
  | "dirty"
  | "stagedCount"
  | "unstagedCount"
  | "untrackedCount"
  | "changedPathKeys"
>;

export function parseWorktreePorcelain(output: string): ParsedWorktree[] {
  const records: ParsedWorktree[] = [];
  let current: Partial<ParsedWorktree> | undefined;
  const flush = () => {
    if (!current?.path) return;
    records.push({
      path: current.path,
      head: current.head,
      branch: current.branch,
      detached: current.detached ?? false,
      bare: current.bare ?? false,
      locked: current.locked ?? false,
      lockReason: current.lockReason,
      prunable: current.prunable ?? false,
      pruneReason: current.pruneReason,
    });
  };

  for (const line of output.split(/\r?\n/)) {
    if (!line) {
      flush();
      current = undefined;
      continue;
    }
    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ").trim();
    if (key === "worktree") {
      if (current?.path) flush();
      current = { path: value };
      continue;
    }
    if (!current) continue;
    if (key === "HEAD") current.head = value;
    else if (key === "branch")
      current.branch = value.replace(/^refs\/heads\//, "");
    else if (key === "detached") current.detached = true;
    else if (key === "bare") current.bare = true;
    else if (key === "locked") {
      current.locked = true;
      current.lockReason = value || undefined;
    } else if (key === "prunable") {
      current.prunable = true;
      current.pruneReason = value || undefined;
    }
  }
  flush();
  return records;
}

export function parseStatusPorcelainV1(output: string) {
  let stagedCount = 0;
  let unstagedCount = 0;
  let untrackedCount = 0;
  const changedPathKeys: string[] = [];

  for (const entry of output.split("\0").filter(Boolean)) {
    if (entry.length < 4) continue;
    const x = entry[0];
    const y = entry[1];
    const path = entry.slice(3).trim().replaceAll("\\", "/");
    if (x === "?" && y === "?") untrackedCount += 1;
    else {
      if (x !== " " && x !== "?") stagedCount += 1;
      if (y !== " " && y !== "?") unstagedCount += 1;
    }
    if (path && changedPathKeys.length < 500)
      changedPathKeys.push(path.toLowerCase());
  }

  return {
    dirty: stagedCount + unstagedCount + untrackedCount > 0,
    stagedCount,
    unstagedCount,
    untrackedCount,
    changedPathKeys: Array.from(new Set(changedPathKeys)),
  };
}

export function inspectWorktrees(
  repositoryPath: string,
  now = new Date().toISOString(),
): WorktreeInventory {
  const repositoryRoot = safeRealPath(resolve(repositoryPath));
  const commonGitDirectory = runGit(repositoryRoot, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]).trim();
  const porcelain = runGit(repositoryRoot, ["worktree", "list", "--porcelain"]);
  const parsed = parseWorktreePorcelain(porcelain);
  const worktrees = parsed.map((worktree) => {
    if (worktree.bare)
      return worktreeRecordSchema.parse({
        ...worktree,
        dirty: false,
        stagedCount: 0,
        unstagedCount: 0,
        untrackedCount: 0,
        changedPathKeys: [],
      });
    const status = spawnSync(
      "git",
      [
        "-C",
        worktree.path,
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=normal",
      ],
      {
        encoding: "utf8",
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
    );
    const summary = status.error
      ? {
          dirty: false,
          stagedCount: 0,
          unstagedCount: 0,
          untrackedCount: 0,
          changedPathKeys: [],
        }
      : parseStatusPorcelainV1(status.stdout ?? "");
    return worktreeRecordSchema.parse({ ...worktree, ...summary });
  });
  const repositoryId = createHash("sha256")
    .update(normalizeIdentity(commonGitDirectory))
    .digest("hex");

  return worktreeInventorySchema.parse({
    schemaVersion: 1,
    repositoryRoot,
    repositoryId,
    commonGitDirectory,
    generatedAt: now,
    worktrees,
    contentStored: false,
    destructiveActionTaken: false,
  });
}

function runGit(cwd: string, args: string[]) {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `git_worktree_inspection_failed:${String(result.stderr || result.error || result.status)}`,
    );
  return result.stdout;
}

function safeRealPath(path: string) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function normalizeIdentity(path: string) {
  const normalized = path.trim().replaceAll("\\", "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { z } from "zod";

export const instructionDigestSchema = z.object({
  path: z.string().min(1),
  provider: z.string().min(1),
  scope: z.enum(["repository", "directory", "provider", "user"]),
  kind: z.enum(["instruction", "rule", "skill", "agent", "plugin", "config"]),
  sha256: z.string().length(64),
  sizeBytes: z.number().int().nonnegative(),
  modifiedAt: z.string().datetime(),
  trust: z.enum(["trusted", "untrusted", "unknown"]),
});

export const instructionProvenanceReportSchema = z.object({
  schemaVersion: z.literal(1),
  root: z.string().min(1),
  generatedAt: z.string().datetime(),
  digests: z.array(instructionDigestSchema),
  reportDigest: z.string().length(64),
  warnings: z.array(z.string()),
  scannedFileCount: z.number().int().nonnegative(),
  skippedFileCount: z.number().int().nonnegative(),
  contentStored: z.literal(false),
});

export type InstructionDigest = z.infer<typeof instructionDigestSchema>;
export type InstructionProvenanceReport = z.infer<
  typeof instructionProvenanceReportSchema
>;

const maxFileBytes = 1024 * 1024;
const maxFiles = 500;

const exactCandidates = [
  ["AGENTS.md", "shared", "repository", "instruction"],
  ["CLAUDE.md", "claude-code", "repository", "instruction"],
  ["GEMINI.md", "gemini-cli", "repository", "instruction"],
  [
    ".github/copilot-instructions.md",
    "github-copilot",
    "repository",
    "instruction",
  ],
  [".opencode/config.json", "opencode", "provider", "config"],
  ["opencode.json", "opencode", "repository", "config"],
  [".cursor/rules", "cursor", "provider", "rule"],
  [".clinerules", "cline", "provider", "rule"],
  [".roo/rules", "roo-code", "provider", "rule"],
] as const;

const directoryCandidates = [
  [".claude/rules", "claude-code", "rule"],
  [".claude/agents", "claude-code", "agent"],
  [".claude/skills", "claude-code", "skill"],
  [".opencode/agents", "opencode", "agent"],
  [".opencode/skills", "opencode", "skill"],
  [".opencode/plugins", "opencode", "plugin"],
  [".github/agents", "github-copilot", "agent"],
  [".github/skills", "github-copilot", "skill"],
  [".github/hooks", "github-copilot", "config"],
  [".gemini/agents", "gemini-cli", "agent"],
  [".gemini/skills", "gemini-cli", "skill"],
  [".gemini/extensions", "gemini-cli", "plugin"],
] as const;

export function scanInstructionProvenance(
  rootPath: string,
  now = new Date().toISOString(),
): InstructionProvenanceReport {
  const root = resolve(rootPath);
  const digests: InstructionDigest[] = [];
  const warnings: string[] = [];
  let skippedFileCount = 0;

  const addFile = (
    absolutePath: string,
    provider: string,
    scope: InstructionDigest["scope"],
    kind: InstructionDigest["kind"],
  ) => {
    if (digests.length >= maxFiles) {
      skippedFileCount += 1;
      return;
    }
    if (!isInside(root, absolutePath) || !existsSync(absolutePath)) return;
    const stat = lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      skippedFileCount += 1;
      return;
    }
    if (stat.size > maxFileBytes) {
      warnings.push(
        `${toRelative(root, absolutePath)} exceeds the 1 MiB provenance limit.`,
      );
      skippedFileCount += 1;
      return;
    }
    const bytes = readFileSync(absolutePath);
    digests.push({
      path: toRelative(root, absolutePath),
      provider,
      scope,
      kind,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.byteLength,
      modifiedAt: stat.mtime.toISOString(),
      trust: "unknown",
    });
  };

  for (const [path, provider, scope, kind] of exactCandidates) {
    const absolutePath = resolve(root, path);
    if (!isInside(root, absolutePath) || !existsSync(absolutePath)) continue;
    const stat = lstatSync(absolutePath);
    if (stat.isDirectory()) {
      scanDirectory(absolutePath, (file) =>
        addFile(file, provider, scope, kind),
      );
    } else {
      addFile(absolutePath, provider, scope, kind);
    }
  }

  for (const [path, provider, kind] of directoryCandidates) {
    const absolutePath = resolve(root, path);
    if (!isInside(root, absolutePath) || !existsSync(absolutePath)) continue;
    scanDirectory(absolutePath, (file) =>
      addFile(file, provider, "provider", kind),
    );
  }

  digests.sort((left, right) => left.path.localeCompare(right.path));
  const reportDigest = createHash("sha256")
    .update(
      digests
        .map((item) => `${item.path}:${item.sha256}:${item.modifiedAt}`)
        .join("\n"),
    )
    .digest("hex");

  const providers = new Set(digests.map((item) => item.provider));
  if (providers.size > 1) {
    warnings.push(
      "Multiple instruction systems are active. Review precedence before consequential actions.",
    );
  }

  return instructionProvenanceReportSchema.parse({
    schemaVersion: 1,
    root,
    generatedAt: now,
    digests,
    reportDigest,
    warnings,
    scannedFileCount: digests.length,
    skippedFileCount,
    contentStored: false,
  });
}

export function compareInstructionProvenance(
  previous: InstructionProvenanceReport,
  current: InstructionProvenanceReport,
) {
  const before = new Map(previous.digests.map((item) => [item.path, item]));
  const after = new Map(current.digests.map((item) => [item.path, item]));
  const added = current.digests.filter((item) => !before.has(item.path));
  const removed = previous.digests.filter((item) => !after.has(item.path));
  const changed = current.digests.filter((item) => {
    const old = before.get(item.path);
    return old !== undefined && old.sha256 !== item.sha256;
  });

  return {
    changed: added.length > 0 || removed.length > 0 || changed.length > 0,
    added,
    removed,
    modified: changed,
    previousDigest: previous.reportDigest,
    currentDigest: current.reportDigest,
  };
}

function scanDirectory(directory: string, visit: (path: string) => void) {
  const stack = [directory];
  let visited = 0;
  while (stack.length > 0 && visited < maxFiles) {
    const current = stack.pop();
    if (!current) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (visited >= maxFiles) break;
      const path = resolve(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (!entry.isFile()) continue;
      visited += 1;
      visit(path);
    }
  }
}

function isInside(root: string, candidate: string) {
  const relativePath = relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== "..")
  );
}

function toRelative(root: string, path: string) {
  return relative(root, path).replaceAll("\\", "/");
}

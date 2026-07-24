import { existsSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { ContextSource, SkippedSource } from "./types.js";
import { redactText } from "../core/redaction.js";

const SIZE_LIMIT = 30000; // 30KB safety limit

function computeDigest(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function readRepositoryContext(
  repoPath: string
): { sources: ContextSource[]; skippedSources: SkippedSource[] } {
  const sources: ContextSource[] = [];
  const skippedSources: SkippedSource[] = [];

  const filesToRead = [
    { name: "AGENTS.md", trustLevel: "Repo" as const },
    { name: "CLAUDE.md", trustLevel: "Repo" as const },
    { name: "HANDOFF.md", trustLevel: "Repo" as const },
    { name: ".agent-state/HANDOFF.md", trustLevel: "Repo" as const },
    { name: "BUILD_PLAN.md", trustLevel: "Repo" as const },
    { name: "plan.md", trustLevel: "Repo" as const }
  ];

  for (const f of filesToRead) {
    const fullPath = join(repoPath, f.name);
    if (!existsSync(fullPath)) {
      continue;
    }

    // Exclude .env check (in case it's somehow matches)
    if (basename(fullPath).includes(".env")) {
      skippedSources.push({ path: fullPath, reason: "Security block: .env file excluded." });
      continue;
    }

    try {
      const stats = statSync(fullPath);
      if (stats.size > SIZE_LIMIT) {
        skippedSources.push({
          path: fullPath,
          reason: `File size ${stats.size} exceeds limit of ${SIZE_LIMIT} bytes.`
        });
        continue;
      }

      const raw = readFileSync(fullPath, "utf-8");
      // Run the built-in redactor on the content
      const { value: redacted } = redactText(raw);

      sources.push({
        path: fullPath,
        type: "file",
        content: redacted,
        lastModified: stats.mtime,
        trustLevel: f.trustLevel,
        digest: computeDigest(redacted)
      });
    } catch (e: any) {
      skippedSources.push({
        path: fullPath,
        reason: `Read failed: ${e.message}`
      });
    }
  }

  // package.json parsing for validation scripts
  const packageJsonPath = join(repoPath, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const raw = readFileSync(packageJsonPath, "utf-8");
      const parsed = JSON.parse(raw);
      const scripts = parsed.scripts || {};
      
      const validationKeys = ["test", "lint", "typecheck", "build", "format"];
      const foundScripts: Record<string, string> = {};
      
      for (const k of validationKeys) {
        if (scripts[k]) {
          foundScripts[k] = scripts[k];
        }
      }

      if (Object.keys(foundScripts).length > 0) {
        const contentStr = JSON.stringify(foundScripts, null, 2);
        sources.push({
          path: packageJsonPath,
          type: "command",
          content: contentStr,
          trustLevel: "Repo",
          digest: computeDigest(contentStr)
        });
      }
    } catch {
      // Ignore failures parsing package.json scripts
    }
  }

  // Git state
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoPath, encoding: "utf-8" }).trim();
    const status = execSync("git status --short", { cwd: repoPath, encoding: "utf-8" }).trim();
    const content = `Branch: ${branch}\nDirty: ${status ? "yes" : "no"}\nStatus:\n${status || "Clean"}`;
    sources.push({
      path: join(repoPath, ".git"),
      type: "git",
      content,
      trustLevel: "Repo",
      digest: computeDigest(content)
    });
  } catch {
    sources.push({
      path: join(repoPath, ".git"),
      type: "git",
      content: "Git status: unavailable or not a repository.",
      trustLevel: "Unknown",
      digest: computeDigest("Git status: unavailable or not a repository.")
    });
  }

  return { sources, skippedSources };
}

import { execFileSync } from "node:child_process";
import { existsSync, realpathSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { redactText } from "../core/redaction.js";

export type ChangeCategory =
  "Added" | "Changed" | "Fixed" | "Security" | "Documentation" | "Internal";

export type ChangeItem = {
  hash: string;
  shortHash: string;
  subject: string;
  category: ChangeCategory;
  breaking: boolean;
};

export type ChangelogResult = {
  repository: string;
  range: string;
  markdown: string;
  items: ChangeItem[];
  output?: string;
};

const CATEGORY_ORDER: ChangeCategory[] = [
  "Added",
  "Changed",
  "Fixed",
  "Security",
  "Documentation",
  "Internal",
];

export function generateChangelog(options: {
  repoPath: string;
  since?: string;
  to?: string;
  applyPath?: string;
}): ChangelogResult {
  const repository = canonical(options.repoPath);
  const to = options.to ?? "HEAD";
  const range = options.since ? `${options.since}..${to}` : to;
  const output = git(repository, [
    "log",
    "--no-merges",
    "--format=%H%x1f%h%x1f%s%x1e",
    range,
  ]);
  const items = output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash = "", shortHash = "", rawSubject = ""] = record.split("\x1f");
      const subject = redactText(rawSubject.trim()).value.slice(0, 240);
      return {
        hash,
        shortHash,
        subject: cleanSubject(subject),
        category: category(subject),
        breaking: /!:|BREAKING CHANGE/i.test(subject),
      };
    });
  const markdown = render(items, range);
  let written: string | undefined;
  if (options.applyPath) {
    const target = resolve(repository, options.applyPath);
    const rel = relative(repository, target);
    if (rel.startsWith(".."))
      throw new Error("changelog_path_outside_repository");
    writeFileSync(target, markdown, { encoding: "utf8" });
    written = target;
  }
  return { repository, range, markdown, items, output: written };
}

function render(items: ChangeItem[], range: string) {
  const lines = [
    "# Changelog",
    "",
    `Generated from \`${range}\` by Agent Nudge.`,
    "",
  ];
  for (const heading of CATEGORY_ORDER) {
    const matching = items.filter((item) => item.category === heading);
    if (matching.length === 0) continue;
    lines.push(`## ${heading}`, "");
    for (const item of matching) {
      lines.push(
        `- ${item.breaking ? "**BREAKING:** " : ""}${item.subject} (\`${item.shortHash}\`)`,
      );
    }
    lines.push("");
  }
  if (items.length === 0) lines.push("_No commits found for this range._", "");
  return `${lines.join("\n").trimEnd()}\n`;
}

function category(subject: string): ChangeCategory {
  const value = subject.toLowerCase();
  if (/^(feat|add)(\(.+\))?!?:/.test(value)) return "Added";
  if (/^(fix|bug)(\(.+\))?!?:/.test(value)) return "Fixed";
  if (/^(security|sec)(\(.+\))?!?:/.test(value)) return "Security";
  if (/^(docs?)(\(.+\))?!?:/.test(value)) return "Documentation";
  if (/^(refactor|perf|change)(\(.+\))?!?:/.test(value)) return "Changed";
  if (/vulnerab|credential|cve|xss|csrf/.test(value)) return "Security";
  if (/fix|repair|resolve|correct/.test(value)) return "Fixed";
  if (/readme|documentation|docs/.test(value)) return "Documentation";
  return "Internal";
}

function cleanSubject(subject: string) {
  return subject
    .replace(/^[a-z]+(?:\([^)]+\))?!?:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonical(repoPath: string) {
  const candidate = resolve(repoPath);
  if (!existsSync(candidate)) throw new Error("repository_not_found");
  return realpathSync.native(candidate);
}

function git(cwd: string, args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`changelog_git_failed:${String(error)}`);
  }
}

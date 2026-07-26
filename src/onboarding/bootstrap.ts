import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export type BootstrapAction = {
  path: string;
  relativePath: string;
  state: "create" | "exists";
};

export type BootstrapPlan = {
  repository: string;
  applied: boolean;
  actions: BootstrapAction[];
};

const STARTER_FILES: Record<string, string> = {
  "AGENTS.md": `# Repository Agent Rules

- Read this file and the repository state before editing.
- Keep changes scoped to the active task.
- Run the repository validation commands before claiming completion.
- Never include credentials, environment values, or private material in agent context.
`,
  "CLAUDE.md": `# Claude Project Context

Read \`AGENTS.md\` before acting. Use Agent Nudge to compile current repository context and surface conflicting instructions before consequential changes.
`,
  ".agent-nudge/rules.json": `${JSON.stringify(
    {
      version: 1,
      tokenBudget: 16000,
      profile: "default",
      watch: ["AGENTS.md", "CLAUDE.md", "package.json"],
    },
    null,
    2,
  )}\n`,
};

export function bootstrapRepository(
  repoPath: string,
  apply = false,
): BootstrapPlan {
  const repository = repositoryRoot(repoPath);
  const actions = Object.keys(STARTER_FILES).map((relativePath) => {
    const path = join(repository, relativePath);
    if (existsSync(path) && lstatSync(path).isSymbolicLink())
      throw new Error(`bootstrap_refuses_symbolic_link:${relativePath}`);
    return {
      path,
      relativePath,
      state: existsSync(path) ? ("exists" as const) : ("create" as const),
    };
  });

  if (apply) {
    for (const action of actions) {
      if (action.state !== "create") continue;
      assertContained(repository, action.path);
      mkdirSync(dirname(action.path), { recursive: true });
      writeFileSync(action.path, STARTER_FILES[action.relativePath] ?? "", {
        encoding: "utf8",
        flag: "wx",
      });
    }
  }
  return { repository, applied: apply, actions };
}

function repositoryRoot(repoPath: string) {
  const candidate = resolve(repoPath);
  if (!existsSync(candidate)) throw new Error("repository_not_found");
  const canonical = realpathSync.native(candidate);
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: canonical,
      encoding: "utf8",
      windowsHide: true,
      timeout: 2_000,
    }).trim();
    return realpathSync.native(root);
  } catch {
    return canonical;
  }
}

function assertContained(root: string, target: string) {
  const path = relative(root, target);
  if (path.startsWith("..") || resolve(root, path) !== resolve(target))
    throw new Error("bootstrap_path_outside_repository");
}

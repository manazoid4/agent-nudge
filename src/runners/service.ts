import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { redactText } from "../core/redaction.js";

export type RunnerProvider = "claude" | "codex" | "aider";
export type RunnerState = "running" | "completed" | "failed" | "cancelled";

export type RunnerSpec = {
  provider: RunnerProvider;
  executable: string;
  args: string[];
  input: "stdin" | "file";
};

export type RunnerJob = {
  id: string;
  provider: RunnerProvider;
  repository: string;
  state: RunnerState;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  output: string;
  error: string;
};

const DEFAULT_SPECS: RunnerSpec[] = [
  { provider: "claude", executable: "claude", args: ["-p"], input: "stdin" },
  {
    provider: "codex",
    executable: "codex",
    args: ["exec", "-"],
    input: "stdin",
  },
  {
    provider: "aider",
    executable: "aider",
    args: ["--message-file", "{briefFile}"],
    input: "file",
  },
];

export class RunnerService {
  private readonly specs: RunnerSpec[];
  private readonly jobs = new Map<string, RunnerJob>();
  private readonly processes = new Map<
    string,
    ChildProcessWithoutNullStreams
  >();
  private readonly maxOutput = 64 * 1024;

  constructor(specs: RunnerSpec[] = DEFAULT_SPECS) {
    this.specs = specs;
  }

  list() {
    return this.specs.map((spec) => ({
      provider: spec.provider,
      executable: spec.executable,
      available: executableAvailable(spec.executable),
      transport: spec.input,
    }));
  }

  preview(provider: RunnerProvider, repoPath: string) {
    const spec = this.requireSpec(provider);
    return {
      provider,
      repository: this.repository(repoPath),
      executable: spec.executable,
      args: spec.args.map((arg) =>
        arg === "{briefFile}" ? "<temporary-redacted-brief-file>" : arg,
      ),
      transport: spec.input,
      available: executableAvailable(spec.executable),
    };
  }

  start(provider: RunnerProvider, repoPath: string, brief: string) {
    if (!brief.trim()) throw new Error("brief_required");
    if (Buffer.byteLength(brief, "utf8") > 256 * 1024)
      throw new Error("brief_too_large");
    const spec = this.requireSpec(provider);
    const repository = this.repository(repoPath);
    if (!executableAvailable(spec.executable))
      throw new Error(`runner_unavailable:${provider}`);
    const id = randomUUID();
    let briefFile: string | undefined;
    const args = [...spec.args];
    if (spec.input === "file") {
      const directory = join(tmpdir(), "agent-nudge-runs");
      mkdirSync(directory, { recursive: true });
      briefFile = join(directory, `${id}.md`);
      writeFileSync(briefFile, redactText(brief).value, {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      });
      for (let index = 0; index < args.length; index += 1) {
        if (args[index] === "{briefFile}") args[index] = briefFile;
      }
    }
    const job: RunnerJob = {
      id,
      provider,
      repository,
      state: "running",
      startedAt: new Date().toISOString(),
      output: "",
      error: "",
    };
    this.jobs.set(id, job);
    const child = spawn(spec.executable, args, {
      cwd: repository,
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, AGENT_NUDGE_RUN_ID: id },
    });
    this.processes.set(id, child);
    child.stdin.end(spec.input === "stdin" ? brief : undefined);
    child.stdout.on("data", (chunk) => this.append(job, "output", chunk));
    child.stderr.on("data", (chunk) => this.append(job, "error", chunk));
    child.on("error", (error) => {
      job.state = "failed";
      job.error = redactText(error.message).value;
      job.finishedAt = new Date().toISOString();
      this.cleanup(id, briefFile);
    });
    child.on("close", (code) => {
      if (job.state === "running")
        job.state = code === 0 ? "completed" : "failed";
      job.exitCode = code ?? undefined;
      job.finishedAt = new Date().toISOString();
      this.cleanup(id, briefFile);
    });
    return job;
  }

  get(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error("runner_job_not_found");
    return job;
  }

  cancel(id: string) {
    const job = this.get(id);
    const child = this.processes.get(id);
    if (child && job.state === "running") {
      child.kill();
      job.state = "cancelled";
      job.finishedAt = new Date().toISOString();
    }
    return job;
  }

  private append(job: RunnerJob, field: "output" | "error", chunk: unknown) {
    const current = job[field];
    if (current.length >= this.maxOutput) return;
    const value = redactText(String(chunk)).value;
    job[field] = `${current}${value}`.slice(0, this.maxOutput);
  }

  private cleanup(id: string, briefFile?: string) {
    this.processes.delete(id);
    if (briefFile && existsSync(briefFile)) rmSync(briefFile, { force: true });
  }

  private requireSpec(provider: RunnerProvider) {
    const spec = this.specs.find((item) => item.provider === provider);
    if (!spec) throw new Error("unsupported_runner");
    return spec;
  }

  private repository(repoPath: string) {
    const repository = resolve(repoPath);
    if (!existsSync(repository)) throw new Error("repository_not_found");
    return repository;
  }
}

function executableAvailable(executable: string) {
  if (existsSync(executable)) return true;
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [executable], {
    windowsHide: true,
    shell: false,
    encoding: "utf8",
    timeout: 1_500,
  });
  return result.status === 0 && Boolean(result.stdout.trim());
}

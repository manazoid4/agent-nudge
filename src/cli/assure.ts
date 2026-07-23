#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getProviderCapability,
  listProviderCapabilities,
} from "../core/capabilities.js";
import { scanInstructionProvenance } from "../core/instruction-provenance.js";
import { assessMergeRisk } from "../core/merge-risk.js";
import {
  replayFixtureSchema,
  runDeterministicReplay,
} from "../core/replay-lab.js";
import {
  buildShadowReport,
  shadowEvaluationSchema,
} from "../core/shadow-mode.js";
import { inspectWorktrees } from "../core/worktrees.js";

const command = process.argv[2] ?? "help";

function main() {
  if (command === "capabilities") return capabilities();
  if (command === "instructions") return instructions();
  if (command === "merge-risk") return mergeRisk();
  if (command === "worktrees") return worktrees();
  if (command === "replay") return replay();
  if (command === "shadow-report") return shadowReport();
  help();
  if (command !== "help" && command !== "--help" && command !== "-h")
    process.exitCode = 2;
}

function capabilities() {
  const provider = process.argv[3];
  const result = provider
    ? getProviderCapability(provider)
    : listProviderCapabilities();
  if (!result) {
    console.error(`No capability manifest is available for ${provider}.`);
    process.exitCode = 2;
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

function instructions() {
  const root = resolve(process.argv[3] ?? process.cwd());
  console.log(JSON.stringify(scanInstructionProvenance(root), null, 2));
}

function mergeRisk() {
  const left = process.argv[3];
  const right = process.argv[4];
  if (!left || !right) {
    console.error(
      "Usage: agent-nudge-assure merge-risk <left-paths> <right-paths>",
    );
    process.exitCode = 2;
    return;
  }
  console.log(
    JSON.stringify(
      assessMergeRisk({
        leftPaths: splitList(left),
        rightPaths: splitList(right),
      }),
      null,
      2,
    ),
  );
}

function worktrees() {
  const root = resolve(process.argv[3] ?? process.cwd());
  console.log(JSON.stringify(inspectWorktrees(root), null, 2));
}

function replay() {
  const fixturePath = process.argv[3];
  const reviewAt = Number(process.argv[4] ?? 45);
  const holdAt = Number(process.argv[5] ?? 100);
  if (
    !fixturePath ||
    !Number.isFinite(reviewAt) ||
    !Number.isFinite(holdAt) ||
    reviewAt >= holdAt
  ) {
    console.error(
      "Usage: agent-nudge-assure replay <fixture.json> [review-threshold] [hold-threshold]",
    );
    process.exitCode = 2;
    return;
  }
  const fixture = replayFixtureSchema.parse(readJson(fixturePath));
  console.log(
    JSON.stringify(
      runDeterministicReplay(fixture, {
        id: "cli-policy",
        version: `review-${reviewAt}-hold-${holdAt}`,
        reviewAt,
        holdAt,
      }),
      null,
      2,
    ),
  );
}

function shadowReport() {
  const evaluationsPath = process.argv[3];
  if (!evaluationsPath) {
    console.error("Usage: agent-nudge-assure shadow-report <evaluations.json>");
    process.exitCode = 2;
    return;
  }
  const input = readJson(evaluationsPath);
  if (!Array.isArray(input))
    throw new Error("shadow_report_input_must_be_array");
  const evaluations = input.map((item) => shadowEvaluationSchema.parse(item));
  console.log(JSON.stringify(buildShadowReport(evaluations), null, 2));
}

function readJson(path: string): unknown {
  const absolutePath = resolve(path);
  const content = readFileSync(absolutePath, "utf8");
  if (content.length > 10 * 1024 * 1024)
    throw new Error("assurance_json_input_too_large");
  return JSON.parse(content) as unknown;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function help() {
  console.log(`Agent Nudge Assurance CLI

Commands:
  capabilities [provider]           Show observed, advisory, and enforced provider capabilities
  instructions [repository-path]    Hash active instructions, skills, agents, plugins, and rules
  merge-risk <left> <right>         Compare comma-separated path sets without modifying Git
  worktrees [repository-path]       Inventory worktrees, branches, locks, and dirty path keys
  replay <fixture.json> [review] [hold]
                                    Replay a privacy-safe fixture with deterministic thresholds
  shadow-report <evaluations.json>  Aggregate useful, wrong, changed-action, and prevention outcomes
  help                              Show this help

Examples:
  agent-nudge-assure capabilities opencode
  agent-nudge-assure instructions C:\\work\\project
  agent-nudge-assure merge-risk src/api.ts,package-lock.json src/ui.ts,package-lock.json
  agent-nudge-assure worktrees C:\\work\\project
  agent-nudge-assure replay docs/fixtures/replay-conflicts.json 45 100
  agent-nudge-assure shadow-report shadow-evaluations.json
`);
}

main();

#!/usr/bin/env node
import { resolve } from "node:path";
import {
  getProviderCapability,
  listProviderCapabilities,
} from "../core/capabilities.js";
import { scanInstructionProvenance } from "../core/instruction-provenance.js";
import { assessMergeRisk } from "../core/merge-risk.js";

const command = process.argv[2] ?? "help";

function main() {
  if (command === "capabilities") return capabilities();
  if (command === "instructions") return instructions();
  if (command === "merge-risk") return mergeRisk();
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
  help                              Show this help

Examples:
  agent-nudge-assure capabilities opencode
  agent-nudge-assure instructions C:\\work\\project
  agent-nudge-assure merge-risk src/api.ts,package-lock.json src/ui.ts,package-lock.json
`);
}

main();

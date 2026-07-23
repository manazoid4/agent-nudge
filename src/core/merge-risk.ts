import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { z } from "zod";

export const pathRiskSchema = z.object({
  left: z.string(),
  right: z.string(),
  kind: z.enum([
    "exact-path",
    "directory-overlap",
    "lockfile",
    "migration",
    "generated-file",
    "shared-config",
    "independent",
  ]),
  severity: z.enum(["none", "review", "hold"]),
  reason: z.string(),
});

export const mergeRiskReportSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(["CLEAR", "REVIEW", "HOLD"]),
  pathRisks: z.array(pathRiskSchema),
  gitSimulation: z.object({
    attempted: z.boolean(),
    supported: z.boolean(),
    conflictDetected: z.boolean(),
    exitCode: z.number().int().nullable(),
    summary: z.string(),
  }),
  destructiveActionTaken: z.literal(false),
});

export type PathRisk = z.infer<typeof pathRiskSchema>;
export type MergeRiskReport = z.infer<typeof mergeRiskReportSchema>;

export function classifyPathRisk(leftPath: string, rightPath: string): PathRisk {
  const left = normalizePath(leftPath);
  const right = normalizePath(rightPath);
  if (left === right) {
    return {
      left,
      right,
      kind: specialKind(left) ?? "exact-path",
      severity: "hold",
      reason: "Both tasks target the same normalised path.",
    };
  }
  const special = specialKind(left) ?? specialKind(right);
  if (special) {
    return {
      left,
      right,
      kind: special,
      severity: "review",
      reason: `The paths touch a shared ${special.replaceAll("-", " ")} surface.`,
    };
  }
  if (isAncestor(left, right) || isAncestor(right, left)) {
    return {
      left,
      right,
      kind: "directory-overlap",
      severity: "review",
      reason: "One target path contains the other target path.",
    };
  }
  return {
    left,
    right,
    kind: "independent",
    severity: "none",
    reason: "No direct path-level overlap was detected.",
  };
}

export function assessMergeRisk(input: {
  leftPaths: string[];
  rightPaths: string[];
  repositoryRoot?: string;
  leftRef?: string;
  rightRef?: string;
}): MergeRiskReport {
  const pathRisks = input.leftPaths.flatMap((left) =>
    input.rightPaths.map((right) => classifyPathRisk(left, right)),
  );
  const gitSimulation = simulateMergeTree(
    input.repositoryRoot,
    input.leftRef,
    input.rightRef,
  );
  const hasHold =
    pathRisks.some((risk) => risk.severity === "hold") ||
    gitSimulation.conflictDetected;
  const hasReview = pathRisks.some((risk) => risk.severity === "review");

  return mergeRiskReportSchema.parse({
    schemaVersion: 1,
    status: hasHold ? "HOLD" : hasReview ? "REVIEW" : "CLEAR",
    pathRisks,
    gitSimulation,
    destructiveActionTaken: false,
  });
}

function simulateMergeTree(
  repositoryRoot?: string,
  leftRef?: string,
  rightRef?: string,
) {
  if (!repositoryRoot || !leftRef || !rightRef) {
    return {
      attempted: false,
      supported: true,
      conflictDetected: false,
      exitCode: null,
      summary: "Git merge-tree simulation was not requested.",
    };
  }
  const result = spawnSync(
    "git",
    ["-C", resolve(repositoryRoot), "merge-tree", "--write-tree", leftRef, rightRef],
    {
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    },
  );
  if (result.error) {
    return {
      attempted: true,
      supported: false,
      conflictDetected: false,
      exitCode: result.status,
      summary: "Git merge-tree was unavailable or could not inspect the repository.",
    };
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const conflictDetected =
    result.status === 1 ||
    /CONFLICT|Auto-merging|changed in both|add\/add|modify\/delete/i.test(output);
  return {
    attempted: true,
    supported: true,
    conflictDetected,
    exitCode: result.status,
    summary: conflictDetected
      ? "Read-only git merge-tree simulation reported an integration conflict."
      : result.status === 0
        ? "Read-only git merge-tree simulation found no textual conflict."
        : "Git merge-tree returned an inconclusive result.",
  };
}

function normalizePath(path: string) {
  return path.trim().replaceAll("\\", "/").replace(/^\.\//, "").toLowerCase();
}

function isAncestor(parent: string, child: string) {
  return child.startsWith(`${parent.replace(/\/$/, "")}/`);
}

function specialKind(path: string): PathRisk["kind"] | undefined {
  const name = path.split("/").at(-1) ?? path;
  if (/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(name))
    return "lockfile";
  if (/(^|\/)(migrations?|schema)(\/|\.|$)/.test(path)) return "migration";
  if (/(^|\/)(dist|build|generated|codegen)(\/|$)/.test(path))
    return "generated-file";
  if (
    /(^|\/)(package\.json|tsconfig.*\.json|vite\.config\.|eslint\.config\.|\.github\/workflows)/.test(
      path,
    )
  )
    return "shared-config";
  return undefined;
}

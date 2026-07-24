# Prompt Pattern Cards

Concise, reusable prompt structures for the Agent Brief Compiler.

## 1. Inspect → Plan (PLAN Pass)
* **Purpose:** Generate a safe execution plan without altering source code.
* **Best Mode:** Plan / Research
* **Required Inputs:** Target file(s), Goal.
* **Prompt Skeleton:**
  > Objective: {Goal}.
  > 1. Inspect {Target}. Use codebase graph tools, not grep.
  > 2. Do not modify any source code.
  > 3. Write a step-by-step implementation plan to `BUILD_PLAN.md`.
  > 4. List expected impacted files and verification commands.
* **Common Failure:** Agent starts writing code or making commits.
* **Stop Condition:** `BUILD_PLAN.md` is written.
* **Success Evidence:** File exists and contains no code blocks meant for immediate execution.
* **Scope:** [PERSONAL DEFAULT]
* **Sources:** `SRC-ARX-2308` (Task Decomposition)

## 2. Single Vertical Slice (BUILD Pass)
* **Purpose:** Execute exactly one step safely.
* **Best Mode:** Build
* **Required Inputs:** `BUILD_PLAN.md` step number, target files.
* **Prompt Skeleton:**
  > 1. Read `BUILD_PLAN.md`.
  > 2. Execute exactly ONE unchecked item (Step {N}).
  > 3. Make the smallest coherent diff required.
  > 4. Run `{VerificationCommand}`. If it fails, fix it. If it fails twice, STOP.
  > 5. Append one line to `progress.md`.
* **Common Failure:** Agent scope-creeps and implements the whole plan.
* **Stop Condition:** Verification passes and progress is logged.
* **Success Evidence:** Clean CI/Test run.
* **Scope:** [PERSONAL DEFAULT]
* **Sources:** `SRC-LANG-WF` (State Graphs)

## 3. Evidence-Backed Completion
* **Purpose:** Force truthfulness at the end of a session.
* **Best Mode:** Review / Handoff
* **Required Inputs:** `git status`
* **Prompt Skeleton:**
  > Generate a `BUILD_RECEIPT.md`.
  > You must not claim completion unless you ran the verification command and received a 0 exit code.
  > Include: What was done, what files changed, what needs human review.
  > Base claims ONLY on tool execution output, not your internal assumptions.
* **Common Failure:** Agent hallucinates success.
* **Stop Condition:** Receipt generated.
* **Success Evidence:** Receipt contains actual stdout terminal snippets.
* **Scope:** [PERSONAL DEFAULT]
* **Sources:** `SRC-ARX-REFL` (Reflexion)

## 4. Human Approval Gate
* **Purpose:** Prevent destructive or expensive actions.
* **Best Mode:** Any
* **Required Inputs:** Action context.
* **Prompt Skeleton:**
  > You have reached a human gate.
  > The task requires [credentials / deployment / database deletion].
  > STOP immediately. Write the required action and reason to `DECISION.md`. Do not proceed.
* **Common Failure:** Agent bypasses the prompt and attempts a dry-run or writes mock credentials.
* **Stop Condition:** Write to `DECISION.md` and exit 0.
* **Success Evidence:** Agent process terminates awaiting input.
* **Scope:** [PERSONAL DEFAULT]
* **Sources:** `SRC-GH-REPO` (Custom Instructions)

## 5. Resume from Verified State
* **Purpose:** Cleanly rehydrate context without token bloat.
* **Best Mode:** Simple
* **Required Inputs:** `HANDOFF.md`, `git status`.
* **Prompt Skeleton:**
  > Session Start.
  > 1. Read `.agent-state/HANDOFF.md`.
  > 2. Run `git status`.
  > 3. Output the exact delta between the handoff expectation and current git status.
  > 4. State the immediate next action. Do not execute it yet.
* **Common Failure:** Agent hallucinates past work not in the repo.
* **Stop Condition:** Delta report generated.
* **Success Evidence:** Terminal output matches git status.
* **Scope:** [PERSONAL DEFAULT]
* **Sources:** `SRC-ANTH-MEM` (Memory/Auto-memory)

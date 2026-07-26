# Agent Brief Compiler — Dogfood Build Plan

## Objective

Build the first dogfood specification for a personal Agent Brief Compiler designed specifically around Maz’s real AI-agent workflow. The compiler must resolve conflicting instructions and output the smallest verified context delta for an agent.

## Minimal Dogfood Workflow

1. Select one of Maz’s repositories.
2. Enter a task objective.
3. Select agent and mode.
4. Combine approved personal defaults with repository rules and current state.
5. Show included sources and conflicts.
6. Generate a concise brief.
7. Let Maz edit, copy or export it.
8. Store its digest, edits and later outcome.

## Implementation Batches

### Batch 1: CLI and Configuration Ingestion

- **Goal**: Discover and read repository-level configuration alongside global personal profile settings.
- **Files likely affected**: `src/cli/index.ts`, `src/config/loader.ts`, `src/config/schema.ts`
- **Dependencies**: None.
- **Acceptance criteria**: CLI can target a local repository path, parse `.agent-profile.json` (or similar) into a typed object, and fail gracefully on missing files.
- **Validation commands**: `npm run test:unit src/config`, `npm run lint`
- **Explicit exclusions**: Do not implement prompt generation, resolution logic, or LLM integrations yet.

### Batch 2: Conflict Resolution Engine

- **Goal**: Apply the personal-profile precedence hierarchy to overlapping or conflicting rules.
- **Files likely affected**: `src/compiler/resolver.ts`, `src/compiler/types.ts`
- **Dependencies**: Batch 1
- **Acceptance criteria**: Given a mock set of conflicting rules (e.g., "Autonomous" vs "Stop at uncertainty"), the resolver drops lower-tier rules according to the hierarchy and emits a structured conflict report.
- **Validation commands**: `npm run test:unit src/compiler/resolver.test.ts`
- **Explicit exclusions**: Do not interact with the file system or format markdown output.

### Batch 3: Mode-Specific Generation

- **Goal**: Format the resolved configuration into mode-specific markdown templates (e.g., Build, Orchestration, Handoff).
- **Files likely affected**: `src/compiler/generator.ts`, `src/templates/`
- **Dependencies**: Batch 2
- **Acceptance criteria**: The system generates a valid markdown brief containing the resolved rules, task objective, and a list of included sources.
- **Validation commands**: `npm run test:unit src/compiler/generator.test.ts`
- **Explicit exclusions**: Do not implement interactive editing or TUI components.

### Batch 4: Interactive Review and Artifact Storage

- **Goal**: Provide a CLI flow to review, edit, and locally store the generated brief and its outcome.
- **Files likely affected**: `src/cli/interactive.ts`, `src/storage/history.ts`
- **Dependencies**: Batch 3
- **Acceptance criteria**: The user can preview the generated brief, accept it, and the system saves a digest and the final output to a local SQLite database or flat-file ledger.
- **Validation commands**: `npm run test:integration`
- **Explicit exclusions**: Do not build a graphical Web UI, Electron app, or remote sync service. CLI only for the minimal dogfood flow.

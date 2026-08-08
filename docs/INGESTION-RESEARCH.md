# Ingestion Engine Research Pack

## Findings that change the design

### Planning is a separate concern from execution

The Plan-and-Solve paper proposes first dividing a problem into subtasks and
then carrying them out. It addresses missing-step failures; it does not require
AutoGPT, LangChain, JSON, or autonomous execution. Least-to-Most prompting adds
support for ordering simpler subproblems so later work can use earlier results.

Agent Nudge therefore stops after producing a validated plan. Compilation and
execution remain separate boundaries.

Sources: [Plan-and-Solve](https://arxiv.org/abs/2305.04091),
[Least-to-Most](https://arxiv.org/abs/2205.10625).

### Structured output is necessary but insufficient

Strict JSON Schema constrains the wire shape, but graph meaning still requires
application validation. A syntactically valid response can contain duplicate
IDs, missing dependencies, forward references, self-dependencies, or cycles.

The OpenAI-compatible adapter requests strict JSON Schema. Zod then enforces:

- 1-25 tasks with bounded fields and exact keys;
- unique kebab-case IDs and unique dependency edges;
- dependencies that exist and occur earlier in execution order;
- no self-dependencies or cycles.

OpenAI recommends `json_schema` over the older JSON-only mode. Ollama exposes
the same structured-output mechanism through its OpenAI-compatible endpoint.

Sources: [OpenAI response-format reference](https://platform.openai.com/docs/api-reference/responses-streaming/response/content_part),
[Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

### Do not add an SDK merely to validate an object

Current Vercel AI SDK 6 guidance deprecates `generateObject` in favor of
`generateText` with `Output.object`. Agent Nudge already has a smaller injected
model interface and an OpenAI-compatible adapter. Adding the AI SDK would add a
provider abstraction without removing the need for Zod graph validation.

Source: [AI SDK 6 migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0).

### Voice correction must be conservative and auditable

The Whisper paper distinguishes text normalization from genuine
mistranscription and explicitly describes normalization as imperfect. A broad
"make this sound right" rewrite risks silently changing product intent.

Agent Nudge uses two layers:

1. deterministic, user-specific corrections for known recurring dictation;
2. a conservative model pass that preserves uncertain wording.

The final result retains the exact raw note as `originalText`; the model only
produces `cleanedText` and tasks. This makes every correction reviewable.

Source: [Whisper paper, text standardization appendix](https://cdn.openai.com/papers/whisper.pdf).

## Resulting contract

One bounded model call performs de-janking and planning, returning only
`cleanedText` and a task DAG. Code attaches the authoritative raw input,
validates graph semantics, and rejects the entire response on any invalid edge.

BUILD tasks must describe an observable vertical slice. Setup is combined with
its minimal proof unless the user explicitly requested setup as a separate
outcome. Research tasks exist only for real unknowns. Push, deployment, and
review steps are not invented from completion language such as "when ready."

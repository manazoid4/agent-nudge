# Portfolio Synthesis — 2026-07-20

This audit covers all 19 repositories owned by `manazoid4` at the time of review. It identifies reusable product patterns, not source files to copy. Agent Nudge remains a distinct local-first pre-action context assurance product.

Private repositories were inspected only for high-level operational patterns. Their names appear in this private development document because the owner requested a complete audit; private repository names and content are excluded from public browser fixtures.

## Repository-by-repository decisions

| Repository                         | Strongest reusable pattern                                                                 | Agent Nudge decision                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Agent Nudge                        | Evidence-led nudges before consequential actions                                           | Keep as the product centre; extend, do not replace                                                                   |
| MAZos Site                         | Verification-first story supported by real build receipts                                  | Adopt machine-verifiable context pack digests and visible proof                                                      |
| MAZos UI                           | Context packs, gates, receipt history, circuit breakers, stale-run detection               | Adopt context packs, holds and receipt health; keep loop execution separate                                          |
| Portfolio Deck                     | Cross-repo recency and attention order                                                     | Adopt local ledger-derived portfolio health and staleness                                                            |
| JobFilterV1                        | Explainable scoring, qualification thresholds, plain ROI and commercial focus              | Adopt factor-level health/priority signals and avoided-work framing; do not reuse trade language or visual identity  |
| Scrap Finance Partners             | Diagnostic/health-check wedge, domain authority, explicit compliance boundaries            | Adopt an assurance health view and explicit limitations; keep consultancy workflows separate                         |
| OpenFlowKit                        | Local free core, provider-neutral adapters, paid convenience/policy                        | Reinforce provider neutrality and free local tier; monetize managed coordination                                     |
| OmniScribe                         | Multi-provider media pipeline and human steering                                           | Keep media generation separate; retain provider abstraction principle only                                           |
| khutba.io                          | Real-time, screen-first delivery and narrow initial language/market focus                  | Adopt last-responsible-moment delivery; keep translation and community content separate                              |
| JobFilter Obsidian Vault (private) | Persistent memory maps, agent handoffs, capture/log/archive separation                     | Adopt live-ledger versus durable-playbook separation; do not copy vault content                                      |
| FlowLens                           | Capture → understand → improve → route → measure; measurable friction and ROI              | Adopt outcome/avoided-work measurement and integration contracts; keep workflow recording separate                   |
| FlipSignal (private)               | Ranked signals, lifecycle tracking, feedback from real outcomes                            | Adopt acknowledgement/outcome feedback loop; keep marketplace data and scoring separate                              |
| AgentDock                          | Human review before critical actions, immutable handoffs, existing-system integration      | Adopt HOLD semantics and auditability; keep enterprise complaint workflows separate                                  |
| SecureShift (private)              | Legal gate before ingestion, annual-first packaging, phased cold-start plan                | Adopt policy gates and annual-first commercial packaging; do not expose private source policy details                |
| Zawiya Growth Hub (private)        | Mission control, capture → organise → improve → reuse, strong privacy boundary             | Adopt simplification and privacy boundaries only; no private spiritual content is read into or stored by Agent Nudge |
| Recall                             | Evidence-based user-owned memory, confidence, exportability, “model is not truth” language | Adopt confidence labels, provenance and export; do not become a personal memory graph                                |
| Zawiya Knowledge Vault (private)   | Durable institutional memory separated from live operations                                | Adopt the live context/durable knowledge boundary; do not copy private material                                      |
| InkWeave (archived)                | Staged pipeline and steering at meaningful boundaries                                      | Adopt staged delivery boundaries; keep generation workflows separate                                                 |
| LimitLens (private, archived)      | Provider availability, source-confidence labels, redacted diagnostics                      | Adopt confidence/freshness status; keep quota monitoring a separate utility                                          |

## What was combined

The resulting Context Mesh has five coherent primitives:

1. **Local project ledger** — existing Agent Nudge sessions, facts, evidence and delivery receipts remain the source of truth.
2. **Deterministic context pack** — a recipient/project-scoped pre-action bundle sorted by consequence. Identical ledger state produces an identical SHA-256 digest.
3. **HOLD / REVIEW / CLEAR gate** — human-readable action posture inspired by MAZos and AgentDock, without executing or blocking tools itself.
4. **Portfolio health** — projects rank by open holds, queued consequential context, stale facts, active agents, confidence and receipts.
5. **Outcome loop** — acknowledgement remains distinct from delivery, enabling future avoided-work and wrong-context learning.

## What deliberately stays separate

- Agent execution and loop orchestration
- Personal memory/profile graphs
- Voice, video and live translation pipelines
- Lead, job, finance or marketplace scoring
- Billing, accounts, cloud context storage and enterprise connectors
- Private vault content or undisclosed repository metadata in the public demo

The selection rule is simple: a donor pattern enters Agent Nudge only when it improves context relevance, timing, provenance, policy or measurable outcomes.

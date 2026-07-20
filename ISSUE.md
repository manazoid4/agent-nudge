# Issue 1 — Build Agent Nudge Windows MVP and public demo

## Problem

Claude Code, Codex, and other coding agents can work on the same project without receiving consequential decisions, failures, or edit conflicts discovered by one another.

## Goal

Ship a local-first Windows Agent Nudge MVP that routes small, source-backed context deltas before affected actions, plus a distinct public landing/demo deployment.

## Scope

- TypeScript application with deterministic core, durable local storage, localhost API, CLI/MCP/adapters, React desktop UI, tests, docs, and Windows package.
- Three product-proof scenarios: conflicting edit, changed decision, failed approach.
- Irrelevant-event suppression and factor-level relevance explanations.
- GitHub publication and Vercel landing/demo deployment.

## Non-Goals

- Cloud context synchronization, billing, accounts, enterprise SSO/SCIM, remote A2A hosting, paid APIs, or modifying real Claude/Codex configuration.
- Copying JobFilter branding, trade language, source code, private content, or customer-specific flows.

## Acceptance Criteria

- [x] Repository builds from a clean npm install on Windows.
- [x] Unit and integration tests verify all three scenarios and irrelevant suppression.
- [x] Local data persists across process restart with idempotent ingestion.
- [x] Localhost API exposes health, sessions, facts, nudges, feedback, and demo execution.
- [x] CLI supports doctor, demo, install dry-run, export, purge preview, and help.
- [x] Claude and Codex fixture adapters normalize events without blocking when daemon is offline.
- [x] Desktop displays dashboard, inbox, agents, timeline, evidence, relevance factors, metrics, and settings.
- [x] No raw transcripts or secrets are captured by default; project isolation and redaction are tested.
- [x] Windows installer and portable EXE are produced and smoke-tested on this PC.
- [x] Public GitHub repository and Vercel landing/demo URL are reachable.
- [x] Build receipt records commands, evidence, artifacts, commit, deployment, limitations, and safety.

## Dependencies/Blockers

- Existing GitHub and Vercel authentication must remain valid.
- The unsigned Windows installer will display the normal publisher warning.
- GitHub repository creation initially returned HTTP 503; retry before publication.

## Status

completed — verified, packaged, published, and deployed

## Execution Gate

allowed

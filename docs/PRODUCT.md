# Product

## Target user and job

The first user is a developer or small engineering team running at least two coding-agent products against the same repository. Their job is to prevent parallel work from colliding and resume across agents without rebuilding context from transcripts.

## Core loop

1. An adapter emits a structured event or explicit fact.
2. Agent Nudge redacts and persists the evidence.
3. Deterministic rules score each affected recipient.
4. The smallest useful delta arrives at the next safe action boundary.
5. The recipient acknowledges, snoozes, dismisses, or reports the context.
6. The system measures whether the nudge improved consequential work.

## Activation

The activation event is the first accepted nudge with evidence opened. Retention depends on preventing repeated work or conflict often enough to justify remaining installed while keeping ignored nudges below 10–15%.

## Non-goals

Generic shared memory, transcript search, agent chat, orchestration, autonomous blocking, cloud sync, billing, and enterprise identity are outside this MVP.

## Paid path

Community remains local and useful. Pro may add £19/month encrypted personal sync and richer rules. Team is hypothesized at £299/workspace/month for collaboration, policy, audit, and connectors. Pricing is research, not implemented checkout.

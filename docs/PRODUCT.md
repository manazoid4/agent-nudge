# Product

## Target user and job

The first user is a developer or small engineering team running at least two coding-agent products against the same repository. Their job is to prevent parallel work from colliding and resume across agents without rebuilding context from transcripts.

## Core loop

1. An agent checks in with project, provider, current task, and affected paths.
2. The agent acquires a short path lease or publishes a structured sourced fact.
3. Agent Nudge deterministically scores and fans out that fact to active same-project recipients.
4. Each recipient syncs from a monotonic cursor and receives `HOLD`, `REVIEW`, or `CLEAR`.
5. The recipient acknowledges or the claim owner releases/expires the lease.
6. The next iteration will record whether the nudge changed or prevented an action.

## Activation

The activation event is the first accepted nudge with evidence opened. Retention depends on preventing repeated work or conflict often enough to justify remaining installed while keeping ignored nudges below 10–15%.

## Non-goals

Generic shared memory, transcript search, agent chat, orchestration, autonomous blocking, cloud sync, billing, and enterprise identity are outside this MVP.

## Paid path

Community remains local and useful. Pro is hypothesized at £19/month for encrypted personal sync and richer rules. Studio at £79/month targets founders and AI-native agencies with multi-project GitHub/Obsidian connectors. Team at £299/workspace/month adds collaboration, policy, audit, and approvals. Business at £999/month and Enterprise at £30k–£150k/year add private deployment and governance. Pricing is research, not implemented checkout.

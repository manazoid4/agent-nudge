# Agent Nudge Commercial Site Audit

Date: 2026-07-26
Scope: product code, public offer, onboarding, licensing, checkout, retention, and long-term defensibility.

## Verdict

Agent Nudge is a useful technical beta, but it is not ready to take money from strangers yet.

The core promise is strong: **context assurance for coding agents**. The product already does more than a prompt-file editor: it detects source drift and conflicts, creates a deterministic brief, redacts secrets, records delivery evidence, and hands the brief to a running agent. That can justify a **$29 founder / $49 standard one-time Personal license** after the paid path, local control plane, and install experience are trustworthy.

Do not sell a recurring individual plan for a local-only utility. Keep recurring pricing for a later Team product that creates recurring value through shared policy, history, approvals, and sync.

## Current score

| Perspective             | Score | Finding                                                                                               |
| ----------------------- | ----: | ----------------------------------------------------------------------------------------------------- |
| Product utility         |   4/5 | Clear problem and a working end-to-end local loop.                                                    |
| Paid readiness          |   2/5 | Checkout, key delivery, distribution, recovery, and billing management need a real production pass.   |
| Conversion              |   2/5 | Strong headline, but no low-friction download, email capture, or outcome proof.                       |
| Usability               |   3/5 | High-information workbench, but it opens on a developer-specific path and contains dead controls.     |
| Accessibility           |   2/5 | Focus and reduced-motion foundations exist; 8–10 px UI text and dense tables remain a barrier.        |
| Security posture        |   2/5 | Strong redaction and process boundaries are undermined by an unauthenticated localhost control plane. |
| Defensibility today     |   2/5 | Parsing `AGENTS.md` and `CLAUDE.md` is already becoming native platform behavior.                     |
| Defensibility potential |   4/5 | The source → delivery → acknowledgement → outcome evidence graph can compound into a real moat.       |

**Overall: 21/35 — worth continuing, not yet worth charging strangers.**

## Release blockers

### P0 — fix before taking payments

1. **Authenticate the localhost control plane.** It can write repository files and launch agent processes, but currently has no bearer/session authentication. CORS is not authentication, and allowing the `null` origin lets locally opened HTML make requests. Generate an installation secret, expose it only through Electron preload, require it on every mutating route, remove the `null` origin, and show a launch confirmation with executable, working directory, and brief digest.
2. **Replace the developer-specific repository default.** `src/ui/App.tsx` currently opens `C:\Users\manaz\Projects\agent-nudge`. First run must show a native folder chooser, recent repositories, and a one-command fallback.
3. **Prove the production license-signing chain.** The hosted signing key and the public key embedded in desktop builds must be a deliberate matching pair. Add a release test that creates a checkout entitlement, redeems it, and activates it in the packaged app.
4. **Fix the payment configuration contract.** `.env.example` documents `PUBLIC_APP_URL`, but `src/commerce/http.ts` reads `PUBLIC_SITE_URL`. Use one validated name everywhere.
5. **Model the real license lifecycle.** A redeemed license currently expires one year after redemption rather than at the authoritative Stripe entitlement boundary. Store entitlement/revocation state, handle refunds and cancellation, and bind/recover devices deliberately.
6. **Ship a customer install path.** The public page needs a signed Windows installer download, version, checksum, minimum requirements, release notes, and a recovery link. Cloning the repository is not commercial onboarding.
7. **Update the live site.** The public deployment still presents the earlier v0.4 hypothesis while local v0.5 presents a different product and price.
8. **Configure and test real Stripe state.** Use Stripe test clocks and end-to-end tests for purchase, duplicate redemption, refund, failed payment, expired update entitlement, lost key, and portal access.
9. **Make the offer legally and operationally clear.** State what “one-time” owns, how long updates/support last, device limits, refund window, privacy terms, and what happens after the trial.
10. **Complete a human visual and keyboard pass on the packaged app.** The v0.5 hero overflows at a 1440 px viewport, and the commercial build still needs inspection at 100%, 125%, and 150% scaling and at narrow widths.

### P1 — fix in the first paid release

1. Wire or remove the dead mobile-menu button and the “Show evidence” / “Acknowledge” specimen buttons in `src/ui/App.tsx`.
2. Replace 8–10 px interface copy in `src/ui/styles.css` with a 12 px operational minimum and a 14–16 px reading minimum.
3. Add “Manage license”, “Recover purchase”, and “Manage billing” paths. The Billing Portal endpoint exists but is not a discoverable customer flow.
4. Replace 250 ms runner polling with streamed events or backoff; preserve the 10-minute job boundary.
5. Add a custom application icon, code signing, and update checks. The current build receipt still records the default Electron icon.
6. Reconcile the product identity. `PRODUCT.md` rejects the yellow/black construction metaphor while the current UI deliberately uses navy/yellow industrial styling. Choose one identity and update the product, design, screenshots, and copy together.
7. Add evidence that sells the outcome: conflicts caught, stale instructions found, secrets redacted, and minutes of rework avoided. Never display invented counters.

### P2 — improve after the paid path is stable

1. Add WCAG contrast, keyboard traversal, screen-reader, and Windows high-contrast automation.
2. Export runner and receipt metadata through OpenTelemetry conventions while keeping prompt bodies local and opt-in.
3. Add portable exports, recovery documentation, and a migration path between machines.
4. Split the large UI module after behavior stabilizes; do not make architecture work a launch blocker.

## Pricing decision

### Recommended offer

| Tier            |                 Price | Entitlement                                                                                                                             |
| --------------- | --------------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| Community       |            $0 forever | One active repository, health check, compiler, redaction, manual copy/export.                                                           |
| Personal        |      **$49 one-time** | Current major version, unlimited local repositories, direct handoffs, custom profiles, three devices, 12 months of updates and support. |
| Founder launch  |      **$29 one-time** | Same as Personal for the first 100 customers in exchange for structured feedback.                                                       |
| Updates renewal | **$29/year optional** | Another 12 months of updates and support. The owned version keeps working if the customer does not renew.                               |
| Team            |      Not for sale yet | Introduce at roughly $12/user/month or $99/user/year only when shared policy, sync, approvals, and audit history exist.                 |

This “buy once, optionally renew updates” model is familiar in developer tools. TablePlus sells a perpetual license with one year of updates and an optional renewal; Fork sells a one-time license; Sublime Text sells a perpetual license with a defined update window; JetBrains uses a perpetual fallback concept. Sources: [TablePlus pricing](https://tableplus.com/pricing), [Fork pricing](https://git-fork.com/buy), [Sublime Text store](https://www.sublimehq.com/store/text), [JetBrains perpetual fallback](https://sales.jetbrains.com/hc/en-gb/articles/207240845-What-is-a-perpetual-fallback-license-and-how-do-I-use-one).

### Trial

- Keep the existing **14-day Pro trial**.
- Require no card and no account.
- Show days remaining and exactly which features will fall back.
- At expiry, retain all customer data and fall back safely to Community.
- Do not trial-gate redaction, conflict visibility, export, or other trust features.
- Send trial email only after separate marketing consent; product reminders can remain transactional.

Stripe supports trials without collecting a payment method, but its reminder and compliance behaviors still need deliberate configuration. See [Stripe trial guidance](https://docs.stripe.com/billing/subscriptions/trials).

### Licensing architecture change

Move Personal from time-expiring product access to a version/update entitlement:

```text
license_id
email_hash
plan: personal
major_version_owned: 1
updates_until: ISO date
device_limit: 3
issued_at
key_id
signature
```

The application keeps working for the owned major version after `updates_until`; only newer builds and support require renewal. Continue verifying signed tokens locally. Keep checkout secrets and private signing keys in hosted routes.

The repository is MIT licensed, so local feature flags are not a durable commercial moat. Customers should be paying for official signed builds, zero-friction installation and updates, support, maintained provider compatibility, and later team/cloud services—not for a gate that a fork can remove.

## Email list

Add one restrained inline signup after the live product proof and repeat it in the footer. Do not use an interruption popup.

Recommended copy:

> **Build notes, release notes, and coordination patterns.**
>
> One or two useful emails a month. Unsubscribe anytime.

Implementation:

1. Use Loops or Resend behind a server route; never expose the provider API key in the client.
2. Collect email, explicit marketing consent, consent timestamp, form location, and consent-copy version.
3. Enable double opt-in, unsubscribe, suppression, and preference management.
4. Keep license receipts, activation, recovery, and security notices separate from marketing.
5. Segment only what is useful: `prospect`, `trial_started`, `license_buyer`, and `team_interest`.
6. Track signup → trial → activation → purchase with first-party events; do not collect repository content.

UK guidance generally requires specific, informed, affirmative consent for marketing email to individuals and sole traders, with easy withdrawal. See the [ICO direct-marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/plan-direct-marketing/). Loops supports mailing lists and preference management; Resend supports audiences and unsubscribe handling. Sources: [Loops mailing lists](https://loops.so/docs/contacts/mailing-lists), [Resend audiences](https://resend.com/docs/dashboard/audiences/introduction).

## The moat to build

Basic context-file support will commoditize. GitHub Copilot already consumes repository custom instructions and `AGENTS.md`, while Claude Code natively uses `CLAUDE.md`. Sources: [GitHub Copilot custom-instruction workflow](https://docs.github.com/en/copilot/tutorials/use-copilot-code-review-across-the-pull-request-lifecycle), [Claude Code memory](https://docs.anthropic.com/en/docs/claude-code/memory).

The moat is not storing more context. It is proving that the right context reached the right agent and changed the outcome.

### 0–6 months: trust and compatibility

- Define a portable **Context Receipt**: source digest → selected rule → delivery → acknowledgement → outcome.
- Maintain a public provider compatibility matrix and regression suite across Claude Code, Codex, Aider, OpenCode, and MCP clients.
- Sign connector manifests and policy packs.
- Preserve a local, metadata-only security posture with deterministic redaction.
- Recruit 20–30 design partners and measure repeated mistakes prevented, drift caught, and rework avoided.
- Publish through relevant discovery channels such as the [official MCP Registry](https://modelcontextprotocol.io/registry/about) and [GitHub Marketplace](https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps).

### 6–18 months: compounding product data

- Build an opt-in outcome graph: which source-backed rule prevented which failure, by repository shape, path, and provider.
- Create a signed, versioned policy-pack registry with contributor reputation.
- Add team policy ownership, approval workflow, receipt history, compliance export, and cross-device sync.
- Turn the compatibility matrix into a certification lab that catches provider regressions before customers do.
- Provide “context debt” and repeat-failure reports that improve as the customer uses the product.

### 18+ months: category infrastructure

- Publish a privacy-preserving benchmark for multi-agent coordination failures and successful interventions.
- Offer a private enterprise policy registry and evidence control plane.
- Let providers and tool authors certify integrations against the receipt contract.
- Export to OpenTelemetry rather than competing with generic tracing. OpenTelemetry is already standardizing GenAI observability, and its guidance recognizes the sensitivity of prompt/message content. Sources: [OpenTelemetry agent observability](https://opentelemetry.io/blog/2025/ai-agent-observability/), [GenAI semantic attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/).

### Brand risk

Run naming and trademark clearance before spending on acquisition. Nudge Security now markets AI-agent discovery, history, and system-instruction sync, which creates search and category confusion with “Agent Nudge.” This is not a legal conclusion; it is a clear validation task. Sources: [Nudge Security AI-agent discovery](https://help.nudgesecurity.com/en/articles/14656860-getting-started-with-ai-agent-discovery), [system-instruction syncing](https://help.nudgesecurity.com/en/articles/14658534-ai-agents-setting-syncing-agent-system-instructions).

## Execution queue

### Batch 1 — paid-path proof

- Folder chooser and first-run onboarding.
- Installation-secret authentication for the local API; remove `null`-origin access.
- Production signing-key generation and public-key injection.
- One canonical public-site environment variable.
- Stripe one-time Checkout plus version/update entitlements.
- Purchase, redemption, recovery, refund, and portal tests.
- Acceptance: untrusted local HTML cannot mutate the daemon; a clean Windows machine can purchase in Stripe test mode, install, activate, restart offline, recover the purchase, and keep the owned version after update coverage expires.

### Batch 2 — distribution and conversion

- Signed installer, app icon, checksums, update channel, download CTA, and release notes.
- Replace dead controls and undersized type.
- Add real outcome evidence and the 14-day trial state to the page.
- Acceptance: first useful brief in under two minutes without opening a terminal.

### Batch 3 — consented audience

- Inline double-opt-in form, privacy copy, preferences, unsubscribe, and four lifecycle segments.
- Transactional trial/license messages kept separate.
- Acceptance: consent and suppression tests pass; no provider secret ships to the browser.

### Batch 4 — moat instrumentation

- Context Receipt v1 schema, provider compatibility matrix, outcome tagging, and privacy-preserving value report.
- Acceptance: a customer can export evidence of a rule’s source, delivery, acknowledgement, and recorded result without exporting prompt bodies.

## First command

Start Batch 1 with the paid-launch security blocker:

```powershell
rg -n 'allowedOrigins|addHook\("onRequest"|app\.(post|delete|put|patch)' src/daemon/server.ts
```

Then add an installation-secret authentication hook and tests before touching pricing again. The folder picker is the next edit after the local API is protected.

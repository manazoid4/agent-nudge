import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BellRing,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  ExternalLink,
  FileCode2,
  Gauge,
  GitMerge,
  Inbox,
  Layers3,
  Menu,
  Play,
  Radar,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { samplePortfolio, sampleSnapshot } from "./sample-data.js";

type Snapshot = typeof sampleSnapshot;
type Portfolio = typeof samplePortfolio;
type PortfolioProject = Portfolio["projects"][number];
type NudgeItem = Snapshot["nudges"][number];
type View =
  | "overview"
  | "portfolio"
  | "inbox"
  | "agents"
  | "timeline"
  | "rules"
  | "settings"
  | "compiler";

const endpointOverride = new URLSearchParams(location.search).get("endpoint");
const safeEndpointOverride =
  endpointOverride &&
  /^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}$/.test(endpointOverride)
    ? endpointOverride
    : null;
const endpoint =
  safeEndpointOverride ??
  window.agentNudge?.endpoint ??
  "http://127.0.0.1:47831";
const isDesktop =
  Boolean(window.agentNudge) ||
  new URLSearchParams(location.search).has("desktop");

export function App() {
  const [showDemo, setShowDemo] = useState(location.hash === "#demo");
  useEffect(() => {
    const onHash = () => setShowDemo(location.hash === "#demo");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  if (!isDesktop && !showDemo) return <Landing />;
  return <Console isPublicDemo={!isDesktop} />;
}

function Landing() {
  const [checkoutError, setCheckoutError] = useState("");
  const [issuedToken, setIssuedToken] = useState("");
  const [issuingLicense, setIssuingLicense] = useState(false);

  useEffect(() => {
    const sessionId = new URLSearchParams(location.search).get("session_id");
    if (!sessionId) return;
    setIssuingLicense(true);
    fetch("/api/license", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          token?: string;
          error?: string;
        };
        if (!response.ok || !body.token)
          throw new Error(body.error ?? "License delivery failed.");
        setIssuedToken(body.token);
        history.replaceState(null, "", `${location.pathname}#license`);
      })
      .catch((error: unknown) =>
        setCheckoutError(
          error instanceof Error ? error.message : String(error),
        ),
      )
      .finally(() => setIssuingLicense(false));
  }, []);

  async function startCheckout() {
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url)
        throw new Error(body.error ?? "Checkout is unavailable.");
      location.assign(body.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="landing">
      <header className="site-nav shell">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#proof">Live proof</a>
          <a href="#how">Protocol</a>
          <a href="#bridge">Agent bridge</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="button button-small" href="#demo">
          Open live demo <ArrowRight size={16} />
        </a>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="signal-line">
            <span />
            <strong>Live Agent Bridge</strong>
            <span>v0.5 · reversible connect</span>
          </div>
          <h1>Context assurance for your coding agents.</h1>
          <p className="hero-lede">
            Inspect repository rules, catch drift and conflicts, compile a
            verified brief, then hand it directly to Claude, Codex, or Aider.
            Local by default. No transcript capture.
          </p>
          <div className="hero-actions">
            <a className="button" href="#demo">
              <Play size={17} fill="currentColor" /> Run the two-agent proof
            </a>
            <a
              className="text-link"
              href="https://github.com/manazoid4/agent-nudge"
            >
              View source <ExternalLink size={15} />
            </a>
          </div>
          <p className="privacy-note">
            <ShieldCheck size={16} /> Local SQLite. No transcript capture. No
            model API or cloud account required.
          </p>
        </div>
        <NudgeSpecimen />
      </section>

      {(issuingLicense || issuedToken) && (
        <section className="license-delivery" id="license" aria-live="polite">
          <div className="shell">
            <span>PRO LICENSE</span>
            <h2>
              {issuingLicense
                ? "Verifying payment…"
                : "Payment verified. Activate Pro."}
            </h2>
            {issuedToken && (
              <>
                <code>{issuedToken}</code>
                <button
                  className="button"
                  onClick={() =>
                    void navigator.clipboard.writeText(issuedToken)
                  }
                >
                  Copy signed token
                </button>
                <p>
                  Open Agent Nudge, paste this token into the license panel, and
                  select Activate.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      <section className="proof-strip" id="proof">
        <div className="shell proof-items">
          <div>
            <strong>3</strong>
            <span>provider-neutral agent identities</span>
          </div>
          <div>
            <strong>1</strong>
            <span>durable project-scoped ledger</span>
          </div>
          <div>
            <strong>0</strong>
            <span>raw prompts or file bodies stored</span>
          </div>
          <div>
            <strong>4</strong>
            <span>steps: declare · preflight · act · receipt</span>
          </div>
        </div>
      </section>

      <section className="narrative shell" id="how">
        <div className="narrative-heading">
          <span>Memory is not the guarantee.</span>
          <h2>
            The missing layer proves what reached the agent before it acted.
          </h2>
        </div>
        <div className="flow-line" aria-label="Agent Nudge data flow">
          {[
            "Declare intent",
            "Route the delta",
            "Preflight action",
            "Act or replan",
            "Record receipt",
          ].map((item, index) => (
            <div key={item}>
              <b>{index + 1}</b>
              <span>{item}</span>
              {index < 4 && <ChevronRight />}
            </div>
          ))}
        </div>
        <div className="use-cases">
          <article>
            <AlertOctagon />
            <h3>Stop edit collisions</h3>
            <p>
              Warn Codex that Claude already claimed the exact file—before the
              write, not after the merge conflict.
            </p>
          </article>
          <article>
            <GitMerge />
            <h3>Carry changed decisions</h3>
            <p>
              Route a source-backed architecture decision only to sessions
              touching the affected path and topic.
            </p>
          </article>
          <article>
            <RefreshCw />
            <h3>Don’t repeat failed work</h3>
            <p>
              Surface the test receipt from an abandoned approach without
              injecting the previous session transcript.
            </p>
          </article>
        </div>
      </section>

      <section className="bridge-contract shell" id="bridge">
        <div className="bridge-heading">
          <p className="section-signal">LIVE CONNECT CONTRACT</p>
          <h2>Shared execution state, not a shared transcript.</h2>
          <p>
            Every provider uses the same local loop. Capabilities stay honest:
            MCP and localhost sync are portable now; provider-specific hard
            blocking remains an explicit connector capability.
          </p>
        </div>
        <div className="bridge-grid">
          <article>
            <Bot />
            <span>01 · CHECK IN</span>
            <h3>Who is doing what?</h3>
            <p>Provider, project, task, paths, heartbeat, and lease expiry.</p>
          </article>
          <article>
            <AlertOctagon />
            <span>02 · PREFLIGHT</span>
            <h3>Can this agent safely act?</h3>
            <p>
              Only relevant decisions, failures, claims, and evidence arrive.
            </p>
          </article>
          <article>
            <ShieldCheck />
            <span>03 · RECEIPT</span>
            <h3>What changed because of it?</h3>
            <p>Acknowledge, release, replan, or report the context as wrong.</p>
          </article>
        </div>
        <div
          className="bridge-grid connector-grid"
          aria-label="Connector capabilities"
        >
          <article>
            <Bot />
            <span>CLAUDE CODE · ENFORCED*</span>
            <h3>Project hook</h3>
            <p>
              Pre-action blocking for covered tools while project hooks are
              enabled.
            </p>
          </article>
          <article>
            <TerminalSquare />
            <span>CODEX · ENFORCED*</span>
            <h3>Trusted project hook</h3>
            <p>
              Pre-action blocking for covered local tools after the hook is
              reviewed and trusted.
            </p>
          </article>
          <article>
            <Layers3 />
            <span>OPENCODE · ENFORCED*</span>
            <h3>Project plugin</h3>
            <p>
              Pre-action blocking for covered tool executions while the plugin
              is enabled.
            </p>
          </article>
        </div>
        <p className="capability-note">
          * Hooks are guardrails, not a complete security boundary. Hosted,
          disabled, bypassed, or otherwise uncovered actions remain outside
          enforcement.
        </p>
      </section>

      <section className="commercial" id="pricing">
        <div className="shell commercial-inner">
          <div>
            <p className="section-signal">USEFUL BEFORE YOU PAY</p>
            <h2>The local product stays free.</h2>
            <p>
              Compile and inspect one repository forever. Pay once a year for
              the automation that removes repeated setup and handoff work.
            </p>
            {checkoutError && (
              <p className="checkout-error" role="alert">
                {checkoutError}
              </p>
            )}
          </div>
          <div className="price-line">
            <span>Community</span>
            <strong>$0</strong>
            <small>Local · private · open core</small>
            <a href="#demo">
              Try the full demo <ArrowRight size={15} />
            </a>
          </div>
          <div className="price-line featured">
            <span>Pro</span>
            <strong>
              $29<em>/year</em>
            </strong>
            <small>
              Managed repos · drift watch · changelog writes · direct launches
            </small>
            <button onClick={() => void startCheckout()}>
              Unlock Pro with Stripe <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      <footer className="shell footer">
        <Brand />
        <p>Declare. Preflight. Act. Receipt.</p>
        <a href="https://github.com/manazoid4/agent-nudge">
          GitHub <ExternalLink size={14} />
        </a>
      </footer>
    </main>
  );
}

function NudgeSpecimen() {
  return (
    <div className="specimen">
      <div className="specimen-top">
        <span className="danger-dot" />
        Pre-action hold <span>Codex · now</span>
      </div>
      <div className="specimen-body">
        <div className="score-ring">
          140<small>score</small>
        </div>
        <div>
          <p className="mono-label">EXACT FILE CONFLICT</p>
          <h2>Claude is editing cache.ts</h2>
          <p>
            Another active agent claimed the same file 8 minutes ago. Coordinate
            before writing.
          </p>
        </div>
      </div>
      <div className="evidence-row">
        <FileCode2 />
        <div>
          <strong>src/lib/cache.ts</strong>
          <span>Claude session receipt · source verified</span>
        </div>
        <ShieldCheck />
      </div>
      <div className="factor-list">
        <span>+60 active claim</span>
        <span>+45 exact path</span>
        <span>+25 same project</span>
        <span>+10 evidence</span>
      </div>
      <div className="specimen-actions">
        <button>Show evidence</button>
        <button className="accept">
          <Check size={15} /> Acknowledge
        </button>
      </div>
    </div>
  );
}

function Console({ isPublicDemo }: { isPublicDemo: boolean }) {
  const [view, setView] = useState<View>("overview");
  const [snapshot, setSnapshot] = useState<Snapshot>(sampleSnapshot);
  const [portfolio, setPortfolio] = useState<Portfolio>(samplePortfolio);
  const [selectedId, setSelectedId] = useState(snapshot.nudges[0]?.id ?? "");
  const [connected, setConnected] = useState(!isPublicDemo);
  const [busy, setBusy] = useState(false);
  const selected =
    snapshot.nudges.find((item) => item.id === selectedId) ??
    snapshot.nudges[0];

  const refresh = useCallback(async () => {
    if (isPublicDemo) return;
    try {
      const [response, portfolioResponse] = await Promise.all([
        fetch(`${endpoint}/snapshot?projectId=project-agent-nudge`),
        fetch(`${endpoint}/portfolio`),
      ]);
      if (!response.ok) throw new Error("offline");
      const data = (await response.json()) as Snapshot;
      setSnapshot(data);
      if (portfolioResponse.ok) {
        const portfolioData = (await portfolioResponse.json()) as Portfolio;
        setPortfolio(portfolioData);
      }
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [isPublicDemo]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function runDemo() {
    setBusy(true);
    if (isPublicDemo) {
      setSnapshot(sampleSnapshot);
      setSelectedId("nudge-conflict");
      setView("inbox");
    } else {
      try {
        const suffix = Date.now().toString(36);
        const sessions = [
          {
            sessionId: `claude-proof-${suffix}`,
            provider: "claude-code",
            task: {
              summary: "Refining the cache contract",
              paths: ["src/lib/cache.ts"],
              tags: ["cache"],
            },
          },
          {
            sessionId: `codex-proof-${suffix}`,
            provider: "codex",
            task: {
              summary: "Implementing the cache adapter",
              paths: ["src/lib/cache.ts"],
              tags: ["cache"],
            },
          },
        ];
        for (const session of sessions) {
          await fetch(`${endpoint}/v1/sessions/check-in`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...session,
              projectId: "project-agent-nudge",
              projectName: "Agent Nudge",
              cwd: "C:\\Projects\\agent-nudge",
            }),
          });
        }
        await fetch(`${endpoint}/v1/claims`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: "project-agent-nudge",
            sessionId: sessions[0]?.sessionId,
            path: "src/lib/cache.ts",
            leaseSeconds: 300,
          }),
        });
        const synced = await fetch(`${endpoint}/v1/sync`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: "project-agent-nudge",
            sessionId: sessions[1]?.sessionId,
            cursor: 0,
          }),
        });
        if (!synced.ok) throw new Error("live proof failed");
        await refresh();
        setView("inbox");
      } catch {
        setConnected(false);
      }
    }
    setTimeout(() => setBusy(false), 350);
  }

  async function action(actionName: string) {
    if (!selected) return;
    if (!isPublicDemo) {
      try {
        await fetch(`${endpoint}/nudges/${selected.id}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: actionName }),
        });
        await refresh();
        return;
      } catch {
        setConnected(false);
      }
    }
    setSnapshot(
      (current) =>
        ({
          ...current,
          nudges: current.nudges.map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  state:
                    actionName === "acknowledge" || actionName === "used"
                      ? "acknowledged"
                      : actionName === "snooze"
                        ? "snoozed"
                        : "dismissed",
                }
              : item,
          ),
        }) as Snapshot,
    );
  }

  return (
    <div className="app-shell">
      <aside className="rail">
        <Brand compact />
        <nav>
          {(
            [
              ["overview", Gauge, "Live sync"],
              ["portfolio", Layers3, "Context mesh"],
              ["inbox", Inbox, "Nudge inbox"],
              ["agents", Bot, "Live agents"],
              ["timeline", Activity, "Timeline"],
              ["compiler", Sparkles, "Brief compiler"],
              ["rules", Radar, "Rules"],
              ["settings", Settings, "Settings"],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "inbox" && <b>{snapshot.metrics.queued}</b>}
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <div
            className={`connection ${connected || isPublicDemo ? "online" : ""}`}
          >
            <CircleDot size={15} />
            <span>
              {isPublicDemo
                ? "Browser demo"
                : connected
                  ? "Local daemon"
                  : "Daemon offline"}
            </span>
          </div>
          <small>{window.agentNudge?.version ?? "v0.5.0"}</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-topbar">
          <button className="mobile-menu" aria-label="Open menu">
            <Menu />
          </button>
          <div>
            <span>PROJECT</span>
            <strong>Agent Nudge</strong>
          </div>
          <div className="top-actions">
            <span className="privacy">
              <ShieldCheck size={15} /> Local only
            </span>
            <button
              className="button button-small"
              onClick={runDemo}
              disabled={busy}
            >
              <Play size={15} fill="currentColor" />
              {busy ? "Running…" : "Run two-agent proof"}
            </button>
          </div>
        </header>
        {view === "overview" && (
          <Overview snapshot={snapshot} runDemo={runDemo} />
        )}
        {view === "portfolio" && <ContextMeshView portfolio={portfolio} />}
        {view === "inbox" && (
          <InboxView
            snapshot={snapshot}
            selected={selected}
            setSelectedId={setSelectedId}
            action={action}
          />
        )}
        {view === "agents" && <AgentsView snapshot={snapshot} />}
        {view === "timeline" && <TimelineView snapshot={snapshot} />}
        {view === "compiler" && <CompilerView isPublicDemo={isPublicDemo} />}
        {view === "rules" && <RulesView />}
        {view === "settings" && (
          <SettingsView connected={connected} isPublicDemo={isPublicDemo} />
        )}
      </div>
    </div>
  );
}

function ContextMeshView({ portfolio }: { portfolio: Portfolio }) {
  const [selectedId, setSelectedId] = useState(
    portfolio.projects[0]?.projectId ?? "",
  );
  const selected =
    portfolio.projects.find((project) => project.projectId === selectedId) ??
    portfolio.projects[0];

  useEffect(() => {
    if (
      portfolio.projects.length &&
      !portfolio.projects.some((project) => project.projectId === selectedId)
    ) {
      setSelectedId(portfolio.projects[0]?.projectId ?? "");
    }
  }, [portfolio, selectedId]);

  return (
    <div className="page mesh-page">
      <div className="page-heading">
        <div>
          <p>Cross-repository assurance</p>
          <h1>Context mesh</h1>
          <span>
            One quiet control surface for freshness, holds, receipts, and agent
            coverage across locally known projects.
          </span>
        </div>
        <div className="mesh-confidence">
          <ShieldCheck size={18} />
          <div>
            <strong>Evidence, not memory claims</strong>
            <span>Every status is derived from local ledger receipts.</span>
          </div>
        </div>
      </div>

      <section className="metric-grid mesh-metrics">
        <Metric
          icon={Layers3}
          value={String(portfolio.metrics.projects)}
          label="known projects"
          detail="project-scoped by default"
        />
        <Metric
          icon={ShieldCheck}
          value={String(portfolio.metrics.protectedProjects)}
          label="protected"
          detail="current context + receipts"
        />
        <Metric
          icon={AlertOctagon}
          value={String(portfolio.metrics.openHolds)}
          label="open holds"
          detail="stop before consequential action"
        />
        <Metric
          icon={Check}
          value={String(portfolio.metrics.acknowledged)}
          label="verified acknowledgements"
          detail="delivery is measured separately"
        />
      </section>

      {portfolio.projects.length ? (
        <div className="mesh-layout">
          <section className="panel mesh-projects">
            <div className="panel-head">
              <div>
                <h2>Project attention order</h2>
                <p>Risk first, then weakest context health.</p>
              </div>
              <span>{portfolio.metrics.activeAgents} active agents</span>
            </div>
            <div className="mesh-list" role="list">
              {portfolio.projects.map((project) => (
                <button
                  key={project.projectId}
                  className={
                    selected?.projectId === project.projectId ? "active" : ""
                  }
                  onClick={() => setSelectedId(project.projectId)}
                >
                  <StateMark state={project.state} />
                  <div>
                    <strong>{project.projectName}</strong>
                    <span>
                      {project.activeAgents} agent
                      {project.activeAgents === 1 ? "" : "s"} ·{" "}
                      {project.receiptCount} receipts
                    </span>
                  </div>
                  <div className="mesh-score">
                    <strong>{project.healthScore}</strong>
                    <span>{project.state}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selected && <ProjectAssurance project={selected} />}
        </div>
      ) : (
        <section className="panel empty-mesh">
          <Layers3 size={28} />
          <h2>No projects in the local ledger yet</h2>
          <p>
            Register an agent session or run the proof. Agent Nudge will never
            discover or upload repositories behind your back.
          </p>
        </section>
      )}
    </div>
  );
}

function ProjectAssurance({ project }: { project: PortfolioProject }) {
  const packStatus = project.openHolds
    ? "HOLD"
    : project.queued
      ? "REVIEW"
      : "CLEAR";
  return (
    <section className="panel assurance-card">
      <div className="assurance-title">
        <div>
          <span>PRE-ACTION CONTEXT PACK</span>
          <h2>{project.projectName}</h2>
        </div>
        <b className={`pack-status ${packStatus.toLowerCase()}`}>
          {packStatus}
        </b>
      </div>
      <p className="assurance-summary">
        {packStatus === "HOLD"
          ? `${project.openHolds} blocking conflict must be reviewed before the next write or commit.`
          : packStatus === "REVIEW"
            ? `${project.queued} source-backed context items are waiting for the next boundary.`
            : "No consequential context is waiting. The next action can proceed."}
      </p>
      <dl className="assurance-grid">
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(project.confidence * 100)}%</dd>
        </div>
        <div>
          <dt>Receipts</dt>
          <dd>{project.receiptCount}</dd>
        </div>
        <div>
          <dt>Stale facts</dt>
          <dd>{project.staleFacts}</dd>
        </div>
        <div>
          <dt>Acknowledged</dt>
          <dd>{project.acknowledged}</dd>
        </div>
      </dl>
      <div className="integrity-strip">
        <GitMerge size={17} />
        <div>
          <strong>Hash-addressed pack</strong>
          <span>
            Same ledger state produces the same digest; changed evidence creates
            a new pack.
          </span>
        </div>
      </div>
      <div className="mesh-freshness">
        <Clock3 size={16} />
        Latest activity {relative(project.latestActivityAt)}
      </div>
    </section>
  );
}

function StateMark({ state }: { state: PortfolioProject["state"] }) {
  return <span className={`state-mark ${state}`} aria-label={state} />;
}

function Overview({
  snapshot,
  runDemo,
}: {
  snapshot: Snapshot;
  runDemo: () => void;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Live coordination</p>
          <h1>Who is doing what—and can the next agent act?</h1>
          <span>
            Presence, current task intent, changed constraints, and receipts
            from one local production path.
          </span>
        </div>
        <button className="button secondary" onClick={runDemo}>
          <Sparkles size={16} /> Run live conflict proof
        </button>
      </div>
      <section className="live-loop" aria-label="Live Agent Bridge loop">
        {[
          ["01", "DECLARE", "Task + paths"],
          ["02", "PREFLIGHT", "HOLD / REVIEW / CLEAR"],
          ["03", "ACT", "Proceed or replan"],
          ["04", "RECEIPT", "Acknowledge + evidence"],
        ].map(([step, label, detail]) => (
          <div key={step}>
            <b>{step}</b>
            <strong>{label}</strong>
            <span>{detail}</span>
          </div>
        ))}
      </section>
      <div className="metric-band">
        <Metric
          icon={Bot}
          value={snapshot.metrics.activeAgents}
          label="active agents"
          detail="across this project"
        />
        <Metric
          icon={BellRing}
          value={snapshot.metrics.queued}
          label="awaiting action"
          detail="current project queue"
          tone="danger"
        />
        <Metric
          icon={ShieldCheck}
          value={snapshot.metrics.conflictsPrevented}
          label="conflicts prevented"
          detail="verified acknowledgements"
        />
        <Metric
          icon={Clock3}
          value={snapshot.metrics.acknowledged}
          label="acknowledged"
          detail="receipt-backed"
        />
      </div>
      <section className="overview-grid">
        <div className="operations-list">
          <div className="section-head">
            <div>
              <h2>Consequential context</h2>
              <p>Ranked by action risk, not arrival time.</p>
            </div>
            <button>
              View inbox <ChevronRight size={15} />
            </button>
          </div>
          {snapshot.nudges.map((item) => (
            <NudgeRow key={item.id} item={item} />
          ))}
        </div>
        <div className="system-panel">
          <div className="section-head">
            <div>
              <h2>Routing health</h2>
              <p>Last 24 hours</p>
            </div>
            <span className="status-ok">Healthy</span>
          </div>
          <div className="routing-meter">
            <div style={{ width: snapshot.nudges.length ? "100%" : "0%" }} />
            <span>Deterministic local routing</span>
          </div>
          <dl>
            <div>
              <dt>Structured facts</dt>
              <dd>{snapshot.facts.length}</dd>
            </div>
            <div>
              <dt>Ledger events</dt>
              <dd>{snapshot.events.length}</dd>
            </div>
            <div>
              <dt>Delivered nudges</dt>
              <dd>{snapshot.metrics.delivered}</dd>
            </div>
            <div>
              <dt>Queued nudges</dt>
              <dd>{snapshot.metrics.queued}</dd>
            </div>
          </dl>
          <div className="system-note">
            <Database />
            <p>
              <strong>No transcript store</strong>
              <span>
                Only structured facts, paths, evidence references, and delivery
                receipts.
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InboxView({
  snapshot,
  selected,
  setSelectedId,
  action,
}: {
  snapshot: Snapshot;
  selected?: NudgeItem;
  setSelectedId: (id: string) => void;
  action: (name: string) => void;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Nudge inbox</p>
          <h1>Before the next action</h1>
          <span>
            {snapshot.nudges.length} source-backed context deltas for this
            project.
          </span>
        </div>
      </div>
      <div className="inbox-layout">
        <section className="inbox-list">
          {snapshot.nudges.map((item) => (
            <button
              key={item.id}
              className={`inbox-item ${selected?.id === item.id ? "selected" : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              <ClassIcon value={item.deliveryClass} />
              <div>
                <span>{item.deliveryClass.replace("_", " ")}</span>
                <strong>{item.title}</strong>
                <small>{item.sourceRefs[0]?.label}</small>
              </div>
              <time>{relative(item.createdAt)}</time>
            </button>
          ))}
        </section>
        {selected && (
          <section className="inspector">
            <div className="inspector-head">
              <ClassIcon value={selected.deliveryClass} />
              <div>
                <span>
                  {selected.deliveryClass.replace("_", " ")} · SCORE{" "}
                  {selected.relevanceScore}
                </span>
                <h2>{selected.title}</h2>
              </div>
            </div>
            <p className="nudge-body">{selected.body.split("\n")[0]}</p>
            <div className="why-box">
              <strong>Why this reached Codex now</strong>
              <p>{selected.whyNow}</p>
              {selected.relevanceFactors.map((factor) => (
                <div className="factor" key={factor.code}>
                  <span>+{factor.score}</span>
                  <b>{factor.label}</b>
                  <small>{factor.evidence}</small>
                </div>
              ))}
            </div>
            <div className="source-box">
              <FileCode2 />
              <div>
                <strong>
                  {selected.sourceRefs[0]?.filePath ?? "Session evidence"}
                </strong>
                <span>{selected.sourceRefs[0]?.label}</span>
              </div>
              <button aria-label="Open source">
                <ExternalLink size={16} />
              </button>
            </div>
            <div className="inspector-actions">
              <button onClick={() => action("dismiss")}>
                <X size={16} /> Dismiss
              </button>
              <button onClick={() => action("snooze")}>
                <Clock3 size={16} /> Snooze
              </button>
              <button className="accept" onClick={() => action("acknowledge")}>
                <Check size={16} /> Acknowledge
              </button>
            </div>
            <p className="state-line">
              State: <b>{selected.state}</b> · Delivery is not treated as model
              knowledge.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function AgentsView({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Live agents</p>
          <h1>Who is doing what</h1>
          <span>
            Declared task scope and recent activity—not hidden chain of thought.
          </span>
        </div>
      </div>
      <div className="agent-list">
        {snapshot.sessions.map((agent) => (
          <article key={agent.id}>
            <div className={`provider-mark ${agent.provider}`}>
              <Bot />
            </div>
            <div>
              <span>{agent.provider}</span>
              <h2>{agent.activeTask?.summary ?? "No task declared"}</h2>
              <p>
                <FileCode2 size={14} />
                {agent.activeTask?.paths.join(", ") || "No paths declared"}
              </p>
            </div>
            <div className="agent-state">
              <b>{agent.status}</b>
              <small>{relative(agent.lastSeenAt)}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function TimelineView({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Evidence timeline</p>
          <h1>Why the system acted</h1>
          <span>
            A local audit trail from source fact through recipient response.
          </span>
        </div>
      </div>
      <div className="timeline">
        {snapshot.nudges.map((item, i) => (
          <div key={item.id}>
            <span className="timeline-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <time>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <div>
              <strong>{item.title}</strong>
              <p>{item.whyNow}</p>
              <small>
                {item.state} · {item.sourceRefs[0]?.label}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function RulesView() {
  const rows = [
    ["Exact file claim conflict", "BLOCK", "140", "On"],
    ["Changed decision + exact path", "ACT NOW", "100+", "On"],
    ["Failed approach + task overlap", "NEXT BOUNDARY", "50+", "On"],
    ["Low-signal documentation change", "DROP", "<30", "On"],
  ];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Deterministic rules</p>
          <h1>Inspectable by design</h1>
          <span>
            No embedding model or black-box classification is required.
          </span>
        </div>
      </div>
      <div className="rule-table">
        <div className="rule-header">
          <span>Rule</span>
          <span>Delivery</span>
          <span>Threshold</span>
          <span>Status</span>
        </div>
        {rows.map((row) => (
          <div key={row[0]}>
            {row.map((cell, i) => (
              <span key={cell} className={i === 3 ? "status-ok" : ""}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
function SettingsView({
  connected,
  isPublicDemo,
}: {
  connected: boolean;
  isPublicDemo: boolean;
}) {
  const [connectCommandCopied, setConnectCommandCopied] = useState(false);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Settings</p>
          <h1>Local control</h1>
          <span>Nothing is silently installed into agent configuration.</span>
        </div>
      </div>
      <div className="settings-stack">
        <Setting
          icon={Database}
          title="Local ledger"
          text={
            isPublicDemo
              ? "Browser demo uses fixture data. The Windows app stores SQLite under your user profile."
              : `${endpoint} · ${connected ? "connected" : "offline"}`
          }
          action="Open data folder"
        />
        <Setting
          icon={TerminalSquare}
          title="Agent integrations"
          text="Claude Code, Codex, and OpenCode use project-scoped, reversible connectors. Dry-run is the default; --apply is always explicit."
          action={connectCommandCopied ? "Copied" : "Copy connect command"}
          onClick={() => {
            void copyText("agent-nudge connect all --dry-run").then(() =>
              setConnectCommandCopied(true),
            );
          }}
        />
        <Setting
          icon={ShieldCheck}
          title="Privacy defaults"
          text="Secret redaction on. Raw prompts, replies, file contents, clipboard, and browser history remain off."
          action="Review policy"
        />
        <Setting
          icon={Layers3}
          title="Noise budget"
          text="Maximum three non-urgent nudges per session every ten minutes."
          action="Reset defaults"
        />
      </div>
    </div>
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall back to the synchronous copy path below.
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function Metric({ icon: Icon, value, label, detail, tone = "" }: any) {
  return (
    <div className={`metric ${tone}`}>
      <Icon />
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </div>
  );
}
function NudgeRow({ item }: { item: NudgeItem }) {
  return (
    <div className="nudge-row">
      <ClassIcon value={item.deliveryClass} />
      <div>
        <span>{item.deliveryClass.replace("_", " ")}</span>
        <strong>{item.title}</strong>
        <small>{item.whyNow}</small>
      </div>
      <div>
        <b>{item.relevanceScore}</b>
        <small>{item.state}</small>
      </div>
    </div>
  );
}
function ClassIcon({ value }: { value: string }) {
  return (
    <span className={`class-icon ${value.toLowerCase()}`}>
      {value === "BLOCK" ? (
        <AlertOctagon />
      ) : value === "ACT_NOW" ? (
        <BellRing />
      ) : (
        <Clock3 />
      )}
    </span>
  );
}
function Setting({ icon: Icon, title, text, action, onClick }: any) {
  return (
    <article>
      <Icon />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button onClick={onClick} disabled={!onClick}>
        {action}
        <ChevronRight size={15} />
      </button>
    </article>
  );
}
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`brand ${compact ? "compact" : ""}`}
      href={isDesktop ? "#" : "/"}
    >
      <span>
        N<span>↗</span>
      </span>
      {!compact && (
        <strong>
          Agent Nudge<small>Context assurance</small>
        </strong>
      )}
    </a>
  );
}
function relative(date?: string) {
  if (!date) return "not recorded";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(date).getTime()) / 60000),
  );
  return minutes < 1
    ? "now"
    : minutes < 60
      ? `${minutes}m ago`
      : `${Math.round(minutes / 60)}h ago`;
}

type CompileResult = {
  brief: string;
  digest: string;
  health: ContextHealth;
  sources: { path: string; type: string; digest: string }[];
  skipped: { path: string; reason: string }[];
  conflicts: { overwrittenId: string; winnerId: string; reason: string }[];
};

type ContextHealth = {
  repository: {
    name: string;
    path: string;
    branch: string;
    dirty: boolean;
    changedFiles: number;
    stagedFiles: number;
  };
  sources: Array<{
    name: string;
    present: boolean;
    lines: number;
    estimatedTokens: number;
    digest?: string;
    drift: string;
  }>;
  totals: {
    lines: number;
    estimatedTokens: number;
    tokenBudget: number;
    budgetUsedPercent: number;
    changedSources: number;
  };
  lastCompiledAt?: string;
  outputDigest?: string;
};

type LicenseStatus = {
  plan: "community" | "trial" | "pro" | "studio";
  active: boolean;
  entitlements: string[];
  expiresAt?: string;
  trialDaysRemaining?: number;
  checkoutUrl: string;
};

type RunnerInfo = {
  provider: "claude" | "codex" | "aider";
  executable: string;
  available: boolean;
  transport: string;
};

type RunnerJob = {
  id: string;
  provider: string;
  state: "running" | "completed" | "failed" | "cancelled";
  output: string;
  error: string;
  exitCode?: number;
};

function CompilerView({ isPublicDemo }: { isPublicDemo: boolean }) {
  const [repo, setRepo] = useState("C:\\Users\\manaz\\Projects\\agent-nudge");
  const [objective, setObjective] = useState(
    "Implement the next highest-value product improvement",
  );
  const [mode, setMode] = useState("BUILD");
  const [agent, setAgent] = useState("Codex");
  const [detail, setDetail] = useState("standard");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [health, setHealth] = useState<ContextHealth | null>(null);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseToken, setLicenseToken] = useState("");
  const [runners, setRunners] = useState<RunnerInfo[]>([]);
  const [runner, setRunner] = useState<RunnerInfo["provider"]>("codex");
  const [runJob, setRunJob] = useState<RunnerJob | null>(null);
  const [changelog, setChangelog] = useState("");
  const [notice, setNotice] = useState("");
  const [editedBrief, setEditedBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit) => {
      if (isPublicDemo)
        throw new Error("Open the desktop app to use local tools.");
      const response = await fetch(`${endpoint}${path}`, init);
      const body = (await response.json()) as T & { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? `Request failed (${response.status})`);
      return body;
    },
    [isPublicDemo],
  );

  const inspect = useCallback(async () => {
    setError("");
    try {
      const query = new URLSearchParams({ repo, tokenBudget: "16000" });
      const [healthData, licenseData, runnerData] = await Promise.all([
        request<ContextHealth>(`/v1/context-health?${query}`),
        request<LicenseStatus>("/v1/license/status"),
        request<{ runners: RunnerInfo[] }>("/v1/runners"),
      ]);
      setHealth(healthData);
      setLicense(licenseData);
      setRunners(runnerData.runners);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [repo, request]);

  useEffect(() => {
    if (!isPublicDemo) void inspect();
  }, [inspect, isPublicDemo]);

  async function generate() {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const data = await request<CompileResult>("/v1/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repo,
          objective,
          mode,
          agent,
          verbosity: detail,
        }),
      });
      setResult(data);
      setHealth(data.health);
      setEditedBrief(data.brief);
      setNotice("Brief compiled and context receipt recorded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function copyBrief() {
    void navigator.clipboard.writeText(editedBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function bootstrap(apply: boolean) {
    setBusy(true);
    setError("");
    try {
      const plan = await request<{
        actions: Array<{ relativePath: string; state: string }>;
      }>("/v1/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo, apply }),
      });
      const pending = plan.actions.filter(
        (action) => action.state === "create",
      );
      setNotice(
        apply
          ? `Initialised ${pending.length} missing context file(s).`
          : pending.length
            ? `Ready to create: ${pending.map((action) => action.relativePath).join(", ")}`
            : "Repository context is already initialised.",
      );
      await inspect();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function makeChangelog(apply: boolean) {
    setBusy(true);
    setError("");
    try {
      const data = await request<{ markdown: string; output?: string }>(
        "/v1/changelog",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            repo,
            applyPath: apply ? "CHANGELOG.generated.md" : undefined,
          }),
        },
      );
      setChangelog(data.markdown);
      setNotice(
        data.output
          ? `Changelog written to ${data.output}`
          : "Changelog preview ready.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function activateLicense() {
    setBusy(true);
    setError("");
    try {
      const status = await request<LicenseStatus>("/v1/license/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: licenseToken.trim() }),
      });
      setLicense(status);
      setLicenseToken("");
      setNotice("Pro license activated on this device.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function launch() {
    if (!editedBrief) return;
    setBusy(true);
    setError("");
    try {
      let job = await request<RunnerJob>("/v1/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: runner, repo, brief: editedBrief }),
      });
      setRunJob(job);
      for (
        let attempts = 0;
        attempts < 2_400 && job.state === "running";
        attempts += 1
      ) {
        await new Promise((resolveWait) => setTimeout(resolveWait, 250));
        job = await request<RunnerJob>(`/v1/runs/${job.id}`);
        setRunJob(job);
      }
      setNotice(
        job.state === "completed"
          ? `${runner} completed with a verified receipt.`
          : `${runner} stopped with state: ${job.state}.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="compiler-view industrial-view">
      <header className="view-head">
        <div>
          <h1>
            <Sparkles size={20} /> Agent Brief Compiler
          </h1>
          <p>
            Inspect context. Compile the smallest useful brief. Send it straight
            to an installed coding agent.
          </p>
        </div>
      </header>

      <div className="license-strip">
        <div>
          <span>LICENSE</span>
          <strong>
            {license?.plan ?? (isPublicDemo ? "demo" : "checking")}
          </strong>
          <small>
            {license?.plan === "trial"
              ? `${license.trialDaysRemaining} Pro trial days remaining`
              : license?.plan === "community"
                ? "Core assurance stays free"
                : "Automation unlocked"}
          </small>
        </div>
        {license?.plan === "community" && (
          <button
            className="industrial-button outline"
            onClick={() => window.open(license.checkoutUrl, "_blank")}
          >
            Unlock Pro · $29/year
          </button>
        )}
        <label className="license-entry">
          <span>Signed license token</span>
          <input
            value={licenseToken}
            onChange={(event) => setLicenseToken(event.target.value)}
            placeholder="Paste token"
            type="password"
          />
          <button
            className="industrial-button"
            disabled={!licenseToken.trim() || busy}
            onClick={activateLicense}
          >
            Activate
          </button>
        </label>
      </div>

      {error && (
        <p className="compiler-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="compiler-notice" role="status">
          {notice}
        </p>
      )}

      {health && (
        <div className="health-board">
          <div className="health-summary">
            <div>
              <span>BRANCH</span>
              <strong>{health.repository.branch}</strong>
            </div>
            <div>
              <span>WORKTREE</span>
              <strong>
                {health.repository.dirty
                  ? `${health.repository.changedFiles} DIRTY`
                  : "CLEAN"}
              </strong>
            </div>
            <div>
              <span>CONTEXT</span>
              <strong>
                {health.totals.estimatedTokens.toLocaleString()} TOKENS
              </strong>
            </div>
            <div>
              <span>BUDGET</span>
              <strong>{health.totals.budgetUsedPercent}% USED</strong>
            </div>
          </div>
          <div
            className="health-table"
            role="table"
            aria-label="Repository context health"
          >
            <div className="health-row health-head" role="row">
              <span>SOURCE</span>
              <span>LINES</span>
              <span>TOKENS</span>
              <span>DRIFT</span>
              <span>DIGEST</span>
            </div>
            {health.sources.map((source) => (
              <div className="health-row" role="row" key={source.name}>
                <strong>{source.name}</strong>
                <span>{source.present ? source.lines : "—"}</span>
                <span>
                  {source.present ? `~${source.estimatedTokens}` : "—"}
                </span>
                <span className={`drift drift-${source.drift}`}>
                  {source.present ? source.drift : "missing"}
                </span>
                <code>{source.digest?.slice(0, 8) ?? "--------"}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="compiler-grid">
        <div className="compiler-form panel">
          <label>
            <span>Repository path</span>
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="C:\\Users\\you\\Projects\\your-repo"
            />
          </label>
          <label>
            <span>Task objective</span>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
            />
          </label>
          <div className="compiler-selects">
            <label>
              <span>Mode</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                {["RESEARCH", "PLAN", "BUILD", "REVIEW", "RESUME"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Agent</span>
              <select value={agent} onChange={(e) => setAgent(e.target.value)}>
                {[
                  "Claude",
                  "Codex",
                  "OpenCode",
                  "Grok",
                  "Hermes",
                  "Generic",
                ].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Detail</span>
              <select
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              >
                {["concise", "standard", "detailed"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="button" onClick={generate} disabled={busy}>
            <Sparkles size={16} />
            {busy ? "Generating…" : "Generate Brief"}
          </button>
          <div className="utility-actions">
            <button onClick={inspect} disabled={busy}>
              <RefreshCw size={14} /> Inspect
            </button>
            <button onClick={() => bootstrap(false)} disabled={busy}>
              Preview init
            </button>
            <button onClick={() => bootstrap(true)} disabled={busy}>
              Apply init
            </button>
          </div>
        </div>

        <div className="compiler-output">
          {result ? (
            <>
              <div className="panel compiler-brief">
                <div className="compiler-brief-head">
                  <div>
                    <strong>Generated brief</strong>
                    <code>digest {result.digest.substring(0, 12)}</code>
                  </div>
                  <button className="button button-small" onClick={copyBrief}>
                    {copied ? <Check size={15} /> : <FileCode2 size={15} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <textarea
                  className="compiler-brief-body"
                  value={editedBrief}
                  onChange={(e) => setEditedBrief(e.target.value)}
                  rows={20}
                />
                <div className="runner-bar">
                  <label>
                    <span>DIRECT HANDOFF</span>
                    <select
                      value={runner}
                      onChange={(event) =>
                        setRunner(event.target.value as RunnerInfo["provider"])
                      }
                    >
                      {runners.map((item) => (
                        <option
                          key={item.provider}
                          value={item.provider}
                          disabled={!item.available}
                        >
                          {item.provider}{" "}
                          {item.available ? "ready" : "not installed"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="industrial-button"
                    onClick={launch}
                    disabled={
                      busy ||
                      !runners.find((item) => item.provider === runner)
                        ?.available
                    }
                  >
                    <TerminalSquare size={15} /> Launch with brief
                  </button>
                </div>
                {runJob && (
                  <pre className={`runner-console state-${runJob.state}`}>
                    {`[${runJob.state}] exit=${runJob.exitCode ?? "-"}\n${runJob.output || runJob.error || "Waiting for output…"}`}
                  </pre>
                )}
              </div>

              <div className="panel compiler-sources">
                <strong>Collected source context</strong>
                <ul>
                  {result.sources.map((s) => (
                    <li key={s.path}>
                      <span className="source-type">{s.type}</span>
                      <span className="source-path">
                        {s.path.split(/[\\/]/).pop()}
                      </span>
                      <code>{s.digest.substring(0, 8)}</code>
                    </li>
                  ))}
                </ul>
                {result.skipped.length > 0 && (
                  <>
                    <strong>Skipped</strong>
                    <ul className="skipped-list">
                      {result.skipped.map((s) => (
                        <li key={s.path}>
                          {s.path.split(/[\\/]/).pop()} — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {result.conflicts.length > 0 && (
                <div className="panel compiler-conflicts">
                  <strong>
                    <AlertOctagon size={15} /> Conflicts requiring review
                  </strong>
                  <ul>
                    {result.conflicts.map((c, i) => (
                      <li key={i}>
                        <code>{c.overwrittenId}</code> vs{" "}
                        <code>{c.winnerId}</code> — {c.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="panel compiler-empty">
              <Sparkles size={28} />
              <p>
                Fill in a repository, objective, mode and agent, then generate a
                brief. Sources, digest and any rule conflicts appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="changelog-workbench">
        <div>
          <strong>Automatic changelog</strong>
          <span>
            Deterministic Git history. No model call. Preview is free.
          </span>
        </div>
        <div className="utility-actions">
          <button onClick={() => makeChangelog(false)} disabled={busy}>
            Preview
          </button>
          <button onClick={() => makeChangelog(true)} disabled={busy}>
            Write CHANGELOG.generated.md
          </button>
        </div>
        <textarea
          value={changelog}
          readOnly
          rows={changelog ? 14 : 4}
          placeholder="Generate a changelog preview from this repository."
        />
      </div>
    </section>
  );
}

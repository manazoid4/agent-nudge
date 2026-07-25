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

const endpoint = window.agentNudge?.endpoint ?? "http://127.0.0.1:47831";
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
            <span>v0.4 · reversible connect</span>
          </div>
          <h1>Two agents. One repository. No stale decisions.</h1>
          <p className="hero-lede">
            Agent Nudge keeps Claude, Codex, and OpenCode on the same page with
            task intent, expiring path claims, verified context deltas, and a
            receipt before the next consequential move.
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
              Pay for encrypted teamwork, multi-project operations, policy,
              audit, and controlled delivery—not for storing more noise.
            </p>
          </div>
          <div className="price-line">
            <span>Community</span>
            <strong>£0</strong>
            <small>Local · private · open core</small>
            <a href="#demo">
              Try the full demo <ArrowRight size={15} />
            </a>
          </div>
          <div className="price-line featured">
            <span>Pro hypothesis</span>
            <strong>
              £19<em>/mo</em>
            </strong>
            <small>Sync · rules · history · ROI</small>
            <a href="mailto:hello@agentnudge.dev?subject=Agent%20Nudge%20design%20partner">
              Become a design partner <ArrowRight size={15} />
            </a>
          </div>
          <div className="price-line studio">
            <span>Studio hypothesis</span>
            <strong>
              £79<em>/mo</em>
            </strong>
            <small>5 people · 50 projects · GitHub + Obsidian</small>
            <a href="mailto:hello@agentnudge.dev?subject=Agent%20Nudge%20studio%20pilot">
              Join a studio pilot <ArrowRight size={15} />
            </a>
          </div>
          <div className="price-line">
            <span>Team hypothesis</span>
            <strong>
              £299<em>/mo</em>
            </strong>
            <small>10 people · policy · approvals · audit</small>
            <a href="mailto:hello@agentnudge.dev?subject=Agent%20Nudge%20team%20pilot">
              Discuss a team pilot <ArrowRight size={15} />
            </a>
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
          <small>{window.agentNudge?.version ?? "v0.4.0"}</small>
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
        {view === "compiler" && <CompilerView />}
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
  sources: { path: string; type: string; digest: string }[];
  skipped: { path: string; reason: string }[];
  conflicts: { overwrittenId: string; winnerId: string; reason: string }[];
};

function CompilerView() {
  const [repo, setRepo] = useState("C:\\Users\\manaz\\Projects\\JobFilterV1");
  const [objective, setObjective] = useState(
    "Research the next highest-value product improvements",
  );
  const [mode, setMode] = useState("RESEARCH");
  const [agent, setAgent] = useState("Claude");
  const [detail, setDetail] = useState("standard");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [editedBrief, setEditedBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch(`${endpoint}/v1/compile`, {
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
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Compilation failed");
      }
      const data = (await response.json()) as CompileResult;
      setResult(data);
      setEditedBrief(data.brief);
    } catch (e: any) {
      setError(e.message ?? String(e));
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

  return (
    <section className="compiler-view">
      <header className="view-head">
        <div>
          <h1>
            <Sparkles size={20} /> Agent Brief Compiler
          </h1>
          <p>
            Turn a repository + your approved rules + a task into a concise,
            reusable agent brief. Read-only: compilation never writes to the
            selected repository.
          </p>
        </div>
      </header>

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
                {["Claude", "Codex", "OpenCode", "Grok", "Hermes", "Generic"].map(
                  (a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ),
                )}
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
          {error && <p className="compiler-error">{error}</p>}
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
    </section>
  );
}


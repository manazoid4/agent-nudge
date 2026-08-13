import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BellRing,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  Gauge,
  GitMerge,
  Inbox,
  Layers3,
  LockKeyhole,
  Menu,
  Play,
  Radar,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
  type LucideIcon,
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
async function daemonFetch(path: string, init: RequestInit = {}) {
  if (window.agentNudge?.request) {
    const result = await window.agentNudge.request(path, {
      method: init.method,
      body: typeof init.body === "string" ? init.body : undefined,
    });
    return new Response(result.body, {
      status: result.status,
      headers: { "content-type": result.contentType },
    });
  }
  return fetch(`${endpoint}${path}`, init);
}
const isDesktop =
  Boolean(window.agentNudge) ||
  new URLSearchParams(location.search).has("desktop");
const githubUrl = "https://github.com/manazoid4/agent-nudge";
const releasesUrl = `${githubUrl}/releases`;

const dashboardViews: Array<{
  id: View;
  icon: LucideIcon;
  label: string;
}> = [
  { id: "overview", icon: Gauge, label: "Live sync" },
  { id: "portfolio", icon: Layers3, label: "Context mesh" },
  { id: "inbox", icon: Inbox, label: "Nudge inbox" },
  { id: "agents", icon: Bot, label: "Live agents" },
  { id: "timeline", icon: Activity, label: "Timeline" },
  { id: "compiler", icon: Sparkles, label: "Brief compiler" },
  { id: "rules", icon: Radar, label: "Rules" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function App() {
  const [route, setRoute] = useState(() => location.pathname || "/");

  useEffect(() => {
    const update = () => setRoute(location.pathname || "/");
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);

  useEffect(() => {
    if (isDesktop) return;
    const titles: Record<string, string> = {
      "/": "Agent Nudge — Context before action",
      "/download": "Download Agent Nudge",
      "/docs": "Agent Nudge documentation",
      "/security": "Agent Nudge security",
      "/pricing": "Agent Nudge pricing",
      "/changelog": "Agent Nudge changelog",
    };
    document.title = route.startsWith("/demo")
      ? "Agent Nudge — Interactive demo"
      : (titles[route] ?? "Agent Nudge");
  }, [route]);

  if (isDesktop) return <Console isPublicDemo={false} />;
  if (route === "/") return <Landing />;
  if (route === "/download") return <DownloadPage />;
  if (route === "/docs") return <DocsPage />;
  if (route === "/security") return <SecurityPage />;
  if (route === "/pricing") return <PricingPage />;
  if (route === "/changelog") return <ChangelogPage />;
  if (route === "/demo" || route.startsWith("/demo/")) {
    return <Console isPublicDemo />;
  }
  return <NotFoundPage />;
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

  return (
    <main className="landing">
      <PublicHeader />

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
            <RouteLink className="button" to="/download">
              <Download size={17} /> Get Agent Nudge
            </RouteLink>
            <RouteLink className="button secondary" to="/demo/inbox">
              <Play size={17} fill="currentColor" /> Explore the proof
            </RouteLink>
            <a className="text-link" href={githubUrl}>
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
              {index < 4 && <ChevronRight aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="use-cases">
          <article>
            <AlertOctagon />
            <h3>Stop edit collisions</h3>
            <p>
              Warn Codex that Claude already claimed the exact file before the
              write, rather than after a merge conflict.
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
            <h3>Do not repeat failed work</h3>
            <p>
              Surface a test receipt from an abandoned approach without
              injecting a previous session transcript.
            </p>
          </article>
        </div>
      </section>

      <section className="bridge-contract shell" id="bridge">
        <div className="bridge-heading">
          <p className="section-signal">LIVE CONNECT CONTRACT</p>
          <h2>Shared execution state, not a shared transcript.</h2>
          <p>
            Every provider uses the same local loop. Capability labels stay
            explicit, and connector changes are dry-run first and reversible.
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
            <p>Acknowledge, release, replan, or report context as wrong.</p>
          </article>
        </div>
        <p className="capability-note">
          Hooks are guardrails rather than a complete security boundary. Hosted,
          disabled, bypassed, or uncovered actions remain outside enforcement.
        </p>
      </section>

      <section className="commercial" id="pricing">
        <div className="shell commercial-inner">
          <div>
            <p className="section-signal">USEFUL BEFORE YOU PAY</p>
            <h2>The local product stays free.</h2>
            <p>
              Revenue is intended to come from controlled coordination across
              people, devices, and systems—not from crippling the local core.
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
            <RouteLink to="/download">
              Installation options <ArrowRight size={15} />
            </RouteLink>
          </div>
          <div className="price-line featured">
            <span>Founding beta</span>
            <strong>$29 one-time</strong>
            <small>Unlimited local repos · 12 months of updates</small>
            <a href="mailto:hello@agentnudge.dev?subject=Agent%20Nudge%20design%20partner">
              Join the founding beta <ArrowRight size={15} />
            </a>
          </div>
          <div className="price-line studio">
            <span>Team — later</span>
            <strong>Not for sale</strong>
            <small>Shared policy · approvals · sync · audit</small>
            <RouteLink to="/pricing">
              View packaging <ArrowRight size={15} />
            </RouteLink>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function NudgeSpecimen() {
  return (
    <div className="specimen">
      <div className="specimen-top">
        <span className="danger-dot" />
        Pre-action hold <span>Codex · recorded scenario</span>
      </div>
      <div className="specimen-body">
        <div className="score-ring">
          140<small>score</small>
        </div>
        <div>
          <p className="mono-label">EXACT FILE CONFLICT</p>
          <h2>Claude is editing cache.ts</h2>
          <p>
            Another active agent claimed the same file. Coordinate before
            writing.
          </p>
        </div>
      </div>
      <div className="evidence-row">
        <FileCode2 />
        <div>
          <strong>src/lib/cache.ts</strong>
          <span>Claude session receipt · source attached</span>
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
        <button type="button" onClick={() => navigate("/demo/inbox")}>
          Show evidence
        </button>
        <button
          type="button"
          className="accept"
          onClick={() => navigate("/demo/inbox")}
        >
          <Check size={15} /> Open acknowledgement
        </button>
      </div>
    </div>
  );
}

function Console({ isPublicDemo }: { isPublicDemo: boolean }) {
  const [view, setView] = useState<View>(() => readView());
  const [navOpen, setNavOpen] = useState(false);
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
        daemonFetch("/snapshot?projectId=project-agent-nudge"),
        daemonFetch("/portfolio"),
      ]);
      if (!response.ok) throw new Error("offline");
      const data = (await response.json()) as Snapshot;
      setSnapshot(data);
      if (portfolioResponse.ok) {
        setPortfolio((await portfolioResponse.json()) as Portfolio);
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

  useEffect(() => {
    const update = () => setView(readView());
    addEventListener("popstate", update);
    addEventListener("hashchange", update);
    return () => {
      removeEventListener("popstate", update);
      removeEventListener("hashchange", update);
    };
  }, []);

  useEffect(() => {
    const label = dashboardViews.find((item) => item.id === view)?.label;
    document.title = `Agent Nudge — ${label ?? "Dashboard"}`;
  }, [view]);

  function selectView(next: View) {
    setView(next);
    setNavOpen(false);
    if (isDesktop) {
      location.hash = next;
    } else {
      history.pushState({}, "", `/demo/${next}`);
      dispatchEvent(new PopStateEvent("popstate"));
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(".page h1")?.focus();
    });
  }

  async function runDemo() {
    setBusy(true);
    if (isPublicDemo) {
      setSnapshot(sampleSnapshot);
      setSelectedId("nudge-conflict");
      selectView("inbox");
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
          const response = await daemonFetch("/v1/sessions/check-in", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...session,
              projectId: "project-agent-nudge",
              projectName: "Agent Nudge",
              cwd: "C:\\Projects\\agent-nudge",
            }),
          });
          if (!response.ok) throw new Error("check-in failed");
        }
        const claim = await daemonFetch("/v1/claims", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            projectId: "project-agent-nudge",
            sessionId: sessions[0]?.sessionId,
            path: "src/lib/cache.ts",
            leaseSeconds: 300,
          }),
        });
        if (!claim.ok) throw new Error("claim failed");
        const synced = await daemonFetch("/v1/sync", {
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
        selectView("inbox");
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
        const response = await daemonFetch(
          `/v1/nudges/${selected.id}/receipts/${actionName}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              projectId: selected.projectId,
              sessionId: selected.recipientSessionId,
              clientId: "electron-renderer",
              idempotencyKey: crypto.randomUUID(),
              snoozeMinutes: 15,
            }),
          },
        );
        if (!response.ok) throw new Error("action failed");
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
      <a className="skip-link" href="#main-workspace">
        Skip to dashboard content
      </a>
      <aside
        id="app-navigation"
        className={`rail ${navOpen ? "mobile-open" : ""}`}
      >
        <Brand compact />
        <nav aria-label="Dashboard navigation">
          {dashboardViews.map(({ id, icon: Icon, label }) => (
            <button
              type="button"
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => selectView(id)}
              aria-label={label}
              aria-current={view === id ? "page" : undefined}
              title={label}
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
                ? "Browser simulation"
                : connected
                  ? "Local daemon"
                  : "Daemon offline"}
            </span>
          </div>
          <small>{window.agentNudge?.version ?? "v0.5.1"}</small>
        </div>
      </aside>
      <div className="workspace" id="main-workspace">
        <header className="app-topbar">
          <button
            type="button"
            className="mobile-menu"
            aria-label={
              navOpen
                ? "Close dashboard navigation"
                : "Open dashboard navigation"
            }
            aria-expanded={navOpen}
            aria-controls="app-navigation"
            onClick={() => setNavOpen((current) => !current)}
          >
            {navOpen ? <X /> : <Menu />}
          </button>
          <div>
            <span>PROJECT</span>
            <strong>
              {isPublicDemo ? "Recorded product scenario" : "Agent Nudge"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="privacy">
              <ShieldCheck size={15} />{" "}
              {isPublicDemo ? "Fixture only" : "Local only"}
            </span>
            <button
              type="button"
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
          <Overview
            snapshot={snapshot}
            runDemo={runDemo}
            openInbox={() => selectView("inbox")}
          />
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
          <h1 tabIndex={-1}>Context mesh</h1>
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
          value={portfolio.metrics.projects}
          label="known projects"
          detail="project-scoped by default"
        />
        <Metric
          icon={ShieldCheck}
          value={portfolio.metrics.protectedProjects}
          label="protected"
          detail="current context + receipts"
        />
        <Metric
          icon={AlertOctagon}
          value={portfolio.metrics.openHolds}
          label="open holds"
          detail="review before consequential action"
        />
        <Metric
          icon={Check}
          value={portfolio.metrics.acknowledged}
          label="acknowledgements"
          detail="delivery measured separately"
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
                  type="button"
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
            Register an agent session or run the proof. Agent Nudge never
            discovers or uploads repositories behind your back.
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
            The same ledger state produces the same digest; changed evidence
            produces a new pack.
          </span>
        </div>
      </div>
      <div className="mesh-freshness">
        <Clock3 size={16} /> Latest activity{" "}
        {relative(project.latestActivityAt)}
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
  openInbox,
}: {
  snapshot: Snapshot;
  runDemo: () => void;
  openInbox: () => void;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Live coordination</p>
          <h1 tabIndex={-1}>Who is doing what—and can the next agent act?</h1>
          <span>
            Presence, current task intent, changed constraints, and receipts
            from one local production path.
          </span>
        </div>
        <button type="button" className="button secondary" onClick={runDemo}>
          <Sparkles size={16} /> Run conflict proof
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
          label="active records"
          detail="freshness correction planned for v0.5"
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
          label="block receipts"
          detail="not automatically claimed as prevention"
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
            <button type="button" onClick={openInbox}>
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
              <h2>Routing snapshot</h2>
              <p>Current local state</p>
            </div>
            <span className="status-ok">Inspectable</span>
          </div>
          <div className="routing-meter">
            <div
              style={{
                width: snapshot.nudges.length
                  ? `${Math.min(100, Math.max(12, snapshot.metrics.acknowledged * 25))}%`
                  : "0%",
              }}
            />
            <span>Acknowledged receipt coverage</span>
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
              <dt>Non-queued nudges</dt>
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
          <h1 tabIndex={-1}>Before the next action</h1>
          <span>
            {snapshot.nudges.length} source-backed context deltas for this
            project.
          </span>
        </div>
      </div>
      <div className="inbox-layout">
        <section className="inbox-list" aria-label="Nudges">
          {snapshot.nudges.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`inbox-item ${selected?.id === item.id ? "selected" : ""}`}
              onClick={() => setSelectedId(item.id)}
              aria-pressed={selected?.id === item.id}
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
          <section className="inspector" aria-live="polite">
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
              <strong>Why this reached the recipient now</strong>
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
              <button
                type="button"
                aria-label="Open source path in the Agent Nudge repository"
                onClick={() => {
                  const path = selected.sourceRefs[0]?.filePath;
                  openExternal(
                    path ? `${githubUrl}/blob/main/${path}` : githubUrl,
                  );
                }}
              >
                <ExternalLink size={16} />
              </button>
            </div>
            <div className="inspector-actions">
              <button type="button" onClick={() => action("dismiss")}>
                <X size={16} /> Dismiss
              </button>
              <button type="button" onClick={() => action("snooze")}>
                <Clock3 size={16} /> Snooze 15m
              </button>
              <button
                type="button"
                className="accept"
                onClick={() => action("acknowledge")}
              >
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
          <h1 tabIndex={-1}>Who is doing what</h1>
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
          <p>Nudge timeline</p>
          <h1 tabIndex={-1}>What context was routed</h1>
          <span>
            This view currently shows nudge delivery records. Full
            protocol-event reconstruction is tracked for v0.5.
          </span>
        </div>
      </div>
      <div className="timeline">
        {snapshot.nudges.map((item, index) => (
          <div key={item.id}>
            <span className="timeline-index">
              {String(index + 1).padStart(2, "0")}
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
    ["Exact file claim conflict", "BLOCK", "140", "Built-in"],
    ["Changed decision + exact path", "ACT NOW", "100+", "Built-in"],
    ["Failed approach + task overlap", "NEXT BOUNDARY", "50+", "Built-in"],
    ["Low-signal documentation change", "DROP", "<30", "Built-in"],
  ];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Current policy reference</p>
          <h1 tabIndex={-1}>Deterministic and inspectable</h1>
          <span>
            This is a read-only reference for the current built-in policy. A
            versioned policy editor belongs in a later release.
          </span>
        </div>
      </div>
      <div
        className="rule-table"
        role="table"
        aria-label="Current routing rules"
      >
        <div className="rule-header" role="row">
          <span role="columnheader">Rule</span>
          <span role="columnheader">Delivery</span>
          <span role="columnheader">Threshold</span>
          <span role="columnheader">Source</span>
        </div>
        {rows.map((row) => (
          <div key={row[0]} role="row">
            {row.map((cell, index) => (
              <span
                key={cell}
                role="cell"
                className={index === 3 ? "status-ok" : ""}
              >
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
  const [copied, setCopied] = useState("");
  const [noiseBudget, setNoiseBudget] = useState(3);

  async function copy(label: string, value: string) {
    await copyText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1600);
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p>Settings</p>
          <h1 tabIndex={-1}>Local control</h1>
          <span>Nothing is silently installed into agent configuration.</span>
        </div>
      </div>
      <div className="settings-stack">
        <Setting
          icon={Database}
          title="Local ledger"
          text={
            isPublicDemo
              ? "The browser uses public fixtures. The Windows app keeps its SQLite ledger under the user profile."
              : `${endpoint} · ${connected ? "connected" : "offline"}`
          }
          action={copied === "doctor" ? "Copied" : "Copy doctor command"}
          onClick={() => copy("doctor", "agent-nudge doctor")}
        />
        <Setting
          icon={TerminalSquare}
          title="Agent integrations"
          text="Claude Code, Codex, and OpenCode use project-scoped, reversible connectors. Dry-run is the default."
          action={copied === "connect" ? "Copied" : "Copy dry-run command"}
          onClick={() => copy("connect", "agent-nudge connect all --dry-run")}
        />
        <Setting
          icon={ShieldCheck}
          title="Privacy and security"
          text="Raw prompts, replies, file contents, clipboard data, and browser history remain outside the default ledger."
          action="Review policy"
          onClick={() =>
            isDesktop
              ? openExternal(`${githubUrl}/blob/main/SECURITY.md`)
              : navigate("/security")
          }
        />
        <Setting
          icon={Layers3}
          title="Noise budget"
          text={`Maximum ${noiseBudget} non-urgent nudges per session every ten minutes.`}
          action={noiseBudget === 3 ? "Default active" : "Reset default"}
          onClick={() => setNoiseBudget(3)}
        />
        <Setting
          icon={RotateCcw}
          title="Recovery roadmap"
          text="Crash recovery, stale-lock handling, and sole-writer enforcement are the active v0.5 reliability work."
          action="Open issue"
          onClick={() => openExternal(`${githubUrl}/issues/6`)}
        />
      </div>
    </div>
  );
}

function DownloadPage() {
  return (
    <PublicPage
      eyebrow="WINDOWS DELIVERY"
      title="Install locally. Verify what you run."
      lede="Agent Nudge v0.5 beta has verified local Windows installer and portable build receipts. Public code-signed release assets are still pending, so this page never pretends an unavailable binary is ready."
    >
      <div className="public-grid two-column">
        <article className="public-card featured-card">
          <Download />
          <h2>GitHub Releases</h2>
          <p>
            Use the releases page for published installers, portable builds,
            checksums, release notes, and future signed artifacts.
          </p>
          <a className="button" href={releasesUrl}>
            Open GitHub Releases <ExternalLink size={16} />
          </a>
        </article>
        <article className="public-card">
          <TerminalSquare />
          <h2>Build from source</h2>
          <p>
            Clone the repository on Windows, install the locked dependencies,
            run all checks, and package the installer locally.
          </p>
          <pre>
            <code>{`npm ci\nnpm run typecheck\nnpm run test\nnpm run package:win`}</code>
          </pre>
        </article>
      </div>
      <section className="public-section">
        <h2>First connection</h2>
        <ol className="numbered-steps">
          <li>
            Run <code>agent-nudge doctor</code>.
          </li>
          <li>
            Preview connector changes with{" "}
            <code>agent-nudge connect all --dry-run</code>.
          </li>
          <li>Review every target and backup location.</li>
          <li>
            Apply explicitly with <code>agent-nudge connect all --apply</code>.
          </li>
          <li>Run the two-agent proof and inspect the first receipt.</li>
        </ol>
      </section>
      <Callout>
        Current v0.5 beta limitations include unsigned Windows binaries, an
        unauthenticated local control plane, fail-open hooks while the daemon is
        unavailable, and incomplete hard-termination recovery. They are
        documented rather than hidden.
      </Callout>
    </PublicPage>
  );
}

function DocsPage() {
  return (
    <PublicPage
      eyebrow="DOCUMENTATION"
      title="Declare. Preflight. Act. Receipt."
      lede="The shortest useful path through Agent Nudge, from a clean repository to a source-backed pre-action decision."
    >
      <div className="public-grid three-column">
        <article className="public-card">
          <BookOpen />
          <h2>1. Declare intent</h2>
          <p>
            An agent checks in with project, task, paths, tags, and heartbeat.
          </p>
        </article>
        <article className="public-card">
          <AlertOctagon />
          <h2>2. Preflight</h2>
          <p>The local daemon returns HOLD, REVIEW, or CLEAR with a digest.</p>
        </article>
        <article className="public-card">
          <ShieldCheck />
          <h2>3. Record outcome</h2>
          <p>
            The recipient acknowledges, replans, releases, or disputes context.
          </p>
        </article>
      </div>
      <section className="public-section split-section">
        <div>
          <h2>Connector commands</h2>
          <pre>
            <code>{`agent-nudge doctor\nagent-nudge connect all --dry-run\nagent-nudge connect all --apply\nagent-nudge disconnect all --dry-run`}</code>
          </pre>
        </div>
        <div>
          <h2>Protocol boundaries</h2>
          <ul className="plain-list">
            <li>No transcript store.</li>
            <li>Project isolation by default.</li>
            <li>Explicit connector mutation.</li>
            <li>Evidence references and expiry.</li>
            <li>Delivery does not equal model knowledge.</li>
          </ul>
        </div>
      </section>
      <div className="page-actions">
        <a className="button" href={`${githubUrl}/blob/main/README.md`}>
          Read repository guide <ExternalLink size={16} />
        </a>
        <RouteLink className="button secondary" to="/demo/overview">
          Explore dashboard
        </RouteLink>
      </div>
    </PublicPage>
  );
}

function SecurityPage() {
  return (
    <PublicPage
      eyebrow="SECURITY"
      title="Local-first is a boundary, not a slogan."
      lede="Agent Nudge minimises captured data, binds its service to loopback, and makes provider changes reversible. The remaining risks are stated plainly."
    >
      <div className="public-grid three-column">
        <article className="public-card">
          <Database />
          <h2>Data minimisation</h2>
          <p>
            Structured facts, paths, source references, claims, and receipts.
          </p>
        </article>
        <article className="public-card">
          <LockKeyhole />
          <h2>Local control plane</h2>
          <p>
            The daemon listens on 127.0.0.1 and does not require a cloud
            account.
          </p>
        </article>
        <article className="public-card">
          <RotateCcw />
          <h2>Reversible connectors</h2>
          <p>
            Dry-run, owned fragments, external backups, drift refusal, rollback.
          </p>
        </article>
      </div>
      <section className="public-section">
        <h2>Known limitations and active work</h2>
        <ul className="plain-list status-list">
          <li>
            <strong>Local API authentication:</strong> required before stronger
            multi-process trust claims.
          </li>
          <li>
            <strong>Single writer:</strong> the daemon must become the sole
            SQLite writer.
          </li>
          <li>
            <strong>Crash recovery:</strong> incomplete connector operations
            need deterministic startup recovery.
          </li>
          <li>
            <strong>Unsigned builds:</strong> current Windows builds may trigger
            SmartScreen.
          </li>
          <li>
            <strong>Coverage:</strong> provider hooks cannot stop hosted,
            disabled, bypassed, or otherwise uncovered actions.
          </li>
        </ul>
      </section>
      <Callout>
        Report vulnerabilities privately through the repository security policy.
        Do not include secrets, private source code, or customer data in a
        public issue.
      </Callout>
      <div className="page-actions">
        <a className="button" href={`${githubUrl}/security`}>
          Security policy <ExternalLink size={16} />
        </a>
        <a className="button secondary" href={`${githubUrl}/issues/6`}>
          Reliability issue <ExternalLink size={16} />
        </a>
      </div>
    </PublicPage>
  );
}

function PricingPage() {
  const plans = [
    {
      name: "Community",
      price: "$0 forever",
      text: "One active repository, health checks, compiler, redaction, manual copy, and export.",
    },
    {
      name: "Founding beta",
      price: "$29 one-time",
      text: "The first 100 customers receive Personal features and 12 months of updates in exchange for structured feedback.",
    },
    {
      name: "Personal",
      price: "$49 one-time",
      text: "Unlimited local repositories, direct handoffs, custom profiles, three devices, and 12 months of updates.",
    },
    {
      name: "Team",
      price: "Later",
      text: "Not for sale until shared policy, identity, encrypted sync, approvals, and audit history create recurring value.",
    },
  ];
  return (
    <PublicPage
      eyebrow="PACKAGING"
      title="Buy the tool. Keep the version."
      lede="Community remains useful and private. Personal uses desktop-tool economics: one payment, a cardless 14-day trial, and optional paid updates after the included year."
    >
      <div className="public-grid pricing-grid">
        {plans.map((plan) => (
          <article className="public-card price-card" key={plan.name}>
            <span>{plan.name}</span>
            <strong>{plan.price}</strong>
            <p>{plan.text}</p>
          </article>
        ))}
      </div>
      <Callout>
        The founding offer remains a validation waitlist until authenticated
        local control, production key delivery, purchase recovery, and refund
        tests are green. No card is required for the local trial.
      </Callout>
      <div className="page-actions">
        <a
          className="button"
          href="mailto:hello@agentnudge.dev?subject=Agent%20Nudge%20founding%20beta"
        >
          Join the founding beta <ArrowRight size={16} />
        </a>
      </div>
    </PublicPage>
  );
}

function ChangelogPage() {
  return (
    <PublicPage
      eyebrow="CHANGELOG"
      title="Built in receipts, not release theatre."
      lede="A concise public history of what is implemented, what is verified, and what remains unfinished."
    >
      <div className="changelog-list">
        <article>
          <time>26 July 2026</time>
          <div>
            <span>v0.5.1 reliability beta</span>
            <h2>Local control is authenticated and receipts are atomic</h2>
            <p>
              Per-installation credentials, hostile Host and Origin rejection, a
              sandboxed Electron request bridge, authenticated daemon health
              proofs, safe credential rotation, and ownership-checked,
              replay-safe outcome receipts committed as one local transaction.
            </p>
          </div>
        </article>
        <article>
          <time>26 July 2026</time>
          <div>
            <span>v0.5.0 beta</span>
            <h2>Context assurance workbench</h2>
            <p>
              Repository context health, safe bootstrap, deterministic
              changelogs, direct Claude/Codex/Aider handoffs, signed local
              licensing, a cardless 14-day trial, and the commercial-readiness
              audit.
            </p>
          </div>
        </article>
        <article>
          <time>23 July 2026</time>
          <div>
            <span>Assurance core</span>
            <h2>OpenCode evidence and replay foundations</h2>
            <p>
              Provider capability manifests, event normalization, instruction
              provenance, structured evidence, Shadow Mode, Replay Lab, and
              worktree-aware merge-risk analysis.
            </p>
          </div>
        </article>
        <article>
          <time>20 July 2026</time>
          <div>
            <span>v0.4.0</span>
            <h2>Live Connect</h2>
            <p>
              Reversible project connectors for Claude Code, Codex, and
              OpenCode; local preflight and receipt hooks; offline outbox;
              Windows packaging; expanded tests.
            </p>
          </div>
        </article>
      </div>
      <div className="page-actions">
        <a className="button" href={`${githubUrl}/blob/main/CHANGELOG.md`}>
          Read complete changelog <ExternalLink size={16} />
        </a>
        <a className="button secondary" href={`${githubUrl}/issues`}>
          View roadmap issues <ExternalLink size={16} />
        </a>
      </div>
    </PublicPage>
  );
}

function NotFoundPage() {
  return (
    <PublicPage
      eyebrow="404"
      title="That route is not in the ledger."
      lede="Use the product routes below rather than falling back to an empty single-page shell."
    >
      <div className="page-actions">
        <RouteLink className="button" to="/">
          Return home
        </RouteLink>
        <RouteLink className="button secondary" to="/docs">
          Open documentation
        </RouteLink>
      </div>
    </PublicPage>
  );
}
function PublicPage({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <main className="landing public-route">
      <PublicHeader />
      <section className="public-hero shell">
        <p className="section-signal">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{lede}</p>
      </section>
      <div className="shell public-content">{children}</div>
      <PublicFooter />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="site-nav shell">
      <Brand />
      <nav aria-label="Main navigation">
        <RouteLink to="/docs">Docs</RouteLink>
        <RouteLink to="/security">Security</RouteLink>
        <RouteLink to="/pricing">Pricing</RouteLink>
        <RouteLink to="/changelog">Changelog</RouteLink>
      </nav>
      <RouteLink className="button button-small" to="/download">
        Download <ArrowRight size={16} />
      </RouteLink>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="shell footer">
      <Brand />
      <p>Declare. Preflight. Act. Receipt.</p>
      <a href={githubUrl}>
        GitHub <ExternalLink size={14} />
      </a>
    </footer>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="public-callout">
      <ShieldCheck />
      <p>{children}</p>
    </aside>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  detail,
  tone = "",
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  detail: string;
  tone?: string;
}) {
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

function Setting({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <article>
      <Icon />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button type="button" onClick={onClick}>
        {action}
        <ChevronRight size={15} />
      </button>
    </article>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const href = isDesktop ? "#overview" : "/";
  return (
    <a
      className={`brand ${compact ? "compact" : ""}`}
      href={href}
      aria-label="Agent Nudge home"
      onClick={(event) => {
        if (isDesktop) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        navigate("/");
      }}
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

function RouteLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function navigate(path: string) {
  if (isDesktop) return;
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "auto" });
}

function readView(): View {
  const candidate = isDesktop
    ? location.hash.replace(/^#/, "")
    : location.pathname.split("/").filter(Boolean)[1];
  return dashboardViews.some((item) => item.id === candidate)
    ? (candidate as View)
    : "overview";
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall back to a synchronous copy path.
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
  const [repo, setRepo] = useState(".");
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
      const response = await daemonFetch(path, init);
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
            onClick={() =>
              window.open(
                "https://agent-nudge-bay.vercel.app/pricing",
                "_blank",
              )
            }
          >
            Founder pricing · validation
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

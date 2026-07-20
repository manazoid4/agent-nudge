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
import { sampleSnapshot } from "./sample-data.js";

type Snapshot = typeof sampleSnapshot;
type NudgeItem = Snapshot["nudges"][number];
type View = "overview" | "inbox" | "agents" | "timeline" | "rules" | "settings";

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
          <a href="#proof">Product proof</a>
          <a href="#how">How it works</a>
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
            <strong>Local agent coordination</strong>
            <span>Windows MVP</span>
          </div>
          <h1>Context before action.</h1>
          <p className="hero-lede">
            When Claude learns something Codex should know, Agent Nudge delivers
            the smallest verified warning before the next consequential move.
          </p>
          <div className="hero-actions">
            <a className="button" href="#demo">
              <Play size={17} fill="currentColor" /> Run the product demo
            </a>
            <a
              className="text-link"
              href="https://github.com/manazoid4/agent-nudge"
            >
              View source <ExternalLink size={15} />
            </a>
          </div>
          <p className="privacy-note">
            <ShieldCheck size={16} /> Local-first. No transcript hoarding. No
            model API required.
          </p>
        </div>
        <NudgeSpecimen />
      </section>

      <section className="proof-strip" id="proof">
        <div className="shell proof-items">
          <div>
            <strong>140</strong>
            <span>explainable relevance score</span>
          </div>
          <div>
            <strong>8 min</strong>
            <span>source age, shown honestly</span>
          </div>
          <div>
            <strong>0</strong>
            <span>cloud services required</span>
          </div>
          <div>
            <strong>4</strong>
            <span>proof scenarios included</span>
          </div>
        </div>
      </section>

      <section className="narrative shell" id="how">
        <div className="narrative-heading">
          <span>Agents already communicate.</span>
          <h2>The missing layer decides what matters.</h2>
        </div>
        <div className="flow-line" aria-label="Agent Nudge data flow">
          {[
            "Hooks + Git",
            "Fact ledger",
            "Relevance + policy",
            "Last responsible moment",
            "Outcome evidence",
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

      <section className="commercial" id="pricing">
        <div className="shell commercial-inner">
          <div>
            <p className="section-signal">USEFUL BEFORE YOU PAY</p>
            <h2>The local product stays free.</h2>
            <p>
              Pay later for encrypted teamwork, policy, audit, and controlled
              delivery across agent fleets—not for storing more noise.
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
        </div>
      </section>

      <footer className="shell footer">
        <Brand />
        <p>The right agent. The right evidence. Before it acts.</p>
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
  const [selectedId, setSelectedId] = useState(snapshot.nudges[0]?.id ?? "");
  const [connected, setConnected] = useState(!isPublicDemo);
  const [busy, setBusy] = useState(false);
  const selected =
    snapshot.nudges.find((item) => item.id === selectedId) ??
    snapshot.nudges[0];

  const refresh = useCallback(async () => {
    if (isPublicDemo) return;
    try {
      const response = await fetch(
        `${endpoint}/snapshot?projectId=project-agent-nudge`,
      );
      if (!response.ok) throw new Error("offline");
      const data = (await response.json()) as Snapshot;
      setSnapshot(data.nudges.length ? data : sampleSnapshot);
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
        await fetch(`${endpoint}/demo`, { method: "POST" });
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
              ["overview", Gauge, "Overview"],
              ["inbox", Inbox, "Nudge inbox"],
              ["agents", Bot, "Live agents"],
              ["timeline", Activity, "Timeline"],
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
          <small>{window.agentNudge?.version ?? "v0.1.0"}</small>
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
              {busy ? "Running…" : "Run proof"}
            </button>
          </div>
        </header>
        {view === "overview" && (
          <Overview snapshot={snapshot} runDemo={runDemo} />
        )}
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
        {view === "rules" && <RulesView />}
        {view === "settings" && (
          <SettingsView connected={connected} isPublicDemo={isPublicDemo} />
        )}
      </div>
    </div>
  );
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
          <p>Operations overview</p>
          <h1>Context assurance</h1>
          <span>
            Quiet until a decision, failure, or conflict changes the next move.
          </span>
        </div>
        <button className="button secondary" onClick={runDemo}>
          <Sparkles size={16} /> Replay proof scenarios
        </button>
      </div>
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
          detail="one pre-action hold"
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
          value="8m"
          label="median context age"
          detail="at delivery"
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
            <div style={{ width: "92%" }} />
            <span>92% useful-or-opened</span>
          </div>
          <dl>
            <div>
              <dt>Suppressed as noise</dt>
              <dd>18</dd>
            </div>
            <div>
              <dt>Expired before delivery</dt>
              <dd>2</dd>
            </div>
            <div>
              <dt>Wrong-context reports</dt>
              <dd>0</dd>
            </div>
            <div>
              <dt>Local evidence coverage</dt>
              <dd>100%</dd>
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
              <h2>{agent.activeTask.summary}</h2>
              <p>
                <FileCode2 size={14} />
                {agent.activeTask.paths.join(", ")}
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
          text="Claude Code and Codex adapters are project-scoped and preview changes before install."
          action="Show install plan"
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
function Setting({ icon: Icon, title, text, action }: any) {
  return (
    <article>
      <Icon />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <button>
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
function relative(date: string) {
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

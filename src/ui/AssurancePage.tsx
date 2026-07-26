import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileKey2,
  FlaskConical,
  GitCompareArrows,
  Github,
  LockKeyhole,
  Network,
  RefreshCcw,
  ShieldCheck,
  TerminalSquare,
  Workflow,
} from "lucide-react";
import {
  listProviderCapabilities,
  type CapabilityLevel,
} from "../core/capabilities.js";
import "./assurance-page.css";

const levelOrder: CapabilityLevel[] = [
  "enforced",
  "advisory",
  "observed",
  "unsupported",
];

export function AssurancePage() {
  const manifests = listProviderCapabilities();

  return (
    <main className="assurance-page">
      <header className="assurance-nav assurance-shell">
        <a className="assurance-brand" href="/">
          <span className="assurance-mark">AN</span>
          <span>
            <strong>Agent Nudge</strong>
            <small>Assurance core</small>
          </span>
        </a>
        <nav aria-label="Assurance navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#opencode">OpenCode</a>
          <a href="#privacy">Privacy</a>
          <a href="#use">Use it</a>
        </nav>
        <a
          className="assurance-source"
          href="https://github.com/manazoid4/agent-nudge"
        >
          <Github size={17} /> Source
        </a>
      </header>

      <section className="assurance-hero assurance-shell">
        <div className="assurance-copy">
          <p className="assurance-kicker">
            <ShieldCheck size={16} /> Provider-neutral assurance
          </p>
          <h1>Know what every coding agent can do before it acts.</h1>
          <p>
            Agent Nudge sits around OpenCode, Claude Code and Codex to verify
            connector capability, detect stale instructions and competing work,
            route only relevant evidence, and record what changed after a
            warning.
          </p>
          <div className="assurance-actions">
            <a className="assurance-button" href="#use">
              <TerminalSquare size={17} /> Run assurance checks
            </a>
            <a className="assurance-button secondary" href="/demo/portfolio">
              <Activity size={17} /> Explore the context mesh
            </a>
            <a className="assurance-button secondary" href="/replay">
              <FlaskConical size={17} /> Open Replay Lab
            </a>
          </div>
          <div className="assurance-boundary">
            <LockKeyhole size={18} />
            <span>
              Local-first. No prompt, response, command output or source-file
              body is required for these checks.
            </span>
          </div>
        </div>

        <div
          className="assurance-console"
          aria-label="Assurance decision example"
        >
          <div className="assurance-console-top">
            <span /> preflight · opencode · tool.execute.before
          </div>
          <div className="assurance-decision">
            <strong>REVIEW</strong>
            <span>Instruction changed during this session</span>
          </div>
          <dl>
            <div>
              <dt>Connector</dt>
              <dd>trusted project plugin</dd>
            </div>
            <div>
              <dt>Instruction digest</dt>
              <dd>changed · AGENTS.md</dd>
            </div>
            <div>
              <dt>Competing task</dt>
              <dd>package-lock.json · active</dd>
            </div>
            <div>
              <dt>Recovery point</dt>
              <dd>files + worktree covered</dd>
            </div>
          </dl>
          <p>
            Continue only after reviewing the changed instruction and shared
            lockfile claim.
          </p>
        </div>
      </section>

      <section className="assurance-principles">
        <div className="assurance-shell assurance-principle-grid">
          <article>
            <FileKey2 />
            <strong>Prove configuration</strong>
            <span>Hash active rules, skills, agents and plugins.</span>
          </article>
          <article>
            <GitCompareArrows />
            <strong>Predict collisions</strong>
            <span>Combine claims, paths, tasks, worktrees and merge risk.</span>
          </article>
          <article>
            <RefreshCcw />
            <strong>Stop failed loops</strong>
            <span>Require a changed hypothesis after repeated failures.</span>
          </article>
          <article>
            <CheckCircle2 />
            <strong>Record outcomes</strong>
            <span>
              Separate delivery, review, changed action and prevention.
            </span>
          </article>
        </div>
      </section>

      <section className="assurance-section assurance-shell" id="capabilities">
        <div className="assurance-heading">
          <p>CAPABILITY TRUTH</p>
          <h2>One vocabulary across different agent runtimes.</h2>
          <span>
            An event is never labelled enforced merely because a hook exists.
            Missing, disabled, untrusted, offline or drifted integrations are
            downgraded automatically.
          </span>
        </div>
        <div className="capability-legend">
          {levelOrder.map((level) => (
            <span className={`level level-${level}`} key={level}>
              {level}
            </span>
          ))}
        </div>
        <div className="provider-grid">
          {manifests.map((manifest) => {
            const counts = levelOrder.map(
              (level) =>
                [
                  level,
                  Object.values(manifest.events).filter(
                    (item) => item === level,
                  ).length,
                ] as const,
            );
            return (
              <article className="provider-card" key={manifest.provider}>
                <div className="provider-title">
                  <Bot />
                  <div>
                    <h3>{manifest.displayName}</h3>
                    <span>{manifest.transport}</span>
                  </div>
                  <b>{Math.round(manifest.confidence * 100)}%</b>
                </div>
                <div className="provider-counts">
                  {counts.map(([level, count]) => (
                    <div key={level}>
                      <strong>{count}</strong>
                      <span>{level}</span>
                    </div>
                  ))}
                </div>
                <ul>
                  <li>
                    Worktree identity:{" "}
                    {manifest.worktreeIdentity ? "yes" : "no"}
                  </li>
                  <li>
                    Subagent identity:{" "}
                    {manifest.subagentIdentity ? "yes" : "no"}
                  </li>
                  <li>Checkpoint: {manifest.checkpoint}</li>
                  <li>
                    Reversible installation:{" "}
                    {manifest.reversibleInstall ? "yes" : "no"}
                  </li>
                </ul>
                <p>{manifest.limitations[0]}</p>
              </article>
            );
          })}
        </div>
        <a className="assurance-data-link" href="/provider-capabilities.json">
          View the public capability data <Network size={15} />
        </a>
      </section>

      <section className="assurance-dark" id="opencode">
        <div className="assurance-shell assurance-section">
          <div className="assurance-heading light">
            <p>OPENCODE REFERENCE ADAPTER</p>
            <h2>Rich events become small, privacy-safe assurance signals.</h2>
            <span>
              OpenCode is the reference integration because its plugin surface
              spans sessions, subagents, permissions, tools, files, todos,
              diagnostics and installation state.
            </span>
          </div>
          <div className="event-grid">
            {[
              [
                "Sessions",
                "created · status · idle · error · diff · compacted",
              ],
              ["Actions", "tool before · tool after · command receipt"],
              ["Permissions", "asked · replied · effective capability"],
              ["Evidence", "file edits · watchers · LSP diagnostics"],
              ["Coordination", "todos · parent session · agent mode"],
              ["Health", "installation update · server connected"],
            ].map(([title, body]) => (
              <article key={title}>
                <Workflow />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="allowlist">
            <strong>Stored</strong>
            <span>
              event class · session IDs · model ID · tool class · path keys ·
              status · diagnostic count · hashes · timestamps
            </span>
            <strong>Discarded</strong>
            <span>
              prompts · responses · source bodies · command output · arbitrary
              plugin payloads · credentials
            </span>
          </div>
        </div>
      </section>

      <section className="assurance-section assurance-shell" id="privacy">
        <div className="assurance-heading">
          <p>ASSURANCE PIPELINE</p>
          <h2>
            Configuration, coordination, evidence and recovery stay distinct.
          </h2>
        </div>
        <div className="pipeline">
          {[
            [
              "01",
              "Capability",
              "What can this connected provider actually expose or deny?",
            ],
            [
              "02",
              "Provenance",
              "Which instructions, rules, skills and plugins were active?",
            ],
            [
              "03",
              "Preflight",
              "Do tasks, claims, worktrees or failed approaches conflict?",
            ],
            [
              "04",
              "Evidence",
              "What diagnostic, test, build, Git or human proof exists?",
            ],
            [
              "05",
              "Recovery",
              "Which valid checkpoint covers files, state and environment?",
            ],
            [
              "06",
              "Receipt",
              "Was the warning delivered, reviewed, useful and action-changing?",
            ],
          ].map(([number, title, body]) => (
            <article key={number}>
              <b>{number}</b>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="assurance-use" id="use">
        <div className="assurance-shell assurance-use-grid">
          <div>
            <p className="assurance-kicker">AVAILABLE IN THE REPOSITORY</p>
            <h2>Inspect the assurance layer from the command line.</h2>
            <p>
              The CLI reports capability truth, hashes active agent
              configuration, and compares path sets without modifying Git.
            </p>
            <a
              className="assurance-button"
              href="https://github.com/manazoid4/agent-nudge/blob/main/docs/ASSURANCE_CORE.md"
            >
              Read the assurance contract
            </a>
          </div>
          <pre>
            <code>{`agent-nudge-assure capabilities opencode
agent-nudge-assure instructions C:\\work\\project
agent-nudge-assure merge-risk \\
  src/api.ts,package-lock.json \\
  src/ui.ts,package-lock.json`}</code>
          </pre>
        </div>
      </section>

      <footer className="assurance-footer assurance-shell">
        <a href="/">
          <ArrowLeft size={15} /> Back to Agent Nudge
        </a>
        <span>Local-first assurance for parallel coding agents.</span>
        <a href="https://github.com/manazoid4/agent-nudge/issues/13">
          Feature programme
        </a>
      </footer>
    </main>
  );
}
